import { useState } from "react";
import "./App.css";

const COMMANDS = [
  { phrase: "\"What time is it\"", result: "Speaks the current time" },
  { phrase: "\"Read me the news\"", result: "Reads out today's top headline" },
  { phrase: "\"Open settings\"", result: "Navigates to the settings screen" },
  { phrase: "\"Increase text size\"", result: "Makes on-screen text larger" },
];

export default function App() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [fontScale, setFontScale] = useState(1);

  // Static demo only — no API calls yet. This is wired up in the next step.
  function handleMicPress() {
    setListening(true);
    setTranscript("Listening...");
    setResponse("");

    setTimeout(() => {
      setListening(false);
      setTranscript("What time is it");
      setResponse("It's 3:42 in the afternoon.");
    }, 1600);
  }

  return (
    <div className="app" style={{ fontSize: `${fontScale}rem` }}>
      <header className="hero">
        <p className="eyebrow">Voice-first navigation</p>
        <h1>VoxNav</h1>
        <p className="tagline">Turn speech into intelligent action</p>
      </header>

      <main className="mic-section">
        <button
          className={`mic-button ${listening ? "listening" : ""}`}
          onClick={handleMicPress}
          aria-label={listening ? "Listening" : "Tap to speak a command"}
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
          {listening ? "Listening..." : "Tap the mic and say a command"}
        </p>

        <div className="panel" aria-live="polite">
          <p className="panel-label">You said</p>
          <p className="panel-text">{transcript || "—"}</p>
        </div>

        <div className="panel panel-response" aria-live="polite">
          <p className="panel-label">VoxNav says</p>
          <p className="panel-text">{response || "—"}</p>
        </div>
      </main>

      <section className="commands">
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

      <section className="text-size">
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
