/** Minimal typings + feature detection for the browser Web Speech API. */

export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}
export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
export interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const recognitionSupported = (): boolean => getRecognitionCtor() !== null;

export const synthesisSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

export function isSecureForMic(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

export const LOCALES = [
  { id: 'en-IN', label: 'English (India)' },
  { id: 'en-US', label: 'English (US)' },
  { id: 'en-GB', label: 'English (UK)' },
];

/** Splits text into sentence-sized chunks; long utterances get cut off in some browsers. */
export function chunkForSpeech(text: string, max = 180): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

export function friendlyRecognitionError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow the microphone in your browser\'s site settings, then try again — or use the text box instead.';
    case 'no-speech':
      return 'I didn\'t hear anything. Tap the mic and try speaking a little closer to your device.';
    case 'audio-capture':
      return 'No microphone was found. Check that one is connected, or type your message instead.';
    case 'network':
      return 'Speech recognition needs an internet connection (the browser sends audio to its speech service). Check your connection or type instead.';
    case 'language-not-supported':
      return 'This browser doesn\'t support recognition for the selected language. Try another English locale in Settings.';
    default:
      return 'Speech recognition ran into a problem. You can try again or type your message.';
  }
}
