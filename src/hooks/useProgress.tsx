import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Level, Progress } from '../types';
import {
  clearProgress,
  computeStats,
  emptyProgress,
  loadProgress,
  markStudied,
  recordQuizAnswer,
  recordQuizAttempt,
  recordSpeaking,
  saveProgress,
  setLearned,
  setMastered,
  setSaved,
  type Stats,
} from '../lib/progress';

interface ProgressApi {
  progress: Progress;
  stats: Stats;
  storageError: string | null;
  studied: (id: string) => void;
  learned: (id: string, value: boolean) => void;
  mastered: (id: string, value: boolean) => void;
  saved: (id: string, value: boolean) => void;
  quizAnswer: (id: string, correct: boolean) => void;
  quizAttempt: () => void;
  speaking: (matched: boolean) => void;
  setLevel: (level: Level) => void;
  setLocale: (locale: string) => void;
  setRate: (rate: number) => void;
  setDailyGoal: (n: number) => void;
  reset: () => void;
}

const Ctx = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadProgress());
  const [progress, setProgress] = useState<Progress>(initial.current.progress);
  const [storageError, setStorageError] = useState<string | null>(initial.current.error);
  const skipFirstSave = useRef(true);

  useEffect(() => {
    // Don't overwrite stored data with defaults before the first real change.
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    setStorageError(saveProgress(progress));
  }, [progress]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('voca.')) setProgress(loadProgress().progress);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((fn: (p: Progress) => Progress) => setProgress((p) => fn(p)), []);

  const api = useMemo<ProgressApi>(
    () => ({
      progress,
      stats: computeStats(progress),
      storageError,
      studied: (id) => update((p) => markStudied(p, id)),
      learned: (id, v) => update((p) => setLearned(p, id, v)),
      mastered: (id, v) => update((p) => setMastered(p, id, v)),
      saved: (id, v) => update((p) => setSaved(p, id, v)),
      quizAnswer: (id, c) => update((p) => recordQuizAnswer(p, id, c)),
      quizAttempt: () => update(recordQuizAttempt),
      speaking: (m) => update((p) => recordSpeaking(p, m)),
      setLevel: (level) => update((p) => ({ ...p, level })),
      setLocale: (locale) => update((p) => ({ ...p, locale })),
      setRate: (speechRate) => update((p) => ({ ...p, speechRate })),
      setDailyGoal: (dailyGoal) => update((p) => ({ ...p, dailyGoal })),
      reset: () => {
        clearProgress();
        setProgress(emptyProgress());
        setStorageError(null);
        skipFirstSave.current = true;
      },
    }),
    [progress, storageError, update],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
