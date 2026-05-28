import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true },
  category: { type: String, default: 'General' },
  difficulty: { type: String, default: 'Medium' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Question', questionSchema);