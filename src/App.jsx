import { useState, useRef, useEffect } from "react";
import "./App.css";

const SERVER_URL = "https://voxnav.onrender.com";
const CONFIDENCE_THRESHOLD = 0.85;
// "VoxNav" isn't a real word, so speech recognition transcribes it very
// inconsistently ("box now", "whats now", "vox nav", etc). Rather than chase
// every variant, just require "hey" followed shortly by a nav/now-like sound.
const WAKE_PATTERN = /hey\b[\s\S]{0,12}(nav|now|nah|gnaw)/i;

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const COMMANDS = [
  { phrase: "\"What time is it\"", result: "Speaks the current time" },
  { phrase: "\"Open settings\"", result: "Navigates to the settings screen" },
  { phrase: "\"Increase text size\"", result: "Makes on-screen text larger" },
  { phrase: "\"Ask me anything\"", result: "e.g. \"What's the capital of France\"" },
];

// Asks the backend to classify the transcript, or get a free-form answer.
async function getIntentOrAnswer(text) {
  const res = await fetch(`${SERVER_URL}/api/intent`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return res.json(); // { action: "get_time" } or { action: "answer", answer: "..." }
}

function actionToResponse(action) {
  switch (action) {
    case "get_time": {
      const now = new Date();
      return `It's ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}.`;
    }
    case "open_settings":
      return "Opening settings.";
    case "increase_text":
      return "__INCREASE_TEXT__";
    case "decrease_text":
      return "__DECREASE_TEXT__";
    default:
      return "Sorry, I didn't understand that command.";
  }
}

function speak(text) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

export default function App() {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [fontScale, setFontScale] = useState(1);
  const [error, setError] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [wakeWordSupported] = useState(!!SpeechRecognitionAPI);
  const [heardText, setHeardText] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const handleMicPressRef = useRef(null);
  const listeningRef = useRef(false);
  const processingRef = useRef(false);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  async function handleMicPress(autoStopMs) {
    if (processing) return;

    // Second tap while listening = stop recording now.
    if (listening && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      return;
    }

    setError("");
    setTranscript("");
    setResponse("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => handleRecordingStop(stream);

      recorder.start();
      setListening(true);

      // Manual taps stay open until tapped again. Wake-word activations
      // can't rely on a second tap (that's the whole point of hands-free),
      // so give those a fixed window to speak, then auto-stop.
      if (autoStopMs) {
        setTimeout(() => {
          if (recorder.state !== "inactive") recorder.stop();
        }, autoStopMs);
      }
    } catch (err) {
      console.error(err);
      setError("Microphone access was denied or is unavailable.");
    }
  }
  handleMicPressRef.current = handleMicPress;

  // Wake-word listening: runs locally in the browser via the Web Speech API.
  // No audio is sent anywhere until "hey voxnav" is actually heard.
  useEffect(() => {
    if (!wakeWordEnabled || !SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      if (listeningRef.current || processingRef.current) return; // ignore self-triggering while already recording
      const last = event.results[event.results.length - 1];
      const heard = last[0].transcript.toLowerCase();
      setHeardText(heard);
      console.log("Wake-word heard:", heard);
      if (WAKE_PATTERN.test(heard)) {
        setHeardText("");
        handleMicPressRef.current(5000);
      }
    };

    // Some browsers stop recognition after a period of silence — restart it
    // automatically so "always listening" actually stays always listening.
    recognition.onend = () => {
      if (wakeWordEnabled) {
        try {
          recognition.start();
        } catch {
          // already started — ignore
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Wake-word recognition error:", event.error);
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, [wakeWordEnabled]);

  async function runAction(text) {
    const { action, answer } = await getIntentOrAnswer(text);

    if (action === "answer") {
      setResponse(answer);
      speak(answer);
    } else {
      const reply = actionToResponse(action);
      if (reply === "__INCREASE_TEXT__") {
        setFontScale((s) => Math.min(1.6, s + 0.15));
        setResponse("Text size increased.");
        speak("Text size increased.");
      } else if (reply === "__DECREASE_TEXT__") {
        setFontScale((s) => Math.max(0.85, s - 0.15));
        setResponse("Text size decreased.");
        speak("Text size decreased.");
      } else {
        setResponse(reply);
        speak(reply);
      }
    }
  }

  async function handleRecordingStop(stream) {
    setListening(false);
    setProcessing(true);
    stream.getTracks().forEach((track) => track.stop());

    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const uploadRes = await fetch(`${SERVER_URL}/api/transcribe`, {
        method: "POST",
        body: formData,
      });
      const { id, error: uploadError } = await uploadRes.json();
      if (uploadError || !id) throw new Error(uploadError || "Upload failed");

      // Poll every 2 seconds until AssemblyAI finishes transcribing.
      const { text, confidence } = await pollForTranscript(id);
      setTranscript(text);

      // If we're currently waiting on a yes/no confirmation, handle that first.
      if (pendingConfirmation) {
        const said = text.toLowerCase().replace(/[^a-z\s]/g, "").trim();
        console.log("Confirmation reply heard:", JSON.stringify(said));
        const isYes = /\b(yes|yeah|yep|correct|right|sure)\b/.test(said);
        if (isYes) {
          const toRun = pendingConfirmation.text;
          setPendingConfirmation(null);
          await runAction(toRun);
        } else {
          setPendingConfirmation(null);
          setResponse("Okay, cancelled. Go ahead and try again.");
          speak("Okay, cancelled. Go ahead and try again.");
        }
        return;
      }

      if (confidence < CONFIDENCE_THRESHOLD) {
        // Speech was unclear — confirm before acting, so we never guess wrong.
        const confirmMsg = `Did you mean: "${text}"? Say yes or no.`;
        setResponse(confirmMsg);
        speak(confirmMsg);
        setPendingConfirmation({ text });
        return;
      }

      // Confidence was high — act immediately, no interruption.
      await runAction(text);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while transcribing. Check the server is running.");
    } finally {
      setProcessing(false);
    }
  }

  async function pollForTranscript(id) {
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${SERVER_URL}/api/transcribe/${id}`);
      const data = await res.json();
      if (data.status === "completed") {
        return { text: data.text, confidence: data.confidence ?? 1 };
      }
      if (data.status === "error") throw new Error(data.error);
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Transcription timed out");
  }

  return (
    <div
      className="app"
      style={{ fontSize: `${fontScale}rem` }}
      onClick={() => handleMicPress()}
    >
      <header className="hero">
        <p className="eyebrow">Voice-first navigation</p>
        <h1>VoxNav</h1>
        <p className="tagline">Turn speech into intelligent action</p>
      </header>

      <main className="mic-section">
        <button
          className={`mic-button ${listening ? "listening" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            handleMicPress();
          }}
          disabled={processing}
          aria-label={listening ? "Tap to stop and send" : "Tap to speak a command"}
        >
          <span className="mic-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
              <path
                d="M5 11a7 7 0 0 0 14 0M12 18v3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
        </button>
        <p className="mic-hint">
          {listening
            ? "Listening... tap anywhere when you're done"
            : processing
            ? "Transcribing..."
            : pendingConfirmation
            ? "Waiting for your yes or no"
            : "Tap anywhere and say a command"}
        </p>
        {error && <p className="error-text">{error}</p>}

        <div className="panel" aria-live="polite">
          <p className="panel-label">You said</p>
          <p className="panel-text">{transcript || "—"}</p>
        </div>

        <div className="panel panel-response" aria-live="polite">
          <p className="panel-label">VoxNav says</p>
          <p className="panel-text">{response || "—"}</p>
        </div>
      </main>

      <section className="wake-word" onClick={(e) => e.stopPropagation()}>
        {wakeWordSupported ? (
          <>
            <button
              className={`wake-toggle ${wakeWordEnabled ? "active" : ""}`}
              onClick={() => setWakeWordEnabled((v) => !v)}
              aria-pressed={wakeWordEnabled}
            >
              {wakeWordEnabled ? "Always listening — say \"Hey VoxNav\"" : "Enable always-listening mode"}
            </button>
            <p className="wake-note">
              Runs locally in your browser. No audio is sent anywhere until the wake phrase is heard.
              Works best in Chrome.
            </p>
            {wakeWordEnabled && (
              <p className="wake-note">Hearing: {heardText || "(nothing yet)"}</p>
            )}
          </>
        ) : (
          <p className="wake-note">
            Always-listening mode isn't supported in this browser. Try Chrome for that feature —
            tap-anywhere still works here.
          </p>
        )}
      </section>

      <section className="commands" onClick={(e) => e.stopPropagation()}>
        <h2>Try saying</h2>
        <ul>
          {COMMANDS.map((c) => (
            <li key={c.phrase}>
              <span className="phrase">{c.phrase}</span>
              <span className="result">{c.result}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="text-size" onClick={(e) => e.stopPropagation()}>
        <span>Text size</span>
        <button
          onClick={() => setFontScale((s) => Math.max(0.85, s - 0.15))}
          aria-label="Decrease text size"
        >
          A-
        </button>
        <button
          onClick={() => setFontScale((s) => Math.min(1.6, s + 0.15))}
          aria-label="Increase text size"
        >
          A+
        </button>
      </section>
    </div>
  );
}
