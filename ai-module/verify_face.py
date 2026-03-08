import os
import time
import base64

import cv2 as cv
import face_recognition
import requests

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:4000/api")
STUDENT_ID = os.environ.get("STUDENT_ID", "anonymous")
PROFILE_IMAGE = os.environ.get("PROFILE_IMAGE", None)
PROFILE_DIR = os.environ.get("PROFILE_DIR", "profiles")
THRESHOLD = float(os.environ.get("VERIFY_THRESHOLD", "80"))

def load_profile_encoding():
  path = PROFILE_IMAGE
  if not path:
    fname = f"{STUDENT_ID}.jpg"
    path = os.path.join(PROFILE_DIR, fname)
  if not os.path.exists(path):
    return None
  img = face_recognition.load_image_file(path)
  encs = face_recognition.face_encodings(img)
  if not encs:
    return None
  return encs[0]

def capture_frame():
  cap = cv.VideoCapture(0)
  if not cap.isOpened():
    return None
  time.sleep(0.3)
  ret, frame = cap.read()
  cap.release()
  if not ret:
    return None
  return frame

def encode_image_b64(frame):
  _, buf = cv.imencode(".jpg", frame, [int(cv.IMWRITE_JPEG_QUALITY), 80])
  b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
  return f"data:image/jpeg;base64,{b64}"

def similarity_from_distance(dist):
  d = min(max(dist, 0.0), 0.6)
  sim = max(0.0, (0.6 - d) / 0.6) * 100.0
  return sim

def post_verification(success, score, frame):
  try:
    payload = {
      "studentId": STUDENT_ID,
      "success": bool(success),
      "score": float(score),
      "imageBase64": encode_image_b64(frame),
      "timestamp": int(time.time() * 1000)
    }
    requests.post(f"{BACKEND_URL}/verify", json=payload, timeout=8)
  except Exception:
    pass

def main():
  prof = load_profile_encoding()
  if prof is None:
    print("Profile image/encoding not found")
    return
  frame = capture_frame()
  if frame is None:
    print("Cannot capture frame")
    return
  rgb = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
  encs = face_recognition.face_encodings(rgb)
  if not encs:
    print("No face found in live frame")
    post_verification(False, 0.0, frame)
    return
  dist = face_recognition.face_distance([prof], encs[0])[0]
  score = similarity_from_distance(dist)
  success = score >= THRESHOLD
  post_verification(success, score, frame)
  print(f"Verification {'passed' if success else 'failed'} with score {score:.1f}%")

if __name__ == "__main__":
  main()
