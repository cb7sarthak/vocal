import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Level, View } from '../types';
import { VOCABULARY } from '../data/vocabulary';
import { useProgress } from '../hooks/useProgress';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { Empty, WordCard } from '../components/ui';

type Filter = 'all' | 'saved' | 'learned' | 'mastered';

export default function Vocabulary({ go }: { go: (v: View) => void }) {
  const { progress, mastered } = useProgress();
  const tts = useSpeechSynthesis({ locale: progress.locale, rate: progress.speechRate });
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [level, setLevel] = useState<Level | 'all'>('all');

  const rows = useMemo(() => VOCABULARY.filter((w) => {
    const s = progress.words[w.id];
    if (filter === 'saved' && !s?.saved) return false;
    if (filter === 'learned' && !s?.learned) return false;
    if (filter === 'mastered' && !s?.mastered) return false;
    if (level !== 'all' && w.level !== level) return false;
    const t = q.trim().toLowerCase();
    return !t || w.word.includes(t) || w.definition.toLowerCase().includes(t) || w.synonyms.some((x) => x.toLowerCase().includes(t));
  }), [progress.words, q, filter, level]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">My Vocabulary</h1>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search words, meanings or synonyms" aria-label="Search words"
          className="w-full rounded-xl border border-cream-200 bg-white py-2.5 pl-9 pr-3 text-sm" />
      </div>
      <div className="flex flex-wrap gap-2">
        {(['all', 'saved', 'learned', 'mastered'] as Filter[]).map((f) => (
          <button key={f} className={`${filter === f ? 'btn-primary' : 'btn-ghost'} capitalize !py-1.5`} onClick={() => setFilter(f)}>{f}</button>
        ))}
        <select aria-label="Difficulty" value={level} onChange={(e) => setLevel(e.target.value as Level | 'all')} className="rounded-xl border border-cream-200 bg-white px-3 text-sm">
          <option value="all">All levels</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <Empty title="No words here" text={filter === 'all' ? 'No words match your search.' : `You haven't ${filter === 'saved' ? 'saved' : 'marked'} any words yet.`} action={<button className="btn-primary" onClick={() => go('learn')}>Browse words</button>} />
      ) : (
        <div className="grid gap-3">
          {rows.map((w) => (
            <div key={w.id}>
              <WordCard word={w} onSpeak={tts.speak} compact />
              {progress.words[w.id]?.learned && (
                <button className="mt-1 text-xs font-semibold text-brand-600 underline" onClick={() => mastered(w.id, !progress.words[w.id]?.mastered)}>
                  {progress.words[w.id]?.mastered ? 'Remove mastered' : 'Mark as mastered'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
