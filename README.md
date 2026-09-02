## VoxNav

Voice-first navigation assistant that lets people control web apps entirely by speaking — no clicks, no typing. Built for the [AssemblyAI Voice Agent Hackathon](https://lablab.ai) on lablab.ai.

## Problem

Visually impaired and motor-disabled users often struggle with interfaces built around clicks and typing. Screen readers help with reading content, but true hands-free control is still missing.

## Solution

VoxNav lets a user speak a command — "what time is it," "open settings," "increase text size" — and the app transcribes it, matches it to an action, performs it, and speaks the result back out loud.

## How it works

1. AssemblyAI's real-time transcription captures the spoken command.
2. A lightweight intent-matching layer maps the transcript to an action.
3. The app performs the action and replies via text-to-speech.

## Tech stack

- **Frontend:** React
- **Backend:** Express (keeps the AssemblyAI API key server-side)
- **Speech-to-text:** AssemblyAI API
- **Text-to-speech:** Web Speech API (browser built-in)

## Status

- [x] Static frontend UI — mic button, transcript panel, response panel, command list, text-size control
- [ ] AssemblyAI integration (real transcription)
- [ ] Intent-matching logic
- [ ] Text-to-speech responses
- [ ] Deploy live

## Running locally

```bash
npm install
npm run dev
```

## Impact

Supports accessibility — a key but underused voice AI use case — and shows how AssemblyAI can power intelligent, actionable voice experiences, in line with the hackathon's theme: "Turn speech into intelligent action."
