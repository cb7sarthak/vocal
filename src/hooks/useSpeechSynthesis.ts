import { useCallback, useEffect, useRef, useState } from 'react';
import { chunkForSpeech, synthesisSupported } from '../lib/speech';

interface Options {
  locale: string;
  rate: number;
}

export function useSpeechSynthesis({ locale, rate }: Options) {
  const supported = synthesisSupported();
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  // Incremented on every speak/stop so callbacks from cancelled utterances are ignored.
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
  }, [supported]);

  const pickVoice = useCallback(
    (): SpeechSynthesisVoice | undefined => {
      const voices = voicesRef.current;
      const lang = locale.toLowerCase();
      return (
        voices.find((v) => v.lang.toLowerCase() === lang) ??
        voices.find((v) => v.lang.toLowerCase().startsWith('en'))
      );
    },
    [locale],
  );

  const stop = useCallback(() => {
    tokenRef.current += 1;
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!supported) {
        setError('Text-to-speech is not available in this browser. You can still read the replies on screen.');
        return;
      }
      setError(null);
      // Cancel anything in flight first so replies never overlap.
      window.speechSynthesis.cancel();
      const token = ++tokenRef.current;
      const chunks = chunkForSpeech(text);
      if (!chunks.length) return;
      setSpeaking(true);

      const voice = pickVoice();
      chunks.forEach((chunk, i) => {
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = voice?.lang ?? locale;
        if (voice) u.voice = voice;
        u.rate = rate;
        u.onend = () => {
          if (token !== tokenRef.current) return;
          if (i === chunks.length - 1) {
            setSpeaking(false);
            onDone?.();
          }
        };
        u.onerror = (e) => {
          if (token !== tokenRef.current) return;
          // "canceled"/"interrupted" are expected when the user stops playback.
          if (e.error === 'canceled' || e.error === 'interrupted') return;
          setSpeaking(false);
          setError('Speech playback failed. Check your device volume or try another browser.');
        };
        window.speechSynthesis.speak(u);
      });
    },
    [supported, pickVoice, locale, rate],
  );

  // Never leave speech running after the component unmounts or the tab is hidden.
  useEffect(() => {
    if (!supported) return;
    const onHide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.speechSynthesis.cancel();
    };
  }, [supported, stop]);

  return { supported, speaking, error, speak, stop, clearError: () => setError(null) };
}
