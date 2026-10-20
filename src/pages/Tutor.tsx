import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Send, Square, Volume2 } from 'lucide-react';
import type { AgentContext, AgentMessage, AgentReply } from '../types';
import { SUGGESTED_PROMPTS, newContext, ruleBasedTutor } from '../lib/agent';
import { useProgress } from '../hooks/useProgress';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { wordById } from '../data/vocabulary';
import { Notice } from '../components/ui';

let uid = 0;
const mid = () => `m${++uid}`;

export default function Tutor() {
  const p = useProgress();
  const { progress } = p;
  const tts = useSpeechSynthesis({ locale: progress.locale, rate: progress.speechRate });
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const ctxRef = useRef<AgentContext>(newContext(progress.level));
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // Always read the latest values inside callbacks.
  const live = useRef({ p, tts, autoSpeak });
  live.current = { p, tts, autoSpeak };

  const apply = useCallback((reply: AgentReply) => {
    const { p, tts, autoSpeak } = live.current;
    ctxRef.current = reply.context;
    for (const e of reply.effects) {
      if (e.type === 'seen') p.studied(e.wordId);
      else if (e.type === 'learned') p.learned(e.wordId, true);
      else if (e.type === 'saved') p.saved(e.wordId, true);
      else if (e.type === 'quiz-answer') p.quizAnswer(e.wordId, e.correct);
      else if (e.type === 'level') p.setLevel(e.level);
    }
    setMessages((m) => [...m, { id: mid(), role: 'agent', text: reply.text, wordId: reply.wordId ?? undefined }]);
    if (autoSpeak) tts.speak(reply.text);
  }, []);

  const learnedSet = () => new Set(Object.entries(live.current.p.progress.words).filter(([, s]) => s.learned).map(([id]) => id));

  const send = useCallback((raw: string) => {
    const input = raw.trim();
    if (!input) return;
    live.current.tts.stop();
    setMessages((m) => [...m, { id: mid(), role: 'user', text: input }]);
    setText('');
    setThinking(true);
    // Short pause so the "thinking" state is visible; the tutor itself is instant.
    window.setTimeout(() => {
      apply(ruleBasedTutor.respond(input, ctxRef.current, learnedSet()));
      setThinking(false);
    }, 350);
  }, [apply]);

  const stt = useSpeechRecognition({ locale: progress.locale, onFinal: send });

  // Greeting on first open.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    apply(ruleBasedTutor.start(ctxRef.current, learnedSet()));
  }, [apply]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, thinking]);

  const state = stt.listening ? 'Listening…' : thinking ? 'Thinking…' : tts.speaking ? 'Speaking…' : 'Ready';
  const current = ctxRef.current.currentWordId ? wordById(ctxRef.current.currentWordId) : null;

  const toggleMic = () => {
    if (stt.listening) return stt.stop();
    tts.stop(); // don't let the mic hear the tutor
    stt.start();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Voice Tutor</h1>
        <span className="chip" aria-live="polite">{state}</span>
      </div>
      <Notice>Voca is a rule-based tutor (not an AI model). It understands set commands like “next word”, “repeat that”, “give me an example” and “start a quiz”.</Notice>
      {!stt.supported && <Notice>Voice input isn't supported in this browser (try Chrome or Edge). You can still type below.</Notice>}
      {!tts.supported && <Notice>Read-aloud isn't supported in this browser. Replies still appear on screen.</Notice>}
      {(stt.error || tts.error) && <Notice tone="error">{stt.error || tts.error}</Notice>}

      <div className="card p-4 h-[45vh] md:h-[50vh] overflow-y-auto space-y-3" aria-live="polite" aria-label="Conversation">
        {messages.map((m) => (
          <div key={m.id} className={`flex animate-fadeUp ${m.role === 'user' ? 'justify-end' : ''}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-cream-100 text-navy-900'}`}>
              {m.text}
              {m.role === 'agent' && (
                <button className="ml-2 align-middle text-navy-400 hover:text-brand-600" aria-label="Play this reply" onClick={() => tts.speak(m.text)}><Volume2 size={14} /></button>
              )}
            </div>
          </div>
        ))}
        {stt.listening && <p className="text-sm text-brand-600 italic">“{stt.interim || 'Say something…'}”</p>}
        {thinking && <p className="text-sm text-navy-400">Voca is thinking…</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Suggested prompts">
        {SUGGESTED_PROMPTS.map((s) => (
          <button key={s} className="btn-ghost whitespace-nowrap !py-1.5 !text-xs" onClick={() => send(s)}>{s}</button>
        ))}
      </div>

      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <button type="button" onClick={toggleMic} disabled={!stt.supported}
          aria-label={stt.listening ? 'Stop listening' : 'Start voice input'} aria-pressed={stt.listening}
          className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-white ${stt.listening ? 'bg-red-500' : 'bg-gradient-to-br from-brand-500 to-brand-700'} disabled:opacity-40`}>
          {stt.listening && <span className="absolute inset-0 rounded-full bg-red-400 animate-pulseRing" />}
          <Mic size={20} className="relative" />
        </button>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type here, or tap the mic…" aria-label="Message Voca"
          className="flex-1 rounded-xl border border-cream-200 bg-white px-4 py-3 text-sm" />
        <button className="btn-primary !px-3" type="submit" aria-label="Send" disabled={!text.trim()}><Send size={18} /></button>
        <button type="button" className="btn-ghost !px-3" aria-label="Stop speaking" disabled={!tts.speaking} onClick={tts.stop}><Square size={16} /></button>
      </form>

      <div className="flex items-center justify-between text-xs text-navy-400">
        <label className="flex items-center gap-2"><input type="checkbox" checked={autoSpeak} onChange={(e) => { setAutoSpeak(e.target.checked); if (!e.target.checked) tts.stop(); }} /> Read replies aloud</label>
        {current && <span>Current word: <b className="capitalize text-navy-700">{current.word}</b></span>}
      </div>
    </div>
  );
}
