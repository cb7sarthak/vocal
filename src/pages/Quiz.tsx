import { useMemo, useState } from 'react';
import { CheckCircle2, Mic, RotateCcw, XCircle } from 'lucide-react';
import type { QuizQuestion, View } from '../types';
import { useProgress } from '../hooks/useProgress';
import { MIN_WORDS_FOR_QUIZ, buildQuiz, compareSpeech, quizPool } from '../lib/quiz';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { Empty, Notice } from '../components/ui';
import { wordById } from '../data/vocabulary';

export default function Quiz({ go }: { go: (v: View) => void }) {
  const [mode, setMode] = useState<'quiz' | 'speak'>('quiz');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Quiz</h1>
      <div className="flex gap-2">
        <button className={mode === 'quiz' ? 'btn-primary' : 'btn-ghost'} onClick={() => setMode('quiz')}>Multiple choice</button>
        <button className={mode === 'speak' ? 'btn-primary' : 'btn-ghost'} onClick={() => setMode('speak')}>Speaking practice</button>
      </div>
      {mode === 'quiz' ? <MultipleChoice go={go} /> : <Speaking go={go} />}
    </div>
  );
}

function MultipleChoice({ go }: { go: (v: View) => void }) {
  const p = useProgress();
  const pool = useMemo(() => quizPool(p.progress), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [qs, setQs] = useState<QuizQuestion[]>(() => (pool.length >= MIN_WORDS_FOR_QUIZ ? buildQuiz(pool) : []));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (pool.length < MIN_WORDS_FOR_QUIZ) {
    return <Empty title="Learn a few words first" text={`The quiz uses words you've studied. You've met ${pool.length} so far — study at least ${MIN_WORDS_FOR_QUIZ}.`} action={<button className="btn-primary" onClick={() => go('learn')}>Go to Learn</button>} />;
  }

  const retry = () => {
    const fresh = quizPool(p.progress);
    setQs(buildQuiz(fresh)); setI(0); setPicked(null); setScore(0); setDone(false);
  };

  if (done) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-bold">Quiz complete</h2>
        <p className="font-display text-5xl font-extrabold text-brand-600 my-3">{score}/{qs.length}</p>
        <p className="text-navy-500">{score === qs.length ? 'Perfect score!' : score >= qs.length / 2 ? 'Nice work — keep going.' : 'Good effort. Review the words and try again.'}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button className="btn-primary" onClick={retry}><RotateCcw size={16} /> Retry</button>
          <button className="btn-ghost" onClick={() => go('dashboard')}>Dashboard</button>
        </div>
      </div>
    );
  }

  const q = qs[i];
  const answer = (idx: number) => {
    if (picked !== null) return;
    const correct = idx === q.correctIndex;
    setPicked(idx);
    if (correct) setScore((s) => s + 1);
    if (i === 0) p.quizAttempt(); // count the attempt once, when the first answer is given
    p.quizAnswer(q.wordId, correct);
  };
  const next = () => {
    if (i + 1 >= qs.length) setDone(true);
    else { setI(i + 1); setPicked(null); }
  };

  return (
    <div className="card p-5 space-y-4">
      <div>
        <div className="flex justify-between text-xs text-navy-400 mb-1"><span>Question {i + 1} of {qs.length}</span><span>Score {score}</span></div>
        <div className="h-1.5 rounded-full bg-cream-200"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      </div>
      <h2 className="font-bold text-lg">{q.prompt}</h2>
      <div className="grid gap-2" role="group" aria-label="Answer options">
        {q.options.map((o, idx) => {
          const state = picked === null ? '' : idx === q.correctIndex ? 'border-green-500 bg-green-50' : idx === picked ? 'border-red-400 bg-red-50' : 'opacity-60';
          return (
            <button key={o} disabled={picked !== null} onClick={() => answer(idx)}
              className={`text-left rounded-xl border-2 border-cream-200 bg-white p-3 text-sm transition hover:border-brand-200 ${state}`}>
              <b className="mr-2">{'ABCD'[idx]}.</b>{o}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="space-y-3" aria-live="polite">
          <div className={`flex items-start gap-2 text-sm ${picked === q.correctIndex ? 'text-green-700' : 'text-red-700'}`}>
            {picked === q.correctIndex ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <div><b>{picked === q.correctIndex ? 'Correct!' : 'Not quite.'}</b> <span className="text-navy-700">{q.explanation}</span></div>
          </div>
          <button className="btn-primary" onClick={next}>{i + 1 >= qs.length ? 'See results' : 'Next question'}</button>
        </div>
      )}
    </div>
  );
}

function Speaking({ go }: { go: (v: View) => void }) {
  const p = useProgress();
  const pool = useMemo(() => {
    const met = quizPool(p.progress);
    return met.length ? met : [];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [result, setResult] = useState<{ verdict: 'exact' | 'close' | 'miss'; heard: string } | null>(null);
  const target = pool[i % Math.max(pool.length, 1)];

  const stt = useSpeechRecognition({
    locale: p.progress.locale,
    onFinal: (heard) => {
      if (!target) return;
      const r = compareSpeech(heard, target.word);
      setResult(r);
      p.speaking(r.verdict !== 'miss');
    },
  });

  if (!pool.length) return <Empty title="No words yet" text="Study a word first, then practise saying it here." action={<button className="btn-primary" onClick={() => go('learn')}>Go to Learn</button>} />;

  const msg = result && (result.verdict === 'exact' ? 'Great — that matched the word.' : result.verdict === 'close' ? 'Very close! Try once more, a little slower.' : 'Not quite. Listen to the pronunciation and try again.');

  return (
    <div className="card p-6 text-center space-y-4">
      <Notice>Speech recognition is an approximate practice aid, not a definitive pronunciation assessment.</Notice>
      {!stt.supported && <Notice>Voice input isn't supported in this browser. Try Chrome or Edge.</Notice>}
      {stt.error && <Notice tone="error">{stt.error}</Notice>}
      <p className="text-sm text-navy-500">Say this word aloud:</p>
      <h2 className="text-4xl font-extrabold capitalize">{target.word}</h2>
      <p className="text-navy-500">/{target.pronunciation}/</p>
      <button className="btn-primary mx-auto" disabled={!stt.supported} onClick={stt.listening ? stt.stop : stt.start}>
        <Mic size={16} /> {stt.listening ? 'Stop' : 'Tap and speak'}
      </button>
      {stt.listening && <p className="text-sm text-brand-600 italic">Listening… “{stt.interim}”</p>}
      {result && (
        <div aria-live="polite" className="text-sm">
          <p className="font-semibold">{msg}</p>
          <p className="text-navy-400">I heard: “{result.heard || 'nothing'}”</p>
        </div>
      )}
      <button className="btn-ghost mx-auto" onClick={() => { setI(i + 1); setResult(null); }}>Next word</button>
      <p className="text-xs text-navy-400">Practising: {wordById(target.id)?.partOfSpeech}</p>
    </div>
  );
}
