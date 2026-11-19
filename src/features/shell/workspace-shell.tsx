import { AppShell, SiteFooter } from '@eylulg/ui/chrome';
import { Skeleton } from '@eylulg/ui/skeleton';
import { getTranslations } from 'next-intl/server';
import { type ReactNode, Suspense } from 'react';
import { WorkspaceProvider } from '@/features/workspace/workspace-context';
import { getWorkspaceData, getWorkspaceIssues } from '@/server/queries';
import { getViewer } from '@/server/session';
import { Nav } from './nav';
import { Sidebar } from './sidebar';
import { WorkspaceChrome } from './workspace-chrome';

/** Server component: loads the workspace once per request and hands it to the client chrome. */
export async function WorkspaceShell({ children }: { children: ReactNode }) {
  const t = await getTranslations('common');
  const tf = await getTranslations('chrome.siteFooter');
  const viewer = await getViewer();
  const data = await getWorkspaceData(viewer.workspaceId, viewer.memberId);
  const issues = await getWorkspaceIssues(data);
  const issueIndex = issues.map(
    ({ id, identifier, title, status, priority, assigneeId, teamId }) => ({
      id,
      identifier,
      title,
      status,
      priority,
      assigneeId,
      teamId,
    }),
  );
  return (
    <WorkspaceProvider data={data} issueIndex={issueIndex}>
      <WorkspaceChrome>
        <AppShell
          header={
            <Suspense>
              <Nav />
            </Suspense>
          }
          sidebar={
            <Suspense>
              <Sidebar />
            </Suspense>
          }
          footer={
            <SiteFooter
              currentId='workspace'
              labels={{
                intro: tf('intro'),
                projectsNav: tf('projectsNav'),
                source: tf('source'),
                profilesNav: tf('profilesNav'),
                github: tf('github'),
                linkedin: tf('linkedin'),
                builtWith: tf('builtWith'),
              }}
            />
          }
          skipLinkLabel={t('skipToContent')}
        >
          {children}
        </AppShell>
      </WorkspaceChrome>
    </WorkspaceProvider>
  );
}

export const ShellFallback = () => (
  <div className='flex min-h-dvh flex-col bg-primary' aria-busy='true'>
    <div className='h-14 border-b border-subtle' />
    <div className='flex flex-1'>
      <div className='hidden w-64 shrink-0 border-r border-subtle md:block' />
      <div className='flex flex-1 flex-col gap-4 p-8'>
        <Skeleton shape='rect' className='h-8 w-48' />
        <Skeleton shape='rect' className='h-48 w-full' />
      </div>
    </div>
  </div>
);
