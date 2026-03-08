import { Router } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, studentId, role: roleIn, adminSecret } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'invalid_body' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'email_in_use' });
    let finalRole = roleIn === 'admin' ? 'admin' : 'student';
    if (finalRole === 'admin') {
      if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ message: 'Invalid admin secret' });
      }
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: finalRole, studentId });
    const token = signToken(user);
    return res.json({ ok: true, token, role: finalRole });
  } catch (e) {
    return res.status(500).json({ error: 'signup_failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'invalid_body' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const token = signToken(user);
    return res.json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    return res.status(500).json({ error: 'login_failed' });
  }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'invalid_body' });
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const token = signToken(user);
    return res.json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    return res.status(500).json({ error: 'login_failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ ok: true, user: req.user });
});

export default router;
