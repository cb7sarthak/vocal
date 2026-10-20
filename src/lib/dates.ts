/** Local-date helpers. Streaks use the learner's local calendar day, not UTC. */

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

/**
 * Consecutive days of activity ending today. If the learner hasn't studied yet
 * today, the streak is still alive when yesterday has activity.
 */
export function computeStreak(activity: Record<string, number>, today: Date = new Date()): number {
  let cursor = today;
  if (!activity[dateKey(cursor)]) cursor = addDays(cursor, -1);
  let streak = 0;
  while (activity[dateKey(cursor)] > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Stable per-day index so "Word of the Day" is the same all day and changes at local midnight. */
export function dayIndex(d: Date = new Date()): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}
