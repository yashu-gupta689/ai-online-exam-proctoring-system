import { Router } from 'express';
import CheatingLog from '../models/CheatingLog.js';

const router = Router();

router.post('/event', async (req, res) => {
  try {
    const { studentId, eventType, details, timestamp } = req.body;
    const log = await CheatingLog.create({
      studentId: studentId || 'anonymous',
      eventType,
      details,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    res.json({ ok: true, id: log._id });
  } catch (e) {
    res.status(500).json({ error: 'log_failed' });
  }
});

router.post('/screenshot', async (req, res) => {
  try {
    const { studentId, eventType, details, imageBase64, timestamp } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });
    const log = await CheatingLog.create({
      studentId: studentId || 'anonymous',
      eventType: eventType || 'suspicious_activity',
      details,
      imageBase64,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    res.json({ ok: true, id: log._id });
  } catch (e) {
    res.status(500).json({ error: 'screenshot_failed' });
  }
});

export default router;
