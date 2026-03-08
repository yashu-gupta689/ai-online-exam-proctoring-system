import os
import time
import base64
from pathlib import Path

import cv2 as cv
import mediapipe as mp
import numpy as np
import requests
try:
  import onnxruntime as ort
except Exception:
  ort = None

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:4000/api")
STUDENT_ID = os.environ.get("STUDENT_ID", "anonymous")
COOLDOWN_S = float(os.environ.get("EVENT_COOLDOWN_S", "5.0"))
SCREENSHOT_DIR = os.environ.get("SCREENSHOT_DIR", "screenshots")
YOLO_CFG = os.environ.get("YOLO_CFG", "models/yolov3.cfg")
YOLO_WEIGHTS = os.environ.get("YOLO_WEIGHTS", "models/yolov3.weights")
YOLO_CONF = float(os.environ.get("YOLO_CONF", "0.6"))
YOLO_NMS = float(os.environ.get("YOLO_NMS", "0.4"))
EMO_ONNX = os.environ.get("EMO_ONNX", "models/emotion-ferplus.onnx")

mp_face = mp.solutions.face_detection
mp_mesh = mp.solutions.face_mesh

def ensure_dir(p):
  Path(p).mkdir(parents=True, exist_ok=True)

def save_frame(frame, label):
  ensure_dir(SCREENSHOT_DIR)
  ts = int(time.time() * 1000)
  path = os.path.join(SCREENSHOT_DIR, f"{label}_{ts}.jpg")
  cv.imwrite(path, frame)
  return path

def post_screenshot(event_type, details, frame):
  try:
    _, buf = cv.imencode(".jpg", frame, [int(cv.IMWRITE_JPEG_QUALITY), 80])
    b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
    payload = {
      "studentId": STUDENT_ID,
      "type": event_type,
      "imageBase64": f"data:image/jpeg;base64,{b64}",
      "timestamp": int(time.time() * 1000)
    }
    requests.post(f"{BACKEND_URL}/violation", json=payload, timeout=5)
  except Exception:
    pass

def norm(v, w, h):
  return np.array([v[0] / w, v[1] / h], dtype=np.float32)

def iris_ratio(landmarks, idx_center, idx_left, idx_right, w, h):
  c = (int(landmarks[idx_center].x * w), int(landmarks[idx_center].y * h))
  l = (int(landmarks[idx_left].x * w), int(landmarks[idx_left].y * h))
  r = (int(landmarks[idx_right].x * w), int(landmarks[idx_right].y * h))
  left_to_right = r[0] - l[0] if r[0] != l[0] else 1
  ratio = (c[0] - l[0]) / left_to_right
  return max(0.0, min(1.0, float(ratio)))

class EmotionDetector:
  def __init__(self):
    self.session = None
    if ort and os.path.exists(EMO_ONNX):
      try:
        self.session = ort.InferenceSession(EMO_ONNX, providers=['CPUExecutionProvider'])
        self.inp_name = self.session.get_inputs()[0].name
        self.out_name = self.session.get_outputs()[0].name
      except Exception:
        self.session = None
    # FER+ class order commonly: neutral, happiness, surprise, sadness, anger, disgust, fear, contempt
    self.labels = ['neutral', 'happiness', 'surprise', 'sadness', 'anger', 'disgust', 'fear', 'contempt']

  def preprocess(self, face_roi):
    gray = cv.cvtColor(face_roi, cv.COLOR_BGR2GRAY)
    resized = cv.resize(gray, (64, 64), interpolation=cv.INTER_AREA)
    arr = resized.astype(np.float32) / 255.0
    arr = np.expand_dims(np.expand_dims(arr, 0), 0)  # 1x1x64x64
    return arr

  def map_label(self, raw_label):
    if raw_label in ('anger',):
      return 'angry'
    if raw_label in ('surprise',):
      return 'surprised'
    if raw_label == 'neutral':
      return 'neutral'
    return 'neutral'

  def detect(self, frame, bbox):
    if self.session is None or bbox is None:
      return None
    x, y, w, h = bbox
    x0 = max(0, x); y0 = max(0, y)
    x1 = min(frame.shape[1], x + w); y1 = min(frame.shape[0], y + h)
    roi = frame[y0:y1, x0:x1]
    if roi.size == 0:
      return None
    inp = self.preprocess(roi)
    try:
      out = self.session.run([self.out_name], {self.inp_name: inp})[0]
      idx = int(np.argmax(out))
      raw = self.labels[idx] if idx < len(self.labels) else 'neutral'
      label = self.map_label(raw)
      return label
    except Exception:
      return None

