'use client';

import { useTheme } from '@eylulg/ui/chrome';
import {
  CommandGroup,
  CommandItem,
  CommandPalette as LibraryCommandPalette,
} from '@eylulg/ui/command-palette';
import {
  Bookmark,
  Columns3,
  Folder,
  Globe,
  Hash,
  Keyboard,
  List,
  Moon,
  Plus,
  RefreshCcw,
  Sun,
  Tag,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useState } from 'react';
import { track } from '@/features/analytics/analytics';
import { PriorityIcon, StatusIcon } from '@/features/issues/issue-icons';
import { MemberAvatar } from '@/features/issues/member-avatar';
import {
  useAssigneeOptions,
  usePriorityOptions,
  useStatusOptions,
} from '@/features/issues/property-menus';
import { useResetDemo } from '@/features/shell/use-reset-demo';
import { type PaletteMode, useWorkspace } from '@/features/workspace/workspace-context';
import { LOCALE_NAMES } from '@/i18n/locale-names';
import { usePathname, useRouter } from '@/i18n/navigation';
import { type Locale, locales } from '@/i18n/routing';
import { PRIORITIES, STATUSES } from '@/lib/domain';
import type { IssuePatch } from '@/lib/optimistic';

export function CommandPalette() {
  const { palette } = useWorkspace();

  return palette.open ? <PaletteBody mode={palette.mode} /> : null;
}

/** The library `icon` prop takes a component, so a glyph or avatar that depends on the row goes in front of the label. */
function WithIcon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className='flex min-w-0 items-center gap-2'>
      {icon}
      <span className='truncate'>{children}</span>
    </span>
  );
}

