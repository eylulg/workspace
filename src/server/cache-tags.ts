/** One tag per team for its issues, and one per workspace for teams, members, labels, projects and views. */
export const teamTag = (teamId: string) => `team:${teamId}`;
export const workspaceTag = (workspaceId: string) => `workspace:${workspaceId}`;
