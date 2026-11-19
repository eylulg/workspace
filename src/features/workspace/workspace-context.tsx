'use client';

import { type ReactNode, createContext, useContext, useRef, useState } from 'react';
import type { IssueSummary, WorkspaceData } from '@/lib/domain';
import type { IssuePatch } from '@/lib/optimistic';
import { useIssueMutations } from '../issues/use-issue-mutations';

export type IssueIndexEntry = Pick<
  IssueSummary,
  'id' | 'identifier' | 'title' | 'status' | 'priority' | 'assigneeId' | 'teamId'
>;

/** Palette pages that act on the active issue. */
export type PaletteMode = 'root' | 'status' | 'priority' | 'assignee';

type IssueUpdater = (issue: IssueIndexEntry, patch: IssuePatch) => void;

interface WorkspaceContextValue {
  data: WorkspaceData;
  issueIndex: IssueIndexEntry[];
  /** The issue that s, p and a act on: the focused or hovered row or card, or the open issue page. */
  activeIssue: IssueIndexEntry | null;
  setActiveIssue: (issue: IssueIndexEntry | null) => void;
  palette: { open: boolean; mode: PaletteMode };
  openPalette: (mode?: PaletteMode) => void;
  closePalette: () => void;
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  /** The view that owns the optimistic list registers how to apply a change, so the palette updates it instantly. */
  registerUpdater: (updater: IssueUpdater | null) => void;
  updateIssue: IssueUpdater;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  data,
  issueIndex,
  children,
}: {
  data: WorkspaceData;
  issueIndex: IssueIndexEntry[];
  children: ReactNode;
}) {
  // Without a registered view (for example on the projects page) changes go straight to the server.
  const fallback = useIssueMutations(null);
  const [activeIssue, setActiveIssue] = useState<IssueIndexEntry | null>(null);
  const [palette, setPalette] = useState<{ open: boolean; mode: PaletteMode }>({
    open: false,
    mode: 'root',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const updater = useRef<IssueUpdater | null>(null);

  function registerUpdater(next: IssueUpdater | null) {
    updater.current = next;
  }

  function updateIssue(issue: IssueIndexEntry, patch: IssuePatch) {
    (updater.current ?? fallback.update)(issue, patch);
  }

  function openPalette(mode: PaletteMode = 'root') {
    setPalette({ open: true, mode });
  }

  function closePalette() {
    setPalette((current) => ({ ...current, open: false }));
  }

  const value: WorkspaceContextValue = {
    data,
    issueIndex,
    activeIssue,
    setActiveIssue,
    palette,
    openPalette,
    closePalette,
    createOpen,
    setCreateOpen,
    helpOpen,
    setHelpOpen,
    registerUpdater,
    updateIssue,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return value;
}
