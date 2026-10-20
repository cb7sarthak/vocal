import { Bookmark, BookmarkCheck, CheckCircle2, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { VocabWord } from '../types';
import { useProgress } from '../hooks/useProgress';

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  const c = tone === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-brand-50 text-navy-700 border-brand-100';
  return <div role={tone === 'error' ? 'alert' : 'note'} className={`rounded-xl border px-4 py-3 text-sm ${c}`}>{children}</div>;
}

export function Stat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-navy-500 text-xs font-medium">{icon}{label}</div>
      <div className="font-display text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs text-navy-400 mt-0.5">{hint}</div>}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-navy-500 text-sm mt-1 mb-4">{text}</p>
      {action}
    </div>
  );
}

interface WordCardProps {
  word: VocabWord;
  onSpeak?: (text: string) => void;
  compact?: boolean;
}

/** Shows one word with learned / saved controls. */
export function WordCard({ word, onSpeak, compact }: WordCardProps) {
  const { progress, learned, saved } = useProgress();
  const s = progress.words[word.id];
  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-bold capitalize">{word.word}</h3>
            <span className="chip">{word.level}</span>
          </div>
          <p className="text-sm text-navy-500 mt-1">{word.partOfSpeech} · /{word.pronunciation}/</p>
        </div>
        <div className="flex gap-1">
          {onSpeak && (
            <button className="btn-ghost !p-2" aria-label={`Hear ${word.word}`} onClick={() => onSpeak(`${word.word}. ${word.definition} For example: ${word.example}`)}>
              <Volume2 size={18} />
            </button>
          )}
          <button className="btn-ghost !p-2" aria-label={s?.saved ? `Remove ${word.word} from saved` : `Save ${word.word}`} aria-pressed={!!s?.saved} onClick={() => saved(word.id, !s?.saved)}>
            {s?.saved ? <BookmarkCheck size={18} className="text-brand-600" /> : <Bookmark size={18} />}
          </button>
        </div>
      </div>
      <p className="mt-3">{word.definition}</p>
      <p className="mt-2 text-navy-700 italic">“{word.example}”</p>
      {!compact && (
        <>
          <p className="mt-3 text-sm text-navy-500"><b className="text-navy-700">In real life:</b> {word.usage}</p>
          <p className="mt-1 text-sm text-navy-500"><b className="text-navy-700">At work:</b> {word.workExample}</p>
          <p className="mt-1 text-sm text-navy-500"><b className="text-navy-700">Synonyms:</b> {word.synonyms.join(', ')}</p>
          <p className="mt-1 text-sm text-navy-500"><b className="text-navy-700">Try it:</b> {word.practice}</p>
        </>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={s?.learned ? 'btn-ghost' : 'btn-primary'} aria-pressed={!!s?.learned} onClick={() => learned(word.id, !s?.learned)}>
          <CheckCircle2 size={16} /> {s?.learned ? 'Learned ✓' : 'Mark as learned'}
        </button>
      </div>
    </article>
  );
}
