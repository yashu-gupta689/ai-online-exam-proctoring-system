import mongoose from 'mongoose';

const examSessionSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamConfig' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    status: { type: String, enum: ['active', 'completed', 'aborted'], default: 'active' },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    score: { type: Number },
    total: { type: Number },
    cheatingScore: { type: Number },
    grade: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model('ExamSession', examSessionSchema);
