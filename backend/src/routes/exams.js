import { Router } from 'express';
import ExamSession from '../models/ExamSession.js';
import Violation from '../models/Violation.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const EXAM_DATA = {
  durationSec: 600,
  questions: [
    {
      id: 'q1',
      text: 'Which library is used here for the backend framework?',
      options: ['Django', 'Express', 'Laravel', 'Spring Boot'],
      correctIndex: 1
    },
    {
      id: 'q2',
      text: 'Which database is configured for user storage?',
      options: ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite'],
      correctIndex: 2
    },
    {
      id: 'q3',
      text: 'Which language is used for the AI module?',
      options: ['Java', 'C#', 'Go', 'Python'],
      correctIndex: 3
    }
  ]
};

function hashToSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildVariant(studentId) {
  const seed = hashToSeed(String(studentId || 'anonymous'));
  const rng = mulberry32(seed);
  // Shuffle questions
  const questionsShuffled = shuffleWithRng(EXAM_DATA.questions, rng);
  // For each question, shuffle options and record mapping from presented index -> original index
  const optionOrderMap = {};
  const maskedQuestions = questionsShuffled.map((q) => {
    const idxs = [...q.options.keys()];
    const order = shuffleWithRng(idxs, rng);
    optionOrderMap[q.id] = order;
    const options = order.map((orig) => q.options[orig]);
    return { id: q.id, text: q.text, options };
  });
  return { durationSec: EXAM_DATA.durationSec, questions: maskedQuestions, optionOrderMap };
}

function getOptionOrderMap(studentId) {
  const v = buildVariant(studentId);
  return v.optionOrderMap;
}

router.post('/start', requireAuth, async (req, res) => {
  try {
    const { startedAt } = req.body;
    const sid = req.user?.email || 'anonymous';
    const session = await ExamSession.create({ studentId: sid, startedAt: startedAt ? new Date(startedAt) : new Date() });
    res.json({ ok: true, sessionId: session._id });
  } catch (e) {
    res.status(500).json({ error: 'start_failed' });
  }
});

router.get('/questions', requireAuth, async (req, res) => {
  try {
    const sid = req.user?.email || 'anonymous';
    const variant = buildVariant(sid);
    res.json({ durationSec: variant.durationSec, questions: variant.questions });
  } catch (e) {
    res.status(500).json({ error: 'questions_failed' });
  }
});

router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { answers } = req.body || {};
    const answerMap = answers || {};
    let score = 0;
    const sid = req.user?.email || 'anonymous';
    const optionOrderMap = getOptionOrderMap(sid);
    for (const q of EXAM_DATA.questions) {
      const presented = answerMap[q.id];
      if (Number.isInteger(presented)) {
        const order = optionOrderMap[q.id] || [];
        const origIndex = order[presented];
        if (Number.isInteger(origIndex) && origIndex === q.correctIndex) {
          score += 1;
        }
      }
    }
    const total = EXAM_DATA.questions.length;
    const active = await ExamSession.findOne({ studentId: sid, status: 'active' }).sort({ createdAt: -1 });
    if (active) {
      active.status = 'completed';
      active.endedAt = new Date();
      active.score = score;
      active.total = total;
      await active.save();
    }
    const cheat = await Violation.aggregate([
      { $match: { studentId: sid } },
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
    const cheatingScore = cheat?.[0]?.cheatingScore || 0;
    if (active) {
      active.cheatingScore = cheatingScore;
      await active.save();
    }
    res.json({ ok: true, score, total, cheatingScore });
  } catch (e) {
    res.status(500).json({ error: 'submit_failed' });
  }
});

export default router;
