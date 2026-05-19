/**
 * Mock handler — returns fixture data for offline development and testing.
 *
 * Each tool-specific method returns data through the same formatting
 * pipeline as the live tools, so mock output looks identical to real output.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	formatWorkItem,
	formatWorkItemList,
	formatWorkItemTypeList,
	formatComments,
	formatRevisions,
	formatTeamList,
	formatBoardList,
	formatBoard,
	formatIterationList,
	formatCapacity,
	formatRepo,
	formatRepoList,
	formatBranch,
	formatBranchList,
	formatPullRequest,
	formatPullRequestList,
	formatPullRequestThread,
	formatCommit,
	formatCommitList,
	formatPolicy,
	formatPolicyEvaluation,
	formatPipeline,
	formatPipelineList,
	formatRun,
	formatRunList,
	formatArtifactList,
	formatTimeline,
	formatTestPlan,
	formatTestPlanList,
	formatTestSuiteList,
	formatTestSuite,
	formatTestCaseList,
	formatTestPointList,
	formatTestRun,
	formatTestRunList,
	formatTestResultList,
} from "../utils/formatting.js";
import { textResult, errorResult, type ToolResult } from "../tools/shared.js";

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");

function loadFixture<T>(name: string): T {
	const raw = readFileSync(join(FIXTURES_DIR, name), "utf-8");
	return JSON.parse(raw) as T;
}

interface FixtureData {
	workItems: Array<{
		id: number;
		rev?: number;
		fields?: Record<string, unknown>;
		relations?: Array<Record<string, unknown>>;
		url?: string;
	}>;
}

interface TypesFixture {
	workItemTypes: Array<{
		name: string;
		referenceName: string;
		description?: string;
		color?: string;
		states?: Array<{ name: string; color: string }>;
	}>;
}

interface CommentsFixture {
	comments: Record<string, {
		comments: Array<{
			id: number;
			createdBy?: { displayName: string; uniqueName: string };
			createdDate?: string;
			text?: string;
		}>;
		continuationToken?: string | null;
		totalCount?: number;
	}>;
}

interface RevisionsFixture {
	revisions: Record<string, Array<{
		rev?: number;
		fields?: Record<string, unknown>;
	}>>;
}

interface TeamsFixture {
	teams: Array<{
		id: string;
		name: string;
		description?: string;
		url?: string;
	}>;
}

interface BoardsFixture {
	boards: Record<string, Array<{
		id: string;
		name: string;
		url?: string;
	}>>;
}

interface BoardDetailFixture {
	boardDetails: Record<string, {
		id?: string;
		name?: string;
		url?: string;
		canEdit?: boolean;
		revision?: number;
		columns?: Array<{
			id?: string;
			name?: string;
			columnType?: number;
			itemLimit?: number | null;
			stateMappings?: Record<string, string>;
		}>;
		rows?: Array<{ id?: string; name?: string }>;
	}>;
}

interface IterationsFixture {
	iterations: Record<string, Array<{
		id: string;
		name: string;
		path?: string;
		attributes?: {
			startDate?: string;
			finishDate?: string;
			timeFrame?: string;
		};
		url?: string;
	}>>;
}

interface IterationWorkItemsFixture {
	iterationWorkItems: Record<string, {
		workItemRelations?: Array<{
			rel?: string;
			source?: { id?: number } | null;
			target?: { id?: number };
		}>;
	}>;
}

interface CapacityFixture {
	capacities: Record<string, {
		teamMembers?: Array<{
			teamMember?: {
				displayName?: string;
				uniqueName?: string;
			};
			activities?: Array<{ name?: string; capacityPerDay?: number }>;
			daysOff?: Array<{ start?: string; end?: string }>;
		}>;
		totalCapacityPerDay?: number;
		totalDaysOff?: number;
	}>;
}

// Lazy-load fixtures
let _workItems: FixtureData | undefined;
let _types: TypesFixture | undefined;
let _comments: CommentsFixture | undefined;
let _revisions: RevisionsFixture | undefined;

function getWorkItems(): FixtureData {
	return (_workItems ??= loadFixture<FixtureData>("work-items.json"));
}

function getTypes(): TypesFixture {
	return (_types ??= loadFixture<TypesFixture>("work-item-types.json"));
}

function getComments(): CommentsFixture {
	return (_comments ??= loadFixture<CommentsFixture>("comments.json"));
}

function getRevisions(): RevisionsFixture {
	return (_revisions ??= loadFixture<RevisionsFixture>("revisions.json"));
}

let _teams: TeamsFixture | undefined;
let _boards: BoardsFixture | undefined;
let _boardDetail: BoardDetailFixture | undefined;
let _iterations: IterationsFixture | undefined;
let _iterationWorkItems: IterationWorkItemsFixture | undefined;
let _capacity: CapacityFixture | undefined;

function getTeams(): TeamsFixture {
	return (_teams ??= loadFixture<TeamsFixture>("teams.json"));
}
function getBoards(): BoardsFixture {
	return (_boards ??= loadFixture<BoardsFixture>("boards.json"));
}
function getBoardDetail(): BoardDetailFixture {
	return (_boardDetail ??= loadFixture<BoardDetailFixture>("board-detail.json"));
}
function getIterations(): IterationsFixture {
	return (_iterations ??= loadFixture<IterationsFixture>("iterations.json"));
}
function getIterationWorkItems(): IterationWorkItemsFixture {
	return (_iterationWorkItems ??= loadFixture<IterationWorkItemsFixture>("iteration-work-items.json"));
}
function getCapacity(): CapacityFixture {
	return (_capacity ??= loadFixture<CapacityFixture>("capacity.json"));
}

// ---------------------------------------------------------------------------
// Mock handlers per tool
// ---------------------------------------------------------------------------

/**
 * Mock: get a single work item by ID.
 */
export function mockGetWorkItem(id: number): ToolResult {
	const data = getWorkItems();
	const wi = data.workItems.find((w) => w.id === id);
	if (!wi) {
		return errorResult(`Work item #${id} not found (mock mode)`);
	}
	return textResult(formatWorkItem(wi as any), { id: wi.id, mock: true });
}

