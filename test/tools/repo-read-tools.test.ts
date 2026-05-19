import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveConfig, type AzureDevOpsConfig } from "../../src/config/index.js";

// All read tools use mock mode, so we just need a valid config
function makeConfig(overrides: Partial<AzureDevOpsConfig> = {}): AzureDevOpsConfig {
	return {
		orgUrl: "https://dev.azure.com/testorg",
		project: "TestProject",
		authMethod: "pat",
		safetyLevel: "confirm",
		defaultWorkItemType: "User Story",
		maxQueryResults: 100,
		autocomplete: true,
		mock: false,
		...overrides,
	};
}

const mockCtx = { cwd: "/test", config: makeConfig({ mock: true }) };
const noop = undefined as any;

// ---------------------------------------------------------------------------
// azure_devops_list_repos
// ---------------------------------------------------------------------------

describe("azure_devops_list_repos (mock)", () => {
	it("returns all repositories", async () => {
		const { listReposTool } = await import("../../src/tools/list-repos.js");
		const result = await listReposTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("webapp"));
		assert.ok(result.content[0].text.includes("api-service"));
		assert.ok(result.content[0].text.includes("shared-libs"));
	});

	it("includes mock indicator", async () => {
		const { listReposTool } = await import("../../src/tools/list-repos.js");
		const result = await listReposTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("mock"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_repo
// ---------------------------------------------------------------------------

describe("azure_devops_get_repo (mock)", () => {
	it("returns repo by ID", async () => {
		const { getRepoTool } = await import("../../src/tools/get-repo.js");
		const result = await getRepoTool.execute("", { repositoryId: "repo-webapp", mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("webapp"));
		assert.equal(result.details.repoId, "repo-webapp");
	});

	it("returns repo by name", async () => {
		const { getRepoTool } = await import("../../src/tools/get-repo.js");
		const result = await getRepoTool.execute("", { repositoryId: "shared-libs", mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("shared-libs"));
	});

	it("returns error for unknown repo", async () => {
		const { getRepoTool } = await import("../../src/tools/get-repo.js");
		const result = await getRepoTool.execute("", { repositoryId: "unknown", mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_list_branches
// ---------------------------------------------------------------------------

describe("azure_devops_list_branches (mock)", () => {
	it("returns branches for known repo", async () => {
		const { listBranchesTool } = await import("../../src/tools/list-branches.js");
		const result = await listBranchesTool.execute("", { repositoryId: "repo-webapp", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 4);
		assert.ok(result.content[0].text.includes("main"));
		assert.ok(result.content[0].text.includes("feature/login"));
	});

	it("returns error for unknown repo", async () => {
		const { listBranchesTool } = await import("../../src/tools/list-branches.js");
		const result = await listBranchesTool.execute("", { repositoryId: "nonexistent", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_list_pull_requests
// ---------------------------------------------------------------------------

describe("azure_devops_list_pull_requests (mock)", () => {
	it("returns all pull requests", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.js");
		const result = await listPullRequestsTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 5);
	});

	it("filters by status=active", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.js");
		const result = await listPullRequestsTool.execute("", { status: "active", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
	});

	it("filters by status=completed", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.js");
		const result = await listPullRequestsTool.execute("", { status: "completed", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 1);
	});

	it("filters by status=abandoned", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.js");
		const result = await listPullRequestsTool.execute("", { status: "abandoned", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 1);
	});

	it("filters by creator", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.js");
		const result = await listPullRequestsTool.execute("", { creator: "alice", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 2);
	});

	it("filters by repositoryId", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.js");
		const result = await listPullRequestsTool.execute("", { repositoryId: "repo-api", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 1);
	});

	it("combines status and repositoryId", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.js");
		const result = await listPullRequestsTool.execute("", { status: "active", repositoryId: "repo-webapp", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 1);
	});

	it("returns empty for non-matching filters", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.js");
		const result = await listPullRequestsTool.execute("", { status: "completed", repositoryId: "repo-api", mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("No pull requests"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_pull_request
// ---------------------------------------------------------------------------

describe("azure_devops_get_pull_request (mock)", () => {
	it("returns PR detail by ID", async () => {
		const { getPullRequestTool } = await import("../../src/tools/get-pull-request.js");
		const result = await getPullRequestTool.execute("", { pullRequestId: 1, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("Add login page"));
		assert.ok(result.content[0].text.includes("feature/login → main"));
		assert.ok(result.content[0].text.includes("Alice Developer"));
		assert.ok(result.content[0].text.includes("Bob Engineer (Approved)"));
	});

	it("returns completed PR", async () => {
		const { getPullRequestTool } = await import("../../src/tools/get-pull-request.js");
		const result = await getPullRequestTool.execute("", { pullRequestId: 2, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("Completed"));
		assert.ok(result.content[0].text.includes("Fix auth timeout"));
	});

	it("returns error for unknown PR", async () => {
		const { getPullRequestTool } = await import("../../src/tools/get-pull-request.js");
		const result = await getPullRequestTool.execute("", { pullRequestId: 999, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_pull_request_threads
// ---------------------------------------------------------------------------

describe("azure_devops_get_pull_request_threads (mock)", () => {
	it("returns threads for PR #1", async () => {
		const { getPullRequestThreadsTool } = await import("../../src/tools/get-pull-request-threads.js");
		const result = await getPullRequestThreadsTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 1, mock: true },
			undefined, noop, mockCtx,
		);
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("Thread #1"));
		assert.ok(result.content[0].text.includes("Thread #2"));
		assert.ok(result.content[0].text.includes("Thread #3"));
	});

	it("returns empty for PR with no threads", async () => {
		const { getPullRequestThreadsTool } = await import("../../src/tools/get-pull-request-threads.js");
		const result = await getPullRequestThreadsTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 3, mock: true },
			undefined, noop, mockCtx,
		);
		assert.equal(result.details.count, 0);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_pull_request_commits
// ---------------------------------------------------------------------------

describe("azure_devops_get_pull_request_commits (mock)", () => {
	it("returns commits for PR #1", async () => {
		const { getPullRequestCommitsTool } = await import("../../src/tools/get-pull-request-commits.js");
		const result = await getPullRequestCommitsTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 1, mock: true },
			undefined, noop, mockCtx,
		);
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("Add login page component"));
		assert.ok(result.content[0].text.includes("Add OAuth callback handler"));
	});

	it("returns empty for PR with no commits", async () => {
		const { getPullRequestCommitsTool } = await import("../../src/tools/get-pull-request-commits.js");
		const result = await getPullRequestCommitsTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 3, mock: true },
			undefined, noop, mockCtx,
		);
		assert.equal(result.details.count, 0);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_list_policies
// ---------------------------------------------------------------------------

describe("azure_devops_list_policies (mock)", () => {
	it("returns all policies", async () => {
		const { listPoliciesTool } = await import("../../src/tools/list-policies.js");
		const result = await listPoliciesTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("Minimum reviewers"));
		assert.ok(result.content[0].text.includes("Build validation"));
		assert.ok(result.content[0].text.includes("Required reviewer"));
	});

	it("filters by scope", async () => {
		const { listPoliciesTool } = await import("../../src/tools/list-policies.js");
		const result = await listPoliciesTool.execute("", { scope: "main", mock: true }, undefined, noop, mockCtx);
		assert.ok(result.details.count >= 1);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_policy_evaluations
// ---------------------------------------------------------------------------

describe("azure_devops_get_policy_evaluations (mock)", () => {
	it("returns evaluations for a PR", async () => {
		const { getPolicyEvaluationsTool } = await import("../../src/tools/get-policy-evaluations.js");
		const result = await getPolicyEvaluationsTool.execute("", { pullRequestId: 1, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.details.count >= 1);
		assert.ok(result.content[0].text.includes("Minimum reviewers"));
	});

	it("returns all evaluations for unknown artifact", async () => {
		const { getPolicyEvaluationsTool } = await import("../../src/tools/get-policy-evaluations.js");
		const result = await getPolicyEvaluationsTool.execute("", { pullRequestId: 999, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
	});
});
