import { Router } from 'express';
import CheatingLog from '../models/CheatingLog.js';
import User from '../models/User.js';
import Violation from '../models/Violation.js';
import ExamSession from '../models/ExamSession.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { predictFromCounts } from '../services/cheatModel.js';

const router = Router();

router.get('/logs', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const logs = await CheatingLog.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: 'fetch_failed' });
  }
});

router.get('/metrics', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const [totalStudents, activeExams, completedExams, suspiciousActivities] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      ExamSession.countDocuments({ status: 'active' }),
      ExamSession.countDocuments({ status: 'completed' }),
      Violation.countDocuments()
    ]);

    const users = await User.find({ role: 'student' }).select('name email').lean();
    const violAgg = await Violation.aggregate([{ $group: { _id: '$studentId', count: { $sum: 1 } } }]);
    const cheatAgg = await Violation.aggregate([
      {
        $group: {
          _id: '$studentId',
          cheatingScore: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $in: ['$type', ['gaze_left', 'gaze_right', 'head_movement', 'looking_away']] }, then: 2 },
                  { case: { $eq: ['$type', 'face_absent'] }, then: 5 },
                  { case: { $eq: ['$type', 'multiple_faces'] }, then: 10 },
                  { case: { $eq: ['$type', 'phone_detected'] }, then: 15 },
                  { case: { $eq: ['$type', 'tab_switch'] }, then: 3 }
                ],
                default: 0
              }
            }
          }
        }
      }
    ]);
    const latestStatusAgg = await ExamSession.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$studentId', status: { $first: '$status' } } }
    ]);
    const violMap = Object.fromEntries(violAgg.map(v => [v._id, v.count]));
    const byTypeAgg = await Violation.aggregate([
      { $group: { _id: { studentId: '$studentId', type: '$type' }, count: { $sum: 1 } } }
    ]);
    const featureMap = {};
    byTypeAgg.forEach(row => {
      const sid = row._id.studentId;
      const t = row._id.type;
      const c = row.count;
      if (!featureMap[sid]) featureMap[sid] = { gaze: 0, faceMissing: 0, phone: 0, tabSwitch: 0 };
      if (['gaze_left', 'gaze_right', 'looking_down', 'looking_away', 'head_movement'].includes(t)) featureMap[sid].gaze += c;
      if (t === 'face_absent') featureMap[sid].faceMissing += c;
      if (t === 'phone_detected') featureMap[sid].phone += c;
      if (['tab_switch', 'key_ctrl_tab', 'key_alt_tab'].includes(t)) featureMap[sid].tabSwitch += c;
    });
    const cheatMap = Object.fromEntries(cheatAgg.map(v => [v._id, v.cheatingScore]));
    const statusMap = Object.fromEntries(latestStatusAgg.map(s => [s._id, s.status]));
    const students = users.map(u => {
      const feats = featureMap[u.email] || { gaze: 0, faceMissing: 0, phone: 0, tabSwitch: 0 };
      const prob = predictFromCounts(feats);
      return {
        name: u.name,
        studentId: u.email,
        status: statusMap[u.email] || 'none',
        violations: violMap[u.email] || 0,
        cheatingScore: cheatMap[u.email] || 0,
        cheatingProbability: prob
      };
    });

    res.json({
      totalStudents,
      activeExams,
      completedExams,
      suspiciousActivities,
      students
    });
  } catch (e) {
    res.status(500).json({ error: 'metrics_failed' });
  }
});

router.get('/charts', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const cheatingByType = await Violation.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
    const active = await ExamSession.countDocuments({ status: 'active' });
    const completed = await ExamSession.countDocuments({ status: 'completed' });
    res.json({
      cheatingByType: cheatingByType.map(x => ({ type: x._id, count: x.count })),
      participation: [
        { status: 'active', count: active },
        { status: 'completed', count: completed }
      ]
    });
  } catch (e) {
    res.status(500).json({ error: 'charts_failed' });
  }
});

router.get('/predict', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'studentId_required' });
    const byType = await Violation.aggregate([
      { $match: { studentId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    const feats = { gaze: 0, faceMissing: 0, phone: 0, tabSwitch: 0 };
    byType.forEach(row => {
      const t = row._id, c = row.count;
      if (['gaze_left', 'gaze_right', 'looking_down', 'looking_away', 'head_movement'].includes(t)) feats.gaze += c;
      if (t === 'face_absent') feats.faceMissing += c;
      if (t === 'phone_detected') feats.phone += c;
      if (['tab_switch', 'key_ctrl_tab', 'key_alt_tab'].includes(t)) feats.tabSwitch += c;
    });
    const p = predictFromCounts(feats);
    res.json({ ok: true, probability: p, features: feats });
  } catch (e) {
    res.status(500).json({ error: 'predict_failed' });
  }
});

router.get('/violations', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
    const items = await Violation.find().sort({ timestamp: -1 }).limit(limit).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'violations_failed' });
  }
});

export default router;
