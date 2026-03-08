import mongoose from 'mongoose';

const examSessionSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    status: { type: String, enum: ['active', 'completed', 'aborted'], default: 'active' },
    score: { type: Number },
    total: { type: Number },
    cheatingScore: { type: Number }
  },
  { timestamps: true }
);

export default mongoose.model('ExamSession', examSessionSchema);
