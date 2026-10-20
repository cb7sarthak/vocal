export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface VocabWord {
  id: string;
  word: string;
  partOfSpeech: string;
  /** Respelling like "ver-SAH-tile" — shown on cards and read aloud as the word itself. */
  pronunciation: string;
  definition: string;
  example: string;
  /** Where and how the word shows up in real life. */
  usage: string;
  /** A work/professional-flavoured sentence. */
  workExample: string;
  synonyms: string[];
  level: Level;
  /** Short practice prompt the learner can answer aloud or in text. */
  practice: string;
}

export interface WordState {
  learned: boolean;
  mastered: boolean;
  saved: boolean;
  /** ISO timestamp of last study interaction. */
  lastStudied: string;
  timesSeen: number;
}

export interface ActivityLog {
  /** Local date key (YYYY-MM-DD) -> number of learning actions. */
  [dateKey: string]: number;
}

export interface Progress {
  version: 1;
  words: Record<string, WordState>;
  quizAttempts: number;
  quizQuestionsAnswered: number;
  quizQuestionsCorrect: number;
  speakingAttempts: number;
  speakingMatches: number;
  activity: ActivityLog;
  recent: string[]; // word ids, most recent first
  level: Level;
  dailyGoal: number;
  locale: string;
  speechRate: number;
}

export interface QuizQuestion {
  id: string;
  wordId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AgentMessage {
  id: string;
  role: 'agent' | 'user';
  text: string;
  /** Optional word chip shown with the message. */
  wordId?: string;
}

export type AgentIntent =
  | 'greet'
  | 'explain'
  | 'example'
  | 'work'
  | 'synonym'
  | 'quiz'
  | 'next'
  | 'repeat'
  | 'pronounce'
  | 'save'
  | 'learned'
  | 'level'
  | 'help'
  | 'answer'
  | 'unknown';

export interface AgentContext {
  currentWordId: string | null;
  level: Level;
  lastAgentText: string;
  /** Words the agent has introduced in this session, used to avoid repeats. */
  seen: string[];
  pendingQuiz: { wordId: string; options: string[]; correctIndex: number } | null;
  /** Rotation counters keyed "intent:wordId" so repeated asks give fresh answers. */
  counters: Record<string, number>;
}

export interface AgentReply {
  text: string;
  intent: AgentIntent;
  /** Word to display/set as current after this reply. */
  wordId?: string | null;
  /** Side effects the UI should apply to progress. */
  effects: Array<
    | { type: 'seen'; wordId: string }
    | { type: 'learned'; wordId: string }
    | { type: 'saved'; wordId: string }
    | { type: 'quiz-answer'; wordId: string; correct: boolean }
    | { type: 'level'; level: Level }
  >;
  context: AgentContext;
}

export type View = 'dashboard' | 'learn' | 'tutor' | 'quiz' | 'vocabulary';