class ProctorDetector:
  def __init__(self):
    self.last_event = {}
    self.prev_center = None
    self.gaze_thresh = float(os.environ.get("GAZE_THRESH", "0.15"))
    self.move_thresh = float(os.environ.get("MOVE_THRESH", "0.18"))
    self.away_since = None
    self.away_seconds = float(os.environ.get("AWAY_SECONDS", "5.0"))
    self.mouth_thresh = float(os.environ.get("MOUTH_THRESH", "0.08"))
    self.talking_frames = 0
    self.talking_episodes = 0
    self.talking_repeat = int(os.environ.get("TALKING_REPEAT", "3"))
    self.talking_last_emit = 0.0
    self.talking_cooldown = float(os.environ.get("TALKING_COOLDOWN_S", "20"))
    # Background detection thresholds
    self.bg_blur_var_max = float(os.environ.get("BG_BLUR_VAR_MAX", "15.0"))
    self.face_sharp_var_min = float(os.environ.get("FACE_SHARP_VAR_MIN", "25.0"))
    self.green_ratio_thresh = float(os.environ.get("GREEN_RATIO_THRESH", "0.3"))
    self.bg_color_std_max = float(os.environ.get("BG_COLOR_STD_MAX", "12.0"))
    self.light_min_v = float(os.environ.get("LIGHT_MIN_V", "60.0"))
    self.light_sustain_s = float(os.environ.get("LIGHT_SUSTAIN_S", "3.0"))
    self.low_light_since = None

  def can_emit(self, event_type):
    t = self.last_event.get(event_type, 0.0)
    if time.time() - t > COOLDOWN_S:
      self.last_event[event_type] = time.time()
      return True
    return False

  def process(self, frame, faces, mesh_results):
    h, w = frame.shape[:2]
    if len(faces) == 0:
      if self.can_emit("face_absent"):
        save_frame(frame, "face_absent")
        post_screenshot("face_absent", "No face detected", frame)
      return
    if len(faces) > 1:
      if self.can_emit("multiple_faces"):
        save_frame(frame, "multiple_faces")
        post_screenshot("multiple_faces", "Multiple faces detected", frame)
      return
    det = faces[0]
    box = det.location_data.relative_bounding_box
    cx = (box.xmin + box.width * 0.5) * w
    cy = (box.ymin + box.height * 0.5) * h
    if self.prev_center is None:
      self.prev_center = (cx, cy)
    dx = abs(cx - self.prev_center[0]) / w
    dy = abs(cy - self.prev_center[1]) / h
    if (dx > self.move_thresh or dy > self.move_thresh) and self.can_emit("head_movement"):
      save_frame(frame, "head_movement")
      post_screenshot("head_movement", f"Movement dx={dx:.2f} dy={dy:.2f}", frame)
    self.prev_center = (cx, cy)
    if mesh_results and mesh_results.multi_face_landmarks:
      fl = mesh_results.multi_face_landmarks[0].landmark
      # Horizontal gaze
      left_ratio_h = iris_ratio(fl, 468, 33, 133, w, h)
      right_ratio_h = iris_ratio(fl, 473, 362, 263, w, h)
      # Vertical gaze using eyelid landmarks: left eye top(159), bottom(145); right eye top(386), bottom(374)
      def v_ratio(idx_c, idx_top, idx_bottom):
        cy = int(fl[idx_c].y * h)
        ty = int(fl[idx_top].y * h)
        by = int(fl[idx_bottom].y * h)
        denom = max(1, by - ty)
        return (cy - ty) / denom
      left_ratio_v = v_ratio(468, 159, 145)
      right_ratio_v = v_ratio(473, 386, 374)
      gaze_l = (left_ratio_h < 0.5 - self.gaze_thresh) and (right_ratio_h < 0.5 - self.gaze_thresh)
      gaze_r = (left_ratio_h > 0.5 + self.gaze_thresh) and (right_ratio_h > 0.5 + self.gaze_thresh)
      gaze_down = (left_ratio_v > 0.65) and (right_ratio_v > 0.65)
      gaze_screen = not (gaze_l or gaze_r or gaze_down)
      if gaze_l and self.can_emit("gaze_left"):
        save_frame(frame, "gaze_left")
        post_screenshot("gaze_left", f"Left gaze H {left_ratio_h:.2f}/{right_ratio_h:.2f}", frame)
      elif gaze_r and self.can_emit("gaze_right"):
        save_frame(frame, "gaze_right")
        post_screenshot("gaze_right", f"Right gaze H {left_ratio_h:.2f}/{right_ratio_h:.2f}", frame)
      elif gaze_down and self.can_emit("looking_down"):
        save_frame(frame, "looking_down")
        post_screenshot("looking_down", f"Down gaze V {left_ratio_v:.2f}/{right_ratio_v:.2f}", frame)
      # Talking detection using mouth openness
      def dist(a, b):
        ax, ay = int(fl[a].x * w), int(fl[a].y * h)
        bx, by = int(fl[b].x * w), int(fl[b].y * h)
        return np.hypot(ax - bx, ay - by)
      mouth_open = dist(13, 14)
      mouth_width = dist(61, 291) + 1e-6
      ratio = mouth_open / mouth_width
      if ratio > self.mouth_thresh:
        self.talking_frames += 1
      else:
        if self.talking_frames >= 20:  # ~0.7s at ~30fps
          self.talking_episodes += 1
        self.talking_frames = 0
      now = time.time()
      if self.talking_episodes >= self.talking_repeat and (now - self.talking_last_emit) > self.talking_cooldown:
        self.talking_last_emit = now
        self.talking_episodes = 0
        save_frame(frame, "talking_detected")
        post_screenshot("talking_detected", "Talking detected repeatedly", frame)
      # Sustained away detection
      now = time.time()
      if not gaze_screen:
        if self.away_since is None:
          self.away_since = now
        elif (now - self.away_since) >= self.away_seconds and self.can_emit("looking_away"):
          save_frame(frame, "looking_away")
          post_screenshot("looking_away", "Eyes off screen > threshold", frame)
      else:
        self.away_since = None
    # Background authenticity checks
    try:
      self.check_background(frame, faces)
    except Exception:
      pass
    try:
      self.check_lighting(frame)
    except Exception:
      pass

  def check_background(self, frame, faces):
    if not faces:
      return
    h, w = frame.shape[:2]
    det = faces[0]
    rb = det.location_data.relative_bounding_box
    # Expand face box to include shoulders, then cap to frame
    fx = int(max(0, (rb.xmin - 0.05) * w))
    fy = int(max(0, (rb.ymin - 0.05) * h))
    fw = int(min(w - fx, (rb.width + 0.1) * w))
    fh = int(min(h - fy, (rb.height + 0.1) * h))
    face_roi = frame[fy:fy+fh, fx:fx+fw]
    if face_roi.size == 0:
      return
    gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
    face_gray = cv.cvtColor(face_roi, cv.COLOR_BGR2GRAY)
    # Create background mask: everything except expanded face rectangle
    bg_mask = np.ones((h, w), dtype=np.uint8) * 255
    cv.rectangle(bg_mask, (fx, fy), (fx+fw, fy+fh), 0, thickness=-1)
    # Compute Laplacian variance (sharpness) on face and background
    lap = cv.Laplacian(gray, cv.CV_64F)
    face_lap = cv.Laplacian(face_gray, cv.CV_64F)
    bg_vals = lap[bg_mask == 255]
    bg_var = float(bg_vals.var()) if bg_vals.size > 0 else 0.0
    face_var = float(face_lap.var()) if face_lap.size > 0 else 0.0
    # Background blur detection: blurred bg with sharp face
    if bg_var < self.bg_blur_var_max and face_var > self.face_sharp_var_min and self.can_emit("background_blur"):
      save_frame(frame, "background_blur")
      post_screenshot("background_blur", f"bg_var={bg_var:.1f} face_var={face_var:.1f}", frame)
    # Greenscreen detection on background
    bg_roi = frame.copy()
    bg_roi[fy:fy+fh, fx:fx+fw] = 0
    hsv = cv.cvtColor(bg_roi, cv.COLOR_BGR2HSV)
    hch, sch, vch = cv.split(hsv)
    green_mask = cv.inRange(hsv, (35, 60, 60), (85, 255, 255))
    green_ratio = float(np.count_nonzero(green_mask)) / float(h * w)
    if green_ratio > self.green_ratio_thresh and self.can_emit("greenscreen_detected"):
      save_frame(frame, "greenscreen_detected")
      post_screenshot("greenscreen_detected", f"green_ratio={green_ratio:.2f}", frame)
    # Virtual background (simple heuristic): very uniform background color (low std) not green
    # Compute stddev on background-only pixels
    bg_pixels = bg_roi[bg_mask == 255]
    if bg_pixels.size > 0:
      std_bgr = np.array(bg_pixels).reshape(-1, 3).std(axis=0)
      mean_std = float(std_bgr.mean())
      if mean_std < self.bg_color_std_max and green_ratio < (self.green_ratio_thresh * 0.5) and self.can_emit("virtual_background_detected"):
        save_frame(frame, "virtual_background_detected")
        post_screenshot("virtual_background_detected", f"bg_std={mean_std:.1f}", frame)

  def check_lighting(self, frame):
    hsv = cv.cvtColor(frame, cv.COLOR_BGR2HSV)
    v = hsv[:, :, 2]
    v_mean = float(v.mean())
    now = time.time()
    if v_mean < self.light_min_v:
      if self.low_light_since is None:
        self.low_light_since = now
      elif (now - self.low_light_since) >= self.light_sustain_s and self.can_emit("low_light"):
        save_frame(frame, "low_light")
        post_screenshot("low_light", f"v_mean={v_mean:.1f}", frame)
    else:
      self.low_light_since = None

