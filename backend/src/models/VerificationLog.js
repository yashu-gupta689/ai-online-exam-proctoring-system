import mongoose from 'mongoose';

const verificationLogSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    success: { type: Boolean, required: true },
    score: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    screenshotPath: { type: String },
    kind: { type: String, enum: ['face', 'liveness'], default: 'face' }
  },
  { timestamps: true }
);

export default mongoose.model('VerificationLog', verificationLogSchema);
