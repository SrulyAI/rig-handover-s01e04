import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { countStatuses } from '../src/digest/count.js';

describe('countStatuses', () => {
  it('counts parsed lines per status and skips bad ones', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-count-'));
    const l = (job: string, status: string) => JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job, status, owner: null });
    writeFileSync(join(dir, '2026-10-28.jsonl'), [l('a', 'ok'), l('a', 'retry'), 'junk', l('b', 'fail'), l('c', 'ok')].join('\n'));
    expect(countStatuses(dir, '2026-10-28')).toEqual({ ok: 2, retry: 1, fail: 1 });
  });

  it('is null for a night with no file', () => {
    expect(countStatuses(mkdtempSync(join(tmpdir(), 'rig-count-')), '2026-10-01')).toBeNull();
  });
});
