import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@/server/db/client';
import { getWorkspaceData } from '@/server/queries';
import { getViewer } from '@/server/session';
import { resetDemo, useTestDatabase } from '@/test-utils/test-db';
import { createLabel, deleteLabel, updateLabel } from '../labels';

vi.mock('next/cache', () => ({ updateTag: () => {}, cacheLife: () => {}, cacheTag: () => {} }));
vi.mock('next/headers', async () => ({
  cookies: (await import('@/test-utils/test-db')).testCookies,
}));
vi.mock('next/server', () => ({ connection: async () => {} }));

let db: Database;

async function labels() {
  const viewer = await getViewer();
  return (await getWorkspaceData(viewer.workspaceId, viewer.memberId)).labels;
}

beforeAll(async () => {
  db = await useTestDatabase();
});

beforeEach(async () => {
  await resetDemo(db);
});

describe('label actions', () => {
  it('creates, renames and deletes a label', async () => {
    const created = await createLabel({ name: 'Security', color: '#444ce7' });
    const id = created.ok ? created.data.id : '';

    await updateLabel({ id, name: 'Security review', color: '#0e9384' });
    const renamed = (await labels()).find((label) => label.id === id);
    await deleteLabel({ id });

    expect(renamed).toEqual({ id, name: 'Security review', color: '#0e9384' });
    expect((await labels()).some((label) => label.id === id)).toBe(false);
  });

  it.each([
    ['an existing name', { name: 'Bug', color: '#444ce7' }, 'duplicate'],
    ['a colour that is not a hex value', { name: 'Docs', color: 'blue' }, 'invalid'],
    ['a blank name', { name: ' ', color: '#444ce7' }, 'nameRequired'],
  ])('rejects %s', async (_name, input, error) => {
    expect(await createLabel(input)).toEqual({ ok: false, error });
  });
});
