import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };

const JOBS = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

type Body = { night: string; rows: { job: string; owner: string | null }[]; badLines: number };

beforeAll(() => {
  copyFileSync('runs/2026-10-28.jsonl', join(runsDir, '2026-10-28.jsonl'));
  writeFileSync(join(runsDir, '2026-01-01.jsonl'), '');
});

describe('digest page', () => {
  it('renders the lane banner, every job sorted, and a dash for a null owner', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    const at = JOBS.map((job) => {
      expect(html).toContain(job);
      return html.indexOf(job);
    });
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(html).toContain('—');
  });

  it('says the bad line did not parse', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("didn't parse");
  });

  it('is 404 for a night with no file', async () => {
    const res = await createApp(config).request('/digest/2020-02-02');
    expect(res.status).toBe(404);
  });

  it('is 404 for a night that is not YYYY-MM-DD', async () => {
    const res = await createApp(config).request('/digest/not-a-night');
    expect(res.status).toBe(404);
  });

  it('says nothing ran for an empty file', async () => {
    const res = await createApp(config).request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });
});

describe('digest json', () => {
  it('returns night, rows and badLines, keeping a null owner', async () => {
    const res = await createApp(config).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Body;
    expect(body.night).toBe('2026-10-28');
    expect(body.rows).toHaveLength(5);
    expect(body.rows.map((r) => r.job)).toEqual(JOBS);
    expect(body.badLines).toBe(1);
    expect(body.rows.find((r) => r.job === 'digest/render')?.owner).toBeNull();
  });

  it('is 404 for a night with no file', async () => {
    const res = await createApp(config).request('/api/digest/2020-02-02');
    expect(res.status).toBe(404);
  });

  it('gives no rows for an empty file', async () => {
    const res = await createApp(config).request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Body;
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });
});

describe('page and json agree', () => {
  it('lists the same jobs in the same order', async () => {
    const app = createApp(config);
    const html = await (await app.request('/digest/2026-10-28')).text();
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as Body;
    const at = body.rows.map((r) => html.indexOf(r.job));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });
});
