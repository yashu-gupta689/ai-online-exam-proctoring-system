import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import Violation from '../models/Violation.js';
import { fileURLToPath } from 'url';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { io } from '../realtime/index.js';

const router = Router();

function saveBase64Image(imageBase64, prefix = 'violation') {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'violations');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const m = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    const ext = m ? m[1] : 'jpg';
    const data = m ? m[2] : imageBase64;
    const buf = Buffer.from(data, 'base64');
    const fname = `${prefix}_${Date.now()}.${ext}`;
    const fullPath = path.join(uploadsDir, fname);
    fs.writeFileSync(fullPath, buf);
    const rel = `/uploads/violations/${fname}`;
    return rel;
  } catch (e) {
    return null;
  }
}

router.post('/violation', async (req, res) => {
  try {
    const { studentId, type, timestamp, screenshotPath, imageBase64 } = req.body || {};
    if (!studentId || !type) return res.status(400).json({ error: 'invalid_body' });
    let finalPath = screenshotPath || null;
    if (!finalPath && imageBase64) {
      finalPath = saveBase64Image(imageBase64, type);
    }
    const v = await Violation.create({
      studentId,
      type,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      screenshotPath: finalPath || undefined
    });
    if (io()) {
      io().to('admins').emit('violation', {
        studentId,
        type,
        timestamp: v.timestamp,
        screenshotPath: v.screenshotPath
      });
    }
    res.json({ ok: true, id: v._id, screenshotPath: v.screenshotPath });
  } catch (e) {
    res.status(500).json({ error: 'create_failed' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    let filter = {};
    if (!isAdmin) {
      filter.studentId = req.user?.email || 'anonymous';
    } else if (req.query?.studentId) {
      filter.studentId = req.query.studentId;
    }
    const list = await Violation.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'list_failed' });
  }
});

export default router;
