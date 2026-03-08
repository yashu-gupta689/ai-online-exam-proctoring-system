import os
import sys

# Make ai-module importable
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
AI_MODULE_DIR = os.path.join(BASE_DIR, 'ai-module')
if AI_MODULE_DIR not in sys.path:
    sys.path.insert(0, AI_MODULE_DIR)

try:
    from detector import run_camera
except Exception as e:
    print("Failed to import AI detector. Ensure 'ai-module/detector.py' exists and dependencies are installed.")
    raise

if __name__ == "__main__":
    # Align with backend default port and API base
    os.environ.setdefault("BACKEND_URL", "http://localhost:5000/api")
    run_camera()
