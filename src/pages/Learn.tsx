import { useEffect, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { LEVELS, wordsByLevel } from '../data/vocabulary';
import { useProgress } from '../hooks/useProgress';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { Notice, WordCard } from '../components/ui';
import type { Level } from '../types';

export default function Learn() {
  const { progress, setLevel, studied } = useProgress();
  const tts = useSpeechSynthesis({ locale: progress.locale, rate: progress.speechRate });
  const list = wordsByLevel(progress.level);
  const [i, setI] = useState(0);
  const word = list[i % list.length];

  useEffect(() => { studied(word.id); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [word.id]);

  const pickLevel = (l: Level) => { tts.stop(); setLevel(l); setI(0); };
  const next = () => { tts.stop(); setI((n) => (n + 1) % list.length); };
  const random = () => { tts.stop(); setI(Math.floor(Math.random() * list.length)); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Learn</h1>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Difficulty">
        {LEVELS.map((l) => (
          <button key={l.id} role="tab" aria-selected={progress.level === l.id} onClick={() => pickLevel(l.id)}
            className={progress.level === l.id ? 'btn-primary' : 'btn-ghost'}>{l.label}</button>
        ))}
      </div>
      {!tts.supported && <Notice>Read-aloud isn't supported in this browser, but everything else works.</Notice>}
      {tts.error && <Notice tone="error">{tts.error}</Notice>}
      <WordCard word={word} onSpeak={tts.speak} />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-ghost" onClick={() => setI((n) => (n - 1 + list.length) % list.length)}>Previous</button>
        <button className="btn-primary" onClick={next}>Next word</button>
        <button className="btn-ghost" onClick={random}><Shuffle size={16} /> Random</button>
        {tts.speaking && <button className="btn-ghost" onClick={tts.stop}>Stop audio</button>}
        <span className="text-sm text-navy-400 ml-auto">{(i % list.length) + 1} / {list.length}</span>
      </div>
    </div>
  );
}
