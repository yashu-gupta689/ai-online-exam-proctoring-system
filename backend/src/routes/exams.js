import { Router } from 'express';
import ExamConfig from '../models/ExamConfig.js';
import Question from '../models/Question.js';
import ExamSession from '../models/ExamSession.js';
import Violation from '../models/Violation.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Helper: mulberry32 PRNG
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Helper: simple hash for seed
function hashToSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Helper: shuffle
function shuffleWithRng(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 1. GET /api/exams/list - return all active exams
router.get('/list', async (req, res) => {
  try {
    const exams = await ExamConfig.find({ active: true }).populate('questions');
    res.json(exams); // Return array directly
  } catch (e) {
    console.error('Error fetching exams list:', e);
    res.status(500).json({ error: 'list_failed', message: e.message });
  }
});

// 2. GET /api/exams/questions - return shuffled questions + duration
router.get('/questions', requireAuth, async (req, res) => {
  try {
    const { examId } = req.query;
    if (!examId) return res.status(400).json({ error: 'examId_required' });

    const exam = await ExamConfig.findById(examId).populate('questions');
    if (!exam) return res.status(404).json({ error: 'exam_not_found' });

    let finalQuestions = exam.questions || [];
    
    // If no specific questions linked, pick random questions from the database
    if (finalQuestions.length === 0) {
      const limit = exam.totalQuestions || 10;
      finalQuestions = await Question.find({ active: true }).limit(limit);
    }

    const sid = req.user?.email || 'anonymous';
    const seed = hashToSeed(sid + examId);
    const rng = mulberry32(seed);

    // Shuffle questions
    const shuffled = shuffleWithRng(finalQuestions, rng);
    
    // For proctoring safety, we hide correctIndex in the response
    const questions = shuffled.map(q => ({
      id: q._id.toString(), // Ensure string
      text: q.text,
      options: q.options
    }));

    res.json({ ok: true, durationSec: exam.durationSec, questions });
  } catch (e) {
    res.status(500).json({ error: 'questions_failed' });
  }
});

// 3. POST /api/exams/start - create ExamSession in DB
router.post('/start', requireAuth, async (req, res) => {
  try {
    const { examId, startedAt, questions } = req.body;
    if (!examId) return res.status(400).json({ error: 'examId_required' });

    const sid = req.user?.email || 'anonymous';
    const session = await ExamSession.create({
      studentId: sid,
      examId,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      status: 'active',
      questions: Array.isArray(questions) ? questions : []
    });

    res.json({ ok: true, sessionId: session._id });
  } catch (e) {
    res.status(500).json({ error: 'start_failed' });
  }
});

// 4. POST /api/exams/submit - calculate score, save result, return metrics
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { examId, answers } = req.body;
    const sid = req.user?.email || 'anonymous';
    const answerMap = answers || {};

    // 1. Find the active session first to get the specific questions served
    const session = await ExamSession.findOne({ studentId: sid, examId, status: 'active' })
      .sort({ createdAt: -1 })
      .populate('questions');
    
    if (!session) return res.status(404).json({ error: 'session_not_found' });

    const exam = await ExamConfig.findById(examId).populate('questions');
    if (!exam) return res.status(404).json({ error: 'exam_not_found' });

    // 2. Decide which questions to score against
    // Use session questions if available, otherwise exam.questions
    let finalQuestions = (session.questions && session.questions.length > 0) 
      ? session.questions 
      : exam.questions;

    // 3. Last fallback: if both are empty, re-fetch random questions (least reliable but prevents NaN)
    if (finalQuestions.length === 0) {
      const limit = exam.totalQuestions || 10;
      finalQuestions = await Question.find({ active: true }).limit(limit);
    }

    let score = 0;
    const total = finalQuestions.length;

    if (total === 0) {
      console.error('Submission error: No questions found for scoring. examId:', examId);
      return res.status(500).json({ error: 'no_questions_for_scoring' });
    }

    finalQuestions.forEach(q => {
      const studentAns = answerMap[q._id.toString()] !== undefined ? answerMap[q._id.toString()] : answerMap[q._id];
      if (studentAns === q.correctIndex) {
        score++;
      }
    });

    // 4. Calculate cheating score from violations during the session
    const violations = await Violation.find({ 
      studentId: sid, 
      timestamp: { $gte: session.startedAt } 
    });
    let cheatingScore = 0;
    violations.forEach(v => {
      switch (v.type) {
        case 'face_absent': cheatingScore += 5; break;
        case 'multiple_faces': cheatingScore += 10; break;
        case 'phone_detected': cheatingScore += 15; break;
        case 'prohibited_book':
        case 'prohibited_laptop': cheatingScore += 10; break;
        case 'tab_switch':
        case 'key_ctrl_tab':
        case 'key_alt_tab':
        case 'fullscreen_exit': cheatingScore += 3; break;
        case 'gaze_left':
        case 'gaze_right':
        case 'gaze_up':
        case 'gaze_down': cheatingScore += 2; break;
        case 'background_speech': cheatingScore += 5; break;
        default: cheatingScore += 1;
      }
    });

    // Determine grade
    const percent = (score / total) * 100;
    let grade = 'F';
    if (percent >= 90) grade = 'A';
    else if (percent >= 80) grade = 'B';
    else if (percent >= 70) grade = 'C';
    else if (percent >= 60) grade = 'D';

    // Update session
    session.status = 'completed';
    session.endedAt = new Date();
    session.score = score;
    session.total = total;
    session.cheatingScore = cheatingScore;
    session.grade = grade;
    await session.save();

    res.json({
      ok: true,
      score,
      total,
      grade,
      cheatingScore,
      passed: percent >= exam.passingScore
    });
  } catch (e) {
    res.status(500).json({ error: 'submit_failed' });
  }
});

export default router;
