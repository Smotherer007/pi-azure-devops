import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
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
} from "../../src/utils/formatting.js";

// ---------------------------------------------------------------------------
// Repo formatting
// ---------------------------------------------------------------------------

describe("formatRepo", () => {
	it("formats a repo with all fields", () => {
		const result = formatRepo({
			id: "repo-1",
			name: "webapp",
			url: "https://dev.azure.com/org/_git/webapp",
			defaultBranch: "refs/heads/main",
			size: 1234567,
			project: { name: "TestProject" },
		});
		assert.ok(result.includes("webapp"));
		assert.ok(result.includes("repo-1"));
		assert.ok(result.includes("main"));
		assert.ok(result.includes("1.2 MB"));
		assert.ok(result.includes("TestProject"));
	});

	it("handles missing fields", () => {
		const result = formatRepo({});
		assert.ok(result.includes("Unknown"));
	});

	it("formats size in different units", () => {
		assert.ok(formatRepo({ size: 500 }).includes("500 B"));
		assert.ok(formatRepo({ size: 2048 }).includes("2.0 KB"));
		assert.ok(formatRepo({ size: 1048576 }).includes("1.0 MB"));
	});
});

describe("formatRepoList", () => {
	it("formats multiple repos", () => {
		const result = formatRepoList([
			{ id: "r1", name: "webapp" },
			{ id: "r2", name: "api" },
		]);
		assert.ok(result.includes("webapp"));
		assert.ok(result.includes("api"));
	});

	it("returns message for empty list", () => {
		assert.equal(formatRepoList([]), "No repositories found.");
	});
});

// ---------------------------------------------------------------------------
// Branch formatting
// ---------------------------------------------------------------------------

describe("formatBranch", () => {
	it("formats a branch with all fields", () => {
		const result = formatBranch({
			name: "feature/login",
			commit: {
				commitId: "abc1234567890",
				author: { name: "Alice", date: "2026-05-10T10:00:00Z" },
				comment: "Add login page",
			},
			aheadCount: 3,
			behindCount: 1,
			isBaseVersion: false,
		});
		assert.ok(result.includes("feature/login"));
		assert.ok(result.includes("abc1234"));
		assert.ok(result.includes("↑3 ↓1"));
		assert.ok(result.includes("Add login page"));
	});

	it("shows base badge for base version", () => {
		const result = formatBranch({ name: "main", isBaseVersion: true });
		assert.ok(result.includes("(base)"));
	});

	it("handles missing fields", () => {
		const result = formatBranch({});
		assert.ok(result.includes("?"));
	});
});

describe("formatBranchList", () => {
	it("formats multiple branches", () => {
		const result = formatBranchList([
			{ name: "main" },
			{ name: "develop" },
		]);
		assert.ok(result.includes("main"));
		assert.ok(result.includes("develop"));
	});

	it("returns message for empty list", () => {
		assert.equal(formatBranchList([]), "No branches found.");
	});
});

// ---------------------------------------------------------------------------
// Pull Request formatting
// ---------------------------------------------------------------------------

describe("formatPullRequest", () => {
	it("formats a PR with all fields", () => {
		const result = formatPullRequest({
			pullRequestId: 1,
			title: "Add login page",
			description: "Implements OAuth login.",
			status: "active",
			sourceRefName: "refs/heads/feature/login",
			targetRefName: "refs/heads/main",
			createdBy: { displayName: "Alice Developer" },
			creationDate: "2026-05-10T10:30:00Z",
			reviewers: [
				{ displayName: "Bob", vote: 10 },
				{ displayName: "Carol", vote: 0 },
			],
			url: "https://dev.azure.com/org/_git/webapp/pullrequest/1",
		});
		assert.ok(result.includes("PR #1"));
		assert.ok(result.includes("Add login page"));
		assert.ok(result.includes("Active"));
		assert.ok(result.includes("feature/login → main"));
		assert.ok(result.includes("Alice Developer"));
		assert.ok(result.includes("Bob (Approved)"));
		assert.ok(result.includes("Carol (No vote)"));
		assert.ok(result.includes("OAuth login"));
	});

	it("formats completed PR", () => {
		const result = formatPullRequest({ status: "completed" });
		assert.ok(result.includes("Completed"));
	});

	it("formats abandoned PR", () => {
		const result = formatPullRequest({ status: "abandoned" });
		assert.ok(result.includes("Abandoned"));
	});

	it("handles missing fields", () => {
		const result = formatPullRequest({});
		assert.ok(result.includes("Unknown"));
	});
});

