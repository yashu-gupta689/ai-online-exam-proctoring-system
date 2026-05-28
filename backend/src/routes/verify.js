import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import VerificationLog from '../models/VerificationLog.js';
import { requireAuth } from '../middleware/auth.js';
import { io } from '../realtime/index.js';
import { spawn } from 'child_process';

const router = Router();

function saveBase64Image(imageBase64, prefix = 'verify') {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'verify');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const m = imageBase64?.match?.(/^data:image\/(\w+);base64,(.+)$/);
    const ext = m ? m[1] : 'jpg';
    const data = m ? m[2] : imageBase64;
    const buf = Buffer.from(data || '', 'base64');
    const fname = `${prefix}_${Date.now()}.${ext}`;
    const fullPath = path.join(uploadsDir, fname);
    fs.writeFileSync(fullPath, buf);
    return `/uploads/verify/${fname}`;
  } catch {
    return null;
  }
}

router.post('/verify', async (req, res) => {
  try {
    const { studentId, success, score, imageBase64, timestamp, kind } = req.body || {};
    if (!studentId || typeof success !== 'boolean' || typeof score !== 'number') {
      return res.status(400).json({ error: 'invalid_body' });
    }
    let screenshotPath = null;
    if (imageBase64) {
      screenshotPath = saveBase64Image(imageBase64, 'verify');
    }
    const log = await VerificationLog.create({
      studentId,
      success,
      score,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      screenshotPath: screenshotPath || undefined,
      kind: kind === 'liveness' ? 'liveness' : 'face'
    });
    if (io()) {
      io().to('admins').emit('verification', { studentId, success, score, screenshotPath: log.screenshotPath, timestamp: log.timestamp });
    }
    res.json({ ok: true, id: log._id });
  } catch (e) {
    res.status(500).json({ error: 'verify_failed' });
  }
});

router.get('/verify/status', requireAuth, async (req, res) => {
  try {
    const sid = req.user?.email || 'anonymous';
    const last = await VerificationLog.findOne({ studentId: sid, kind: 'face' }).sort({ timestamp: -1 }).lean();
    res.json({ ok: true, last });
  } catch (e) {
    res.status(500).json({ error: 'status_failed' });
  }
});

router.get('/verify/liveness-status', requireAuth, async (req, res) => {
  try {
    const sid = req.user?.email || 'anonymous';
    const last = await VerificationLog.findOne({ studentId: sid, kind: 'liveness' }).sort({ timestamp: -1 }).lean();
    res.json({ ok: true, last });
  } catch (e) {
    res.status(500).json({ error: 'status_failed' });
  }
});

router.post('/verify/liveness-start', requireAuth, async (req, res) => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.join(__dirname, '..', '..', '..');
    const scriptPath = path.join(projectRoot, 'ai-module', 'liveness_check.py');
    const port = process.env.PORT || 5000;
    const env = {
      ...process.env,
      BACKEND_URL: `http://localhost:${port}/api`,
      STUDENT_ID: req.user?.email || 'anonymous'
    };
    let cmd = process.platform === 'win32' ? 'python' : 'python3';
    let args = [scriptPath];
    const child = spawn(cmd, args, { env, stdio: 'ignore', detached: true, windowsHide: true });
    child.unref();
    res.status(202).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'liveness_start_failed' });
  }
});

export default router;
