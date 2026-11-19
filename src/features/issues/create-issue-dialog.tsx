'use client';

import { Button } from '@eylulg/ui/button';
import { Dialog } from '@eylulg/ui/dialog';
import { Input } from '@eylulg/ui/input';
import { Select, SelectItem } from '@eylulg/ui/select';
import { Textarea } from '@eylulg/ui/textarea';
import { useToast } from '@eylulg/ui/toast';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type FormEvent, useState, useTransition } from 'react';
import type { Key, KeyboardEvent } from 'react-aria-components';
import { track } from '@/features/analytics/analytics';
import { useWorkspace } from '@/features/workspace/workspace-context';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useRouter } from '@/i18n/navigation';
import type { IssueSummary } from '@/lib/domain';
import { createIssue } from '@/server/actions/issues';
import { AssigneeMenu, LabelsMenu, PriorityMenu, ProjectMenu, StatusMenu } from './property-menus';

type Draft = Pick<
  IssueSummary,
  'title' | 'status' | 'priority' | 'assigneeId' | 'projectId' | 'labelIds'
> & {
  description: string;
  dueDate: string;
};

export const DATE_INPUT_CLASS =
  'h-control-sm rounded-md border border-control bg-primary px-2 text-sm text-primary outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-focus/25';

export function CreateIssueDialog() {
  const t = useTranslations();
  const params = useSearchParams();
  const { data, createOpen, setCreateOpen } = useWorkspace();
  const [pickedTeamId, setPickedTeamId] = useState<string | null>(null);
  const defaultTeam =
    data.teams.find((team) => team.key === params.get('team')?.toUpperCase()) ?? data.teams[0];
  const teamId = pickedTeamId ?? defaultTeam?.id ?? '';

  function handleOpenChange(open: boolean) {
    setCreateOpen(open);
    if (!open) setPickedTeamId(null);
  }

  function handleDone() {
    handleOpenChange(false);
  }

  function handleTeamChange(key: Key | null) {
    if (key !== null) setPickedTeamId(String(key));
  }

  const teamSelect = (
    <Select
      aria-label={t('create.team')}
      className='w-44'
      selectedKey={teamId}
      onSelectionChange={handleTeamChange}
      items={data.teams}
    >
      {(team) => (
        <SelectItem id={team.id} textValue={team.name} description={team.key}>
          {team.name}
        </SelectItem>
      )}
    </Select>
  );

  return (
    <Dialog
      isOpen={createOpen}
      onOpenChange={handleOpenChange}
      size='lg'
      title={t('create.title')}
      closeLabel={t('common.close')}
      headerActions={teamSelect}
    >
      {createOpen ? <CreateIssueForm teamId={teamId} onDone={handleDone} /> : null}
    </Dialog>
  );
}

function CreateIssueForm({ teamId, onDone }: { teamId: string; onDone: () => void }) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const { data } = useWorkspace();
  const mounted = useIsMounted();
  const [draft, setDraft] = useState<Draft>({
    title: '',
    description: '',
    status: 'todo',
    priority: 0,
    assigneeId: null,
    projectId: null,
    labelIds: [],
    dueDate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // A project chosen for another team no longer applies after the team changes.
  const projectId = data.projects.some(
    (project) => project.id === draft.projectId && project.teamId === teamId,
  )
    ? draft.projectId
    : null;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    if (!draft.title.trim()) {
      setError(t('errors.titleRequired'));
      return;
    }
    startTransition(async () => {
      const result = await createIssue({
        ...draft,
        teamId,
        projectId,
        dueDate: draft.dueDate || null,
      }).catch(() => null);
      if (!result) {
        toast({ title: t('errors.unknown'), variant: 'error' });
        return;
      }
      if (!result.ok) {
        if (mounted.current) setError(t(`errors.${result.error}`));
        return;
      }
      const { identifier } = result.data;
      track('issue_created', { teamId, priority: draft.priority, hasProject: projectId !== null });
      toast({
        title: t('create.created', { identifier }),
        variant: 'success',
        action: { label: t('create.view'), onPress: () => router.push(`/issue/${identifier}`) },
      });
      onDone();
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  // Cmd or Ctrl + Enter submits from the text fields, like in Linear. React Aria stops every other key
  // at the field, so Escape would never reach the dialog without continuePropagation.
  function handleFieldKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) {
      event.continuePropagation();
      return;
    }
    event.preventDefault();
    submit();
  }

  function handleTitleChange(value: string) {
    set('title', value);
    setError(null);
  }

  function handleDescriptionChange(value: string) {
    set('description', value);
  }

  function handleStatusChange(value: Draft['status']) {
    set('status', value);
  }

  function handlePriorityChange(value: Draft['priority']) {
    set('priority', value);
  }

  function handleAssigneeChange(value: string | null) {
    set('assigneeId', value);
  }

  function handleProjectChange(value: string | null) {
    set('projectId', value);
  }

  function handleLabelsChange(value: string[]) {
    set('labelIds', value);
  }

  function handleDueDateChange(event: ChangeEvent<HTMLInputElement>) {
    set('dueDate', event.target.value);
  }

  return (
    <form className='flex flex-col gap-5' onSubmit={handleSubmit}>
      <Input
        label={t('create.titleLabel')}
        placeholder={t('create.titlePlaceholder')}
        value={draft.title}
        onChange={handleTitleChange}
        onKeyDown={handleFieldKeyDown}
        isRequired
        validationBehavior='aria'
        autoFocus
        isInvalid={error !== null}
        errorMessage={error ?? undefined}
        name='title'
      />

      <Textarea
        label={t('create.descriptionLabel')}
        placeholder={t('create.descriptionPlaceholder')}
        value={draft.description}
        onChange={handleDescriptionChange}
        onKeyDown={handleFieldKeyDown}
        rows={5}
      />

      <fieldset className='flex flex-col gap-2'>
        <legend className='mb-2 text-sm font-medium text-secondary'>{t('issue.properties')}</legend>
        <div className='flex flex-wrap items-center gap-1 rounded-lg border border-subtle bg-secondary p-1'>
          <StatusMenu value={draft.status} onChange={handleStatusChange} />
          <PriorityMenu value={draft.priority} onChange={handlePriorityChange} />
          <AssigneeMenu value={draft.assigneeId} onChange={handleAssigneeChange} />
          <ProjectMenu teamId={teamId} value={projectId} onChange={handleProjectChange} />
          <LabelsMenu value={draft.labelIds} onChange={handleLabelsChange} />
          <label className='flex h-control-sm items-center gap-2 rounded-md px-2 text-sm text-secondary'>
            <span>{t('issue.dueDate')}</span>
            <input
              type='date'
              value={draft.dueDate}
              onChange={handleDueDateChange}
              className={DATE_INPUT_CLASS}
            />
          </label>
        </div>
      </fieldset>

      <div className='flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-xs text-tertiary'>{t('create.submitHint')}</p>
        <div className='flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
          <Button variant='secondary' onPress={onDone}>
            {t('common.cancel')}
          </Button>
          <Button type='submit' isLoading={isPending}>
            {t('create.submit')}
          </Button>
        </div>
      </div>
    </form>
  );
}
