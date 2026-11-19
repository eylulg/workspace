'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useWorkspace } from '@/features/workspace/workspace-context';
import type { IssueDetail } from '@/server/queries';

type Entry = IssueDetail['activity'][number];

/** One line of the activity log, with raw stored values turned into translated names. */
export function ActivityLine({ entry }: { entry: Entry }) {
  const t = useTranslations();
  const format = useFormatter();
  const { data } = useWorkspace();

  function nameOf(value: string | null): string {
    if (value === null) return t('activity.none');
    switch (entry.kind) {
      case 'status':
        return t(`status.${value}`);
      case 'priority':
        return t(`priority.${value}`);
      case 'assignee':
        return data.members.find((member) => member.id === value)?.name ?? t('issue.someone');
      case 'project':
        return (
          data.projects.find((project) => project.id === value)?.name ??
          t('activity.removedProject')
        );
      case 'labels':
        return (
          value
            .split(',')
            .map((id) => data.labels.find((label) => label.id === id)?.name)
            .filter(Boolean)
            .join(', ') || t('activity.none')
        );
      case 'due_date':
        return format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: 'medium' });
      default:
        return value;
    }
  }

  const actor =
    data.members.find((member) => member.id === entry.actorId)?.name ?? t('issue.someone');
  const message = t(`activity.${entry.kind}`, {
    actor,
    from: nameOf(entry.fromValue),
    to: nameOf(entry.toValue),
  });

  return (
    <p className='flex flex-wrap items-baseline gap-x-2 pl-1 text-sm text-tertiary'>
      <span>{message}</span>
      <time dateTime={entry.createdAt} className='text-xs text-tertiary'>
        {format.dateTime(new Date(entry.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}
      </time>
    </p>
  );
}