class YOLODetector:
  def __init__(self):
    self.net = None
    try:
      if os.path.exists(YOLO_CFG) and os.path.exists(YOLO_WEIGHTS):
        self.net = cv.dnn.readNetFromDarknet(YOLO_CFG, YOLO_WEIGHTS)
        self.net.setPreferableBackend(cv.dnn.DNN_BACKEND_OPENCV)
        self.net.setPreferableTarget(cv.dnn.DNN_TARGET_CPU)
        self.out_layers = [self.net.getLayerNames()[i - 1] for i in self.net.getUnconnectedOutLayers().flatten()]
      else:
        self.net = None
    except Exception:
      self.net = None

  def detect(self, frame):
    if self.net is None:
      return []
    h, w = frame.shape[:2]
    blob = cv.dnn.blobFromImage(frame, 1/255.0, (416, 416), swapRB=True, crop=False)
    self.net.setInput(blob)
    outs = self.net.forward(self.out_layers)
    boxes = []
    confidences = []
    class_ids = []
    for out in outs:
      for det in out:
        scores = det[5:]
        class_id = int(np.argmax(scores))
        conf = float(scores[class_id])
        if conf > YOLO_CONF:
          cx, cy, bw, bh = det[0:4]
          x = int((cx - bw/2) * w)
          y = int((cy - bh/2) * h)
          box = [x, y, int(bw * w), int(bh * h)]
          boxes.append(box)
          confidences.append(conf)
          class_ids.append(class_id)
    idxs = cv.dnn.NMSBoxes(boxes, confidences, YOLO_CONF, YOLO_NMS)
    results = []
    if len(idxs) > 0:
      for i in idxs.flatten():
        results.append((class_ids[i], confidences[i], boxes[i]))
    return results

