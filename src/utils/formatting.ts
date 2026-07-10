/**
 * Work item → readable text formatting utilities.
 *
 * Types are inferred from azure-devops-node-api API return types
 * to avoid deep path import issues with Node16 module resolution.
 */

import type { IWorkItemTrackingApi } from "azure-devops-node-api/WorkItemTrackingApi";

/** Inferred types from the Azure DevOps API */
type WorkItem = NonNullable<Awaited<ReturnType<IWorkItemTrackingApi["getWorkItem"]>>>;
type WorkItemType = NonNullable<Awaited<ReturnType<IWorkItemTrackingApi["getWorkItemType"]>>>;
type CommentList = NonNullable<Awaited<ReturnType<IWorkItemTrackingApi["getComments"]>>>;

/**
 * Format a single work item into readable text.
 */
export function formatWorkItem(wi: WorkItem): string {
	const fields = (wi.fields ?? {}) as Record<string, unknown>;
	const lines: string[] = [];

	lines.push(`# Work Item ${wi.id}: ${fields["System.Title"] ?? "(untitled)"}`);
	lines.push(`- **Type:** ${fields["System.WorkItemType"] ?? "Unknown"}`);
	lines.push(`- **State:** ${fields["System.State"] ?? "Unknown"}`);
	lines.push(`- **Reason:** ${fields["System.Reason"] ?? ""}`);

	const assigned = fields["System.AssignedTo"];
	if (assigned && typeof assigned === "object" && "displayName" in (assigned as object)) {
		lines.push(`- **Assigned To:** ${(assigned as { displayName: string }).displayName}`);
	} else if (assigned) {
		lines.push(`- **Assigned To:** ${String(assigned)}`);
	} else {
		lines.push(`- **Assigned To:** (unassigned)`);
	}

	if (fields["System.AreaPath"]) lines.push(`- **Area Path:** ${fields["System.AreaPath"]}`);
	if (fields["System.IterationPath"]) lines.push(`- **Iteration Path:** ${fields["System.IterationPath"]}`);
	if (fields["System.Priority"]) lines.push(`- **Priority:** ${fields["System.Priority"]}`);
	if (fields["Microsoft.VSTS.Common.Severity"]) lines.push(`- **Severity:** ${fields["Microsoft.VSTS.Common.Severity"]}`);

	if (fields["System.Description"]) {
		lines.push("");
		lines.push("## Description");
		lines.push(String(fields["System.Description"]));
	}

	if (fields["System.Tags"]) {
		lines.push("");
		lines.push(`**Tags:** ${fields["System.Tags"]}`);
	}

	if (wi.url) {
		lines.push("");
		lines.push(`**URL:** ${wi.url}`);
	}

	return lines.join("\n");
}

/**
 * Format a work item summary (compact, for lists).
 */
export function formatWorkItemSummary(wi: WorkItem): string {
	const fields = (wi.fields ?? {}) as Record<string, unknown>;
	const type = fields["System.WorkItemType"] ?? "?";
	const state = fields["System.State"] ?? "?";
	const title = fields["System.Title"] ?? "(untitled)";
	return `#${wi.id} [${type}] [${state}] ${title}`;
}

/**
 * Format a list of work items.
 */
export function formatWorkItemList(workItems: WorkItem[]): string {
	if (workItems.length === 0) return "No work items found.";
	return workItems.map(formatWorkItemSummary).join("\n");
}

/**
 * Format a work item type.
 */
export function formatWorkItemType(wit: WorkItemType): string {
	const lines: string[] = [];
	lines.push(`**${wit.name}** (${wit.referenceName})`);
	if (wit.description) lines.push(`  ${wit.description}`);
	if (wit.states && wit.states.length > 0) {
		lines.push(`  States: ${wit.states.map((s: { name?: string }) => s.name ?? "").join(", ")}`);
	}
	return lines.join("\n");
}

/**
 * Format a list of work item types.
 */
export function formatWorkItemTypeList(types: WorkItemType[]): string {
	if (types.length === 0) return "No work item types found.";
	return types.map(formatWorkItemType).join("\n");
}

/**
 * Format comments on a work item.
 */
export function formatComments(commentList: CommentList): string {
	const comments = commentList.comments ?? [];
	if (comments.length === 0) return "No comments.";

	const lines: string[] = [];
	for (const c of comments) {
		const author = c.createdBy?.displayName ?? "Unknown";
		const date = c.createdDate ? new Date(c.createdDate).toISOString().slice(0, 10) : "";
		lines.push(`**${author}** (${date}):`);
		lines.push(c.text ?? "(empty)");
		lines.push("");
	}
	return lines.join("\n");
}

/**
 * Format revision history.
 */
export function formatRevisions(revisions: WorkItem[]): string {
	if (revisions.length === 0) return "No revisions found.";

	const lines: string[] = [];
	for (const rev of revisions) {
		const fields = (rev.fields ?? {}) as Record<string, unknown>;
		const revNum = rev.rev ?? "?";
		const changedBy = fields["System.ChangedBy"];
		const author = changedBy && typeof changedBy === "object" && "displayName" in (changedBy as object)
			? (changedBy as { displayName: string }).displayName
			: String(changedBy ?? "Unknown");
		const changedDate = fields["System.ChangedDate"]
			? new Date(String(fields["System.ChangedDate"])).toISOString().slice(0, 19)
			: "";

		lines.push(`## Rev ${revNum} — ${author} (${changedDate})`);

		for (const [key, value] of Object.entries(fields)) {
			if (key.startsWith("System.") || key.startsWith("Microsoft.VSTS.")) {
				lines.push(`  ${key}: ${formatFieldValue(value)}`);
			}
		}
		lines.push("");
	}
	return lines.join("\n");
}