/**
 * Mock: query work items by simple WIQL-like filtering.
 *
 * Supports a subset of WIQL for mock purposes:
 * - WHERE [System.State] = 'Active'
 * - WHERE [System.WorkItemType] = 'Bug'
 * - WHERE [System.AssignedTo] = @me
 *
 * Multiple conditions are ANDed. Returns all if no conditions match.
 */
export function mockQueryWorkItems(query: string, top: number = 100): ToolResult {
	const data = getWorkItems();
	let results = [...data.workItems];

	// Parse simple WHERE conditions
	const conditionRegex = /\[([^\]]+)\]\s*=\s*'([^']+)'/g;
	let match: RegExpExecArray | null;
	const conditions: Array<{ field: string; value: string }> = [];

	while ((match = conditionRegex.exec(query)) !== null) {
		conditions.push({ field: match[1], value: match[2] });
	}

	// Also check for state/type in plain text (loose matching for LLM queries)
	if (query.toLowerCase().includes("active") && !conditions.some((c) => c.field === "System.State")) {
		conditions.push({ field: "System.State", value: "Active" });
	}
	if (query.toLowerCase().includes("bug") && !conditions.some((c) => c.field === "System.WorkItemType")) {
		conditions.push({ field: "System.WorkItemType", value: "Bug" });
	}
	if (query.toLowerCase().includes("closed") && !conditions.some((c) => c.field === "System.State")) {
		conditions.push({ field: "System.State", value: "Closed" });
	}

	// Apply filters
	for (const cond of conditions) {
		results = results.filter((wi) => {
			const fields = (wi.fields ?? {}) as Record<string, unknown>;
			const val = fields[cond.field];
			if (val === undefined || val === null) return false;
			return String(val).toLowerCase() === cond.value.toLowerCase();
		});
	}

	results = results.slice(0, top);

	return textResult(
		`Found ${results.length} work item(s) (mock mode):\n\n${formatWorkItemList(results as any)}`,
		{ count: results.length, mock: true },
	);
}

/**
 * Mock: list work item types.
 */
export function mockListWorkItemTypes(): ToolResult {
	const data = getTypes();
	return textResult(
		`Work item types (mock mode):\n\n${formatWorkItemTypeList(data.workItemTypes as any)}`,
		{ count: data.workItemTypes.length, mock: true },
	);
}

/**
 * Mock: get comments for a work item.
 */
export function mockGetWorkItemComments(workItemId: number): ToolResult {
	const data = getComments();
	const commentData = data.comments[String(workItemId)];
	if (!commentData) {
		return textResult(
			`No comments found for work item #${workItemId} (mock mode)`,
			{ workItemId, count: 0, mock: true },
		);
	}
	return textResult(
		`Comments on #${workItemId} (mock mode):\n\n${formatComments(commentData as any)}`,
		{ workItemId, count: commentData.comments.length, mock: true },
	);
}

/**
 * Mock: get revisions for a work item.
 */
export function mockGetWorkItemRevisions(workItemId: number): ToolResult {
	const data = getRevisions();
	const revisions = data.revisions[String(workItemId)];
	if (!revisions || revisions.length === 0) {
		return textResult(
			`No revisions found for work item #${workItemId} (mock mode)`,
			{ workItemId, count: 0, mock: true },
		);
	}
	return textResult(
		`Revision history for #${workItemId} (mock mode):\n\n${formatRevisions(revisions as any)}`,
		{ workItemId, count: revisions.length, mock: true },
	);
}

/**
 * Mock: create a work item — returns a simulated created item.
 */
export function mockCreateWorkItem(
	type: string,
	title: string,
	_description?: string,
	_fields?: Record<string, string>,
): ToolResult {
	const newId = 200 + Math.floor(Math.random() * 100);
	return textResult(
		[
			`✅ Created work item #${newId} (mock mode)`,
			"",
			`- **Type:** ${type}`,
			`- **Title:** ${title}`,
			`- **State:** New`,
			`- **URL:** https://dev.azure.com/testorg/_apis/wit/workItems/${newId}`,
			"",
			"⚠️ This is mock data — no work item was actually created.",
		].join("\n"),
		{ id: newId, type, title, mock: true },
	);
}

/**
 * Mock: update a work item — returns a simulated updated item.
 */
export function mockUpdateWorkItem(
	id: number,
	fields: Record<string, string>,
): ToolResult {
	const data = getWorkItems();
	const wi = data.workItems.find((w) => w.id === id);
	if (!wi) {
		return errorResult(`Work item #${id} not found (mock mode)`);
	}

	const lines: string[] = [
		`✅ Updated work item #${id} (mock mode)`,
		"",
		"Changed fields:",
	];
	for (const [key, value] of Object.entries(fields)) {
		lines.push(`- **${key}:** ${value}`);
	}
	lines.push("");
	lines.push("⚠️ This is mock data — no work item was actually updated.");

	return textResult(lines.join("\n"), { id, fields, mock: true });
}

/**
 * Mock: add a comment — returns confirmation.
 */
export function mockAddWorkItemComment(
	workItemId: number,
	text: string,
): ToolResult {
	return textResult(
		[
			`✅ Added comment to work item #${workItemId} (mock mode)`,
			"",
			`> ${text}`,
			"",
			"⚠️ This is mock data — no comment was actually added.",
		].join("\n"),
		{ workItemId, mock: true },
	);
}

/**
 * Mock: manage work item links — returns confirmation.
 */
export function mockManageWorkItemLinks(
	workItemId: number,
	operation: "add" | "remove",
	relationType: string,
	targetId: number,
): ToolResult {
	const verb = operation === "add" ? "Added" : "Removed";
	return textResult(
		[
			`✅ ${verb} ${relationType} link ${operation === "add" ? "to" : "from"} #${workItemId} → #${targetId} (mock mode)`,
			"",
			"⚠️ This is mock data — no link was actually modified.",
		].join("\n"),
		{ workItemId, operation, relationType, targetId, mock: true },
	);
}

/**
 * Mock: list teams in the project.
 */
export function mockListTeams(): ToolResult {
	const data = getTeams();
	return textResult(
		`Teams (mock mode):\n\n${formatTeamList(data.teams as any)}`,
		{ count: data.teams.length, mock: true },
	);
}

/**
 * Mock: list boards for a team.
 */
