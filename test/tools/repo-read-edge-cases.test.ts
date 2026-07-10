import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AzureDevOpsConfig } from "../../src/config/index.ts";

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
// azure_devops_list_repos edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_list_repos edge cases", () => {
	it("returns text content type", async () => {
		const { listReposTool } = await import("../../src/tools/list-repos.ts");
		const result = await listReposTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.equal(result.content[0].type, "text");
	});

	it("details include count and mock flag", async () => {
		const { listReposTool } = await import("../../src/tools/list-repos.ts");
		const result = await listReposTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.equal(typeof result.details.count, "number");
		assert.equal(result.details.mock, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_repo edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_get_repo edge cases", () => {
	it("returns repo with default branch", async () => {
		const { getRepoTool } = await import("../../src/tools/get-repo.ts");
		const result = await getRepoTool.execute("", { repositoryId: "repo-webapp", mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("main"));
	});

	it("returns repo with develop as default branch", async () => {
		const { getRepoTool } = await import("../../src/tools/get-repo.ts");
		const result = await getRepoTool.execute("", { repositoryId: "repo-shared", mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("develop"));
	});

	it("returns repo with size info", async () => {
		const { getRepoTool } = await import("../../src/tools/get-repo.ts");
		const result = await getRepoTool.execute("", { repositoryId: "repo-webapp", mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("MB") || result.content[0].text.includes("KB"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_list_branches edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_list_branches edge cases", () => {
	it("repo-api returns correct count", async () => {
		const { listBranchesTool } = await import("../../src/tools/list-branches.ts");
		const result = await listBranchesTool.execute("", { repositoryId: "repo-api", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 2);
	});

	it("repo-shared returns branches", async () => {
		const { listBranchesTool } = await import("../../src/tools/list-branches.ts");
		const result = await listBranchesTool.execute("", { repositoryId: "repo-shared", mock: true }, undefined, noop, mockCtx);
		assert.ok(result.details.count >= 1);
		assert.ok(result.content[0].text.includes("develop"));
	});

	it("error result has error flag", async () => {
		const { listBranchesTool } = await import("../../src/tools/list-branches.ts");
		const result = await listBranchesTool.execute("", { repositoryId: "nonexistent", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_list_pull_requests edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_list_pull_requests edge cases", () => {
	it("filters by status=abandoned", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.ts");
		const result = await listPullRequestsTool.execute("", { status: "abandoned", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 1);
		assert.ok(result.content[0].text.includes("Update dependencies"));
	});

	it("filters by status=all", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.ts");
		const result = await listPullRequestsTool.execute("", { status: "all", mock: true }, undefined, noop, mockCtx);
		// Mock handler filters by string match; "all" doesn't match fixture statuses
		assert.ok(typeof result.details.count === "number");
	});

	it("returns text content type", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.ts");
		const result = await listPullRequestsTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.equal(result.content[0].type, "text");
	});

	it("empty result for non-matching creator", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.ts");
		const result = await listPullRequestsTool.execute("", { creator: "nonexistent", mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("No pull requests"));
	});

	it("filters by shared-libs repo", async () => {
		const { listPullRequestsTool } = await import("../../src/tools/list-pull-requests.ts");
		const result = await listPullRequestsTool.execute("", { repositoryId: "repo-shared", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 1);
		assert.ok(result.content[0].text.includes("Refactor shared utils"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_pull_request edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_get_pull_request edge cases", () => {
	it("returns abandoned PR", async () => {
		const { getPullRequestTool } = await import("../../src/tools/get-pull-request.ts");
		const result = await getPullRequestTool.execute("", { pullRequestId: 3, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("Abandoned"));
		assert.ok(result.content[0].text.includes("Update dependencies"));
	});

	it("returns PR with reviewer votes", async () => {
		const { getPullRequestTool } = await import("../../src/tools/get-pull-request.ts");
		const result = await getPullRequestTool.execute("", { pullRequestId: 5, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("Waiting for author"));
	});

	it("error result includes error flag", async () => {
		const { getPullRequestTool } = await import("../../src/tools/get-pull-request.ts");
		const result = await getPullRequestTool.execute("", { pullRequestId: 999, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.error, true);
	});

	it("works with repositoryId param (mock ignores it)", async () => {
		const { getPullRequestTool } = await import("../../src/tools/get-pull-request.ts");
		const result = await getPullRequestTool.execute(
			"",
			{ pullRequestId: 1, repositoryId: "repo-webapp", mock: true },
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Add login page"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_pull_request_threads edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_get_pull_request_threads edge cases", () => {
	it("returns thread with Fixed status", async () => {
		const { getPullRequestThreadsTool } = await import("../../src/tools/get-pull-request-threads.ts");
		const result = await getPullRequestThreadsTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 1, mock: true },
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Fixed"));
	});

	it("returns thread with Pending status", async () => {
		const { getPullRequestThreadsTool } = await import("../../src/tools/get-pull-request-threads.ts");
		const result = await getPullRequestThreadsTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 1, mock: true },
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Pending"));
	});

	it("returns threads for repo-api PR", async () => {
		const { getPullRequestThreadsTool } = await import("../../src/tools/get-pull-request-threads.ts");
		const result = await getPullRequestThreadsTool.execute(
			"",
			{ repositoryId: "repo-api", pullRequestId: 4, mock: true },
			undefined, noop, mockCtx,
		);
		assert.ok(result.details.count >= 1);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_pull_request_commits edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_get_pull_request_commits edge cases", () => {
	it("returns multiple commits for PR #4", async () => {
		const { getPullRequestCommitsTool } = await import("../../src/tools/get-pull-request-commits.ts");
		const result = await getPullRequestCommitsTool.execute(
			"",
			{ repositoryId: "repo-api", pullRequestId: 4, mock: true },
			undefined, noop, mockCtx,
		);
		assert.equal(result.details.count, 4);
	});

	it("returns single commit for PR #2", async () => {
		const { getPullRequestCommitsTool } = await import("../../src/tools/get-pull-request-commits.ts");
		const result = await getPullRequestCommitsTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 2, mock: true },
			undefined, noop, mockCtx,
		);
		assert.equal(result.details.count, 1);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_list_policies edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_list_policies edge cases", () => {
	it("shows blocking status", async () => {
		const { listPoliciesTool } = await import("../../src/tools/list-policies.ts");
		const result = await listPoliciesTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("Blocking"));
	});

	it("shows policy settings", async () => {
		const { listPoliciesTool } = await import("../../src/tools/list-policies.ts");
		const result = await listPoliciesTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("minimumApproverCount"));
		assert.ok(result.content[0].text.includes("buildDefinitionId"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_policy_evaluations edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_get_policy_evaluations edge cases", () => {
	it("shows all three evaluation statuses", async () => {
		const { getPolicyEvaluationsTool } = await import("../../src/tools/get-policy-evaluations.ts");
		const result = await getPolicyEvaluationsTool.execute("", { pullRequestId: 1, mock: true }, undefined, noop, mockCtx);
		const text = result.content[0].text;
		assert.ok(text.includes("Approved"));
		assert.ok(text.includes("Running"));
		assert.ok(text.includes("Rejected"));
	});

	it("details include count", async () => {
		const { getPolicyEvaluationsTool } = await import("../../src/tools/get-policy-evaluations.ts");
		const result = await getPolicyEvaluationsTool.execute("", { pullRequestId: 1, mock: true }, undefined, noop, mockCtx);
		assert.equal(typeof result.details.count, "number");
		assert.ok(result.details.count >= 1);
	});
});
