import os
import time
import base64

import cv2 as cv
import mediapipe as mp
import numpy as np
import requests

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:4000/api")
STUDENT_ID = os.environ.get("STUDENT_ID", "anonymous")
TIMEOUT_S = float(os.environ.get("LIVENESS_TIMEOUT_S", "30"))

mp_mesh = mp.solutions.face_mesh

def encode_b64(frame):
  _, buf = cv.imencode(".jpg", frame, [int(cv.IMWRITE_JPEG_QUALITY), 80])
  return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode("utf-8")

def post_liveness(success, score, frame):
  try:
    payload = {
      "studentId": STUDENT_ID,
      "success": bool(success),
      "score": float(score),
      "imageBase64": encode_b64(frame),
      "timestamp": int(time.time() * 1000),
      "kind": "liveness"
    }
    requests.post(f"{BACKEND_URL}/verify", json=payload, timeout=8)
  except Exception:
    pass

def ear_ratio(landmarks, w, h, top, bottom, left, right):
  tx, ty = int(landmarks[top].x * w), int(landmarks[top].y * h)
  bx, by = int(landmarks[bottom].x * w), int(landmarks[bottom].y * h)
  lx, ly = int(landmarks[left].x * w), int(landmarks[left].y * h)
  rx, ry = int(landmarks[right].x * w), int(landmarks[right].y * h)
  vert = np.hypot(tx - bx, ty - by)
  horiz = np.hypot(lx - rx, ly - ry) + 1e-6
  return vert / horiz

def iris_h_ratio(landmarks, c_idx, l_idx, r_idx, w, h):
  cx = int(landmarks[c_idx].x * w)
  lx = int(landmarks[l_idx].x * w)
  rx = int(landmarks[r_idx].x * w)
  denom = max(1, rx - lx)
  return (cx - lx) / denom

def main():
  cap = cv.VideoCapture(0)
  if not cap.isOpened():
    print("Cannot open webcam")
    return
  blinked = False
  turned_left = False
  turned_right = False
  start = time.time()
  with mp_mesh.FaceMesh(static_image_mode=False, refine_landmarks=True, max_num_faces=1, min_detection_confidence=0.5, min_tracking_confidence=0.5) as mesh:
    while True:
      ok, frame = cap.read()
      if not ok:
        break
      rgb = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
      res = mesh.process(rgb)
      h, w = frame.shape[:2]
      if res and res.multi_face_landmarks:
        fl = res.multi_face_landmarks[0].landmark
        ear_l = ear_ratio(fl, w, h, 159, 145, 33, 133)
        ear_r = ear_ratio(fl, w, h, 386, 374, 362, 263)
        if ear_l < 0.18 and ear_r < 0.18:
          blinked = True
        ratio_l = iris_h_ratio(fl, 468, 33, 133, w, h)
        ratio_r = iris_h_ratio(fl, 473, 362, 263, w, h)
        avg = (ratio_l + ratio_r) * 0.5
        if avg < 0.35:
          turned_left = True
        if avg > 0.65:
          turned_right = True
      cv.imshow("Liveness Check - Blink and Turn Head L/R - Press Q to quit", frame)
      if blinked and turned_left and turned_right:
        post_liveness(True, 100.0, frame)
        print("Liveness passed")
        break
      if time.time() - start > TIMEOUT_S:
        post_liveness(False, 0.0, frame)
        print("Liveness failed")
        break
      if cv.waitKey(1) & 0xFF in (ord('q'), ord('Q')):
        break
  cap.release()
  cv.destroyAllWindows()

if __name__ == "__main__":
  main()
