import { Router } from 'express';
import CheatingLog from '../models/CheatingLog.js';
import User from '../models/User.js';
import Violation from '../models/Violation.js';
import ExamSession from '../models/ExamSession.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import ExamConfig from '../models/ExamConfig.js';
import Question from '../models/Question.js';
import { predictFromCounts } from '../services/cheatModel.js';

const router = Router();

// Exam Config Routes
router.get('/exam-config', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const configs = await ExamConfig.find().populate('questions').sort({ createdAt: -1 }).lean();
    res.json(configs);
  } catch (e) {
    res.status(500).json({ error: 'fetch_exam_configs_failed' });
  }
});

router.post('/exam-config', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id, title, subject, durationSec, passingScore, totalQuestions, questions, active } = req.body;
    let config;
    if (id) {
      config = await ExamConfig.findByIdAndUpdate(id, { title, subject, durationSec, passingScore, totalQuestions, questions, active }, { new: true });
    } else {
      config = await ExamConfig.create({ title, subject, durationSec, passingScore, totalQuestions, questions, active });
    }
    res.json({ ok: true, config });
  } catch (e) {
    res.status(500).json({ error: 'save_exam_config_failed' });
  }
});

// Questions Routes
router.get('/questions', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 }).lean();
    res.json(questions);
  } catch (e) {
    res.status(500).json({ error: 'fetch_questions_failed' });
  }
});

router.post('/questions', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { questions, text, options, correctIndex } = req.body;
    
    // Handle bulk insert
    if (Array.isArray(questions)) {
      const created = await Question.insertMany(questions);
      return res.json({ ok: true, count: created.length });
    }
    
    // Handle single insert
    if (text && options && correctIndex !== undefined) {
      const created = await Question.create({ text, options, correctIndex, category: req.body.category, difficulty: req.body.difficulty });
      return res.json({ ok: true, question: created });
    }

    res.status(400).json({ error: 'invalid_request_body' });
  } catch (e) {
    res.status(500).json({ error: 'save_questions_failed' });
  }
});

router.delete('/questions/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'delete_question_failed' });
  }
});

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
    const [totalStudents, suspiciousActivities, activeExamIds, activeSessions, completedExams] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Violation.countDocuments(),
      ExamSession.distinct('examId', { status: 'active' }),
      ExamSession.countDocuments({ status: 'active' }),
      ExamSession.countDocuments({ status: 'completed' })
    ]);
    const activeExams = Array.isArray(activeExamIds) ? activeExamIds.length : 0;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Metrics debug:', { activeExams, activeSessions });
    }

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
                  { case: { $in: ['$type', ['gaze_left', 'gaze_right', 'gaze_up', 'gaze_down', 'head_movement', 'looking_away']] }, then: 2 },
                  { case: { $eq: ['$type', 'face_absent'] }, then: 5 },
                  { case: { $eq: ['$type', 'multiple_faces'] }, then: 10 },
                  { case: { $eq: ['$type', 'phone_detected'] }, then: 15 },
                  { case: { $in: ['$type', ['prohibited_book', 'prohibited_laptop']] }, then: 10 },
                  { case: { $in: ['$type', ['tab_switch', 'key_ctrl_tab', 'key_alt_tab', 'fullscreen_exit']] }, then: 3 },
                  { case: { $eq: ['$type', 'background_speech'] }, then: 5 }
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
      if (['gaze_left', 'gaze_right', 'gaze_up', 'gaze_down', 'looking_down', 'looking_away', 'head_movement'].includes(t)) featureMap[sid].gaze += c;
      if (t === 'face_absent') featureMap[sid].faceMissing += c;
      if (t === 'phone_detected' || t === 'prohibited_book' || t === 'prohibited_laptop') featureMap[sid].phone += c;
      if (['tab_switch', 'key_ctrl_tab', 'key_alt_tab', 'fullscreen_exit'].includes(t)) featureMap[sid].tabSwitch += c;
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
      activeSessions,
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
