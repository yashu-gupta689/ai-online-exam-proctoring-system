import mongoose from 'mongoose';

const violationSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    screenshotPath: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model('Violation', violationSchema);
