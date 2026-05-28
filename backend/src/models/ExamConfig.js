import mongoose from 'mongoose';

const examConfigSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  durationSec: { type: Number, default: 600 },
  passingScore: { type: Number, default: 50 },
  totalQuestions: { type: Number, default: 10 },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('ExamConfig', examConfigSchema);