import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type SpeechRecognitionLike,
  friendlyRecognitionError,
  getRecognitionCtor,
  isSecureForMic,
} from '../lib/speech';

interface Options {
  locale: string;
  /** Called once per listening session with the final transcript. */
  onFinal: (text: string) => void;
}

export function useSpeechRecognition({ locale, onFinal }: Options) {
  const Ctor = getRecognitionCtor();
  const supported = Ctor !== null;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  const deliveredRef = useRef(false);
  const finalTextRef = useRef('');

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const detach = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    // Remove handlers so a stale session can never fire a duplicate reply.
    rec.onstart = rec.onend = rec.onresult = rec.onerror = null;
    try {
      rec.abort();
    } catch {
      /* already stopped */
    }
    recRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const start = useCallback(() => {
    if (!Ctor) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge, or use the text box.');
      return;
    }
    if (!isSecureForMic()) {
      setError('Microphone access needs a secure (HTTPS) connection.');
      return;
    }
    detach();
    setError(null);
    setInterim('');
    deliveredRef.current = false;
    finalTextRef.current = '';

    const rec = new Ctor();
    rec.lang = locale;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let interimText = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? '';
        if (r.isFinal) finalText += t;
        else interimText += t;
      }
      if (finalText) finalTextRef.current += finalText;
      setInterim((finalTextRef.current + ' ' + interimText).trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      setError(friendlyRecognitionError(e.error));
      deliveredRef.current = true; // don't deliver partial text after an error
    };
    rec.onend = () => {
      setListening(false);
      const text = finalTextRef.current.trim();
      if (!deliveredRef.current && text) {
        deliveredRef.current = true;
        onFinalRef.current(text);
      }
      setInterim('');
      recRef.current = null;
    };

    recRef.current = rec;
    try {
      rec.start(); // the browser asks for mic permission here, after the user's click
    } catch {
      setError('Could not start the microphone. Wait a moment and try again.');
      recRef.current = null;
      setListening(false);
    }
  }, [Ctor, locale, detach]);

  useEffect(() => detach, [detach]);

  return { supported, listening, interim, error, start, stop, clearError: () => setError(null) };
}