export function mockListBoards(team: string): ToolResult {
	const data = getBoards();
	const boards = data.boards[team];
	if (!boards) {
		return errorResult(`No boards found for team "${team}" (mock mode)`);
	}
	return textResult(
		`Boards for ${team} (mock mode):\n\n${formatBoardList(boards as any)}`,
		{ team, count: boards.length, mock: true },
	);
}

/**
 * Mock: get full board detail.
 */
export function mockGetBoard(team: string, boardId: string): ToolResult {
	const data = getBoardDetail();
	const key = `${team}:${boardId}`;
	const board = data.boardDetails[key];
	if (!board) {
		return errorResult(`Board "${boardId}" not found for team "${team}" (mock mode)`);
	}
	return textResult(
		`Board detail (mock mode):\n\n${formatBoard(board as any)}`,
		{ team, boardId, mock: true },
	);
}

/**
 * Mock: list iterations for a team.
 */
export function mockListIterations(team: string, timeframe?: string): ToolResult {
	const data = getIterations();
	const iterations = data.iterations[team];
	if (!iterations) {
		return errorResult(`No iterations found for team "${team}" (mock mode)`);
	}

	let filtered = iterations;
	if (timeframe) {
		const tf = timeframe.toLowerCase();
		filtered = iterations.filter(
			(it) => it.attributes?.timeFrame?.toLowerCase() === tf,
		);
	}

	return textResult(
		`Iterations for ${team} (mock mode):\n\n${formatIterationList(filtered as any)}`,
		{ team, count: filtered.length, mock: true },
	);
}

/**
 * Mock: get work items in an iteration.
 */
export function mockGetIterationWorkItems(team: string, iterationId: string): ToolResult {
	const data = getIterationWorkItems();
	const key = `${team}:${iterationId}`;
	const items = data.iterationWorkItems[key];
	if (!items || !items.workItemRelations || items.workItemRelations.length === 0) {
		return textResult(
			`No work items in iteration ${iterationId} for ${team} (mock mode)`,
			{ team, iterationId, count: 0, mock: true },
		);
	}

	// Collect target IDs and format
	const workItemData = getWorkItems();
	const ids = items.workItemRelations
		.filter((r) => r.target?.id)
		.map((r) => r.target!.id!);
	const matched = workItemData.workItems.filter((wi) => ids.includes(wi.id));

	const lines = [`Work items in iteration ${iterationId} for ${team} (mock mode):`, ""];
	if (matched.length > 0) {
		lines.push(formatWorkItemList(matched as any));
	} else {
		lines.push(`Work item IDs: ${ids.join(", ")}`);
	}

	return textResult(lines.join("\n"), { team, iterationId, count: ids.length, mock: true });
}

/**
 * Mock: get sprint capacity.
 */
export function mockGetCapacity(team: string, iterationId: string): ToolResult {
	const data = getCapacity();
	const key = `${team}:${iterationId}`;
	const cap = data.capacities[key];
	if (!cap) {
		return errorResult(`No capacity data for ${team} / ${iterationId} (mock mode)`);
	}
	return textResult(
		`Sprint capacity (mock mode):\n\n${formatCapacity(cap as any)}`,
		{ team, iterationId, mock: true },
	);
}

/**
 * Mock: set board columns — returns confirmation.
 */
export function mockSetBoardColumns(
	team: string,
	boardId: string,
	columns: Array<{ name: string; itemLimit?: number }>,
): ToolResult {
	const colNames = columns.map((c) => c.name).join(" → ");
	return textResult(
		[
			`✅ Updated columns on board "${boardId}" for ${team} (mock mode)`,
			"",
			`Columns: ${colNames}`,
			"",
			"⚠️ This is mock data — no board was actually modified.",
		].join("\n"),
		{ team, boardId, mock: true },
	);
}

/**
 * Mock: set iteration — add or remove from team.
 */
export function mockSetIteration(
	team: string,
	iterationId: string,
	operation: "add" | "remove",
): ToolResult {
	const verb = operation === "add" ? "Added" : "Removed";
	const prep = operation === "add" ? "to" : "from";
	return textResult(
		[
			`✅ ${verb} iteration ${iterationId} ${prep} ${team} (mock mode)`,
			"",
			"⚠️ This is mock data — no iteration was actually modified.",
		].join("\n"),
		{ team, iterationId, operation, mock: true },
	);
}

/**
 * Mock: set capacity — returns confirmation.
 */
export function mockSetCapacity(
	team: string,
	iterationId: string,
	capacities: Array<{ teamMemberId: string }>,
): ToolResult {
	return textResult(
		[
			`✅ Set capacity for ${capacities.length} member(s) in ${team} / ${iterationId} (mock mode)`,
			"",
			"⚠️ This is mock data — no capacity was actually modified.",
		].join("\n"),
		{ team, iterationId, memberCount: capacities.length, mock: true },
	);
}

// ---------------------------------------------------------------------------
// Phase 3: Repos & PRs fixture types
// ---------------------------------------------------------------------------

interface ReposFixture {
	repositories: Array<{
		id?: string;
		name?: string;
		url?: string;
		defaultBranch?: string;
		size?: number;
		project?: { id?: string; name?: string; url?: string };
	}>;
}

interface BranchesFixture {
	branches: Record<string, Array<{
		name?: string;
		commit?: {
			commitId?: string;
			author?: { name?: string; date?: string };
			comment?: string;
		};
		aheadCount?: number;
		behindCount?: number;
		isBaseVersion?: boolean;
	}>>;
}

interface PullRequestsFixture {
	pullRequests: Array<{
		pullRequestId?: number;
		title?: string;
		description?: string;
		status?: string;
		sourceRefName?: string;
		targetRefName?: string;
		repositoryId?: string;
		createdBy?: { id?: string; displayName?: string; uniqueName?: string };
		creationDate?: string;
		reviewers?: Array<{ id?: string; displayName?: string; vote?: number }>;
		mergeStatus?: string;
		url?: string;
	}>;
}

interface PrThreadsFixture {
	prThreads: Record<string, Array<{
		id?: number;
		status?: number;
		comments?: Array<{
			id?: number;
			author?: { displayName?: string; uniqueName?: string };
			publishedDate?: string;
			content?: string;
		}>;
	}>>;
}

