import { useState } from 'react';
import { Flame, Target, BookCheck, Percent, Play, Trash2 } from 'lucide-react';
import type { View } from '../types';
import { useProgress } from '../hooks/useProgress';
import { VOCABULARY, wordById } from '../data/vocabulary';
import { dayIndex } from '../lib/dates';
import { LOCALES } from '../lib/speech';
import { Empty, Stat, WordCard } from '../components/ui';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

export default function Dashboard({ go }: { go: (v: View) => void }) {
  const { progress, stats, reset, setLocale, setRate, setDailyGoal } = useProgress();
  const [confirm, setConfirm] = useState(false);
  const tts = useSpeechSynthesis({ locale: progress.locale, rate: progress.speechRate });
  const wotd = VOCABULARY[dayIndex() % VOCABULARY.length];
  const recent = progress.recent.map(wordById).filter((w): w is NonNullable<typeof w> => !!w).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold">Hey there! Ready to level up your vocabulary?</h1>
        <p className="text-navy-500 mt-1">Talk to Voca, learn a word, then quiz yourself.</p>
        <button className="btn-primary mt-4" onClick={() => go('tutor')}><Play size={16} /> Start learning</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Flame size={14} />} label="Streak" value={`${stats.streak} day${stats.streak === 1 ? '' : 's'}`} />
        <Stat icon={<BookCheck size={14} />} label="Words learned" value={String(stats.learned)} hint={`${stats.mastered} mastered`} />
        <Stat icon={<Percent size={14} />} label="Quiz accuracy" value={stats.accuracy === null ? '—' : `${stats.accuracy}%`} hint={stats.accuracy === null ? 'Take a quiz' : `${stats.quizAnswered} answers`} />
        <Stat icon={<Target size={14} />} label="Daily goal" value={`${Math.min(stats.todayCount, progress.dailyGoal)}/${progress.dailyGoal}`} hint="learning actions today" />
      </div>
      <div className="h-2 rounded-full bg-cream-200 overflow-hidden" role="progressbar" aria-label="Daily goal progress" aria-valuenow={Math.round(stats.goalProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all" style={{ width: `${stats.goalProgress * 100}%` }} />
      </div>

      <section>
        <h2 className="font-bold text-lg mb-2">Word of the Day</h2>
        <WordCard word={wotd} onSpeak={tts.speak} compact />
        {tts.error && <p className="text-sm text-red-700 mt-2">{tts.error}</p>}
      </section>

      <section>
        <h2 className="font-bold text-lg mb-2">Recent progress</h2>
        {recent.length === 0 ? (
          <Empty title="Nothing yet" text="Words you study will show up here." action={<button className="btn-primary" onClick={() => go('learn')}>Browse words</button>} />
        ) : (
          <ul className="card divide-y divide-cream-200">
            {recent.map((w) => (
              <li key={w.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-semibold capitalize">{w.word}</span>
                <span className="text-xs text-navy-400">{progress.words[w.id]?.mastered ? 'Mastered' : progress.words[w.id]?.learned ? 'Learned' : 'Studied'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-bold text-lg mb-3">Settings</h2>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <label className="flex flex-col gap-1">Voice language
            <select className="rounded-lg border border-cream-200 p-2 bg-white" value={progress.locale} onChange={(e) => setLocale(e.target.value)}>
              {LOCALES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">Speech speed ({progress.speechRate.toFixed(2)}×)
            <input type="range" min={0.6} max={1.3} step={0.05} value={progress.speechRate} onChange={(e) => setRate(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">Daily goal (actions)
            <input type="number" min={1} max={20} className="rounded-lg border border-cream-200 p-2" value={progress.dailyGoal} onChange={(e) => setDailyGoal(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
        </div>
        <p className="text-xs text-navy-400 mt-3">Voice features depend on your browser, internet connection and microphone permission. Chrome and Edge work best.</p>
        <button className="btn-ghost mt-3 text-red-700" onClick={() => setConfirm(true)}><Trash2 size={16} /> Reset progress</button>
      </section>

      {confirm && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-navy-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <div className="card p-6 max-w-sm w-full">
            <h2 id="reset-title" className="font-bold text-lg">Reset all progress?</h2>
            <p className="text-sm text-navy-500 mt-1">This deletes your learned words, saved words, quiz history and streak. It can't be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" autoFocus onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={() => { reset(); setConfirm(false); }}>Yes, reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
