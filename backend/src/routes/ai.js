import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import axios from "axios";

const router = Router();

router.post("/generate-questions", requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { topic, content, count, difficulty, category } = req.body;
    
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is missing in backend/.env" });
    }

    const prompt = `Generate exactly ${count || 5} multiple choice questions about "${topic || 'General Knowledge'}". 
    ${content ? "Additional context: " + content : ""} 
    Difficulty: ${difficulty || 'Medium'}. 
    Category: ${category || 'General'}. 
    Return ONLY a raw JSON array, no markdown code blocks, no extra text, no explanation. 
    Each object in the array MUST follow this structure: 
    {"text":"question text?","options":["A","B","C","D"],"correctIndex":0,"category":"${category || 'General'}","difficulty":"${difficulty || 'Medium'}"}`;

    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 3000
    }, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.GROQ_API_KEY
      }
    });

    const data = response.data;
    const text = data.choices?.[0]?.message?.content || "";
    
    // Clean up response text in case AI adds markdown blocks
    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7, cleanText.length - 3).trim();
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3, cleanText.length - 3).trim();
    }

    const match = cleanText.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error("AI Response was not valid JSON:", text);
      return res.status(500).json({ error: "AI response format invalid" });
    }

    const questions = JSON.parse(match[0]);
    res.json({ ok: true, questions });
  } catch (e) {
    console.error("AI Generation Error:", e.response?.data || e.message);
    const errMsg = e.response?.data?.error?.message || e.message;
    res.status(500).json({ error: "AI generation failed: " + errMsg });
  }
});

export default router;