interface PrCommitsFixture {
	prCommits: Record<string, Array<{
		commitId?: string;
		author?: { name?: string; date?: string };
		comment?: string;
		url?: string;
	}>>;
}

interface PoliciesFixture {
	policies: Array<{
		id?: number;
		type?: { id?: string; displayName?: string; url?: string };
		scope?: Array<{ repositoryId?: string | null; refName?: string; matchKind?: string }>;
		settings?: Record<string, unknown>;
		isBlocking?: boolean;
		isDeleted?: boolean;
	}>;
}

interface PolicyEvaluationsFixture {
	evaluations: Array<{
		evaluationId?: string;
		policyId?: number;
		policyDisplayName?: string;
		artifactId?: string;
		status?: string;
		startedDate?: string;
		completedDate?: string;
		context?: Record<string, unknown>;
	}>;
}

let _repos: ReposFixture | undefined;
let _branches: BranchesFixture | undefined;
let _pullRequests: PullRequestsFixture | undefined;
let _prThreads: PrThreadsFixture | undefined;
let _prCommits: PrCommitsFixture | undefined;
let _policies: PoliciesFixture | undefined;
let _policyEvals: PolicyEvaluationsFixture | undefined;

function getRepos(): ReposFixture {
	return (_repos ??= loadFixture<ReposFixture>("repos.json"));
}
function getBranches(): BranchesFixture {
	return (_branches ??= loadFixture<BranchesFixture>("branches.json"));
}
function getPullRequests(): PullRequestsFixture {
	return (_pullRequests ??= loadFixture<PullRequestsFixture>("pull-requests.json"));
}
function getPrThreads(): PrThreadsFixture {
	return (_prThreads ??= loadFixture<PrThreadsFixture>("pr-threads.json"));
}
function getPrCommits(): PrCommitsFixture {
	return (_prCommits ??= loadFixture<PrCommitsFixture>("pr-commits.json"));
}
function getPolicies(): PoliciesFixture {
	return (_policies ??= loadFixture<PoliciesFixture>("policies.json"));
}
function getPolicyEvals(): PolicyEvaluationsFixture {
	return (_policyEvals ??= loadFixture<PolicyEvaluationsFixture>("policy-evaluations.json"));
}

// ---------------------------------------------------------------------------
// Phase 3: Repo & PR mock handlers
// ---------------------------------------------------------------------------

/**
 * Mock: list repositories.
 */
export function mockListRepos(): ToolResult {
	const data = getRepos();
	return textResult(
		`Repositories (mock mode):\n\n${formatRepoList(data.repositories as any)}`,
		{ count: data.repositories.length, mock: true },
	);
}

/**
 * Mock: get a single repository.
 */
export function mockGetRepo(repoId: string): ToolResult {
	const data = getRepos();
	const repo = data.repositories.find((r) => r.id === repoId || r.name === repoId);
	if (!repo) {
		return errorResult(`Repository "${repoId}" not found (mock mode)`);
	}
	return textResult(
		`Repository detail (mock mode):\n\n${formatRepo(repo as any)}`,
		{ repoId: repo.id, mock: true },
	);
}

/**
 * Mock: list branches for a repository.
 */
export function mockListBranches(repoId: string): ToolResult {
	const data = getBranches();
	const branches = data.branches[repoId];
	if (!branches) {
		return errorResult(`No branches found for repository "${repoId}" (mock mode)`);
	}
	return textResult(
		`Branches for ${repoId} (mock mode):\n\n${formatBranchList(branches as any)}`,
		{ repoId, count: branches.length, mock: true },
	);
}

/**
 * Mock: list pull requests with optional filters.
 */
export function mockListPullRequests(filters?: {
	status?: string;
	creator?: string;
	repositoryId?: string;
}): ToolResult {
	const data = getPullRequests();
	let prs = [...data.pullRequests];

	if (filters?.status) {
		prs = prs.filter((pr) => pr.status === filters.status);
	}
	if (filters?.creator) {
		prs = prs.filter((pr) =>
			pr.createdBy?.displayName?.toLowerCase().includes(filters.creator!.toLowerCase())
			|| pr.createdBy?.uniqueName?.toLowerCase().includes(filters.creator!.toLowerCase()),
		);
	}
	if (filters?.repositoryId) {
		prs = prs.filter((pr) => pr.repositoryId === filters.repositoryId);
	}

	return textResult(
		`Pull requests (mock mode):\n\n${formatPullRequestList(prs as any)}`,
		{ count: prs.length, mock: true },
	);
}

/**
 * Mock: get a single pull request by ID.
 */
export function mockGetPullRequest(prId: number): ToolResult {
	const data = getPullRequests();
	const pr = data.pullRequests.find((p) => p.pullRequestId === prId);
	if (!pr) {
		return errorResult(`Pull request #${prId} not found (mock mode)`);
	}
	return textResult(
		`Pull request detail (mock mode):\n\n${formatPullRequest(pr as any)}`,
		{ pullRequestId: pr.pullRequestId, mock: true },
	);
}

/**
 * Mock: get comment threads for a PR.
 */
export function mockGetPullRequestThreads(repoId: string, prId: number): ToolResult {
	const data = getPrThreads();
	const key = `${repoId}:${prId}`;
	const threads = data.prThreads[key];
	if (!threads || threads.length === 0) {
		return textResult(
			`No comment threads on PR #${prId} (mock mode)`,
			{ repoId, pullRequestId: prId, count: 0, mock: true },
		);
	}
	const formatted = threads.map((t) => formatPullRequestThread(t as any)).join("\n");
	return textResult(
		`Comment threads on PR #${prId} (mock mode):\n\n${formatted}`,
		{ repoId, pullRequestId: prId, count: threads.length, mock: true },
	);
}

/**
 * Mock: get commits for a PR.
 */
export function mockGetPullRequestCommits(repoId: string, prId: number): ToolResult {
	const data = getPrCommits();
	const commits = data.prCommits[String(prId)];
	if (!commits || commits.length === 0) {
		return textResult(
			`No commits on PR #${prId} (mock mode)`,
			{ repoId, pullRequestId: prId, count: 0, mock: true },
		);
	}
	return textResult(
		`Commits on PR #${prId} (mock mode):\n\n${formatCommitList(commits as any)}`,
		{ repoId, pullRequestId: prId, count: commits.length, mock: true },
	);
}

