import type { Level, Progress, WordState } from '../types';
import { computeStreak, dateKey } from './dates';

export const STORAGE_KEY = 'voca.progress.v1';

export function emptyProgress(): Progress {
  return {
    version: 1,
    words: {},
    quizAttempts: 0,
    quizQuestionsAnswered: 0,
    quizQuestionsCorrect: 0,
    speakingAttempts: 0,
    speakingMatches: 0,
    activity: {},
    recent: [],
    level: 'beginner',
    dailyGoal: 5,
    locale: 'en-IN',
    speechRate: 0.95,
  };
}

const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Validates untrusted JSON from localStorage and falls back to defaults field-by-field. */
export function sanitize(input: unknown): Progress {
  const base = emptyProgress();
  if (!input || typeof input !== 'object') return base;
  const p = input as Partial<Progress>;
  const words: Record<string, WordState> = {};
  if (p.words && typeof p.words === 'object') {
    for (const [id, s] of Object.entries(p.words)) {
      if (!s || typeof s !== 'object') continue;
      words[id] = {
        learned: !!s.learned,
        mastered: !!s.mastered,
        saved: !!s.saved,
        lastStudied: typeof s.lastStudied === 'string' ? s.lastStudied : '',
        timesSeen: num(s.timesSeen, 0),
      };
    }
  }
  const levels: Level[] = ['beginner', 'intermediate', 'advanced'];
  const activity: Record<string, number> = {};
  if (p.activity && typeof p.activity === 'object') {
    for (const [k, v] of Object.entries(p.activity)) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) activity[k] = num(v, 0);
  }
  return {
    version: 1,
    words,
    quizAttempts: num(p.quizAttempts, 0),
    quizQuestionsAnswered: num(p.quizQuestionsAnswered, 0),
    quizQuestionsCorrect: num(p.quizQuestionsCorrect, 0),
    speakingAttempts: num(p.speakingAttempts, 0),
    speakingMatches: num(p.speakingMatches, 0),
    activity,
    recent: Array.isArray(p.recent) ? p.recent.filter((x): x is string => typeof x === 'string').slice(0, 20) : [],
    level: levels.includes(p.level as Level) ? (p.level as Level) : base.level,
    dailyGoal: Math.min(20, Math.max(1, num(p.dailyGoal, base.dailyGoal))),
    locale: p.locale === 'en-US' || p.locale === 'en-GB' || p.locale === 'en-IN' ? p.locale : base.locale,
    speechRate: Math.min(1.3, Math.max(0.6, num(p.speechRate, base.speechRate))),
  };
}

export function loadProgress(): { progress: Progress; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { progress: emptyProgress(), error: null };
    return { progress: sanitize(JSON.parse(raw)), error: null };
  } catch {
    return {
      progress: emptyProgress(),
      error: 'Your saved progress could not be read, so Voca started fresh. Browser storage may be blocked or corrupted.',
    };
  }
}

export function saveProgress(p: Progress): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    return null;
  } catch {
    return 'Progress could not be saved. Storage may be full, or private browsing may be blocking it.';
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const blankWord = (): WordState => ({ learned: false, mastered: false, saved: false, lastStudied: '', timesSeen: 0 });

function touchActivity(p: Progress, now: Date): Record<string, number> {
  const k = dateKey(now);
  return { ...p.activity, [k]: (p.activity[k] ?? 0) + 1 };
}

// ── Pure state transitions (easy to unit-test) ───────────────────────────────

/** Records that the learner studied a word (opened it, heard it explained). */
export function markStudied(p: Progress, id: string, now: Date = new Date()): Progress {
  const prev = p.words[id] ?? blankWord();
  return {
    ...p,
    words: { ...p.words, [id]: { ...prev, timesSeen: prev.timesSeen + 1, lastStudied: now.toISOString() } },
    recent: [id, ...p.recent.filter((r) => r !== id)].slice(0, 20),
    activity: touchActivity(p, now),
  };
}

export function setLearned(p: Progress, id: string, learned: boolean, now: Date = new Date()): Progress {
  const prev = p.words[id] ?? blankWord();
  const next: WordState = { ...prev, learned, mastered: learned ? prev.mastered : false, lastStudied: now.toISOString() };
  return {
    ...p,
    words: { ...p.words, [id]: next },
    recent: [id, ...p.recent.filter((r) => r !== id)].slice(0, 20),
    activity: learned ? touchActivity(p, now) : p.activity,
  };
}

export function setMastered(p: Progress, id: string, mastered: boolean, now: Date = new Date()): Progress {
  const prev = p.words[id] ?? blankWord();
  return {
    ...p,
    words: { ...p.words, [id]: { ...prev, mastered, learned: mastered ? true : prev.learned, lastStudied: now.toISOString() } },
    activity: mastered ? touchActivity(p, now) : p.activity,
  };
}

export function setSaved(p: Progress, id: string, saved: boolean): Progress {
  const prev = p.words[id] ?? blankWord();
  return { ...p, words: { ...p.words, [id]: { ...prev, saved } } };
}

export function recordQuizAnswer(p: Progress, wordId: string, correct: boolean, now: Date = new Date()): Progress {
  const prev = p.words[wordId] ?? blankWord();
  return {
    ...p,
    quizQuestionsAnswered: p.quizQuestionsAnswered + 1,
    quizQuestionsCorrect: p.quizQuestionsCorrect + (correct ? 1 : 0),
    words: { ...p.words, [wordId]: { ...prev, lastStudied: now.toISOString() } },
    activity: touchActivity(p, now),
  };
}

export function recordQuizAttempt(p: Progress): Progress {
  return { ...p, quizAttempts: p.quizAttempts + 1 };
}

export function recordSpeaking(p: Progress, matched: boolean, now: Date = new Date()): Progress {
  return {
    ...p,
    speakingAttempts: p.speakingAttempts + 1,
    speakingMatches: p.speakingMatches + (matched ? 1 : 0),
    activity: touchActivity(p, now),
  };
}

// ── Derived metrics ──────────────────────────────────────────────────────────

export interface Stats {
  learned: number;
  mastered: number;
  saved: number;
  studied: number;
  quizAttempts: number;
  quizAnswered: number;
  /** Null until at least one question has been answered — never show a fake percentage. */
  accuracy: number | null;
  streak: number;
  todayCount: number;
  goalProgress: number;
}

export function computeStats(p: Progress, now: Date = new Date()): Stats {
  const states = Object.values(p.words);
  const todayCount = p.activity[dateKey(now)] ?? 0;
  return {
    learned: states.filter((s) => s.learned).length,
    mastered: states.filter((s) => s.mastered).length,
    saved: states.filter((s) => s.saved).length,
    studied: states.filter((s) => s.timesSeen > 0 || s.learned).length,
    quizAttempts: p.quizAttempts,
    quizAnswered: p.quizQuestionsAnswered,
    accuracy: p.quizQuestionsAnswered ? Math.round((p.quizQuestionsCorrect / p.quizQuestionsAnswered) * 100) : null,
    streak: computeStreak(p.activity, now),
    todayCount,
    goalProgress: Math.min(1, todayCount / p.dailyGoal),
  };
}
