import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
const BASE_URL = "https://api.assemblyai.com/v2";

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file received" });
    }

    const uploadRes = await fetch(`${BASE_URL}/upload`, {
      method: "POST",
      headers: {
        authorization: ASSEMBLYAI_KEY,
        "content-type": "application/octet-stream",
      },
      body: req.file.buffer,
    });

    const uploadData = await uploadRes.json();
    if (!uploadData.upload_url) {
      return res.status(500).json({ error: "Upload to AssemblyAI failed" });
    }

    const transcriptRes = await fetch(`${BASE_URL}/transcript`, {
      method: "POST",
      headers: {
        authorization: ASSEMBLYAI_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ audio_url: uploadData.upload_url }),
    });

    const transcriptData = await transcriptRes.json();
    res.json({ id: transcriptData.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Transcription request failed" });
  }
});

app.get("/api/transcribe/:id", async (req, res) => {
  try {
    const pollRes = await fetch(`${BASE_URL}/transcript/${req.params.id}`, {
      headers: { authorization: ASSEMBLYAI_KEY },
    });
    const data = await pollRes.json();
    // data.confidence is AssemblyAI's own 0-1 score for how sure it is
    // about the transcription as a whole.
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Polling failed" });
  }
});

const VALID_ACTIONS = ["get_time", "open_settings", "increase_text", "decrease_text"];

app.post("/api/intent", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: `You are VoxNav, a helpful voice assistant. If the user's command clearly matches one of these app actions: ${VALID_ACTIONS.join(", ")} — reply with ONLY the action name, nothing else. Otherwise, answer the user's question naturally and conversationally in one or two short sentences, since your reply will be spoken aloud.`,
          },
          { role: "user", content: text },
        ],
        temperature: 0.4,
      }),
    });

    const data = await groqRes.json();
    if (data.error) {
      console.error("Groq API error:", data.error);
      return res.status(500).json({ error: data.error.message || "Groq API error" });
    }

    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    const lower = raw.toLowerCase();

    if (VALID_ACTIONS.includes(lower)) {
      return res.json({ action: lower });
    }

    res.json({ action: "answer", answer: raw });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Intent classification failed" });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`VoxNav server running on http://localhost:${PORT}`);
});