describe("formatPullRequestList", () => {
	it("formats multiple PRs", () => {
		const result = formatPullRequestList([
			{ pullRequestId: 1, title: "PR 1", status: "active", sourceRefName: "refs/heads/feat", targetRefName: "refs/heads/main", createdBy: { displayName: "Alice" }, creationDate: "2026-05-10T10:00:00Z" },
			{ pullRequestId: 2, title: "PR 2", status: "completed", sourceRefName: "refs/heads/fix", targetRefName: "refs/heads/main", createdBy: { displayName: "Bob" }, creationDate: "2026-05-09T10:00:00Z" },
		]);
		assert.ok(result.includes("#1"));
		assert.ok(result.includes("PR 1"));
		assert.ok(result.includes("#2"));
		assert.ok(result.includes("PR 2"));
	});

	it("returns message for empty list", () => {
		assert.equal(formatPullRequestList([]), "No pull requests found.");
	});
});

// ---------------------------------------------------------------------------
// PR Thread formatting
// ---------------------------------------------------------------------------

describe("formatPullRequestThread", () => {
	it("formats a thread with comments", () => {
		const result = formatPullRequestThread({
			id: 1,
			status: 1,
			comments: [
				{ id: 1, author: { displayName: "Bob" }, publishedDate: "2026-05-10T11:00:00Z", content: "Looks good" },
				{ id: 2, author: { displayName: "Alice" }, publishedDate: "2026-05-10T11:15:00Z", content: "Thanks!" },
			],
		});
		assert.ok(result.includes("Thread #1"));
		assert.ok(result.includes("Active"));
		assert.ok(result.includes("Bob"));
		assert.ok(result.includes("Looks good"));
		assert.ok(result.includes("Alice"));
		assert.ok(result.includes("Thanks!"));
	});

	it("handles different thread statuses", () => {
		assert.ok(formatPullRequestThread({ status: 2 }).includes("Fixed"));
		assert.ok(formatPullRequestThread({ status: 6 }).includes("Pending"));
	});
});

// ---------------------------------------------------------------------------
// Commit formatting
// ---------------------------------------------------------------------------

describe("formatCommit", () => {
	it("formats a commit", () => {
		const result = formatCommit({
			commitId: "abc1234567890",
			author: { name: "Alice", date: "2026-05-10T09:00:00Z" },
			comment: "Add login page",
		});
		assert.ok(result.includes("abc1234"));
		assert.ok(result.includes("Add login page"));
		assert.ok(result.includes("Alice"));
		assert.ok(result.includes("2026-05-10"));
	});

	it("handles multiline comments (first line only)", () => {
		const result = formatCommit({
			commitId: "abc1234",
			comment: "First line\nSecond line",
		});
		assert.ok(result.includes("First line"));
		assert.ok(!result.includes("Second line"));
	});
});

describe("formatCommitList", () => {
	it("formats multiple commits", () => {
		const result = formatCommitList([
			{ commitId: "abc1234", comment: "Commit 1" },
			{ commitId: "def5678", comment: "Commit 2" },
		]);
		assert.ok(result.includes("abc1234"));
		assert.ok(result.includes("def5678"));
	});

	it("returns message for empty list", () => {
		assert.equal(formatCommitList([]), "No commits found.");
	});
});

// ---------------------------------------------------------------------------
// Policy formatting
// ---------------------------------------------------------------------------

describe("formatPolicy", () => {
	it("formats a blocking policy", () => {
		const result = formatPolicy({
			id: 1,
			type: { displayName: "Minimum reviewers" },
			isBlocking: true,
			scope: [{ refName: "refs/heads/main" }],
			settings: { minimumApproverCount: 2 },
		});
		assert.ok(result.includes("Minimum reviewers"));
		assert.ok(result.includes("Blocking"));
		assert.ok(result.includes("main"));
		assert.ok(result.includes("minimumApproverCount"));
	});

	it("formats a non-blocking policy", () => {
		const result = formatPolicy({ isBlocking: false });
		assert.ok(result.includes("Non-blocking"));
	});

	it("handles missing fields", () => {
		const result = formatPolicy({});
		assert.ok(result.includes("Unknown"));
	});
});

// ---------------------------------------------------------------------------
// Policy Evaluation formatting
// ---------------------------------------------------------------------------

describe("formatPolicyEvaluation", () => {
	it("formats an approved evaluation", () => {
		const result = formatPolicyEvaluation({
			policyDisplayName: "Minimum reviewers",
			status: "approved",
			startedDate: "2026-05-10T10:35:00Z",
			completedDate: "2026-05-10T12:00:00Z",
		});
		assert.ok(result.includes("Minimum reviewers"));
		assert.ok(result.includes("Approved"));
		assert.ok(result.includes("2026-05-10"));
	});

	it("formats a running evaluation", () => {
		const result = formatPolicyEvaluation({
			policyDisplayName: "Build validation",
			status: "running",
			startedDate: "2026-05-10T10:35:00Z",
		});
		assert.ok(result.includes("Running"));
	});

	it("formats a rejected evaluation", () => {
		const result = formatPolicyEvaluation({
			policyDisplayName: "Required reviewer",
			status: "rejected",
			startedDate: "2026-05-10T10:35:00Z",
		});
		assert.ok(result.includes("Rejected"));
	});

	it("handles missing fields", () => {
		const result = formatPolicyEvaluation({});
		assert.ok(result.includes("?"));
	});
});