function PaletteBody({ mode }: { mode: PaletteMode }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { setTheme } = useTheme();
  const {
    data,
    issueIndex,
    activeIssue,
    openPalette,
    closePalette,
    setCreateOpen,
    setHelpOpen,
    updateIssue,
  } = useWorkspace();
  const statusOptions = useStatusOptions();
  const priorityOptions = usePriorityOptions();
  const assigneeOptions = useAssigneeOptions();
  const resetDemo = useResetDemo();
  const [search, setSearch] = useState('');

  const target = activeIssue;
  const identifier = target?.identifier ?? '';
  const pageTitles = {
    status: t('palette.changeStatus'),
    priority: t('palette.changePriority'),
    assignee: t('palette.changeAssignee'),
  };
  const page = mode === 'root' ? undefined : { id: mode, title: pageTitles[mode] };
  const placeholder =
    mode === 'root' ? t('palette.placeholder') : t(`palette.${mode}Placeholder`, { identifier });

  useEffect(() => {
    track('palette_opened', { mode });
  }, [mode]);

  function handleOpenChange(open: boolean) {
    if (!open) closePalette();
  }

  function run(action: () => void) {
    return () => {
      closePalette();
      action();
    };
  }

  function go(href: string) {
    return run(() => router.push(href));
  }

  function openPage(next: PaletteMode) {
    return () => {
      setSearch('');
      openPalette(next);
    };
  }

  function patchTarget(patch: IssuePatch) {
    return run(() => {
      if (target) updateIssue(target, patch);
    });
  }

  function switchLocale(next: Locale) {
    return run(() => router.replace(`${pathname}${window.location.search}`, { locale: next }));
  }

  function handleCreate() {
    setCreateOpen(true);
  }

  function handleHelp() {
    setHelpOpen(true);
  }

  function handleLightTheme() {
    setTheme('light');
  }

  function handleDarkTheme() {
    setTheme('dark');
  }

  return (
    <LibraryCommandPalette
      isOpen
      onOpenChange={handleOpenChange}
      closeOnAction={false}
      onSearchChange={setSearch}
      page={page}
      onBack={openPage('root')}
      backLabel={t('palette.back')}
      label={t('palette.label')}
      searchLabel={t('palette.searchLabel')}
      placeholder={placeholder}
      emptyState={t('palette.noResults')}
    >
      {mode === 'status' && target && (
        <CommandGroup heading={t('palette.setStatusFor', { identifier })}>
          {STATUSES.map((status, index) => (
            <CommandItem
              key={status}
              id={status}
              textValue={statusOptions[index]?.label}
              onAction={patchTarget({ status })}
            >
              <WithIcon icon={<StatusIcon status={status} />}>
                {statusOptions[index]?.label}
                {status === target.status && (
                  <span className='sr-only'> ({t('palette.current')})</span>
                )}
              </WithIcon>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {mode === 'priority' && target && (
        <CommandGroup heading={t('palette.setPriorityFor', { identifier })}>
          {PRIORITIES.map((priority, index) => (
            <CommandItem
              key={priority}
              id={String(priority)}
              textValue={priorityOptions[index]?.label}
              onAction={patchTarget({ priority })}
            >
              <WithIcon icon={<PriorityIcon priority={priority} />}>
                {priorityOptions[index]?.label}
              </WithIcon>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {mode === 'assignee' && target && (
        <CommandGroup heading={t('palette.assign', { identifier })}>
          {assigneeOptions.map((option) => (
            <CommandItem
              key={option.id}
              id={option.id}
              textValue={option.label}
              onAction={patchTarget({ assigneeId: option.id === 'none' ? null : option.id })}
            >
              <WithIcon icon={option.icon}>{option.label}</WithIcon>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {mode === 'root' && target && (
        <CommandGroup heading={identifier}>
          <CommandItem
            id='set-status'
            textValue={t('palette.changeStatus')}
            shortcut={['S']}
            onAction={openPage('status')}
          >
            <WithIcon icon={<StatusIcon status={target.status} />}>
              {t('palette.changeStatus')}
            </WithIcon>
          </CommandItem>
          <CommandItem
            id='set-priority'
            textValue={t('palette.changePriority')}
            shortcut={['P']}
            onAction={openPage('priority')}
          >
            <WithIcon icon={<PriorityIcon priority={target.priority} />}>
              {t('palette.changePriority')}
            </WithIcon>
          </CommandItem>
          <CommandItem
            id='assign'
            textValue={t('palette.changeAssignee')}
            shortcut={['A']}
            onAction={openPage('assignee')}
          >
            <WithIcon
              icon={
                <MemberAvatar
                  member={data.members.find((member) => member.id === target.assigneeId)}
                />
              }
            >
              {t('palette.changeAssignee')}
            </WithIcon>
          </CommandItem>
        </CommandGroup>
      )}
      {mode === 'root' && (
        <>
          <CommandGroup heading={t('palette.actions')}>
            <CommandItem id='create' icon={Plus} shortcut={['C']} onAction={run(handleCreate)}>
              {t('palette.createIssue')}
            </CommandItem>
            <CommandItem id='shortcuts' icon={Keyboard} shortcut={['?']} onAction={run(handleHelp)}>
              {t('palette.shortcuts')}
            </CommandItem>
            <CommandItem id='light' icon={Sun} onAction={run(handleLightTheme)}>
              {t('palette.lightTheme')}
            </CommandItem>
            <CommandItem id='dark' icon={Moon} onAction={run(handleDarkTheme)}>
              {t('palette.darkTheme')}
            </CommandItem>
            {locales
              .filter((item) => item !== locale)
              .map((item) => (
                <CommandItem
                  key={item}
                  id={`locale-${item}`}
                  icon={Globe}
                  textValue={`${t('palette.language')} ${LOCALE_NAMES[item]}`}
                  onAction={switchLocale(item)}
                >
                  {t('palette.language')} <span lang={item}>{LOCALE_NAMES[item]}</span>
                </CommandItem>
              ))}
            <CommandItem id='reset' icon={RefreshCcw} onAction={run(resetDemo)}>
              {t('palette.resetDemo')}
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading={t('palette.navigation')}>
            <CommandItem id='go-issues' icon={List} shortcut={['G', 'I']} onAction={go('/issues')}>
              {t('palette.goIssues')}
            </CommandItem>
            <CommandItem id='go-board' icon={Columns3} onAction={go('/issues?view=board')}>
              {t('palette.goBoard')}
            </CommandItem>
            <CommandItem
              id='go-projects'
              icon={Folder}
              shortcut={['G', 'P']}
              onAction={go('/projects')}
            >
              {t('palette.goProjects')}
            </CommandItem>
            <CommandItem id='go-labels' icon={Tag} shortcut={['G', 'L']} onAction={go('/labels')}>
              {t('palette.goLabels')}
            </CommandItem>
            {data.teams.map((team) => (
              <CommandItem
                key={team.id}
                id={`team-${team.id}`}
                icon={Hash}
                onAction={go(`/issues?team=${team.key}`)}
              >
                {t('palette.teamIssues', { team: team.name })}
              </CommandItem>
            ))}
            {data.savedViews.map((view) => (
              <CommandItem
                key={view.id}
                id={`view-${view.id}`}
                icon={Bookmark}
                onAction={go(`/issues?${view.query}`)}
              >
                {view.name}
              </CommandItem>
            ))}
          </CommandGroup>
          {search.trim().length > 0 && (
            <CommandGroup heading={t('palette.issues')}>
              {issueIndex.map((issue) => (
                <CommandItem
                  key={issue.id}
                  id={`issue-${issue.id}`}
                  textValue={`${issue.identifier} ${issue.identifier.replace('-', ' ')} ${issue.title}`}
                  onAction={go(`/issue/${issue.identifier}`)}
                >
                  <WithIcon icon={<StatusIcon status={issue.status} />}>
                    <span className='mr-2 font-data text-xs text-tertiary tabular-nums'>
                      {issue.identifier}
                    </span>
                    {issue.title}
                  </WithIcon>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </>
      )}
    </LibraryCommandPalette>
  );
}