/**
 * Mock: create a pull request.
 */
export function mockCreatePullRequest(
	repoId: string,
	title: string,
	sourceRefName: string,
	targetRefName: string,
	description?: string,
): ToolResult {
	const newId = 100 + Math.floor(Math.random() * 50);
	return textResult(
		[
			`✅ Created pull request #${newId} (mock mode)`,
			"",
			`- **Title:** ${title}`,
			`- **Branch:** ${sourceRefName.replace("refs/heads/", "")} → ${targetRefName.replace("refs/heads/", "")}`,
			`- **Repository:** ${repoId}`,
			`- **Status:** Active`,
			description ? `\n${description}` : "",
			"",
			"⚠️ This is mock data — no pull request was actually created.",
		].join("\n"),
		{ pullRequestId: newId, repoId, title, mock: true },
	);
}

/**
 * Mock: update a pull request.
 */
export function mockUpdatePullRequest(
	repoId: string,
	prId: number,
	updates: { title?: string; description?: string; status?: string },
): ToolResult {
	const data = getPullRequests();
	const pr = data.pullRequests.find((p) => p.pullRequestId === prId);
	if (!pr) {
		return errorResult(`Pull request #${prId} not found (mock mode)`);
	}
	const changed: string[] = [];
	if (updates.title) changed.push(`title: ${updates.title}`);
	if (updates.description) changed.push("description");
	if (updates.status) changed.push(`status: ${updates.status}`);

	return textResult(
		[
			`✅ Updated pull request #${prId} (mock mode)`,
			"",
			`Changed: ${changed.join(", ")}`,
			"",
			"⚠️ This is mock data — no pull request was actually updated.",
		].join("\n"),
		{ pullRequestId: prId, repoId, changes: changed, mock: true },
	);
}

/**
 * Mock: add a comment to a PR (creates a new thread).
 */
export function mockAddPullRequestComment(
	repoId: string,
	prId: number,
	text: string,
): ToolResult {
	return textResult(
		[
			`✅ Added comment to PR #${prId} (mock mode)`,
			"",
			`> ${text}`,
			"",
			"⚠️ This is mock data — no comment was actually added.",
		].join("\n"),
		{ pullRequestId: prId, repoId, mock: true },
	);
}

/**
 * Mock: set vote on a PR.
 */
export function mockSetPullRequestVote(
	repoId: string,
	prId: number,
	vote: number,
): ToolResult {
	const VOTE_LABELS: Record<number, string> = {
		10: "Approved",
		5: "Approved with suggestions",
		0: "No vote",
		[-5]: "Waiting for author",
		[-10]: "Rejected",
	};
	const label = VOTE_LABELS[vote] ?? `Unknown (${vote})`;
	return textResult(
		[
			`✅ Set vote on PR #${prId}: ${label} (mock mode)`,
			"",
			"⚠️ This is mock data — no vote was actually recorded.",
		].join("\n"),
		{ pullRequestId: prId, repoId, vote, voteLabel: label, mock: true },
	);
}

/**
 * Mock: list policy configurations.
 */
export function mockListPolicies(scope?: string): ToolResult {
	const data = getPolicies();
	let policies = data.policies.filter((p) => !p.isDeleted);
	if (scope) {
		policies = policies.filter((p) =>
			p.scope?.some((s) => s.refName?.includes(scope)),
		);
	}
	const formatted = policies.map((p) => formatPolicy(p as any)).join("\n");
	return textResult(
		`Policy configurations (mock mode):\n\n${formatted}`,
		{ count: policies.length, mock: true },
	);
}

/**
 * Mock: get policy evaluations.
 */
export function mockGetPolicyEvaluations(artifactId: string): ToolResult {
	const data = getPolicyEvals();
	const evals = data.evaluations.filter((e) => e.artifactId === artifactId);
	if (evals.length === 0) {
		// Return all evaluations if artifactId doesn't match (convenient for testing)
		const allFormatted = data.evaluations.map((e) => formatPolicyEvaluation(e as any)).join("\n");
		return textResult(
			`Policy evaluations (mock mode):\n\n${allFormatted}`,
			{ count: data.evaluations.length, mock: true },
		);
	}
	const formatted = evals.map((e) => formatPolicyEvaluation(e as any)).join("\n");
	return textResult(
		`Policy evaluations (mock mode):\n\n${formatted}`,
		{ count: evals.length, mock: true },
	);
}

// ---------------------------------------------------------------------------
// Phase 2: Pipelines fixture types
// ---------------------------------------------------------------------------

interface PipelinesFixture {
	pipelines: Array<{
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
	}>;
}

interface RunsFixture {
	runs: Array<{
		id?: number;
		name?: string;
		pipeline?: { id?: number; name?: string; folder?: string };
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
	}>;
}

interface RunArtifactsFixture {
	artifacts: Record<string, Array<{
		id?: number;
		name?: string;
		resource?: {
			type?: string;
			data?: string;
			url?: string;
		};
	}>>;
}

interface RunLogsFixture {
	logs: Record<string, Array<{
		id?: number;
		type?: string;
		createdOn?: string;
		lastChangedOn?: string;
		lineCount?: number;
		url?: string;
	}>>;
}

interface RunTimelineFixture {
	timelines: Record<string, {
		records?: Array<{
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
		}>;
	}>;
}

let _pipelines: PipelinesFixture | undefined;
let _runs: RunsFixture | undefined;
let _runArtifacts: RunArtifactsFixture | undefined;
let _runLogs: RunLogsFixture | undefined;
let _runTimelines: RunTimelineFixture | undefined;

function getPipelines(): PipelinesFixture {
	return (_pipelines ??= loadFixture<PipelinesFixture>("pipelines.json"));
}
function getRuns(): RunsFixture {
	return (_runs ??= loadFixture<RunsFixture>("runs.json"));
}
function getRunArtifacts(): RunArtifactsFixture {
	return (_runArtifacts ??= loadFixture<RunArtifactsFixture>("run-artifacts.json"));
}
function getRunLogs(): RunLogsFixture {
	return (_runLogs ??= loadFixture<RunLogsFixture>("run-logs.json"));
}
function getRunTimelines(): RunTimelineFixture {
	return (_runTimelines ??= loadFixture<RunTimelineFixture>("run-timeline.json"));
}

