import mongoose from 'mongoose';

const cheatingLogSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    eventType: { type: String, required: true },
    details: { type: String },
    timestamp: { type: Date, default: Date.now },
    imageBase64: { type: String } 
  },
  { timestamps: true }
);

export default mongoose.model('CheatingLog', cheatingLogSchema);
