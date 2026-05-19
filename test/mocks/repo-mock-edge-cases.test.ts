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
	mockListPolicies,
	mockGetPolicyEvaluations,
	clearFixtureCache,
} from "../../src/mocks/mock-handler.js";

beforeEach(() => {
	clearFixtureCache();
});

// ---------------------------------------------------------------------------
// Repo mock handler edge cases
// ---------------------------------------------------------------------------

describe("mockListRepos edge cases", () => {
	it("includes URL for each repo", () => {
		const result = mockListRepos();
		assert.ok(result.content[0].text.includes("dev.azure.com"));
	});

	it("includes project name", () => {
		const result = mockListRepos();
		assert.ok(result.content[0].text.includes("TestProject"));
	});
});

describe("mockGetRepo edge cases", () => {
	it("repo-webapp has main branch", () => {
		const result = mockGetRepo("repo-webapp");
		assert.ok(result.content[0].text.includes("main"));
	});

	it("repo-shared has develop branch", () => {
		const result = mockGetRepo("repo-shared");
		assert.ok(result.content[0].text.includes("develop"));
	});

	it("case-sensitive lookup", () => {
		const result = mockGetRepo("WebApp");
		// Should not match — names are case-sensitive
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// Branch mock handler edge cases
// ---------------------------------------------------------------------------

describe("mockListBranches edge cases", () => {
	it("repo-webapp main is base version", () => {
		const result = mockListBranches("repo-webapp");
		assert.ok(result.content[0].text.includes("base"));
	});

	it("repo-webapp includes ahead/behind info", () => {
		const result = mockListBranches("repo-webapp");
		assert.ok(result.content[0].text.includes("↑") || result.content[0].text.includes("↓"));
	});

	it("repo-shared returns branches", () => {
		const result = mockListBranches("repo-shared");
		assert.ok(result.details.count >= 1);
	});
});

// ---------------------------------------------------------------------------
// PR mock handler edge cases
// ---------------------------------------------------------------------------

describe("mockListPullRequests edge cases", () => {
	it("returns empty for non-matching status+repo combo", () => {
		const result = mockListPullRequests({ status: "completed", repositoryId: "repo-shared" });
		assert.equal(result.details.count, 0);
	});

	it("creator filter is case-insensitive", () => {
		const result = mockListPullRequests({ creator: "ALICE" });
		assert.equal(result.details.count, 2);
	});

	it("filters by creator email", () => {
		const result = mockListPullRequests({ creator: "carol@testorg.com" });
		assert.equal(result.details.count, 1);
	});

	it("returns all when no filters", () => {
		const result = mockListPullRequests();
		assert.equal(result.details.count, 5);
	});
});

describe("mockGetPullRequest edge cases", () => {
	it("PR #3 is abandoned", () => {
		const result = mockGetPullRequest(3);
		assert.ok(result.content[0].text.includes("Abandoned"));
	});

	it("PR #5 has waiting-for-author vote", () => {
		const result = mockGetPullRequest(5);
		assert.ok(result.content[0].text.includes("Waiting for author"));
	});

	it("PR #4 has approved-with-suggestions reviewer", () => {
		const result = mockGetPullRequest(4);
		assert.ok(result.content[0].text.includes("Approved with suggestions"));
	});
});

// ---------------------------------------------------------------------------
// PR threads mock handler edge cases
// ---------------------------------------------------------------------------

describe("mockGetPullRequestThreads edge cases", () => {
	it("repo-api:4 returns threads", () => {
		const result = mockGetPullRequestThreads("repo-api", 4);
		assert.equal(result.details.count, 1);
	});

	it("repo-webapp:2 has no threads in fixture", () => {
		const result = mockGetPullRequestThreads("repo-webapp", 2);
		assert.equal(result.details.count, 0);
	});

	it("thread text includes author names", () => {
		const result = mockGetPullRequestThreads("repo-webapp", 1);
		assert.ok(result.content[0].text.includes("Bob Engineer"));
		assert.ok(result.content[0].text.includes("Alice Developer"));
	});
});

// ---------------------------------------------------------------------------
// PR commits mock handler edge cases
// ---------------------------------------------------------------------------

describe("mockGetPullRequestCommits edge cases", () => {
	it("PR #5 has 2 commits", () => {
		const result = mockGetPullRequestCommits("repo-shared", 5);
		assert.equal(result.details.count, 2);
	});

	it("commit includes author name", () => {
		const result = mockGetPullRequestCommits("repo-webapp", 1);
		assert.ok(result.content[0].text.includes("Alice Developer"));
	});

	it("commit includes short SHA", () => {
		const result = mockGetPullRequestCommits("repo-webapp", 1);
		assert.ok(result.content[0].text.includes("ghi3456"));
	});
});

// ---------------------------------------------------------------------------
// Policy mock handler edge cases
// ---------------------------------------------------------------------------

describe("mockListPolicies edge cases", () => {
	it("shows Required reviewer policy with security message", () => {
		const result = mockListPolicies();
		assert.ok(result.content[0].text.includes("Required reviewer"));
		assert.ok(result.content[0].text.includes("Security team"));
	});

	it("shows scope branch names", () => {
		const result = mockListPolicies();
		assert.ok(result.content[0].text.includes("main"));
	});
});

describe("mockGetPolicyEvaluations edge cases", () => {
	it("matching artifact returns subset", () => {
		const result = mockGetPolicyEvaluations("vstfs://CodeReview/CodeReviewId/1");
		assert.ok(result.details.count >= 1);
	});

	it("all evaluations include date info", () => {
		const result = mockGetPolicyEvaluations("unknown");
		assert.ok(result.content[0].text.includes("2026"));
	});
});
