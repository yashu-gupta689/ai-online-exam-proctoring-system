import { Router } from 'express';
import ExamSession from '../models/ExamSession.js';
import Violation from '../models/Violation.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';
import { predictFromCounts } from '../services/cheatModel.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

router.get('/results/me', requireAuth, async (req, res) => {
  try {
    const sid = req.user?.email || 'anonymous';
    const session = await ExamSession.findOne({ studentId: sid, status: 'completed' }).sort({ endedAt: -1 }).lean();
    if (!session) return res.json({ ok: true, session: null, violations: [], cheatingProbability: 0 });
    const vFilter = { studentId: sid };
    if (session.startedAt && session.endedAt) {
      vFilter.timestamp = { $gte: session.startedAt, $lte: session.endedAt };
    }
    const violations = await Violation.find(vFilter).sort({ timestamp: -1 }).limit(200).lean();
    const byType = await Violation.aggregate([
      { $match: vFilter },
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
    const cheatingProbability = predictFromCounts(feats);
    res.json({ ok: true, session, violations, cheatingProbability });
  } catch (e) {
    res.status(500).json({ error: 'results_failed' });
  }
});

router.get('/admin/report', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'studentId_required' });
    const session = await ExamSession.findOne({ studentId, status: 'completed' }).sort({ endedAt: -1 }).lean();
    const vFilter = { studentId };
    if (session?.startedAt && session?.endedAt) {
      vFilter.timestamp = { $gte: session.startedAt, $lte: session.endedAt };
    }
    const violations = await Violation.find(vFilter).sort({ timestamp: 1 }).limit(500).lean();
    const byType = await Violation.aggregate([
      { $match: vFilter },
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
    const cheatingProbability = predictFromCounts(feats);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="exam-report-${encodeURIComponent(studentId)}.pdf"`);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(18).text('Exam Report', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Student: ${studentId}`);
    if (session) {
      doc.text(`Session: ${new Date(session.startedAt).toLocaleString()} → ${new Date(session.endedAt).toLocaleString()}`);
      doc.text(`Score: ${session.score ?? '-'} / ${session.total ?? '-'}`);
      doc.text(`Cheating Score: ${session.cheatingScore ?? 0}`);
      doc.text(`Cheating Probability: ${(cheatingProbability * 100).toFixed(0)}%`);
      doc.text(`Status: ${session.status}`);
    } else {
      doc.text('No completed session found.');
    }
    doc.moveDown();
    doc.fontSize(14).text('Violations', { underline: true });
    doc.moveDown(0.5);
    if (violations.length === 0) {
      doc.fontSize(12).text('No violations recorded.');
    } else {
      violations.forEach((v) => {
        doc.fontSize(12).text(`[${new Date(v.timestamp).toLocaleString()}] ${v.type} ${v.screenshotPath ? '- ' + v.screenshotPath : ''}`);
      });
    }
    doc.moveDown();
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const uploadsBase = path.join(__dirname, '..', '..');
    const shots = violations.filter(v => v.screenshotPath).slice(0, 12);
    if (shots.length > 0) {
      doc.addPage();
      doc.fontSize(14).text('Screenshots', { underline: true });
      doc.moveDown(0.5);
      const imgW = 220;
      const imgH = 150;
      const gapX = 20;
      const gapY = 20;
      let x = doc.x;
      let y = doc.y;
      let col = 0;
      shots.forEach((v, idx) => {
        try {
          const rel = (v.screenshotPath || '').replace(/^\/+/, '');
          const full = path.join(uploadsBase, rel);
          if (fs.existsSync(full)) {
            if (y + imgH > doc.page.height - doc.page.margins.bottom) {
              doc.addPage();
              x = doc.page.margins.left;
              y = doc.page.margins.top;
              col = 0;
            }
            doc.image(full, x, y, { width: imgW, height: imgH });
            doc.fontSize(10).text(`${new Date(v.timestamp).toLocaleString()} · ${v.type}`, x, y + imgH + 2, { width: imgW });
            col += 1;
            if (col >= 2) {
              col = 0;
              x = doc.page.margins.left;
              y += imgH + 40 + gapY;
            } else {
              x += imgW + gapX;
            }
          }
        } catch {}
      });
    }
    doc.end();
  } catch (e) {
    res.status(500).json({ error: 'report_failed' });
  }
});

export default router;