// ---------------------------------------------------------------------------
// Phase 4: Test plan fixture types + lazy-loaders
// ---------------------------------------------------------------------------

interface TestPlansFixture {
	testPlans: Array<{
		id: number;
		name: string;
		state?: string;
		iteration?: string;
		startDate?: string;
		endDate?: string;
		owner?: { displayName?: string; uniqueName?: string };
		rootSuite?: { id?: number; name?: string };
		revision?: number;
		areaPath?: string;
		url?: string;
	}>;
}

interface TestSuitesFixture {
	testSuites: Record<string, Array<{
		id: number;
		name: string;
		suiteType?: string;
		parentSuite?: { id?: number; name?: string } | null;
		children?: number[];
		testCaseCount?: number;
		requirementId?: number;
		plan?: { id?: number; name?: string };
		url?: string;
	}>>;
}

interface TestCasesFixture {
	testCases: Record<string, Array<{
		workItem?: {
			id?: number;
			name?: string;
			workItemFields?: Array<Record<string, unknown>>;
		};
		order?: number;
		pointAssignments?: Array<{ configurationId?: number; configurationName?: string }>;
	}>>;
}

interface TestPointsFixture {
	testPoints: Record<string, Array<{
		id?: number;
		testCaseReference?: { id?: number; name?: string };
		configuration?: { id?: string; name?: string };
		outcome?: string;
		state?: string;
		tester?: { displayName?: string; uniqueName?: string };
		lastRunBuildNumber?: string | null;
		url?: string;
	}>>;
}

interface TestRunsFixture {
	testRuns: Array<{
		id: number;
		name: string;
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
		buildConfiguration?: { buildDefinitionId?: number } | null;
		url?: string;
	}>;
}

interface TestResultsFixture {
	testResults: Record<string, Array<{
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
	}>>;
}

let _testPlans: TestPlansFixture | undefined;
let _testSuites: TestSuitesFixture | undefined;
let _testCases: TestCasesFixture | undefined;
let _testPoints: TestPointsFixture | undefined;
let _testRuns: TestRunsFixture | undefined;
let _testResults: TestResultsFixture | undefined;

function getTestPlans(): TestPlansFixture {
	return (_testPlans ??= loadFixture<TestPlansFixture>("test-plans.json"));
}
function getTestSuites(): TestSuitesFixture {
	return (_testSuites ??= loadFixture<TestSuitesFixture>("test-suites.json"));
}
function getTestCases(): TestCasesFixture {
	return (_testCases ??= loadFixture<TestCasesFixture>("test-cases.json"));
}
function getTestPoints(): TestPointsFixture {
	return (_testPoints ??= loadFixture<TestPointsFixture>("test-points.json"));
}
function getTestRuns(): TestRunsFixture {
	return (_testRuns ??= loadFixture<TestRunsFixture>("test-runs.json"));
}
function getTestResults(): TestResultsFixture {
	return (_testResults ??= loadFixture<TestResultsFixture>("test-results.json"));
}

// ---------------------------------------------------------------------------
// Phase 2: Pipeline mock handlers
// ---------------------------------------------------------------------------

/**
 * Mock: list all pipelines.
 */
export function mockListPipelines(): ToolResult {
	const data = getPipelines();
	return textResult(
		`Pipelines (mock mode):\n\n${formatPipelineList(data.pipelines as any)}`,
		{ count: data.pipelines.length, mock: true },
	);
}

/**
 * Mock: get a single pipeline by ID.
 */
export function mockGetPipeline(pipelineId: number): ToolResult {
	const data = getPipelines();
	const pipeline = data.pipelines.find((p) => p.id === pipelineId);
	if (!pipeline) {
		return errorResult(`Pipeline #${pipelineId} not found (mock mode)`);
	}
	return textResult(
		`Pipeline detail (mock mode):\n\n${formatPipeline(pipeline as any)}`,
		{ pipelineId: pipeline.id, mock: true },
	);
}

/**
 * Mock: list runs, optionally filtered by pipeline.
 */
export function mockListRuns(filters?: {
	pipelineId?: number;
	status?: string;
	result?: string;
	branch?: string;
}): ToolResult {
	const data = getRuns();
	let runs = [...data.runs];

	if (filters?.pipelineId) {
		runs = runs.filter((r) => r.pipeline?.id === filters.pipelineId);
	}
	if (filters?.status) {
		runs = runs.filter((r) => r.state === filters.status);
	}
	if (filters?.result) {
		runs = runs.filter((r) => r.result === filters.result);
	}
	if (filters?.branch) {
		const branchRef = filters.branch.startsWith("refs/") ? filters.branch : `refs/heads/${filters.branch}`;
		runs = runs.filter((r) => r.resources?.repositories?.self?.refName === branchRef);
	}

	return textResult(
		`Runs (mock mode):\n\n${formatRunList(runs as any)}`,
		{ count: runs.length, mock: true },
	);
}

/**
 * Mock: get a single run.
 */
export function mockGetRun(pipelineId: number, runId: number): ToolResult {
	const data = getRuns();
	const run = data.runs.find((r) => r.id === runId && r.pipeline?.id === pipelineId);
	if (!run) {
		return errorResult(`Run #${runId} not found for pipeline #${pipelineId} (mock mode)`);
	}
	return textResult(
		`Run detail (mock mode):\n\n${formatRun(run as any)}`,
		{ pipelineId, runId: run.id, mock: true },
	);
}

/**
 * Mock: get artifacts for a run.
 */
export function mockGetRunArtifacts(pipelineId: number, runId: number): ToolResult {
	const data = getRunArtifacts();
	const artifacts = data.artifacts[String(runId)];
	if (!artifacts || artifacts.length === 0) {
		return textResult(
			`No artifacts for run #${runId} (mock mode)`,
			{ pipelineId, runId, count: 0, mock: true },
		);
	}
	return textResult(
		`Artifacts for run #${runId} (mock mode):\n\n${formatArtifactList(artifacts as any)}`,
		{ pipelineId, runId, count: artifacts.length, mock: true },
	);
}

