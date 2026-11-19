import { parseIdentifier } from '@/lib/domain';
import { getIssueDetail, getWorkspaceData } from '@/server/queries';
import { getViewer } from '@/server/session';

/** Lets the proxy answer 404 for a missing issue before the page starts streaming. Reads only the visitor's own workspace. */
export async function GET(request: Request) {
  const parsed = parseIdentifier(new URL(request.url).searchParams.get('identifier') ?? '');
  if (!parsed) return new Response(null, { status: 404 });
  const viewer = await getViewer();
  const data = await getWorkspaceData(viewer.workspaceId, viewer.memberId);
  const team = data.teams.find((item) => item.key === parsed.teamKey);
  const found = team ? await getIssueDetail(team.id, parsed.number) : null;
  return new Response(null, { status: found ? 204 : 404 });
}
