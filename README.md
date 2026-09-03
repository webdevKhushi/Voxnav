# VoxNav

Voice-first navigation assistant that lets people control web apps entirely by speaking — no clicks, no typing, no sign-in. Built for the [AssemblyAI Voice Agent Hackathon](https://lablab.ai) on lablab.ai.

## Problem

Visually impaired and motor-disabled users often struggle with interfaces built around clicks and typing. Screen readers help with reading content, but true hands-free control is still missing — and most voice assistants assume clear, fluent speech, which excludes users with speech-motor conditions.

## Solution

VoxNav lets a user speak naturally — a fixed command like "increase text size," or literally any open-ended question — and responds instantly by voice. No login screen, since requiring visual interaction to sign in before using a voice tool would defeat the purpose.

## Key features

- **Adaptive confirmation** — uses AssemblyAI's confidence score to decide how to respond. Clear speech → acts immediately, no interruption. Unclear speech → asks "Did you mean...?" before acting, so it's fast for most people and safe for people whose speech is harder to recognize.
- **Hands-free wake word** — say "Hey VoxNav" to start a command with no tap at all. Runs entirely locally in the browser (Web Speech API) — no audio is sent anywhere until the wake phrase is detected.
- **Tap anywhere** — the whole screen is a mic toggle, not just a small button, for anyone who can't precisely locate a target on screen.
- **Open-ended answers** — anything outside the fixed command set is answered naturally by an LLM (Groq), not just a fixed phrase list.
- **User-controlled pace** — manual recordings have no fixed timer; the user decides when they're done speaking.
- **No sign-in** — everything works with zero account creation or login.

## How it works

1. AssemblyAI transcribes the spoken audio and returns a confidence score.
2. If confidence is high, the transcript goes straight to intent handling. If low, VoxNav confirms first.
3. An LLM (Groq) either classifies the command into a fixed action (time, settings, text size) or answers it freely if it's an open question.
4. The result is shown on screen and spoken aloud via the Web Speech API.

## Tech stack

- **Frontend:** React
- **Backend:** Express (keeps API keys server-side, never exposed to the browser)
- **Speech-to-text:** AssemblyAI API
- **Intent classification & open-ended answers:** Groq API (LLM)
- **Text-to-speech & wake-word detection:** Web Speech API (browser built-in, local, free)

## Status

- [x] Real mic recording (tap, tap-anywhere, or wake word)
- [x] AssemblyAI transcription with confidence scoring
- [x] Adaptive confirmation flow
- [x] Fixed actions (time, settings, text size)
- [x] Open-ended Q&A via LLM
- [x] Hands-free "Hey VoxNav" wake word (Chrome/Edge)
- [x] Accessibility-first UI (large text, high contrast, aria-labels, no login)
- [ ] Deploy live
- [ ] Real email/calendar integration (roadmap — would need voice-guided OAuth)
- [ ] Custom user-taught commands (roadmap)

## Known limitations

- "VoxNav" is an invented word, so wake-word detection is tuned to catch common mishearings (e.g. "hey box now") rather than the exact phrase.
- Wake-word mode requires Chrome or Edge; it isn't supported in Safari or Firefox.

## Running locally

**Frontend:**
```bash
npm install
npm run dev
```

**Backend** (in `/server`):
```bash
npm install
npm run dev
```
Requires a `.env` file with `ASSEMBLYAI_API_KEY` and `GROQ_API_KEY`.

## Impact

Supports accessibility — a key but underused voice AI use case — and shows how AssemblyAI can power intelligent, actionable voice experiences, in line with the hackathon's theme: "Turn speech into intelligent action."