function formatFieldValue(value: unknown): string {
	if (value === null || value === undefined) return "(empty)";
	if (typeof value === "object" && "displayName" in (value as object)) {
		return (value as { displayName: string }).displayName;
	}
	return String(value);
}

// ---------------------------------------------------------------------------
// Team formatting
// ---------------------------------------------------------------------------

/** A team from CoreApi.getTeams() */
interface TeamLike {
	id?: string;
	name?: string;
	description?: string;
	url?: string;
}

export function formatTeam(team: TeamLike): string {
	const lines: string[] = [];
	lines.push(`**${team.name ?? "Unknown"}** (id: ${team.id ?? "?"})`);
	if (team.description) lines.push(`  ${team.description}`);
	if (team.url) lines.push(`  URL: ${team.url}`);
	return lines.join("\n");
}

export function formatTeamList(teams: TeamLike[]): string {
	if (teams.length === 0) return "No teams found.";
	return teams.map(formatTeam).join("\n");
}

// ---------------------------------------------------------------------------
// Board formatting
// ---------------------------------------------------------------------------

/** A board reference from WorkApi.getBoards() */
interface BoardRefLike {
	id?: string;
	name?: string;
	url?: string;
}

/** A full board from WorkApi.getBoard() */
interface BoardLike {
	id?: string;
	name?: string;
	url?: string;
	canEdit?: boolean;
	columns?: Array<{
		id?: string;
		name?: string;
		columnType?: number;
		itemLimit?: number | null;
		stateMappings?: Record<string, string>;
	}>;
	rows?: Array<{ id?: string; name?: string }>;
}

const COLUMN_TYPE_NAMES: Record<number, string> = {
	0: "Incoming",
	1: "InProgress",
	2: "Outgoing",
};

export function formatBoardRef(board: BoardRefLike): string {
	return `**${board.name ?? "Unknown"}** (id: ${board.id ?? "?"})${board.url ? ` — ${board.url}` : ""}`;
}

export function formatBoardList(boards: BoardRefLike[]): string {
	if (boards.length === 0) return "No boards found.";
	return boards.map(formatBoardRef).join("\n");
}

