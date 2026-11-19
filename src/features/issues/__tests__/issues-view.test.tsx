import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { WorkspaceChrome } from '@/features/shell/workspace-chrome';
import { parseIssueQuery } from '@/lib/issue-query';
import { makeIssue } from '@/test-utils/fixtures';
import { renderInWorkspace } from '@/test-utils/render';
import { IssuesView } from '../issues-view';

// Server Actions are the network boundary.
const { updateIssue, createIssue } = vi.hoisted(() => ({
  updateIssue: vi.fn(),
  createIssue: vi.fn(),
}));
vi.mock('@/server/actions/issues', () => ({
  updateIssue,
  moveIssue: vi.fn(),
  deleteIssue: vi.fn(),
  restoreIssue: vi.fn(),
  createIssue,
  addComment: vi.fn(),
}));

const issues = [
  makeIssue({ number: 1, title: 'Checklist forgets progress', status: 'todo' }),
  makeIssue({ number: 2, title: 'Hero image shifts', status: 'in_progress' }),
];

function renderList(search = '') {
  return renderInWorkspace(
    <WorkspaceChrome>
      <IssuesView
        issues={search.includes('q=nothing') ? [] : issues}
        query={parseIssueQuery(new URLSearchParams(search))}
      />
    </WorkspaceChrome>,
  );
}

beforeEach(() => {
  updateIssue.mockReset();
});

describe('IssuesView', () => {
  it.each([
    ['the issues grouped by status', '', ['Checklist forgets progress', 'Hero image shifts']],
    [
      'an empty state with a way out when filters match nothing',
      'q=nothing',
      ['No issues match these filters', 'Clear filters'],
    ],
  ])('shows %s', (_name, search, texts) => {
    renderList(search);

    for (const text of texts) expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  });

  it('moves an issue to its new status group before the server answers, then sends the change', async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => {};
    updateIssue.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderList();

    await user.click(screen.getByRole('button', { name: 'Status: Todo' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Done' }));

    const done = await screen.findByRole('heading', { name: /Done/ });
    expect(
      within(done.closest('section') ?? document.body).getByRole('link', {
        name: /Checklist forgets progress/,
      }),
    ).toBeInTheDocument();
    expect(updateIssue).toHaveBeenCalledWith({ id: issues[0]?.id, patch: { status: 'done' } });
    finish({ ok: true, data: { id: issues[0]?.id } });
  });

  it('rolls the change back and explains why when the server refuses it', async () => {
    const user = userEvent.setup();
    updateIssue.mockResolvedValue({ ok: false, error: 'notFound' });
    renderList();

    await user.click(screen.getByRole('button', { name: 'Status: Todo' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Done' }));

    expect(
      await screen.findByText(
        'That item no longer exists. Reload the page to see the latest data.',
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Status: Todo' })).toBeInTheDocument(),
    );
  });

  it('keeps the create dialog and the typed title when the server fails, and says so', async () => {
    const user = userEvent.setup();
    createIssue.mockRejectedValue(new Error('500'));
    renderList();

    await user.click(screen.getAllByRole('button', { name: 'New issue' })[0] as HTMLElement);
    await user.type(await screen.findByRole('textbox', { name: /Title/ }), 'Fix the footer');
    await user.click(screen.getByRole('button', { name: 'Create issue' }));

    expect(
      await screen.findByText('Something went wrong. Try again in a moment.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Fix the footer');
  });

  it('has no axe violations', async () => {
    const { container } = renderList();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders the first rows and adds more when the end of the list comes near', () => {
    let reveal: (entries: { isIntersecting: boolean }[]) => void = () => {};
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof reveal) {
          reveal = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const many = Array.from({ length: 30 }, (_, index) =>
      makeIssue({ number: index + 1, title: `Issue ${index + 1}` }),
    );
    renderInWorkspace(
      <WorkspaceChrome>
        <IssuesView issues={many} query={parseIssueQuery(new URLSearchParams())} />
      </WorkspaceChrome>,
    );

    expect(screen.getAllByRole('row')).toHaveLength(13);
    expect(screen.getByText('30 issues')).toBeInTheDocument();

    act(() => reveal([{ isIntersecting: true }]));

    expect(screen.getAllByRole('row')).toHaveLength(25);
    vi.unstubAllGlobals();
  });
});
