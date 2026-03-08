import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import examsRoutes from './routes/exams.js';
import adminRoutes from './routes/admin.js';
import monitorRoutes from './routes/monitor.js';
import violationsRoutes from './routes/violations.js';
import resultsRoutes from './routes/results.js';
import verifyRoutes from './routes/verify.js';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { init as initRealtime } from './realtime/index.js';
import User from './models/User.js';
import bcrypt from 'bcrypt';

dotenv.config();
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api', violationsRoutes);
app.use('/api', resultsRoutes);
app.use('/api', verifyRoutes);

connectDB()
  .then(() => {
    (async () => {
      try {
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        if (email && password) {
          const exists = await User.findOne({ email, role: 'admin' });
          if (!exists) {
            const passwordHash = await bcrypt.hash(password, 10);
            await User.create({ name: 'Administrator', email, passwordHash, role: 'admin' });
            console.log(`Admin user created: ${email}`);
          }
        }
      } catch {}
    })();
    const server = http.createServer(app);
    initRealtime(server);
    server.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('DB connection failed', err);
    process.exit(1);
  });