export function formatBoard(board: BoardLike): string {
	const lines: string[] = [];
	lines.push(`# Board: ${board.name ?? "Unknown"} (id: ${board.id ?? "?"})`);
	if (board.canEdit !== undefined) lines.push(`- **Editable:** ${board.canEdit ? "Yes" : "No"}`);

	const columns = board.columns ?? [];
	if (columns.length > 0) {
		lines.push("");
		lines.push("## Columns");
		for (const col of columns) {
		const typeLabel = COLUMN_TYPE_NAMES[col.columnType ?? -1] ?? "Unknown";
		const limitStr = col.itemLimit != null ? ` (limit: ${col.itemLimit})` : "";
		lines.push(`- **${col.name ?? "?"}** [${typeLabel}]${limitStr}`);
		if (col.stateMappings) {
			const mappings = Object.entries(col.stateMappings)
				.map(([type, state]) => `${type} → ${state}`)
				.join(", ");
			lines.push(`  Mappings: ${mappings}`);
		}
		}
	}

	const rows = board.rows ?? [];
	if (rows.length > 0) {
		lines.push("");
		lines.push(`## Rows (${rows.length})`);
		for (const row of rows) {
			lines.push(`- ${row.name || "(default)"}`);
		}
	}

	if (board.url) {
		lines.push("");
		lines.push(`**URL:** ${board.url}`);
	}

	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Iteration formatting
// ---------------------------------------------------------------------------

interface IterationLike {
	id?: string;
	name?: string;
	path?: string;
	attributes?: {
		startDate?: string;
		finishDate?: string;
		timeFrame?: string;
	};
	url?: string;
}

// TimeFrame can be a numeric enum (0=Past, 1=Current, 2=Future) or a string.
const TIMEFRAME_LABELS: Record<string, string> = {
	"0": "⚪ Past",
	"1": "🔵 Current",
	"2": "🟢 Future",
	past: "⚪ Past",
	current: "🔵 Current",
	future: "🟢 Future",
};

export function formatIteration(iteration: IterationLike): string {
	const attrs = iteration.attributes ?? {};
	const rawTf = attrs.timeFrame;
	const tf = rawTf !== undefined && rawTf !== null && rawTf !== "" ? String(rawTf) : "";
	const tfLabel = tf ? (TIMEFRAME_LABELS[tf.toLowerCase()] ?? tf) : "";
	const start = attrs.startDate ? new Date(attrs.startDate).toISOString().slice(0, 10) : "?";
	const end = attrs.finishDate ? new Date(attrs.finishDate).toISOString().slice(0, 10) : "?";

	const lines: string[] = [];
	lines.push(`**${iteration.name ?? "Unknown"}** (id: ${iteration.id ?? "?"}) ${tfLabel}`);
	lines.push(`  ${start} → ${end}`);
	if (iteration.path) lines.push(`  Path: ${iteration.path}`);
	return lines.join("\n");
}

export function formatIterationList(iterations: IterationLike[]): string {
	if (iterations.length === 0) return "No iterations found.";
	return iterations.map(formatIteration).join("\n");
}

// ---------------------------------------------------------------------------
// Capacity formatting
// ---------------------------------------------------------------------------

interface CapacityLike {
	teamMembers?: Array<{
		teamMember?: {
			displayName?: string;
			uniqueName?: string;
		};
		activities?: Array<{
			name?: string;
			capacityPerDay?: number;
		}>;
		daysOff?: Array<{
			start?: string;
			end?: string;
		}>;
	}>;
	totalCapacityPerDay?: number;
	totalDaysOff?: number;
}

export function formatCapacity(capacity: CapacityLike): string {
	const members = capacity.teamMembers ?? [];
	const lines: string[] = [];

	lines.push(`# Team Capacity`);
	lines.push(`- **Total capacity:** ${capacity.totalCapacityPerDay ?? 0} hours/day`);
	lines.push(`- **Total days off:** ${capacity.totalDaysOff ?? 0}`);

	if (members.length > 0) {
		lines.push("");
		lines.push("## Team Members");
		for (const m of members) {
			const name = m.teamMember?.displayName ?? "Unknown";
			const activities = m.activities ?? [];
			const actStr = activities
				.map((a) => `${a.name ?? "?"}: ${a.capacityPerDay ?? 0}h/day`)
				.join(", ");
			const daysOff = m.daysOff ?? [];
			const offStr = daysOff.length > 0
				? daysOff
					.map((d) => {
						const s = d.start ? new Date(d.start).toISOString().slice(0, 10) : "?";
						const e = d.end ? new Date(d.end).toISOString().slice(0, 10) : "?";
						return s === e ? s : `${s}–${e}`;
					})
					.join(", ")
				: "none";

			lines.push(`- **${name}**: ${actStr || "no activities"}`);
			lines.push(`  Days off: ${offStr}`);
		}
	}

	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Repo formatting
// ---------------------------------------------------------------------------

interface RepoLike {
	id?: string;
	name?: string;
	url?: string;
	defaultBranch?: string;
	size?: number;
	project?: { name?: string };
}

export function formatRepo(repo: RepoLike): string {
	const lines: string[] = [];
	lines.push(`**${repo.name ?? "Unknown"}** (id: ${repo.id ?? "?"})`);
	if (repo.defaultBranch) lines.push(`- **Default branch:** ${repo.defaultBranch.replace("refs/heads/", "")}`);
	if (repo.size != null) lines.push(`- **Size:** ${formatBytes(repo.size)}`);
	if (repo.project?.name) lines.push(`- **Project:** ${repo.project.name}`);
	if (repo.url) lines.push(`- **URL:** ${repo.url}`);
	return lines.join("\n");
}

export function formatRepoList(repos: RepoLike[]): string {
	if (repos.length === 0) return "No repositories found.";
	return repos.map(formatRepo).join("\n");
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ---------------------------------------------------------------------------
// Branch formatting
// ---------------------------------------------------------------------------

interface BranchLike {
	name?: string;
	commit?: {
		commitId?: string;
		author?: { name?: string; date?: string };
		comment?: string;
	};
	aheadCount?: number;
	behindCount?: number;
	isBaseVersion?: boolean;
}

export function formatBranch(branch: BranchLike): string {
	const sha = branch.commit?.commitId?.slice(0, 7) ?? "?";
	const message = branch.commit?.comment?.split("\n")[0] ?? "";
	const ahead = branch.aheadCount ?? 0;
	const behind = branch.behindCount ?? 0;
	const badge = branch.isBaseVersion ? " (base)" : "";
	const trackStr = ahead > 0 || behind > 0 ? ` ↑${ahead} ↓${behind}` : "";

	const lines: string[] = [];
	lines.push(`**${branch.name ?? "?"}**${badge} \`${sha}\`${trackStr}`);
	if (message) lines.push(`  ${message}`);
	return lines.join("\n");
}

export function formatBranchList(branches: BranchLike[]): string {
	if (branches.length === 0) return "No branches found.";
	return branches.map(formatBranch).join("\n");
}

// ---------------------------------------------------------------------------
// Pull Request formatting
// ---------------------------------------------------------------------------

const PR_STATUS_LABELS: Record<string, string> = {
	"0": "Not Set",
	"1": "🟢 Active",
	"2": "⚪ Abandoned",
	"3": "✅ Completed",
	active: "🟢 Active",
	completed: "✅ Completed",
	abandoned: "⚪ Abandoned",
};

function normalizePrStatus(status: unknown): string {
	return PR_STATUS_LABELS[String(status)] ?? PR_STATUS_LABELS[String(status).toLowerCase()] ?? String(status ?? "Unknown");
}

const VOTE_LABELS: Record<number, string> = {
	10: "Approved",
	5: "Approved with suggestions",
	0: "No vote",
	[-5]: "Waiting for author",
	[-10]: "Rejected",
};

interface PullRequestLike {
	pullRequestId?: number;
	title?: string;
	description?: string;
	status?: string;
	sourceRefName?: string;
	targetRefName?: string;
	repositoryId?: string;
	createdBy?: { displayName?: string; uniqueName?: string };
	creationDate?: string;
	reviewers?: Array<{ displayName?: string; vote?: number }>;
	url?: string;
}

export function formatPullRequest(pr: PullRequestLike): string {
	const lines: string[] = [];
	const statusLabel = normalizePrStatus(pr.status);

	lines.push(`# PR #${pr.pullRequestId ?? "?"}: ${pr.title ?? "(untitled)"}`);
	lines.push(`- **Status:** ${statusLabel}`);
	lines.push(`- **Branch:** ${shortRef(pr.sourceRefName)} → ${shortRef(pr.targetRefName)}`);
	lines.push(`- **Author:** ${pr.createdBy?.displayName ?? "Unknown"}`);

	if (pr.creationDate) {
		const date = new Date(pr.creationDate).toISOString().slice(0, 10);
		lines.push(`- **Created:** ${date}`);
	}

	const reviewers = pr.reviewers ?? [];
	if (reviewers.length > 0) {
		lines.push(`- **Reviewers:** ${reviewers.map((r) => `${r.displayName ?? "?"} (${VOTE_LABELS[r.vote ?? 0] ?? "?"})`).join(", ")}`);
	}

	if (pr.description) {
		lines.push("");
		lines.push("## Description");
		lines.push(pr.description);
	}

	if (pr.url) {
		lines.push("");
		lines.push(`**URL:** ${pr.url}`);
	}

	return lines.join("\n");
}

export function formatPullRequestList(prs: PullRequestLike[]): string {
	if (prs.length === 0) return "No pull requests found.";

	const lines: string[] = [];
	for (const pr of prs) {
		const statusLabel = normalizePrStatus(pr.status);
		const source = shortRef(pr.sourceRefName);
		const target = shortRef(pr.targetRefName);
		const author = pr.createdBy?.displayName ?? "?";
		const date = pr.creationDate ? new Date(pr.creationDate).toISOString().slice(0, 10) : "?";
		lines.push(`#${pr.pullRequestId ?? "?"} ${statusLabel} — ${pr.title ?? "?"} (${source}→${target}) by ${author} [${date}]`);
	}
	return lines.join("\n");
}

function shortRef(refName?: string): string {
	if (!refName) return "?";
	return refName.replace("refs/heads/", "");
}

// ---------------------------------------------------------------------------
// PR Thread formatting
// ---------------------------------------------------------------------------

const THREAD_STATUS_LABELS: Record<number, string> = {
	0: "Unknown",
	1: "Active",
	2: "Fixed",
	3: "Won't Fix",
	4: "Closed",
	5: "By Design",
	6: "Pending",
};

interface PrThreadLike {
	id?: number;
	status?: number;
	comments?: Array<{
		id?: number;
		author?: { displayName?: string };
		publishedDate?: string;
		content?: string;
	}>;
}

export function formatPullRequestThread(thread: PrThreadLike): string {
	const statusLabel = THREAD_STATUS_LABELS[thread.status ?? 0] ?? "Unknown";
	const lines: string[] = [];

	lines.push(`### Thread #${thread.id ?? "?"} [${statusLabel}]`);

	const comments = thread.comments ?? [];
	for (const c of comments) {
		const author = c.author?.displayName ?? "Unknown";
		const date = c.publishedDate ? new Date(c.publishedDate).toISOString().slice(0, 10) : "";
		lines.push(`**${author}** (${date}):`);
		lines.push(c.content ?? "(empty)");
		lines.push("");
	}

	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Commit formatting
// ---------------------------------------------------------------------------

interface CommitLike {
	commitId?: string;
	author?: { name?: string; date?: string };
	comment?: string;
	url?: string;
}

export function formatCommit(commit: CommitLike): string {
	const sha = commit.commitId?.slice(0, 7) ?? "?";
	const author = commit.author?.name ?? "Unknown";
	const date = commit.author?.date ? new Date(commit.author.date).toISOString().slice(0, 10) : "";
	const message = commit.comment?.split("\n")[0] ?? "";

	return `\`${sha}\` ${message} — ${author} [${date}]`;
}

export function formatCommitList(commits: CommitLike[]): string {
	if (commits.length === 0) return "No commits found.";
	return commits.map(formatCommit).join("\n");
}

// ---------------------------------------------------------------------------
// Policy formatting
// ---------------------------------------------------------------------------

interface PolicyLike {
	id?: number;
	type?: { displayName?: string };
	isBlocking?: boolean;
	scope?: Array<{ repositoryId?: string | null; refName?: string }>;
	settings?: Record<string, unknown>;
}

export function formatPolicy(policy: PolicyLike): string {
	const lines: string[] = [];
	const typeName = policy.type?.displayName ?? "Unknown";
	const blocking = policy.isBlocking ? "🔒 Blocking" : "⚠️ Non-blocking";

	lines.push(`**${typeName}** (id: ${policy.id ?? "?"}) ${blocking}`);

	const scope = policy.scope ?? [];
	if (scope.length > 0) {
		const scopeStr = scope
			.map((s) => `${s.refName?.replace("refs/heads/", "") ?? "?"}`)
			.join(", ");
		lines.push(`  Scope: ${scopeStr}`);
	}

	if (policy.settings) {
		const settings = Object.entries(policy.settings)
			.map(([k, v]) => `${k}=${JSON.stringify(v)}`)
			.join(", ");
		lines.push(`  Settings: ${settings}`);
	}

	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Policy Evaluation formatting
// ---------------------------------------------------------------------------

const EVAL_STATUS_ICONS: Record<string, string> = {
	approved: "✅ Approved",
	running: "⏳ Running",
	rejected: "❌ Rejected",
	queued: "📋 Queued",
	notApplicable: "➖ Not applicable",
};

interface PolicyEvaluationLike {
	evaluationId?: string;
	policyDisplayName?: string;
	status?: string;
	startedDate?: string;
	completedDate?: string;
}

export function formatPolicyEvaluation(evaluation: PolicyEvaluationLike): string {
	const statusIcon = EVAL_STATUS_ICONS[evaluation.status ?? ""] ?? evaluation.status ?? "?";
	const started = evaluation.startedDate ? new Date(evaluation.startedDate).toISOString().slice(0, 10) : "?";
	const completed = evaluation.completedDate ? new Date(evaluation.completedDate).toISOString().slice(0, 10) : "—";

	return `**${evaluation.policyDisplayName ?? "?"}**: ${statusIcon} (${started}${completed !== "—" ? ` → ${completed}` : ""})`;
}

// ---------------------------------------------------------------------------
// Pipeline formatting
// ---------------------------------------------------------------------------

const RUN_STATE_ICONS: Record<string, string> = {
	"0": "❓ Unknown",
	"1": "⏳ In Progress",
	"2": "❌ Canceling",
	"4": "✅ Completed",
	completed: "✅ Completed",
	inProgress: "⏳ In Progress",
	cancelling: "❌ Canceling",
};

function normalizeRunState(state: unknown): string {
	return RUN_STATE_ICONS[String(state)] ?? RUN_STATE_ICONS[String(state).toLowerCase()] ?? `⏸️ ${state}`;
}

const RUN_RESULT_LABELS: Record<string, string> = {
	"0": "unknown",
	"1": "✅ succeeded",
	"2": "🔴 failed",
	"4": "⚪ canceled",
	succeeded: "✅ succeeded",
	failed: "🔴 failed",
	canceled: "⚪ canceled",
	partiallySucceeded: "⚠️ partially succeeded",
};

function normalizeRunResult(result: unknown): string {
	return RUN_RESULT_LABELS[String(result)] ?? RUN_RESULT_LABELS[String(result).toLowerCase()] ?? String(result ?? "");
}

interface PipelineLike {
	id?: number;
	name?: string;
	folder?: string;
	revision?: number;
	configuration?: {
		type?: string;
		path?: string;
		repository?: { id?: string; name?: string; type?: string };
	};
	url?: string;
}

export function formatPipeline(pipeline: PipelineLike): string {
	const lines: string[] = [];
	lines.push(`**${pipeline.name ?? "Unknown"}** (id: ${pipeline.id ?? "?"})`);
	if (pipeline.folder) lines.push(`- **Folder:** ${pipeline.folder}`);
	const cfg = pipeline.configuration;
	if (cfg) {
		lines.push(`- **Type:** ${cfg.type ?? "?"}`);
		if (cfg.path) lines.push(`- **Path:** ${cfg.path}`);
		if (cfg.repository?.name) lines.push(`- **Repository:** ${cfg.repository.name}`);
	}
	if (pipeline.url) lines.push(`- **URL:** ${pipeline.url}`);
	return lines.join("\n");
}

export function formatPipelineList(pipelines: PipelineLike[]): string {
	if (pipelines.length === 0) return "No pipelines found.";
	return pipelines.map(formatPipeline).join("\n");
}

interface RunLike {
	id?: number;
	name?: string;
	pipeline?: { id?: number; name?: string };
	state?: string;
	result?: string | null;
	createdDate?: string;
	finishedDate?: string | null;
	resources?: {
		repositories?: {
			self?: { refName?: string; version?: string };
		};
	};
	templateParameters?: Record<string, string>;
	url?: string;
}

export function formatDuration(createdDate?: string, finishedDate?: string | null): string {
	if (!createdDate) return "?";
	const start = new Date(createdDate).getTime();
	const end = finishedDate ? new Date(finishedDate).getTime() : Date.now();
	const diffMs = end - start;
	if (diffMs < 0) return "?";
	const seconds = Math.floor(diffMs / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
	return `${seconds}s`;
}

export function formatRun(run: RunLike): string {
	const lines: string[] = [];
	const stateIcon = normalizeRunState(run.state);
	const resultLabel = run.result ? normalizeRunResult(run.result) : "";
	const pipelineName = run.pipeline?.name ?? "?";
	const branch = run.resources?.repositories?.self?.refName?.replace("refs/heads/", "") ?? "?";
	const duration = formatDuration(run.createdDate, run.finishedDate);

	lines.push(`# Run #${run.id ?? "?"} — ${pipelineName}`);
	lines.push(`- **State:** ${stateIcon}`);
	if (resultLabel) lines.push(`- **Result:** ${resultLabel}`);
	lines.push(`- **Branch:** ${branch}`);
	lines.push(`- **Duration:** ${duration}`);

	if (run.createdDate) {
		lines.push(`- **Started:** ${new Date(run.createdDate).toISOString().slice(0, 19).replace("T", " ")}`);
	}
	if (run.finishedDate) {
		lines.push(`- **Finished:** ${new Date(run.finishedDate).toISOString().slice(0, 19).replace("T", " ")}`);
	}

	const params = run.templateParameters ?? {};
	const paramKeys = Object.keys(params);
	if (paramKeys.length > 0) {
		lines.push(`- **Parameters:** ${paramKeys.map((k) => `${k}=${params[k]}`).join(", ")}`);
	}

	if (run.url) lines.push(`- **URL:** ${run.url}`);
	return lines.join("\n");
}

export function formatRunList(runs: RunLike[]): string {
	if (runs.length === 0) return "No runs found.";

	const lines: string[] = [];
	for (const run of runs) {
		const stateIcon = normalizeRunState(run.state);
		const resultLabel = run.result ? normalizeRunResult(run.result) : "";
		const pipelineName = run.pipeline?.name ?? "?";
		const branch = run.resources?.repositories?.self?.refName?.replace("refs/heads/", "") ?? "?";
		const duration = formatDuration(run.createdDate, run.finishedDate);
		const statusStr = resultLabel ? `${stateIcon} ${resultLabel}` : `${stateIcon}`;
		lines.push(`#${run.id ?? "?"} ${pipelineName} — ${statusStr} — ${branch} (${duration})`);
	}
	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Artifact formatting
// ---------------------------------------------------------------------------

interface ArtifactLike {
	id?: number;
	name?: string;
	resource?: {
		type?: string;
		data?: string;
		url?: string;
	};
}

export function formatArtifact(artifact: ArtifactLike): string {
	const lines: string[] = [];
	lines.push(`**${artifact.name ?? "Unknown"}** (id: ${artifact.id ?? "?"})`);
	if (artifact.resource?.type) lines.push(`- **Type:** ${artifact.resource.type}`);
	if (artifact.resource?.data) lines.push(`- **Data:** ${artifact.resource.data}`);
	if (artifact.resource?.url) lines.push(`- **URL:** ${artifact.resource.url}`);
	return lines.join("\n");
}

export function formatArtifactList(artifacts: ArtifactLike[]): string {
	if (artifacts.length === 0) return "No artifacts found.";
	return artifacts.map(formatArtifact).join("\n");
}

// ---------------------------------------------------------------------------
// Timeline formatting
// ---------------------------------------------------------------------------

const TIMELINE_STATE_ICONS: Record<string, string> = {
	"0": "⏸️ Pending",
	"1": "⏳ In Progress",
	"2": "✅ Completed",
	completed: "✅",
	inProgress: "⏳",
	pending: "⏸️",
};

function normalizeTimelineState(state: unknown): string {
	return TIMELINE_STATE_ICONS[String(state)] ?? TIMELINE_STATE_ICONS[String(state).toLowerCase()] ?? "⏸️";
}

const TIMELINE_RESULT_ICONS: Record<string, string> = {
	"0": "🟢 Succeeded",
	"1": "⚠️ Succeeded with issues",
	"2": "🔴 Failed",
	"3": "⚪ Canceled",
	"4": "⏭️ Skipped",
	"5": "⚪ Abandoned",
	succeeded: "🟢",
	failed: "🔴",
	canceled: "⚪",
	skipped: "⏭️",
	abandoned: "⚪",
};

function normalizeTimelineResult(result: unknown): string {
	return TIMELINE_RESULT_ICONS[String(result)] ?? TIMELINE_RESULT_ICONS[String(result).toLowerCase()] ?? "";
}

interface TimelineRecordLike {
	id?: string;
	parentId?: string | null;
	type?: string;
	name?: string;
	order?: number;
	state?: string;
	result?: string;
	startTime?: string;
	finishTime?: string;
	errorCount?: number;
	warningCount?: number;
}

interface TimelineLike {
	records?: TimelineRecordLike[];
}

export function formatTimelineRecord(record: TimelineRecordLike): string {
	const stateIcon = normalizeTimelineState(record.state);
	const resultIcon = record.result ? normalizeTimelineResult(record.result) : "";
	const icon = resultIcon || stateIcon;
	const duration = formatDuration(record.startTime, record.finishTime);
	const issues: string[] = [];
	if ((record.errorCount ?? 0) > 0) issues.push(`${record.errorCount} error(s)`);
	if ((record.warningCount ?? 0) > 0) issues.push(`${record.warningCount} warning(s)`);
	const issueStr = issues.length > 0 ? ` — ${issues.join(", ")}` : "";

	return `${icon} **${record.name ?? "?"}** [${record.type ?? "?"}] (${duration})${issueStr}`;
}

export function formatTimeline(timeline: TimelineLike): string {
	const records = timeline.records ?? [];
	if (records.length === 0) return "No timeline records.";

	const sorted = [...records].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	const lines: string[] = [];

	for (const record of sorted) {
		const indent = record.parentId ? (record.type === "Task" ? "    " : "  ") : "";
		lines.push(`${indent}${formatTimelineRecord(record)}`);
	}

	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Test Plan formatting
// ---------------------------------------------------------------------------

const TEST_OUTCOME_ICONS: Record<string, string> = {
	passed: "🟢",
	failed: "🔴",
	blocked: "🚫",
	notExecuted: "⏸️",
	inconclusive: "❓",
	timeout: "⏱️",
	aborted: "⚪",
	notApplicable: "➖",
	warning: "⚠️",
	error: "💥",
	paused: "⏸️",
	inProgress: "⏳",
	notImpacted: "➖",
};

const TEST_RUN_STATE_ICONS: Record<string, string> = {
	InProgress: "⏳",
	Completed: "✅",
	Aborted: "⚪",
	Waiting: "⏸️",
	NeedsInvestigation: "🔍",
	NotStarted: "⏸️",
};

interface TestPlanLike {
	id?: number;
	name?: string;
	state?: string;
	iteration?: string;
	startDate?: string;
	endDate?: string;
	owner?: { displayName?: string; uniqueName?: string };
	rootSuite?: { id?: number; name?: string };
	revision?: number;
	areaPath?: string;
	url?: string;
}

export function formatTestPlan(plan: TestPlanLike): string {
	const lines: string[] = [];
	lines.push(`**${plan.name ?? "Unknown"}** (id: ${plan.id ?? "?"})`);
	lines.push(`- **State:** ${plan.state ?? "unknown"}`);
	if (plan.iteration) lines.push(`- **Iteration:** ${plan.iteration}`);
	if (plan.startDate) lines.push(`- **Start:** ${new Date(plan.startDate).toISOString().slice(0, 10)}`);
	if (plan.endDate) lines.push(`- **End:** ${new Date(plan.endDate).toISOString().slice(0, 10)}`);
	if (plan.owner?.displayName) lines.push(`- **Owner:** ${plan.owner.displayName}`);
	if (plan.rootSuite) lines.push(`- **Root Suite:** #${plan.rootSuite.id} ${plan.rootSuite.name ?? ""}`);
	if (plan.areaPath) lines.push(`- **Area:** ${plan.areaPath}`);
	if (plan.url) lines.push(`- **URL:** ${plan.url}`);
	return lines.join("\n");
}

export function formatTestPlanList(plans: TestPlanLike[]): string {
	if (plans.length === 0) return "No test plans found.";
	return plans.map(formatTestPlan).join("\n");
}

interface TestSuiteLike {
	id?: number;
	name?: string;
	suiteType?: string;
	parentSuite?: { id?: number; name?: string } | null;
	children?: number[] | Array<{ id?: number }>;
	testCaseCount?: number;
	requirementId?: number;
	plan?: { id?: number; name?: string };
	url?: string;
}

const SUITE_TYPE_LABELS: Record<string, string> = {
	staticTestSuite: "Static",
	dynamicTestSuite: "Dynamic (query-based)",
	requirementTestSuite: "Requirement-based",
};

export function formatTestSuite(suite: TestSuiteLike): string {
	const lines: string[] = [];
	const typeLabel = SUITE_TYPE_LABELS[suite.suiteType ?? ""] ?? suite.suiteType ?? "unknown";
	lines.push(`**${suite.name ?? "Unknown"}** (id: ${suite.id ?? "?"})`);
	lines.push(`- **Type:** ${typeLabel}`);
	if (suite.parentSuite) lines.push(`- **Parent:** #${suite.parentSuite.id} ${suite.parentSuite.name ?? ""}`);
	const childCount = Array.isArray(suite.children) ? suite.children.length : 0;
	if (childCount > 0) lines.push(`- **Children:** ${childCount}`);
	if (suite.testCaseCount !== undefined) lines.push(`- **Test Cases:** ${suite.testCaseCount}`);
	if (suite.requirementId) lines.push(`- **Requirement:** #${suite.requirementId}`);
	if (suite.url) lines.push(`- **URL:** ${suite.url}`);
	return lines.join("\n");
}

export function formatTestSuiteList(suites: TestSuiteLike[]): string {
	if (suites.length === 0) return "No test suites found.";

	const lines: string[] = [];
	for (const suite of suites) {
		const typeLabel = SUITE_TYPE_LABELS[suite.suiteType ?? ""] ?? suite.suiteType ?? "?";
		const indent = suite.parentSuite ? "  " : "";
		const caseCount = suite.testCaseCount !== undefined ? ` (${suite.testCaseCount} cases)` : "";
		lines.push(`${indent}#${suite.id ?? "?"} ${suite.name ?? "?"}${caseCount} [${typeLabel}]`);
	}
	return lines.join("\n");
}

interface TestCaseLike {
	workItem?: {
		id?: number;
		name?: string;
		workItemFields?: Array<Record<string, unknown>>;
	};
	order?: number;
	pointAssignments?: Array<{ configurationId?: number; configurationName?: string }>;
}

export function formatTestCase(tc: TestCaseLike): string {
	const lines: string[] = [];
	const wi = tc.workItem;
	lines.push(`**${wi?.name ?? "Unknown"}** (id: ${wi?.id ?? "?"})`);
	const fields = wi?.workItemFields?.[0] ?? {};
	if (fields["System.State"]) lines.push(`- **State:** ${fields["System.State"]}`);
	if (fields["System.AssignedTo"]) lines.push(`- **Assigned To:** ${fields["System.AssignedTo"]}`);
	if (fields["Microsoft.VSTS.Common.Priority"]) lines.push(`- **Priority:** ${fields["Microsoft.VSTS.Common.Priority"]}`);
	if (tc.order !== undefined) lines.push(`- **Order:** ${tc.order}`);
	const configs = tc.pointAssignments ?? [];
	if (configs.length > 0) {
		lines.push(`- **Configurations:** ${configs.map((c) => c.configurationName ?? `#${c.configurationId}`).join(", ")}`);
	}
	return lines.join("\n");
}

export function formatTestCaseList(cases: TestCaseLike[]): string {
	if (cases.length === 0) return "No test cases found.";

	const lines: string[] = [];
	for (const tc of cases) {
		const wi = tc.workItem;
		const fields = wi?.workItemFields?.[0] ?? {};
		const state = fields["System.State"] ? ` [${fields["System.State"]}]` : "";
		const assignee = fields["System.AssignedTo"] ? ` → ${fields["System.AssignedTo"]}` : "";
		lines.push(`#${wi?.id ?? "?"} ${wi?.name ?? "?"}${state}${assignee}`);
	}
	return lines.join("\n");
}

interface TestPointLike {
	id?: number;
	testCaseReference?: { id?: number; name?: string };
	configuration?: { id?: string; name?: string };
	outcome?: string;
	state?: string;
	tester?: { displayName?: string; uniqueName?: string };
	lastRunBuildNumber?: string | null;
	url?: string;
}

export function formatTestPoint(point: TestPointLike): string {
	const lines: string[] = [];
	const outcomeIcon = TEST_OUTCOME_ICONS[point.outcome ?? ""] ?? "❓";
	lines.push(`**Point #${point.id ?? "?"}** — ${point.testCaseReference?.name ?? "?"} (case #${point.testCaseReference?.id ?? "?"})`);
	lines.push(`- **Outcome:** ${outcomeIcon} ${point.outcome ?? "none"}`);
	if (point.configuration?.name) lines.push(`- **Configuration:** ${point.configuration.name}`);
	if (point.tester?.displayName) lines.push(`- **Tester:** ${point.tester.displayName}`);
	if (point.state) lines.push(`- **State:** ${point.state}`);
	if (point.lastRunBuildNumber) lines.push(`- **Last Build:** ${point.lastRunBuildNumber}`);
	return lines.join("\n");
}

export function formatTestPointList(points: TestPointLike[]): string {
	if (points.length === 0) return "No test points found.";

	const lines: string[] = [];
	for (const point of points) {
		const outcomeIcon = TEST_OUTCOME_ICONS[point.outcome ?? ""] ?? "❓";
		const config = point.configuration?.name ?? "?";
		const tester = point.tester?.displayName ?? "?";
		lines.push(`#${point.id ?? "?"} ${point.testCaseReference?.name ?? "?"} — ${outcomeIcon} ${point.outcome ?? "?"} — ${config} — ${tester}`);
	}
	return lines.join("\n");
}

interface TestRunLike {
	id?: number;
	name?: string;
	state?: string;
	plan?: { id?: number; name?: string };
	startedDate?: string;
	completedDate?: string | null;
	totalTests?: number;
	passedTests?: number;
	failedTests?: number;
	incompleteTests?: number;
	notApplicableTests?: number;
	owner?: { displayName?: string; uniqueName?: string };
	url?: string;
}

export function formatTestRun(run: TestRunLike): string {
	const lines: string[] = [];
	const stateIcon = TEST_RUN_STATE_ICONS[run.state ?? ""] ?? "⏸️";
	lines.push(`# Run #${run.id ?? "?"} — ${run.name ?? "Unknown"}`);
	lines.push(`- **State:** ${stateIcon} ${run.state ?? "unknown"}`);
	if (run.plan) lines.push(`- **Plan:** ${run.plan.name ?? "?"} (#${run.plan.id ?? "?"})`);

	const total = run.totalTests ?? 0;
	const passed = run.passedTests ?? 0;
	const failed = run.failedTests ?? 0;
	const incomplete = run.incompleteTests ?? 0;
	lines.push(`- **Results:** ${passed}/${total} passed, ${failed} failed, ${incomplete} incomplete`);

	if (run.startedDate) {
		lines.push(`- **Started:** ${new Date(run.startedDate).toISOString().slice(0, 19).replace("T", " ")}`);
	}
	if (run.completedDate) {
		lines.push(`- **Completed:** ${new Date(run.completedDate).toISOString().slice(0, 19).replace("T", " ")}`);
		lines.push(`- **Duration:** ${formatDuration(run.startedDate, run.completedDate)}`);
	}
	if (run.owner?.displayName) lines.push(`- **Owner:** ${run.owner.displayName}`);
	if (run.url) lines.push(`- **URL:** ${run.url}`);
	return lines.join("\n");
}

export function formatTestRunList(runs: TestRunLike[]): string {
	if (runs.length === 0) return "No test runs found.";

	const lines: string[] = [];
	for (const run of runs) {
		const stateIcon = TEST_RUN_STATE_ICONS[run.state ?? ""] ?? "⏸️";
		const passed = run.passedTests ?? 0;
		const total = run.totalTests ?? 0;
		const date = run.startedDate ? new Date(run.startedDate).toISOString().slice(0, 10) : "?";
		lines.push(`#${run.id ?? "?"} ${run.name ?? "?"} — ${stateIcon} ${run.state ?? "?"} — ${passed}/${total} passed (${date})`);
	}
	return lines.join("\n");
}

interface TestResultLike {
	id?: number;
	testCaseTitle?: string;
	testCase?: { id?: number; name?: string };
	outcome?: string;
	state?: string;
	durationInMs?: number;
	startedDate?: string;
	completedDate?: string;
	errorMessage?: string | null;
	comment?: string | null;
	runBy?: { displayName?: string; uniqueName?: string };
	url?: string;
}

export function formatTestResult(result: TestResultLike): string {
	const lines: string[] = [];
	const outcomeIcon = TEST_OUTCOME_ICONS[result.outcome?.toLowerCase() ?? ""] ?? "❓";
	lines.push(`**${result.testCaseTitle ?? result.testCase?.name ?? "Unknown"}** (result #${result.id ?? "?"})`);
	lines.push(`- **Outcome:** ${outcomeIcon} ${result.outcome ?? "unknown"}`);
	if (result.durationInMs !== undefined) {
		const seconds = (result.durationInMs / 1000).toFixed(1);
		lines.push(`- **Duration:** ${seconds}s`);
	}
	if (result.runBy?.displayName) lines.push(`- **Run By:** ${result.runBy.displayName}`);
	if (result.errorMessage) lines.push(`- **Error:** ${result.errorMessage}`);
	if (result.comment) lines.push(`- **Comment:** ${result.comment}`);
	return lines.join("\n");
}

export function formatTestResultList(results: TestResultLike[]): string {
	if (results.length === 0) return "No test results found.";

	const lines: string[] = [];
	for (const result of results) {
		const outcomeIcon = TEST_OUTCOME_ICONS[result.outcome?.toLowerCase() ?? ""] ?? "❓";
		const duration = result.durationInMs !== undefined ? `${(result.durationInMs / 1000).toFixed(1)}s` : "?";
		lines.push(`#${result.id ?? "?"} ${result.testCaseTitle ?? "?"} — ${outcomeIcon} ${result.outcome ?? "?"} (${duration})`);
	}
	return lines.join("\n");
}
