import type { Progress, QuizQuestion, VocabWord } from '../types';
import { VOCABULARY } from '../data/vocabulary';

export const MIN_WORDS_FOR_QUIZ = 3;
export const QUIZ_LENGTH = 5;

export type Rng = () => number;

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Words the learner has actually met: opened, heard, saved or marked learned. */
export function quizPool(p: Progress): VocabWord[] {
  return VOCABULARY.filter((w) => {
    const s = p.words[w.id];
    return !!s && (s.timesSeen > 0 || s.learned || s.mastered || s.saved);
  });
}

function pickDistractors(target: VocabWord, count: number, rng: Rng): VocabWord[] {
  // Prefer the same part of speech and level so options are plausible, then fill from everything else.
  const others = VOCABULARY.filter((w) => w.id !== target.id);
  const close = shuffle(others.filter((w) => w.partOfSpeech === target.partOfSpeech), rng);
  const rest = shuffle(others.filter((w) => w.partOfSpeech !== target.partOfSpeech), rng);
  return [...close, ...rest].slice(0, count);
}

const mask = (sentence: string, word: string): string =>
  sentence.replace(new RegExp(`\\b${word}\\w*`, 'i'), '_____');

export function buildQuestion(target: VocabWord, kind: number, rng: Rng = Math.random): QuizQuestion {
  const distractors = pickDistractors(target, 3, rng);
  const type = kind % 3;

  let prompt: string;
  let correct: string;
  let wrong: string[];

  if (type === 0) {
    prompt = `Which word means: "${target.definition}"`;
    correct = target.word;
    wrong = distractors.map((d) => d.word);
  } else if (type === 1) {
    prompt = `What does "${target.word}" mean?`;
    correct = target.definition;
    wrong = distractors.map((d) => d.definition);
  } else {
    const blank = mask(target.example, target.word);
    // If the example doesn't contain the exact word form, fall back to a definition question.
    if (blank === target.example) return buildQuestion(target, 0, rng);
    prompt = `Fill in the blank: "${blank}"`;
    correct = target.word;
    wrong = distractors.map((d) => d.word);
  }

  const options = shuffle([correct, ...wrong], rng);
  return {
    id: `${target.id}-${type}`,
    wordId: target.id,
    prompt,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `"${target.word}" (${target.partOfSpeech}) means: ${target.definition} Example: ${target.example}`,
  };
}

export function buildQuiz(pool: VocabWord[], length: number = QUIZ_LENGTH, rng: Rng = Math.random): QuizQuestion[] {
  const chosen = shuffle(pool, rng).slice(0, Math.min(length, pool.length));
  return chosen.map((w, i) => buildQuestion(w, Math.floor(rng() * 3) + i, rng));
}

// ── Speaking practice ────────────────────────────────────────────────────────

const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z\s]/g, '').trim();

/** Levenshtein distance for short strings. */
export function editDistance(a: string, b: string): number {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export type SpeakVerdict = 'exact' | 'close' | 'miss';

/**
 * Approximate comparison of what the browser heard against the target word.
 * This measures recognition, not pronunciation quality.
 */
export function compareSpeech(heard: string, target: string): { verdict: SpeakVerdict; heard: string } {
  const h = normalize(heard);
  const t = normalize(target);
  if (!h) return { verdict: 'miss', heard: '' };
  const tokens = h.split(/\s+/);
  if (tokens.includes(t)) return { verdict: 'exact', heard: h };
  const best = Math.min(...tokens.map((tok) => editDistance(tok, t)));
  const tolerance = t.length <= 5 ? 1 : 2;
  return { verdict: best <= tolerance ? 'close' : 'miss', heard: h };
}
