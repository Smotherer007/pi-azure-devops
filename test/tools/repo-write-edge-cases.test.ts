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
// azure_devops_create_pull_request edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_create_pull_request edge cases", () => {
	it("creates PR with develop as target", async () => {
		const { createPullRequestTool } = await import("../../src/tools/create-pull-request.ts");
		const result = await createPullRequestTool.execute(
			"",
			{
				repositoryId: "repo-shared",
				sourceRefName: "refs/heads/feature/utils",
				targetRefName: "refs/heads/develop",
				title: "Refactor utils",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Refactor utils"));
		assert.ok(result.content[0].text.includes("feature/utils → develop"));
	});

	it("returns details with repositoryId", async () => {
		const { createPullRequestTool } = await import("../../src/tools/create-pull-request.ts");
		const result = await createPullRequestTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				sourceRefName: "refs/heads/feature/x",
				targetRefName: "refs/heads/main",
				title: "Test PR",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.equal(result.details.repoId, "repo-webapp");
	});

	it("returns details with generated PR ID", async () => {
		const { createPullRequestTool } = await import("../../src/tools/create-pull-request.ts");
		const result = await createPullRequestTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				sourceRefName: "refs/heads/feature/x",
				targetRefName: "refs/heads/main",
				title: "Test PR",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.equal(typeof result.details.pullRequestId, "number");
	});

	it("includes mock warning", async () => {
		const { createPullRequestTool } = await import("../../src/tools/create-pull-request.ts");
		const result = await createPullRequestTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				sourceRefName: "refs/heads/feature/x",
				targetRefName: "refs/heads/main",
				title: "Test PR",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("mock data"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_update_pull_request edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_update_pull_request edge cases", () => {
	it("updates description", async () => {
		const { updatePullRequestTool } = await import("../../src/tools/update-pull-request.ts");
		const result = await updatePullRequestTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				pullRequestId: 1,
				description: "New description here",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("description"));
	});

	it("updates multiple fields at once", async () => {
		const { updatePullRequestTool } = await import("../../src/tools/update-pull-request.ts");
		const result = await updatePullRequestTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				pullRequestId: 1,
				title: "New title",
				description: "New desc",
				status: "active",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.details.changes.length === 3);
	});

	it("details include changes array", async () => {
		const { updatePullRequestTool } = await import("../../src/tools/update-pull-request.ts");
		const result = await updatePullRequestTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				pullRequestId: 1,
				title: "X",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(Array.isArray(result.details.changes));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_add_pull_request_comment edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_add_pull_request_comment edge cases", () => {
	it("adds comment with special characters", async () => {
		const { addPullRequestCommentTool } = await import("../../src/tools/add-pull-request-comment.ts");
		const result = await addPullRequestCommentTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				pullRequestId: 1,
				content: "Fix: handle null & undefined in `parse()` — see #42",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("parse()"));
	});

	it("adds comment to different repo", async () => {
		const { addPullRequestCommentTool } = await import("../../src/tools/add-pull-request-comment.ts");
		const result = await addPullRequestCommentTool.execute(
			"",
			{
				repositoryId: "repo-api",
				pullRequestId: 4,
				content: "Nice work",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("PR #4"));
	});

	it("details include repoId", async () => {
		const { addPullRequestCommentTool } = await import("../../src/tools/add-pull-request-comment.ts");
		const result = await addPullRequestCommentTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				pullRequestId: 1,
				content: "Test",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.equal(result.details.repoId, "repo-webapp");
	});
});

// ---------------------------------------------------------------------------
// azure_devops_set_pull_request_vote edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_set_pull_request_vote edge cases", () => {
	it("details include vote label", async () => {
		const { setPullRequestVoteTool } = await import("../../src/tools/set-pull-request-vote.ts");
		const result = await setPullRequestVoteTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 1, vote: "approve", mock: true },
			undefined, noop, mockCtx,
		);
		assert.equal(result.details.voteLabel, "Approved");
	});

	it("vote on different repo", async () => {
		const { setPullRequestVoteTool } = await import("../../src/tools/set-pull-request-vote.ts");
		const result = await setPullRequestVoteTool.execute(
			"",
			{ repositoryId: "repo-api", pullRequestId: 4, vote: "reject", mock: true },
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Rejected"));
		assert.equal(result.details.repoId, "repo-api");
	});

	it("all vote values produce correct numeric mapping", async () => {
		const { setPullRequestVoteTool } = await import("../../src/tools/set-pull-request-vote.ts");
		const votes: Array<[string, number]> = [
			["approve", 10],
			["approve-with-suggestions", 5],
			["reset", 0],
			["waiting-for-author", -5],
			["reject", -10],
		];
		for (const [vote, expected] of votes) {
			const result = await setPullRequestVoteTool.execute(
				"",
				{ repositoryId: "repo-webapp", pullRequestId: 1, vote, mock: true },
				undefined, noop, mockCtx,
			);
			assert.equal(result.details.vote, expected, `vote "${vote}" should map to ${expected}`);
		}
	});
});
