import assert from 'node:assert/strict';
import { VOCABULARY } from '../src/data/vocabulary';
import { detectIntent, newContext, parseQuizAnswer, ruleBasedTutor } from '../src/lib/agent';
import { buildQuiz, compareSpeech } from '../src/lib/quiz';
import { computeStreak } from '../src/lib/dates';
import { computeStats, emptyProgress, markStudied, recordQuizAnswer, sanitize, setLearned } from '../src/lib/progress';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };

t('dataset has 30+ complete words across 3 levels', () => {
  assert.ok(VOCABULARY.length >= 30);
  for (const w of VOCABULARY) {
    assert.ok(w.definition && w.example && w.usage && w.practice && w.pronunciation, w.word);
    assert.ok(w.synonyms.length >= 2, w.word);
  }
  for (const l of ['beginner', 'intermediate', 'advanced']) assert.ok(VOCABULARY.some((w) => w.level === l));
  assert.equal(new Set(VOCABULARY.map((w) => w.id)).size, VOCABULARY.length);
});

t('intent matching for voice commands', () => {
  assert.equal(detectIntent('next word'), 'next');
  assert.equal(detectIntent('Repeat that'), 'repeat');
  assert.equal(detectIntent('give me an example'), 'example');
  assert.equal(detectIntent('start a quiz'), 'quiz');
  assert.equal(detectIntent('How do I use this at work?'), 'work');
  assert.equal(detectIntent('Teach me a synonym.'), 'synonym');
  assert.equal(detectIntent('Teach me another word.'), 'next');
  assert.equal(detectIntent('Explain this word simply.'), 'explain');
  assert.equal(detectIntent('asdf qwer'), 'unknown');
});

t('agent conversation flow incl. quiz answer', () => {
  let r = ruleBasedTutor.start(newContext('beginner'), new Set());
  assert.ok(r.context.currentWordId);
  const id = r.context.currentWordId!;
  r = ruleBasedTutor.respond('give me an example', r.context, new Set());
  assert.equal(r.intent, 'example');
  r = ruleBasedTutor.respond('repeat that', r.context, new Set());
  assert.equal(r.intent, 'repeat');
  r = ruleBasedTutor.respond('quiz me', r.context, new Set());
  assert.ok(r.context.pendingQuiz);
  const right = 'abcd'[r.context.pendingQuiz!.correctIndex];
  const a = ruleBasedTutor.respond(right, r.context, new Set());
  assert.equal(a.effects[0].type, 'quiz-answer');
  assert.equal((a.effects[0] as { correct: boolean }).correct, true);
  assert.equal(a.context.pendingQuiz, null);
  const s = ruleBasedTutor.respond('save this word', a.context, new Set());
  assert.deepEqual(s.effects, [{ type: 'saved', wordId: id }]);
  const nx = ruleBasedTutor.respond('next word', s.context, new Set());
  assert.notEqual(nx.context.currentWordId, id);
});

t('quiz answer parsing', () => {
  assert.equal(parseQuizAnswer('B', ['x', 'y', 'z', 'w']), 1);
  assert.equal(parseQuizAnswer('option c', ['x', 'y', 'z', 'w']), 2);
  assert.equal(parseQuizAnswer('the second one', ['x', 'y', 'z', 'w']), 1);
  assert.equal(parseQuizAnswer('hello there', ['x', 'y', 'z', 'w']), null);
});

t('quiz has 4 options with exactly one correct, no duplicates', () => {
  const qs = buildQuiz(VOCABULARY.slice(0, 10), 10);
  assert.equal(qs.length, 10);
  for (const q of qs) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
  }
});

t('speech comparison', () => {
  assert.equal(compareSpeech('Reliable', 'reliable').verdict, 'exact');
  assert.equal(compareSpeech('reliably', 'reliable').verdict, 'close');
  assert.equal(compareSpeech('banana', 'reliable').verdict, 'miss');
  assert.equal(compareSpeech('', 'reliable').verdict, 'miss');
});

t('streak uses consecutive local days', () => {
  const today = new Date(2026, 9, 19);
  assert.equal(computeStreak({}, today), 0);
  assert.equal(computeStreak({ '2026-10-19': 1, '2026-10-18': 2, '2026-10-17': 1 }, today), 3);
  assert.equal(computeStreak({ '2026-10-18': 1 }, today), 1); // not studied yet today
  assert.equal(computeStreak({ '2026-10-17': 1 }, today), 0); // gap
});

t('progress: starts empty, updates from real actions, survives sanitize roundtrip', () => {
  let p = emptyProgress();
  const s0 = computeStats(p);
  assert.equal(s0.learned, 0); assert.equal(s0.accuracy, null); assert.equal(s0.streak, 0);
  p = markStudied(p, 'reliable'); p = setLearned(p, 'reliable', true);
  p = recordQuizAnswer(p, 'reliable', true); p = recordQuizAnswer(p, 'reliable', false);
  const s = computeStats(p);
  assert.equal(s.learned, 1); assert.equal(s.accuracy, 50); assert.equal(s.streak, 1);
  const again = sanitize(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(again, p);
  assert.deepEqual(sanitize('garbage'), emptyProgress());
  assert.equal(setLearned(p, 'reliable', false).words.reliable.mastered, false);
});

console.log(`\n${n} test groups passed`);
