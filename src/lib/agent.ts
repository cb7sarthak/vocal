/**
 * Rule-based vocabulary tutor.
 *
 * Honesty note: this is NOT an LLM. It matches the learner's words against a fixed
 * set of intents and answers from the structured vocabulary dataset. The `TutorAgent`
 * interface at the bottom is the seam where a real model could be plugged in later.
 */
import type { AgentContext, AgentIntent, AgentReply, Level, VocabWord } from '../types';
import { VOCABULARY, findWordInText, wordById, wordsByLevel } from '../data/vocabulary';
import { buildQuestion, shuffle } from './quiz';

export const SUGGESTED_PROMPTS = [
  'Explain this word simply.',
  'Give me another example.',
  'How do I use this at work?',
  'Teach me a synonym.',
  'Quiz me on this word.',
  'Teach me another word.',
];

export function newContext(level: Level): AgentContext {
  return { currentWordId: null, level, lastAgentText: '', seen: [], pendingQuiz: null, counters: {} };
}

const normalize = (s: string): string =>
  s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const has = (t: string, ...patterns: RegExp[]): boolean => patterns.some((p) => p.test(t));

export function detectIntent(input: string): AgentIntent {
  const t = normalize(input);
  if (!t) return 'unknown';
  // Order matters: more specific intents first.
  if (has(t, /\b(next word|another word|new word|different word|teach me another|teach me a new|skip|move on|next one)\b/)) return 'next';
  if (has(t, /\b(repeat|say that again|say it again|once more|pardon|come again|what did you say)\b/) || t === 'again') return 'repeat';
  if (has(t, /\b(quiz|test me|test my|practice question|practise)\b/)) return 'quiz';
  if (has(t, /\b(pronounce|pronunciation|how do you say|how to say|say the word)\b/)) return 'pronounce';
  if (has(t, /\b(work|office|job|interview|professional|workplace|meeting|career)\b/)) return 'work';
  if (has(t, /\b(synonym|synonyms|similar word|another word for|same meaning|similar meaning)\b/)) return 'synonym';
  if (has(t, /\b(example|sentence|use it|use this|in a sentence)\b/)) return 'example';
  if (has(t, /\b(save|bookmark|favourite|favorite|keep this word)\b/)) return 'save';
  if (has(t, /\b(i learned|i have learned|mark as learned|mark it learned|i know this|got it|i understand|learned it)\b/)) return 'learned';
  if (has(t, /\b(beginner|intermediate|advanced|easier|harder|more difficult|too easy|too hard)\b/)) return 'level';
  if (has(t, /\b(explain|meaning|mean|define|definition|what is|whats|simply|tell me about|teach me)\b/)) return 'explain';
  if (has(t, /\b(help|what can you do|how does this work|commands)\b/)) return 'help';
  if (has(t, /^(hi|hello|hey|hii|good morning|good evening|good afternoon|namaste)\b/)) return 'greet';
  return 'unknown';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const bump = (ctx: AgentContext, key: string): [number, Record<string, number>] => {
  const n = ctx.counters[key] ?? 0;
  return [n, { ...ctx.counters, [key]: n + 1 }];
};

function chooseNextWord(ctx: AgentContext, learned: Set<string>): VocabWord {
  const pool = wordsByLevel(ctx.level);
  const unseenUnlearned = pool.filter((w) => !ctx.seen.includes(w.id) && !learned.has(w.id));
  const unseen = pool.filter((w) => !ctx.seen.includes(w.id));
  const candidates = unseenUnlearned.length ? unseenUnlearned : unseen.length ? unseen : pool.filter((w) => w.id !== ctx.currentWordId);
  const list = candidates.length ? candidates : pool;
  return shuffle(list)[0];
}

function introduce(word: VocabWord): string {
  return (
    `Today's word is "${word.word}" — pronounced ${word.pronunciation}. ` +
    `It's ${/^[aeiou]/i.test(word.partOfSpeech) ? 'an' : 'a'} ${word.partOfSpeech}. ` +
    `Simply put: ${word.definition} ` +
    `For example: ${word.example} ` +
    `${word.usage}`
  );
}

const LETTERS = ['A', 'B', 'C', 'D'];

function formatQuizPrompt(prompt: string, options: string[]): string {
  return `${prompt} ${options.map((o, i) => `${LETTERS[i]}: ${o}.`).join(' ')} Say or type the letter of your answer.`;
}

/** Interprets "b", "option c", "the second one", or the answer text itself. */
export function parseQuizAnswer(input: string, options: string[]): number | null {
  const t = normalize(input);
  const letter = t.match(/^(?:option |answer |choice |its |it is |i think |maybe )?([abcd])$/);
  if (letter) return 'abcd'.indexOf(letter[1]);
  const ordinals: Array<[RegExp, number]> = [
    [/\b(first|1|one)\b/, 0],
    [/\b(second|2|two)\b/, 1],
    [/\b(third|3|three)\b/, 2],
    [/\b(fourth|4|four)\b/, 3],
  ];
  // "the second one": drop a trailing filler "one" so it can't match as the number 1.
  const ord = t.replace(/\b(the )?(first|second|third|fourth) one\b/, '$2');
  if (/\b(option|answer|choice|number|the)\b/.test(ord) || /^(first|second|third|fourth|one|two|three|four)$/.test(ord)) {
    for (const [re, idx] of ordinals) if (re.test(ord) && idx < options.length) return idx;
  }
  const byText = options.findIndex((o) => {
    const n = normalize(o);
    return n.length > 0 && (t === n || (n.split(' ').length === 1 && new RegExp(`\\b${n}\\b`).test(t)));
  });
  return byText >= 0 ? byText : null;
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface TutorAgent {
  /** Opening turn: greet and introduce a word. */
  start(ctx: AgentContext, learned: Set<string>): AgentReply;
  /** Respond to one learner utterance. */
  respond(input: string, ctx: AgentContext, learned: Set<string>): AgentReply;
}

function reply(text: string, intent: AgentIntent, ctx: AgentContext, extra: Partial<AgentReply> = {}): AgentReply {
  return {
    text,
    intent,
    effects: [],
    ...extra,
    context: { ...ctx, ...(extra.context ?? {}), lastAgentText: text },
  };
}

export const ruleBasedTutor: TutorAgent = {
  start(ctx, learned) {
    const word = chooseNextWord(ctx, learned);
    const text = `Hey there! I'm Voca, your vocabulary coach. ${introduce(word)} You can ask me for another example, a synonym, a quiz, or say "next word".`;
    return reply(text, 'greet', ctx, {
      wordId: word.id,
      effects: [{ type: 'seen', wordId: word.id }],
      context: { ...ctx, currentWordId: word.id, seen: [...ctx.seen, word.id], pendingQuiz: null },
    });
  },

  respond(input, ctx, learned) {
    // 1) Awaiting a quiz answer
    if (ctx.pendingQuiz) {
      const idx = parseQuizAnswer(input, ctx.pendingQuiz.options);
      if (idx !== null) {
        const q = ctx.pendingQuiz;
        const word = wordById(q.wordId)!;
        const correct = idx === q.correctIndex;
        const text = correct
          ? `Correct! Nicely done. ${word.word} — ${word.definition} Want another example, or shall we try "next word"?`
          : `Not quite. The right answer was ${LETTERS[q.correctIndex]}: ${q.options[q.correctIndex]}. ${word.word} — ${word.definition} No worries — ask for an example and we'll lock it in.`;
        return reply(text, 'answer', ctx, {
          wordId: word.id,
          effects: [{ type: 'quiz-answer', wordId: word.id, correct }],
          context: { ...ctx, pendingQuiz: null },
        });
      }
      // Not an answer: let other intents (next, repeat, help…) cancel the quiz naturally.
      const other = detectIntent(input);
      if (other === 'unknown') {
        return reply(
          `I'm waiting for your answer — say or type A, B, C or D. Or say "next word" to skip the quiz.`,
          'unknown',
          ctx,
        );
      }
      if (other === 'repeat') {
        return reply(ctx.lastAgentText, 'repeat', ctx);
      }
      ctx = { ...ctx, pendingQuiz: null };
    }

    const intent = detectIntent(input);
    const mentioned = findWordInText(normalize(input));
    const current = ctx.currentWordId ? wordById(ctx.currentWordId) : undefined;

    // 2) Asking about a specific word ("what does resilient mean?")
    if (mentioned && (intent === 'explain' || intent === 'unknown' || intent === 'example' || intent === 'synonym') && mentioned.id !== ctx.currentWordId) {
      const text = `Sure, let's look at "${mentioned.word}". ${introduce(mentioned)}`;
      return reply(text, 'explain', ctx, {
        wordId: mentioned.id,
        effects: [{ type: 'seen', wordId: mentioned.id }],
        context: { ...ctx, currentWordId: mentioned.id, seen: ctx.seen.includes(mentioned.id) ? ctx.seen : [...ctx.seen, mentioned.id] },
      });
    }

    switch (intent) {
      case 'greet': {
        if (!current) return ruleBasedTutor.start(ctx, learned);
        return reply(`Hi again! We're on "${current.word}". Ask for an example, a synonym or a quiz — or say "next word".`, 'greet', ctx);
      }
      case 'help':
        return reply(
          `I'm a rule-based tutor, not an AI model — I understand a set of everyday commands and answer from my built-in word list. Try: "explain this word", "give me an example", "how do I use this at work", "teach me a synonym", "how do you pronounce it", "quiz me", "save this word", "I learned it", "next word", or "make it harder". Say "repeat that" to hear me again.`,
          'help',
          ctx,
        );
      case 'next': {
        const word = chooseNextWord(ctx, learned);
        return reply(`Great, let's try another one. ${introduce(word)}`, 'next', ctx, {
          wordId: word.id,
          effects: [{ type: 'seen', wordId: word.id }],
          context: { ...ctx, currentWordId: word.id, seen: [...ctx.seen, word.id].slice(-VOCABULARY.length), pendingQuiz: null },
        });
      }
      case 'repeat':
        return reply(ctx.lastAgentText || 'We have not started yet — say "next word" and I will begin.', 'repeat', ctx);
      case 'level': {
        const t = normalize(input);
        const order: Level[] = ['beginner', 'intermediate', 'advanced'];
        let level: Level = ctx.level;
        if (/\bbeginner\b/.test(t)) level = 'beginner';
        else if (/\bintermediate\b/.test(t)) level = 'intermediate';
        else if (/\badvanced\b/.test(t)) level = 'advanced';
        else if (/\b(easier|too hard)\b/.test(t)) level = order[Math.max(0, order.indexOf(ctx.level) - 1)];
        else level = order[Math.min(2, order.indexOf(ctx.level) + 1)];
        const next = { ...ctx, level, seen: [] as string[] };
        const word = chooseNextWord(next, learned);
        return reply(`Switching to ${level} level. ${introduce(word)}`, 'level', ctx, {
          wordId: word.id,
          effects: [{ type: 'level', level }, { type: 'seen', wordId: word.id }],
          context: { ...next, currentWordId: word.id, seen: [word.id], pendingQuiz: null },
        });
      }
      default:
        break;
    }

    // Everything below needs a current word.
    if (!current) {
      return reply(`Let's pick a word first — say "next word" and I'll introduce one.`, 'unknown', ctx);
    }

    switch (intent) {
      case 'explain':
        return reply(
          `"${current.word}" is ${/^[aeiou]/i.test(current.partOfSpeech) ? 'an' : 'a'} ${current.partOfSpeech}. In simple words: ${current.definition} For example: ${current.example}`,
          'explain',
          ctx,
        );
      case 'example': {
        const [n, counters] = bump(ctx, `example:${current.id}`);
        const examples = [current.example, current.workExample, `Now your turn: ${current.practice}`];
        const text = n < examples.length - 1 ? `Here's an example: ${examples[n]}` : examples[examples.length - 1];
        return reply(text, 'example', ctx, { context: { ...ctx, counters } });
      }
      case 'work': {
        return reply(`At work, you could say: ${current.workExample} ${current.usage}`, 'work', ctx);
      }
      case 'synonym': {
        const [n, counters] = bump(ctx, `synonym:${current.id}`);
        const syn = current.synonyms[n % current.synonyms.length];
        const all = current.synonyms.join(', ');
        const text =
          n === 0
            ? `A good synonym for "${current.word}" is "${syn}". Other similar words: ${all}.`
            : `Another word with a similar meaning is "${syn}". All of them: ${all}.`;
        return reply(text, 'synonym', ctx, { context: { ...ctx, counters } });
      }
      case 'pronounce':
        return reply(`"${current.word}" is pronounced ${current.pronunciation}. Say it out loud after me: ${current.word}.`, 'pronounce', ctx);
      case 'quiz': {
        const q = buildQuestion(current, Math.floor(Math.random() * 3));
        const text = formatQuizPrompt(q.prompt, q.options);
        return reply(text, 'quiz', ctx, {
          context: { ...ctx, pendingQuiz: { wordId: current.id, options: q.options, correctIndex: q.correctIndex } },
        });
      }
      case 'save':
        return reply(`Saved "${current.word}" to My Vocabulary so you can review it later.`, 'save', ctx, {
          effects: [{ type: 'saved', wordId: current.id }],
        });
      case 'learned':
        return reply(`Nice work! I've marked "${current.word}" as learned. Ready for a new word? Just say "next word".`, 'learned', ctx, {
          effects: [{ type: 'learned', wordId: current.id }],
        });
      default:
        return reply(
          `I didn't quite catch that — I only understand a set of commands. For "${current.word}" you can say: "explain it", "give me an example", "how do I use it at work", "teach me a synonym", "quiz me", or "next word". Say "help" for the full list.`,
          'unknown',
          ctx,
        );
    }
  },
};