/**
 * Mock: get log entries for a run.
 */
export function mockGetRunLogs(pipelineId: number, runId: number): ToolResult {
	const data = getRunLogs();
	const logs = data.logs[String(runId)];
	if (!logs || logs.length === 0) {
		return textResult(
			`No logs for run #${runId} (mock mode)`,
			{ pipelineId, runId, count: 0, mock: true },
		);
	}

	const lines = logs.map((log) => {
		const created = log.createdOn ? new Date(log.createdOn).toISOString().slice(0, 19).replace("T", " ") : "?";
		return `Log #${log.id ?? "?"} (${log.lineCount ?? 0} lines) — ${created}`;
	});

	return textResult(
		`Logs for run #${runId} (mock mode):\n\n${lines.join("\n")}`,
		{ pipelineId, runId, count: logs.length, mock: true },
	);
}

/**
 * Mock: get timeline for a run.
 */
export function mockGetRunTimeline(pipelineId: number, runId: number): ToolResult {
	const data = getRunTimelines();
	const timeline = data.timelines[String(runId)];
	if (!timeline || !timeline.records || timeline.records.length === 0) {
		return textResult(
			`No timeline for run #${runId} (mock mode)`,
			{ pipelineId, runId, count: 0, mock: true },
		);
	}
	return textResult(
		`Timeline for run #${runId} (mock mode):\n\n${formatTimeline(timeline as any)}`,
		{ pipelineId, runId, count: timeline.records.length, mock: true },
	);
}

/**
 * Mock: run a pipeline — returns a simulated new run.
 */
export function mockRunPipeline(
	pipelineId: number,
	branch?: string,
	templateParameters?: Record<string, string>,
): ToolResult {
	const data = getPipelines();
	const pipeline = data.pipelines.find((p) => p.id === pipelineId);
	if (!pipeline) {
		return errorResult(`Pipeline #${pipelineId} not found (mock mode)`);
	}
	const newRunId = 100 + Math.floor(Math.random() * 900);
	const branchRef = branch ? `refs/heads/${branch}` : "refs/heads/main";
	const params = templateParameters ?? {};
	const paramStr = Object.keys(params).length > 0
		? `\n- **Parameters:** ${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(", ")}`
		: "";

	return textResult(
		[
			`✅ Queued run #${newRunId} for "${pipeline.name}" (mock mode)`,
			"",
			`- **Pipeline:** ${pipeline.name} (#${pipeline.id})`,
			`- **Branch:** ${branchRef.replace("refs/heads/", "")}`,
			`- **State:** inProgress`,
			paramStr,
			"",
			"⚠️ This is mock data — no pipeline was actually run.",
		].filter(Boolean).join("\n"),
		{ pipelineId, runId: newRunId, branch: branchRef, mock: true },
	);
}

/**
 * Mock: cancel a run.
 */
export function mockCancelRun(pipelineId: number, runId: number): ToolResult {
	const data = getRuns();
	const run = data.runs.find((r) => r.id === runId && r.pipeline?.id === pipelineId);
	if (!run) {
		return errorResult(`Run #${runId} not found for pipeline #${pipelineId} (mock mode)`);
	}
	if (run.state !== "inProgress") {
		return errorResult(`Run #${runId} is not in progress (state: ${run.state}) — cannot cancel (mock mode)`);
	}
	return textResult(
		[
			`✅ Cancelled run #${runId} (mock mode)`,
			"",
			`- **Pipeline:** ${run.pipeline?.name ?? "?"} (#${pipelineId})`,
			`- **State:** cancelling`,
			"",
			"⚠️ This is mock data — no run was actually cancelled.",
		].join("\n"),
		{ pipelineId, runId, mock: true },
	);
}

/**
 * Mock: retry a failed run.
 */
export function mockRetryRun(pipelineId: number, runId: number): ToolResult {
	const data = getRuns();
	const run = data.runs.find((r) => r.id === runId && r.pipeline?.id === pipelineId);
	if (!run) {
		return errorResult(`Run #${runId} not found for pipeline #${pipelineId} (mock mode)`);
	}
	const newRunId = runId + 1000;
	return textResult(
		[
			`✅ Retried run #${runId} → new run #${newRunId} (mock mode)`,
			"",
			`- **Pipeline:** ${run.pipeline?.name ?? "?"} (#${pipelineId})`,
			`- **Original run:** #${runId}`,
			`- **New run:** #${newRunId}`,
			`- **State:** inProgress`,
			"",
			"⚠️ This is mock data — no run was actually retried.",
		].join("\n"),
		{ pipelineId, originalRunId: runId, newRunId, mock: true },
	);
}

// ---------------------------------------------------------------------------
// Phase 4: Test plan mock handlers
// ---------------------------------------------------------------------------

/**
 * Mock: list test plans, optionally filter by active only.
 */
export function mockListTestPlans(filters?: {
	filterActivePlans?: boolean;
}): ToolResult {
	const data = getTestPlans();
	let plans = [...data.testPlans];

	if (filters?.filterActivePlans) {
		plans = plans.filter((p) => p.state === "active");
	}

	return textResult(
		`Test plans (mock mode):\n\n${formatTestPlanList(plans as any)}`,
		{ count: plans.length, mock: true },
	);
}

/**
 * Mock: get a single test plan by ID.
 */
export function mockGetTestPlan(planId: number): ToolResult {
	const data = getTestPlans();
	const plan = data.testPlans.find((p) => p.id === planId);
	if (!plan) {
		return errorResult(`Test plan #${planId} not found (mock mode)`);
	}
	return textResult(
		`Test plan detail (mock mode):\n\n${formatTestPlan(plan as any)}`,
		{ planId: plan.id, mock: true },
	);
}

/**
 * Mock: list test suites for a plan.
 */
export function mockListTestSuites(planId: number): ToolResult {
	const data = getTestSuites();
	const suites = data.testSuites[String(planId)];
	if (!suites || suites.length === 0) {
		return textResult(
			`No test suites found for plan #${planId} (mock mode)`,
			{ planId, count: 0, mock: true },
		);
	}
	return textResult(
		`Test suites for plan #${planId} (mock mode):\n\n${formatTestSuiteList(suites as any)}`,
		{ planId, count: suites.length, mock: true },
	);
}