def run_camera():
  det = ProctorDetector()
  yolo = YOLODetector()
  emo = EmotionDetector()
  cap = cv.VideoCapture(0)
  if not cap.isOpened():
    print("Cannot open webcam")
    return
  with mp_face.FaceDetection(model_selection=0, min_detection_confidence=0.6) as face_det:
    with mp_mesh.FaceMesh(static_image_mode=False, refine_landmarks=True, max_num_faces=1, min_detection_confidence=0.5, min_tracking_confidence=0.5) as mesh:
      while True:
        ok, frame = cap.read()
        if not ok:
          print("Failed to read frame")
          break
        rgb = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
        faces = face_det.process(rgb).detections or []
        mesh_res = mesh.process(rgb)
        det.process(frame, faces, mesh_res)
        # Emotion detection (optional): emit activity to admins via realtime frame channel only; logging can be added if needed
        if faces:
          b = faces[0].location_data.relative_bounding_box
          fx = int(b.xmin * frame.shape[1])
          fy = int(b.ymin * frame.shape[0])
          fw = int(b.width * frame.shape[1])
          fh = int(b.height * frame.shape[0])
          label = emo.detect(frame, (fx, fy, fw, fh)) if emo else None
          # Currently we don't log emotions other than talking to violations to avoid noise
        detections = yolo.detect(frame)
        for class_id, conf, box in detections:
          if class_id in (0, 63, 67):
            if class_id == 67 and det.can_emit("phone_detected"):
              save_frame(frame, "phone_detected")
              post_screenshot("phone_detected", f"cell_phone {conf:.2f}", frame)
        cv.imshow("AI Proctoring - Press Q to quit", frame)
        if cv.waitKey(1) & 0xFF in (ord('q'), ord('Q')):
          break
  cap.release()
  cv.destroyAllWindows()
