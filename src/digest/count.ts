import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';
import type { RunStatus } from './types.js';

export type StatusCounts = Record<RunStatus, number>;

// Parsed log lines per status for one night; null when the night's file is missing or unreadable.
export function countStatuses(runsDir: string, night: string): StatusCounts | null {
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  try {
    for (const text of readFileSync(file, 'utf8').split('\n')) {
      const line = parseLine(text);
      if (line) counts[line.status]++;
    }
  } catch {
    return null;
  }
  return counts;
}
