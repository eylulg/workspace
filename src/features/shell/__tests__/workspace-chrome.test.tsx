import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { IssuesView } from '@/features/issues/issues-view';
import { parseIssueQuery } from '@/lib/issue-query';
import { ids, makeIssue } from '@/test-utils/fixtures';
import { router } from '@/test-utils/navigation-mock';
import { renderInWorkspace } from '@/test-utils/render';
import { WorkspaceChrome } from '../workspace-chrome';

const actions = vi.hoisted(() => ({ createIssue: vi.fn(), updateIssue: vi.fn() }));
vi.mock('@/server/actions/issues', () => ({
  ...actions,
  moveIssue: vi.fn(),
  deleteIssue: vi.fn(),
  restoreIssue: vi.fn(),
  addComment: vi.fn(),
}));

const issue = makeIssue({ number: 7, title: 'Date picker opens off screen', status: 'todo' });

function renderApp() {
  return renderInWorkspace(
    <WorkspaceChrome>
      <IssuesView issues={[issue]} query={parseIssueQuery(new URLSearchParams())} />
    </WorkspaceChrome>,
  );
}

// The palette and dialogs load on first use; loading them here keeps that
// first transform out of each test's wait.
beforeAll(() =>
  Promise.all([
    import('@/features/palette/command-palette'),
    import('@/features/issues/create-issue-dialog'),
    import('@/features/shortcuts/shortcuts-dialog'),
  ]),
);

beforeEach(() => {
  actions.createIssue.mockReset();
  actions.updateIssue.mockReset().mockResolvedValue({ ok: true, data: { id: issue.id } });
});

describe('keyboard shortcuts', () => {
  it('opens the create dialog with c and puts focus in the title', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.keyboard('c');

    expect(await screen.findByRole('textbox', { name: /Title/ })).toHaveFocus();
  });

  it('blocks creating an issue without a title and does not call the server', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.keyboard('c');

    await user.click(await screen.findByRole('button', { name: 'Create issue' }));

    expect(await screen.findByText('Enter a title.')).toBeInTheDocument();
    expect(actions.createIssue).not.toHaveBeenCalled();
  });

  it('creates an issue with Cmd and Enter, closes the dialog and confirms with a toast', async () => {
    const user = userEvent.setup();
    actions.createIssue.mockResolvedValue({ ok: true, data: { id: 'new', identifier: 'WEB-61' } });
    renderApp();
    await user.keyboard('c');

    await user.type(
      await screen.findByRole('textbox', { name: /Title/ }),
      'Export fails for large files',
    );
    await user.keyboard('{Meta>}{Enter}{/Meta}');

    expect(await screen.findByText('Created WEB-61')).toBeInTheDocument();
    expect(actions.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: ids.web,
        title: 'Export fails for large files',
        status: 'todo',
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sets the status of the hovered issue with s', async () => {
    const user = userEvent.setup();
    actions.updateIssue.mockReturnValue(new Promise(() => {}));
    renderApp();

    await user.hover(screen.getByRole('link', { name: /Date picker opens off screen/ }));
    await user.keyboard('s');
    // The first open loads the library's menu chunk, which is slow on CI runners.
    await user.click(await screen.findByRole('menuitem', { name: /In review/ }, { timeout: 5000 }));

    expect(actions.updateIssue).toHaveBeenCalledWith({
      id: issue.id,
      patch: { status: 'in_review' },
    });
    expect(await screen.findByRole('button', { name: 'Status: In review' })).toBeInTheDocument();
  });

  it('navigates with g then p', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.keyboard('gp');

    expect(router.push).toHaveBeenCalledWith('/en/projects');
  });

  it('lists every shortcut in the help dialog opened with ?', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.keyboard('?');

    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(within(dialog).getByRole('rowheader', { name: 'Create an issue' })).toBeInTheDocument();
  });
});

describe('command palette', () => {
  it('opens with Cmd and K, finds an issue by identifier and opens it', async () => {
    const user = userEvent.setup();
    renderInWorkspace(
      <WorkspaceChrome>
        <p>Page</p>
      </WorkspaceChrome>,
      { issueIndex: [issue] },
    );

    await user.keyboard('{Meta>}k{/Meta}');
    await user.keyboard('WEB-7');
    await user.keyboard('{Enter}');

    expect(router.push).toHaveBeenCalledWith('/en/issue/WEB-7');
  });
});
