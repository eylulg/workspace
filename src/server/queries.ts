import "server-only";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { IssueSummary, Priority, Status, WorkspaceData } from "@/lib/domain";
import { identifierOf } from "@/lib/domain";
import { teamTag, workspaceTag } from "./cache-tags";
import { getDb } from "./db/client";
import { single } from "./db/rows";
import { activities, comments, issueLabels, issues, labels, members, projects, savedViews, teams } from "./db/schema";

/*
 * Reads are cached with `use cache` and tagged per team (issues) or per workspace (everything else).
 * Server Actions call `updateTag` with the same tags, so the next render reads fresh rows.
 * Every function takes ids from getViewer(), which reads cookies, so nothing here runs at build time.
 */

export async function getWorkspaceData(workspaceId: string, viewerId: string): Promise<WorkspaceData> {
    "use cache";
    cacheLife("minutes");
    cacheTag(workspaceTag(workspaceId));
    const db = await getDb();
    const [teamRows, memberRows, labelRows, projectRows, viewRows] = await Promise.all([
        db
            .select({ id: teams.id, key: teams.key, name: teams.name })
            .from(teams)
            .where(eq(teams.workspaceId, workspaceId))
            .orderBy(asc(teams.name)),
        db
            .select({ id: members.id, name: members.name, email: members.email, isGuest: members.isGuest })
            .from(members)
            .where(eq(members.workspaceId, workspaceId))
            .orderBy(desc(members.isGuest), asc(members.name)),
        db
            .select({ id: labels.id, name: labels.name, color: labels.color })
            .from(labels)
            .where(eq(labels.workspaceId, workspaceId))
            .orderBy(asc(labels.name)),
        db
            .select({
                id: projects.id,
                teamId: projects.teamId,
                name: projects.name,
                description: projects.description,
                state: projects.state,
                leadId: projects.leadId,
                targetDate: projects.targetDate,
            })
            .from(projects)
            .where(eq(projects.workspaceId, workspaceId))
            .orderBy(asc(projects.createdAt), asc(projects.name)),
        db
            .select({ id: savedViews.id, name: savedViews.name, query: savedViews.query })
            .from(savedViews)
            .where(eq(savedViews.workspaceId, workspaceId))
            .orderBy(asc(savedViews.createdAt)),
    ]);
    return { workspaceId, viewerId, teams: teamRows, members: memberRows, labels: labelRows, projects: projectRows, savedViews: viewRows };
}

async function getTeamIssues(teamId: string): Promise<IssueSummary[]> {
    "use cache";
    cacheLife("minutes");
    cacheTag(teamTag(teamId));
    const db = await getDb();
    const rows = await db
        .select({
            id: issues.id,
            teamKey: teams.key,
            teamId: issues.teamId,
            number: issues.number,
            title: issues.title,
            status: issues.status,
            priority: issues.priority,
            assigneeId: issues.assigneeId,
            projectId: issues.projectId,
            dueDate: issues.dueDate,
            sortOrder: issues.sortOrder,
            createdAt: issues.createdAt,
            updatedAt: issues.updatedAt,
            labelIds: sql<
                string[]
            >`coalesce(array_agg(${issueLabels.labelId}::text) filter (where ${issueLabels.labelId} is not null), '{}')`,
        })
        .from(issues)
        .innerJoin(teams, eq(teams.id, issues.teamId))
        .leftJoin(issueLabels, eq(issueLabels.issueId, issues.id))
        .where(and(eq(issues.teamId, teamId), isNull(issues.deletedAt)))
        .groupBy(issues.id, teams.key)
        .orderBy(asc(issues.sortOrder));
    return rows.map(({ teamKey, ...row }) => ({
        ...row,
        identifier: identifierOf(teamKey, row.number),
        status: row.status as Status,
        priority: row.priority as Priority,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    }));
}

/** All live issues across the workspace, each team read through its own cache entry. */
export async function getWorkspaceIssues(data: WorkspaceData): Promise<IssueSummary[]> {
    const perTeam = await Promise.all(data.teams.map((team) => getTeamIssues(team.id)));
    return perTeam.flat();
}

export interface IssueDetail {
    issue: IssueSummary & { description: string; creatorId: string | null };
    comments: { id: string; authorId: string | null; body: string; createdAt: string }[];
    activity: { id: string; actorId: string | null; kind: string; fromValue: string | null; toValue: string | null; createdAt: string }[];
}

export async function getIssueDetail(teamId: string, number: number): Promise<IssueDetail | null> {
    "use cache";
    cacheLife("minutes");
    cacheTag(teamTag(teamId));
    const db = await getDb();
    const summary = (await getTeamIssues(teamId)).find((issue) => issue.number === number);
    if (!summary) return null;
    const extra = single(
        await db.select({ description: issues.description, creatorId: issues.creatorId }).from(issues).where(eq(issues.id, summary.id)),
    );
    const [commentRows, activityRows] = await Promise.all([
        db
            .select({ id: comments.id, authorId: comments.authorId, body: comments.body, createdAt: comments.createdAt })
            .from(comments)
            .where(eq(comments.issueId, summary.id))
            .orderBy(asc(comments.createdAt)),
        db
            .select({
                id: activities.id,
                actorId: activities.actorId,
                kind: activities.kind,
                fromValue: activities.fromValue,
                toValue: activities.toValue,
                createdAt: activities.createdAt,
            })
            .from(activities)
            .where(eq(activities.issueId, summary.id))
            .orderBy(asc(activities.createdAt)),
    ]);
    return {
        issue: { ...summary, ...extra },
        comments: commentRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
        activity: activityRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    };
}

export async function getLabelUsage(workspaceId: string, teamIds: string[]): Promise<Record<string, number>> {
    "use cache";
    cacheLife("minutes");
    cacheTag(workspaceTag(workspaceId), ...teamIds.map(teamTag));
    const db = await getDb();
    const rows = await db
        .select({ labelId: issueLabels.labelId, total: count() })
        .from(issueLabels)
        .innerJoin(issues, eq(issues.id, issueLabels.issueId))
        .where(and(eq(issues.workspaceId, workspaceId), isNull(issues.deletedAt)))
        .groupBy(issueLabels.labelId);
    return Object.fromEntries(rows.map((row) => [row.labelId, row.total]));
}
