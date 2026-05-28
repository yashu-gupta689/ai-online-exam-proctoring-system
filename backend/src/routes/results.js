import { Router } from 'express';
import ExamSession from '../models/ExamSession.js';
import ExamConfig from '../models/ExamConfig.js';
import Violation from '../models/Violation.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/results - get all results for admin or current student results
router.get('/', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const query = isAdmin ? {} : { studentId: req.user.email };
    
    const results = await ExamSession.find(query)
      .populate('examId', 'title subject passingScore')
      .sort({ createdAt: -1 });
      
    res.json(results); // Return array directly
  } catch (e) {
    res.status(500).json({ error: 'fetch_results_failed' });
  }
});

// GET /api/results/stats - get summary stats for student
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const sid = req.user.email;
    const results = await ExamSession.find({ studentId: sid, status: 'completed' });
    
    const totalExams = results.length;
    const avgScore = totalExams > 0 
      ? (results.reduce((acc, curr) => acc + (curr.score / curr.total), 0) / totalExams) * 100 
      : 0;
    
    // Simple logic for best grade: A > B > C > D > F
    const gradeValues = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
    let bestGrade = 'N/A';
    if (totalExams > 0) {
      const sortedGrades = results
        .map(r => r.grade)
        .filter(Boolean)
        .sort((a, b) => gradeValues[b] - gradeValues[a]);
      bestGrade = sortedGrades[0] || 'N/A';
    }

    // Total violations across all exams
    const totalViolations = results.reduce((acc, curr) => acc + (curr.cheatingScore || 0), 0);

    res.json({
      ok: true,
      stats: {
        totalExams,
        avgScore: Math.round(avgScore),
        bestGrade,
        totalViolations,
        name: req.user.name || sid.split('@')[0],
        email: sid
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'fetch_stats_failed' });
  }
});

export default router;
