import { describe, it } from "node:test";
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
// Repo formatting edge cases
// ---------------------------------------------------------------------------

describe("formatRepo edge cases", () => {
	it("handles zero size", () => {
		const result = formatRepo({ id: "r1", name: "empty-repo", size: 0 });
		assert.ok(result.includes("0 B"));
	});

	it("handles very large size (GB)", () => {
		const result = formatRepo({ size: 3 * 1024 * 1024 * 1024 });
		assert.ok(result.includes("3.0 GB"));
	});

	it("handles repo without project", () => {
		const result = formatRepo({ id: "r1", name: "test" });
		assert.ok(!result.includes("Project"));
	});

	it("strips refs/heads/ from default branch", () => {
		const result = formatRepo({ defaultBranch: "refs/heads/develop" });
		assert.ok(result.includes("develop"));
		assert.ok(!result.includes("refs/heads/"));
	});
});

describe("formatRepoList edge cases", () => {
	it("single repo", () => {
		const result = formatRepoList([{ id: "r1", name: "only-repo" }]);
		assert.ok(result.includes("only-repo"));
		assert.ok(!result.includes("No repositories"));
	});
});

// ---------------------------------------------------------------------------
// Branch formatting edge cases
// ---------------------------------------------------------------------------

describe("formatBranch edge cases", () => {
	it("handles branch with no ahead/behind", () => {
		const result = formatBranch({
			name: "main",
			aheadCount: 0,
			behindCount: 0,
			isBaseVersion: true,
		});
		assert.ok(result.includes("(base)"));
		assert.ok(!result.includes("↑"));
		assert.ok(!result.includes("↓"));
	});

	it("handles branch with large ahead count", () => {
		const result = formatBranch({ name: "long-lived", aheadCount: 150, behindCount: 30 });
		assert.ok(result.includes("↑150"));
		assert.ok(result.includes("↓30"));
	});

	it("handles multiline commit comment (first line only)", () => {
		const result = formatBranch({
			name: "feature/x",
			commit: { commitId: "abc1234567", comment: "First line\nSecond line\nThird line" },
		});
		assert.ok(result.includes("First line"));
		assert.ok(!result.includes("Second line"));
	});
});

// ---------------------------------------------------------------------------
// PR formatting edge cases
// ---------------------------------------------------------------------------

describe("formatPullRequest edge cases", () => {
	it("handles PR with no reviewers", () => {
		const result = formatPullRequest({ pullRequestId: 1, title: "Test" });
		assert.ok(!result.includes("Reviewers"));
	});

	it("handles PR with no description", () => {
		const result = formatPullRequest({ pullRequestId: 1, title: "Test" });
		assert.ok(!result.includes("Description"));
	});

	it("handles PR with no URL", () => {
		const result = formatPullRequest({ pullRequestId: 1, title: "Test" });
		assert.ok(!result.includes("URL"));
	});

	it("handles unknown status gracefully", () => {
		const result = formatPullRequest({ pullRequestId: 1, status: "unknown-status" });
		assert.ok(result.includes("unknown-status"));
	});

	it("handles createdBy without displayName", () => {
		const result = formatPullRequest({ pullRequestId: 1, createdBy: {} });
		assert.ok(result.includes("Unknown"));
	});
});

describe("formatPullRequestList edge cases", () => {
	it("single PR", () => {
		const result = formatPullRequestList([{
			pullRequestId: 1,
			title: "Only PR",
			status: "active",
			sourceRefName: "refs/heads/feat",
			targetRefName: "refs/heads/main",
			createdBy: { displayName: "Alice" },
			creationDate: "2026-05-10T10:00:00Z",
		}]);
		assert.ok(result.includes("Only PR"));
		assert.ok(!result.includes("No pull requests"));
	});
});

// ---------------------------------------------------------------------------
// Thread formatting edge cases
// ---------------------------------------------------------------------------

describe("formatPullRequestThread edge cases", () => {
	it("handles thread with no comments", () => {
		const result = formatPullRequestThread({ id: 1, status: 1, comments: [] });
		assert.ok(result.includes("Thread #1"));
		assert.ok(result.includes("Active"));
	});

	it("handles unknown thread status", () => {
		const result = formatPullRequestThread({ id: 1, status: 99 });
		assert.ok(result.includes("Unknown"));
	});

	it("handles comment without author", () => {
		const result = formatPullRequestThread({
			id: 1,
			comments: [{ content: "Test comment" }],
		});
		assert.ok(result.includes("Unknown"));
		assert.ok(result.includes("Test comment"));
	});
});

// ---------------------------------------------------------------------------
// Commit formatting edge cases
// ---------------------------------------------------------------------------

describe("formatCommit edge cases", () => {
	it("handles commit with short SHA", () => {
		const result = formatCommit({ commitId: "abc" });
		assert.ok(result.includes("abc"));
	});

	it("handles commit with no author", () => {
		const result = formatCommit({ commitId: "abc1234", comment: "Fix" });
		assert.ok(result.includes("Unknown"));
	});

	it("handles commit with no comment", () => {
		const result = formatCommit({ commitId: "abc1234" });
		assert.ok(result.includes("abc1234"));
	});
});

// ---------------------------------------------------------------------------
// Policy formatting edge cases
// ---------------------------------------------------------------------------

describe("formatPolicy edge cases", () => {
	it("handles policy with no scope", () => {
		const result = formatPolicy({ id: 1, type: { displayName: "Test" }, isBlocking: true });
		assert.ok(result.includes("Test"));
		assert.ok(!result.includes("Scope"));
	});

	it("handles policy with no settings", () => {
		const result = formatPolicy({ id: 1, type: { displayName: "Test" } });
		assert.ok(!result.includes("Settings"));
	});

	it("handles policy with empty scope array", () => {
		const result = formatPolicy({ id: 1, scope: [] });
		assert.ok(!result.includes("Scope"));
	});
});

// ---------------------------------------------------------------------------
// Policy Evaluation edge cases
// ---------------------------------------------------------------------------

describe("formatPolicyEvaluation edge cases", () => {
	it("handles unknown status", () => {
		const result = formatPolicyEvaluation({
			policyDisplayName: "Test",
			status: "unknown-status",
			startedDate: "2026-05-10T10:00:00Z",
		});
		assert.ok(result.includes("unknown-status"));
	});

	it("handles evaluation with no completed date", () => {
		const result = formatPolicyEvaluation({
			policyDisplayName: "Build",
			status: "running",
			startedDate: "2026-05-10T10:00:00Z",
		});
		assert.ok(result.includes("Build"));
		assert.ok(!result.includes("→"));
	});

	it("handles evaluation with completed date", () => {
		const result = formatPolicyEvaluation({
			policyDisplayName: "Reviewers",
			status: "approved",
			startedDate: "2026-05-10T10:00:00Z",
			completedDate: "2026-05-10T12:00:00Z",
		});
		assert.ok(result.includes("→"));
	});
});
