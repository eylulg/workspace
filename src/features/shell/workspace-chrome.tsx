'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { useGlobalShortcuts } from '@/features/shortcuts/use-global-shortcuts';
import { useWorkspace } from '@/features/workspace/workspace-context';
import { useOpenedOnce } from '@/hooks/use-opened-once';

// The dialogs pull in React Aria's dialog, combobox, select and menu code. Nothing renders until the first open,
// so that code stays out of the first load. Once mounted a dialog stays, so it keeps its own close animation.
const CommandPalette = dynamic(
  () => import('@/features/palette/command-palette').then((module) => module.CommandPalette),
  { ssr: false },
);
const CreateIssueDialog = dynamic(
  () => import('@/features/issues/create-issue-dialog').then((module) => module.CreateIssueDialog),
  {
    ssr: false,
  },
);
const ShortcutsDialog = dynamic(
  () => import('@/features/shortcuts/shortcuts-dialog').then((module) => module.ShortcutsDialog),
  {
    ssr: false,
  },
);

/** Client side layer around the page: global dialogs and keyboard shortcuts. */
export function WorkspaceChrome({ children }: { children: ReactNode }) {
  const { palette, createOpen, helpOpen } = useWorkspace();
  const paletteOpened = useOpenedOnce(palette.open);
  const createOpened = useOpenedOnce(createOpen);
  const helpOpened = useOpenedOnce(helpOpen);
  useGlobalShortcuts();

  return (
    <>
      {children}
      {paletteOpened && <CommandPalette />}
      {createOpened && <CreateIssueDialog />}
      {helpOpened && <ShortcutsDialog />}
    </>
  );
}
