import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { single } from "./rows";
import { activities, comments, issueLabels, issues, labels, members, projects, savedViews, teams, workspaces } from "./schema";
import { DEMO_ISSUES, DEMO_LABELS, DEMO_MEMBERS, DEMO_PROJECTS, DEMO_TEAMS, DEMO_WORKSPACE } from "./seed-data";

const DAY = 24 * 60 * 60 * 1000;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Builds a lookup that fails loudly when the fixture references a key it did not create. */
function lookup(entries: [string, string][]) {
    const map = new Map(entries);
    return (key: string) => {
        const value = map.get(key);
        if (value === undefined) throw new Error(`Unknown seed key: ${key}`);
        return value;
    };
}

/** Creates the demo workspace only when it does not exist yet. */
export async function ensureDemoWorkspace(db: Database) {
    const existing = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, DEMO_WORKSPACE.slug));
    if (existing.length === 0) await seedDemoWorkspace(db);
}

/** Deletes the demo workspace (cascading to everything in it) and creates it again from the fixture. */
export async function seedDemoWorkspace(db: Database, now = new Date()) {
    return db.transaction(async (tx) => {
        await tx.delete(workspaces).where(eq(workspaces.slug, DEMO_WORKSPACE.slug));
        const workspace = single(await tx.insert(workspaces).values(DEMO_WORKSPACE).returning());
        const workspaceId = workspace.id;

        const memberRows = await tx
            .insert(members)
            .values(DEMO_MEMBERS.map(({ name, email, isGuest }) => ({ workspaceId, name, email, isGuest })))
            .returning();
        const memberId = lookup(memberRows.map((row, index) => [DEMO_MEMBERS[index]?.key ?? "", row.id]));

        const teamRows = await tx
            .insert(teams)
            .values(
                DEMO_TEAMS.map((team) => ({
                    workspaceId,
                    ...team,
                    issueCounter: DEMO_ISSUES.filter((issue) => issue.team === team.key).length,
                })),
            )
            .returning();
        const teamId = lookup(teamRows.map((row) => [row.key, row.id]));

        const labelRows = await tx
            .insert(labels)
            .values(DEMO_LABELS.map(({ name, color }) => ({ workspaceId, name, color })))
            .returning();
        const labelId = lookup(labelRows.map((row, index) => [DEMO_LABELS[index]?.key ?? "", row.id]));

        const projectRows = await tx
            .insert(projects)
            .values(
                DEMO_PROJECTS.map((project) => ({
                    workspaceId,
                    teamId: teamId(project.team),
                    name: project.name,
                    description: project.description,
                    state: project.state,
                    leadId: memberId(project.lead),
                    targetDate: isoDate(new Date(now.getTime() + project.targetInDays * DAY)),
                })),
            )
            .returning();
        const projectId = lookup(projectRows.map((row, index) => [DEMO_PROJECTS[index]?.key ?? "", row.id]));

        const counters = new Map<string, number>();
        const issueValues = DEMO_ISSUES.map((issue, index) => {
            const number = (counters.get(issue.team) ?? 0) + 1;
            counters.set(issue.team, number);
            // Spread creation over the last few weeks so sorting by date is meaningful.
            const createdAt = new Date(now.getTime() - (DEMO_ISSUES.length - index) * 0.6 * DAY);
            return {
                workspaceId,
                teamId: teamId(issue.team),
                projectId: issue.project ? projectId(issue.project) : null,
                number,
                title: issue.title,
                description: issue.description ?? "",
                status: issue.status,
                priority: issue.priority,
                assigneeId: issue.assignee ? memberId(issue.assignee) : null,
                creatorId: memberId(DEMO_MEMBERS[1 + (index % (DEMO_MEMBERS.length - 1))]?.key ?? "ada"),
                dueDate: issue.dueInDays === undefined ? null : isoDate(new Date(now.getTime() + issue.dueInDays * DAY)),
                sortOrder: (number + 1) * 1000,
                createdAt,
                updatedAt: createdAt,
            };
        });
        const issueRows = await tx.insert(issues).values(issueValues).returning();

        const seeded = DEMO_ISSUES.map((issue, index) => ({ issue, row: single(issueRows.slice(index, index + 1)) }));
        const labelLinks = seeded.flatMap(({ issue, row }) =>
            (issue.labels ?? []).map((key) => ({ issueId: row.id, labelId: labelId(key) })),
        );
        if (labelLinks.length) await tx.insert(issueLabels).values(labelLinks);

        const commentRows = seeded.flatMap(({ issue, row }) =>
            (issue.comments ?? []).map((comment, position) => ({
                issueId: row.id,
                authorId: memberId(comment.author),
                body: comment.body,
                createdAt: new Date(row.createdAt.getTime() + (position + 1) * 3 * 60 * 60 * 1000),
            })),
        );
        if (commentRows.length) await tx.insert(comments).values(commentRows);

        await tx.insert(activities).values(
            issueRows.map((issue) => ({
                issueId: issue.id,
                actorId: issue.creatorId,
                kind: "created" as const,
                createdAt: issue.createdAt,
            })),
        );

        await tx.insert(savedViews).values([
            { workspaceId, name: "Urgent and high", query: "priority=1,2&sort=priority" },
            { workspaceId, name: "Web bugs", query: `team=WEB&label=${labelId("bug")}` },
        ]);

        return { workspaceId, issueCount: issueRows.length };
    });
}
