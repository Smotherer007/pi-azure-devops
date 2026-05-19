import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
	mockListRepos,
	mockGetRepo,
	mockListBranches,
	mockListPullRequests,
	mockGetPullRequest,
	mockGetPullRequestThreads,
	mockGetPullRequestCommits,
	mockCreatePullRequest,
	mockUpdatePullRequest,
	mockAddPullRequestComment,
	mockSetPullRequestVote,
	mockListPolicies,
	mockGetPolicyEvaluations,
	clearFixtureCache,
} from "../../src/mocks/mock-handler.js";

beforeEach(() => {
	clearFixtureCache();
});

// ---------------------------------------------------------------------------
// Repo mock handlers
// ---------------------------------------------------------------------------

describe("mockListRepos", () => {
	it("returns all 3 repos", () => {
		const result = mockListRepos();
		assert.ok(result.content[0].text.includes("webapp"));
		assert.ok(result.content[0].text.includes("api-service"));
		assert.ok(result.content[0].text.includes("shared-libs"));
		assert.equal(result.details.count, 3);
		assert.equal(result.details.mock, true);
	});
});

describe("mockGetRepo", () => {
	it("returns repo by ID", () => {
		const result = mockGetRepo("repo-webapp");
		assert.ok(result.content[0].text.includes("webapp"));
		assert.equal(result.details.repoId, "repo-webapp");
	});

	it("returns repo by name", () => {
		const result = mockGetRepo("api-service");
		assert.ok(result.content[0].text.includes("api-service"));
	});

	it("returns error for unknown repo", () => {
		const result = mockGetRepo("unknown-repo");
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

describe("mockListBranches", () => {
	it("returns branches for repo-webapp", () => {
		const result = mockListBranches("repo-webapp");
		assert.ok(result.content[0].text.includes("main"));
		assert.ok(result.content[0].text.includes("feature/login"));
		assert.ok(result.content[0].text.includes("hotfix/auth-fix"));
		assert.equal(result.details.count, 4);
	});

	it("returns branches for repo-api", () => {
		const result = mockListBranches("repo-api");
		assert.equal(result.details.count, 2);
	});

	it("returns error for unknown repo", () => {
		const result = mockListBranches("unknown");
		assert.ok(result.content[0].text.includes("No branches found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// PR mock handlers
// ---------------------------------------------------------------------------

describe("mockListPullRequests", () => {
	it("returns all pull requests", () => {
		const result = mockListPullRequests();
		assert.equal(result.details.count, 5);
	});

	it("filters by status=active", () => {
		const result = mockListPullRequests({ status: "active" });
		assert.equal(result.details.count, 3);
	});

	it("filters by status=completed", () => {
		const result = mockListPullRequests({ status: "completed" });
		assert.equal(result.details.count, 1);
	});

	it("filters by creator", () => {
		const result = mockListPullRequests({ creator: "alice" });
		assert.equal(result.details.count, 2);
	});

	it("filters by repositoryId", () => {
		const result = mockListPullRequests({ repositoryId: "repo-api" });
		assert.equal(result.details.count, 1);
	});

	it("combines filters", () => {
		const result = mockListPullRequests({ status: "active", repositoryId: "repo-webapp" });
		assert.equal(result.details.count, 1);
	});
});

describe("mockGetPullRequest", () => {
	it("returns PR #1 detail", () => {
		const result = mockGetPullRequest(1);
		assert.ok(result.content[0].text.includes("Add login page"));
		assert.ok(result.content[0].text.includes("feature/login → main"));
		assert.ok(result.content[0].text.includes("Alice Developer"));
	});

	it("returns PR #2 (completed)", () => {
		const result = mockGetPullRequest(2);
		assert.ok(result.content[0].text.includes("Fix auth timeout"));
		assert.ok(result.content[0].text.includes("Completed"));
	});

	it("returns error for unknown PR", () => {
		const result = mockGetPullRequest(999);
		assert.ok(result.content[0].text.includes("not found"));
	});
});

describe("mockGetPullRequestThreads", () => {
	it("returns threads for PR #1 in repo-webapp", () => {
		const result = mockGetPullRequestThreads("repo-webapp", 1);
		assert.ok(result.content[0].text.includes("Thread #1"));
		assert.ok(result.content[0].text.includes("Thread #2"));
		assert.ok(result.content[0].text.includes("Thread #3"));
		assert.equal(result.details.count, 3);
	});

	it("returns empty for PR with no threads", () => {
		const result = mockGetPullRequestThreads("repo-webapp", 3);
		assert.equal(result.details.count, 0);
	});
});

describe("mockGetPullRequestCommits", () => {
	it("returns commits for PR #1", () => {
		const result = mockGetPullRequestCommits("repo-webapp", 1);
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("ghi3456"));
	});

	it("returns commits for PR #4", () => {
		const result = mockGetPullRequestCommits("repo-api", 4);
		assert.equal(result.details.count, 4);
	});

	it("returns empty for PR with no commits", () => {
		const result = mockGetPullRequestCommits("repo-webapp", 3);
		assert.equal(result.details.count, 0);
	});
});

// ---------------------------------------------------------------------------
// PR mutation mock handlers
// ---------------------------------------------------------------------------

describe("mockCreatePullRequest", () => {
	it("creates a PR and returns confirmation", () => {
		const result = mockCreatePullRequest(
			"repo-webapp",
			"New feature",
			"refs/heads/feature/new",
			"refs/heads/main",
			"Description here",
		);
		assert.ok(result.content[0].text.includes("Created pull request"));
		assert.ok(result.content[0].text.includes("New feature"));
		assert.ok(result.content[0].text.includes("feature/new → main"));
		assert.equal(result.details.repoId, "repo-webapp");
		assert.equal(result.details.mock, true);
	});
});

describe("mockUpdatePullRequest", () => {
	it("updates a PR and returns confirmation", () => {
		const result = mockUpdatePullRequest("repo-webapp", 1, {
			title: "Updated title",
			status: "active",
		});
		assert.ok(result.content[0].text.includes("Updated pull request #1"));
		assert.ok(result.content[0].text.includes("Updated title"));
		assert.deepEqual(result.details.changes, ["title: Updated title", "status: active"]);
	});

	it("returns error for unknown PR", () => {
		const result = mockUpdatePullRequest("repo-webapp", 999, { title: "X" });
		assert.ok(result.content[0].text.includes("not found"));
	});
});

describe("mockAddPullRequestComment", () => {
	it("adds a comment and returns confirmation", () => {
		const result = mockAddPullRequestComment("repo-webapp", 1, "Looks great!");
		assert.ok(result.content[0].text.includes("Added comment"));
		assert.ok(result.content[0].text.includes("Looks great!"));
	});
});

describe("mockSetPullRequestVote", () => {
	it("records approve vote", () => {
		const result = mockSetPullRequestVote("repo-webapp", 1, 10);
		assert.ok(result.content[0].text.includes("Approved"));
		assert.equal(result.details.vote, 10);
	});

	it("records reject vote", () => {
		const result = mockSetPullRequestVote("repo-webapp", 1, -10);
		assert.ok(result.content[0].text.includes("Rejected"));
	});

	it("records waiting-for-author vote", () => {
		const result = mockSetPullRequestVote("repo-webapp", 1, -5);
		assert.ok(result.content[0].text.includes("Waiting for author"));
	});

	it("records approved-with-suggestions vote", () => {
		const result = mockSetPullRequestVote("repo-webapp", 1, 5);
		assert.ok(result.content[0].text.includes("Approved with suggestions"));
	});

	it("records no-vote", () => {
		const result = mockSetPullRequestVote("repo-webapp", 1, 0);
		assert.ok(result.content[0].text.includes("No vote"));
	});
});

// ---------------------------------------------------------------------------
// Policy mock handlers
// ---------------------------------------------------------------------------

describe("mockListPolicies", () => {
	it("returns all policies", () => {
		const result = mockListPolicies();
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("Minimum reviewers"));
		assert.ok(result.content[0].text.includes("Build validation"));
		assert.ok(result.content[0].text.includes("Required reviewer"));
	});

	it("filters by scope", () => {
		const result = mockListPolicies("main");
		assert.equal(result.details.count, 3); // All 3 target main
	});
});

describe("mockGetPolicyEvaluations", () => {
	it("returns evaluations for matching artifactId", () => {
		const result = mockGetPolicyEvaluations("vstfs://CodeReview/CodeReviewId/1");
		assert.ok(result.details.count >= 1);
		assert.ok(result.content[0].text.includes("Minimum reviewers"));
	});

	it("returns all evaluations for non-matching artifactId", () => {
		const result = mockGetPolicyEvaluations("unknown");
		assert.equal(result.details.count, 3);
	});
});