/**
 * Mock: get a single test suite by plan and suite ID.
 */
export function mockGetTestSuite(planId: number, suiteId: number): ToolResult {
	const data = getTestSuites();
	const suites = data.testSuites[String(planId)];
	if (!suites) {
		return errorResult(`No suites found for plan #${planId} (mock mode)`);
	}
	const suite = suites.find((s) => s.id === suiteId);
	if (!suite) {
		return errorResult(`Test suite #${suiteId} not found in plan #${planId} (mock mode)`);
	}
	return textResult(
		`Test suite detail (mock mode):\n\n${formatTestSuite(suite as any)}`,
		{ planId, suiteId: suite.id, mock: true },
	);
}

/**
 * Mock: list test cases in a suite.
 */
export function mockListTestCases(planId: number, suiteId: number): ToolResult {
	const key = `${planId}-${suiteId}`;
	const data = getTestCases();
	const cases = data.testCases[key];
	if (!cases || cases.length === 0) {
		return textResult(
			`No test cases in suite #${suiteId} of plan #${planId} (mock mode)`,
			{ planId, suiteId, count: 0, mock: true },
		);
	}
	return textResult(
		`Test cases in suite #${suiteId} (mock mode):\n\n${formatTestCaseList(cases as any)}`,
		{ planId, suiteId, count: cases.length, mock: true },
	);
}

/**
 * Mock: list test points in a suite.
 */
export function mockListTestPoints(planId: number, suiteId: number): ToolResult {
	const key = `${planId}-${suiteId}`;
	const data = getTestPoints();
	const points = data.testPoints[key];
	if (!points || points.length === 0) {
		return textResult(
			`No test points in suite #${suiteId} of plan #${planId} (mock mode)`,
			{ planId, suiteId, count: 0, mock: true },
		);
	}
	return textResult(
		`Test points in suite #${suiteId} (mock mode):\n\n${formatTestPointList(points as any)}`,
		{ planId, suiteId, count: points.length, mock: true },
	);
}

/**
 * Mock: create a test run.
 */
export function mockCreateTestRun(
	planId: number,
	suiteIds: number[],
	name?: string,
): ToolResult {
	const planData = getTestPlans();
	const plan = planData.testPlans.find((p) => p.id === planId);
	if (!plan) {
		return errorResult(`Test plan #${planId} not found (mock mode)`);
	}
	const newRunId = 600 + Math.floor(Math.random() * 100);
	const runName = name ?? `${plan.name} — Run ${newRunId}`;

	return textResult(
		[
			`✅ Created test run #${newRunId} (mock mode)`,
			"",
			`- **Name:** ${runName}`,
			`- **Plan:** ${plan.name} (#${planId})`,
			`- **Suites:** ${suiteIds.map((s) => `#${s}`).join(", ")}`,
			`- **State:** NotStarted`,
			"",
			"⚠️ This is mock data — no test run was actually created.",
		].join("\n"),
		{ planId, runId: newRunId, name: runName, mock: true },
	);
}

/**
 * Mock: update test results in a run.
 */
export function mockUpdateTestResults(
	runId: number,
	results: Array<{ testCaseResultId: number; outcome: string; comment?: string }>,
): ToolResult {
	const runsData = getTestRuns();
	const run = runsData.testRuns.find((r) => r.id === runId);
	if (!run) {
		return errorResult(`Test run #${runId} not found (mock mode)`);
	}

	const lines = results.map((r) => {
		const commentStr = r.comment ? ` — "${r.comment}"` : "";
		return `  - Result #${r.testCaseResultId}: ${r.outcome}${commentStr}`;
	});

	return textResult(
		[
			`✅ Updated ${results.length} result(s) in run #${runId} (mock mode)`,
			"",
			...lines,
			"",
			"⚠️ This is mock data — no results were actually updated.",
		].join("\n"),
		{ runId, updatedCount: results.length, mock: true },
	);
}

/**
 * Mock: get a test run by ID.
 */
export function mockGetTestRun(runId: number): ToolResult {
	const data = getTestRuns();
	const run = data.testRuns.find((r) => r.id === runId);
	if (!run) {
		return errorResult(`Test run #${runId} not found (mock mode)`);
	}
	return textResult(
		`Test run detail (mock mode):\n\n${formatTestRun(run as any)}`,
		{ runId: run.id, mock: true },
	);
}

/**
 * Mock: list test runs, optionally filtered by plan.
 */
export function mockListTestRuns(filters?: {
	planId?: number;
}): ToolResult {
	const data = getTestRuns();
	let runs = [...data.testRuns];

	if (filters?.planId) {
		runs = runs.filter((r) => r.plan?.id === filters.planId);
	}

	return textResult(
		`Test runs (mock mode):\n\n${formatTestRunList(runs as any)}`,
		{ count: runs.length, mock: true },
	);
}

/**
 * Mock: get test results for a run.
 */
export function mockGetTestResults(runId: number): ToolResult {
	const data = getTestResults();
	const results = data.testResults[String(runId)];
	if (!results || results.length === 0) {
		return textResult(
			`No test results for run #${runId} (mock mode)`,
			{ runId, count: 0, mock: true },
		);
	}
	return textResult(
		`Test results for run #${runId} (mock mode):\n\n${formatTestResultList(results as any)}`,
		{ runId, count: results.length, mock: true },
	);
}

/**
 * Clear cached fixtures (useful for testing).
 */
export function clearFixtureCache(): void {
	_workItems = undefined;
	_types = undefined;
	_comments = undefined;
	_revisions = undefined;
	_teams = undefined;
	_boards = undefined;
	_boardDetail = undefined;
	_iterations = undefined;
	_iterationWorkItems = undefined;
	_capacity = undefined;
	_repos = undefined;
	_branches = undefined;
	_pullRequests = undefined;
	_prThreads = undefined;
	_prCommits = undefined;
	_policies = undefined;
	_policyEvals = undefined;
	_pipelines = undefined;
	_runs = undefined;
	_runArtifacts = undefined;
	_runLogs = undefined;
	_runTimelines = undefined;
	_testPlans = undefined;
	_testSuites = undefined;
	_testCases = undefined;
	_testPoints = undefined;
	_testRuns = undefined;
	_testResults = undefined;
}
