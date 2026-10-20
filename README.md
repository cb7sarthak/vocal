# Voca — Your Personal Voice Vocabulary Coach

A simple voice-first vocabulary tutor. Built with React + Vite + TypeScript + Tailwind, using the browser's Web Speech API. No backend, no API keys, no paid services.

## Features
- **Voice Tutor** – talk or type; Voca explains a word, gives examples, synonyms, work usage, and quizzes you. Replies are read aloud (stop button included).
- **Learn** – 36 words across Beginner / Intermediate / Advanced, with next / previous / random.
- **Quiz** – 5-question multiple choice from words you've studied, with explanations and a results screen. Plus **speaking practice** (approximate, see below).
- **My Vocabulary** – search, filter by saved / learned / mastered / level.
- **Dashboard** – streak, words learned, quiz accuracy, daily goal, Word of the Day, recent words. Starts empty; nothing is faked.
- Progress is saved in `localStorage`. Reset (with confirmation) is on the Dashboard.

## Honest limitations
- The tutor is **rule-based, not an AI model**. It matches commands ("next word", "repeat that", "give me an example", "start a quiz", …) and answers from the built-in word list. `src/lib/agent.ts` exposes a `TutorAgent` interface so an LLM can be plugged in later.
- Speech recognition works in **Chrome / Edge / Safari** (Firefox has no support). It usually needs internet and mic permission. If unsupported, the text box works.
- Speaking practice compares what the browser *heard* with the target word. It's an approximate aid, **not** a pronunciation score.
- Microphone access requires **HTTPS** (or localhost). Vercel/Netlify provide HTTPS automatically.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # logic tests (intents, quiz, progress, streak)
npm run build      # production build -> dist/
```

## Project structure
```
src/
  components/ui.tsx   shared UI (WordCard, Stat, Notice, Empty)
  pages/              Dashboard, Learn, Tutor, Quiz, Vocabulary
  data/vocabulary.ts  36-word dataset
  hooks/              useSpeechRecognition, useSpeechSynthesis, useProgress
  lib/                agent (intents), quiz, progress, speech, dates
  types/              shared TypeScript types
```

## Push to GitHub
```bash
git init
git add .
git commit -m "Voca: voice vocabulary coach"
git branch -M main
git remote add origin https://github.com/<your-username>/voca.git
git push -u origin main
```

## Deploy (free, HTTPS)
**Vercel:** vercel.com → *Add New → Project* → import the GitHub repo → Deploy (settings are auto-detected from `vercel.json`).
**Netlify:** app.netlify.com → *Add new site → Import from Git* → pick the repo → Deploy (uses `netlify.toml`).

Or from the CLI: `npx vercel --prod` / `npx netlify deploy --prod --dir=dist`.
