import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AzureDevOpsConfig } from "../../src/config/index.js";
import { isMutationTool, formatMutationSummary } from "../../src/safety/index.js";

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
// azure_devops_create_pull_request
// ---------------------------------------------------------------------------

describe("azure_devops_create_pull_request (mock)", () => {
	it("creates a PR and returns confirmation", async () => {
		const { createPullRequestTool } = await import("../../src/tools/create-pull-request.js");
		const result = await createPullRequestTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				sourceRefName: "refs/heads/feature/new",
				targetRefName: "refs/heads/main",
				title: "New feature",
				description: "Adds the new feature",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Created pull request"));
		assert.ok(result.content[0].text.includes("New feature"));
		assert.ok(result.content[0].text.includes("feature/new → main"));
		assert.ok(result.details.mock);
	});

	it("creates a PR without description", async () => {
		const { createPullRequestTool } = await import("../../src/tools/create-pull-request.js");
		const result = await createPullRequestTool.execute(
			"",
			{
				repositoryId: "repo-api",
				sourceRefName: "refs/heads/feature/test",
				targetRefName: "refs/heads/main",
				title: "Add tests",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Add tests"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_update_pull_request
// ---------------------------------------------------------------------------

describe("azure_devops_update_pull_request (mock)", () => {
	it("updates title and returns confirmation", async () => {
		const { updatePullRequestTool } = await import("../../src/tools/update-pull-request.js");
		const result = await updatePullRequestTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				pullRequestId: 1,
				title: "Updated title",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Updated pull request #1"));
		assert.ok(result.content[0].text.includes("Updated title"));
	});

	it("updates status to abandoned", async () => {
		const { updatePullRequestTool } = await import("../../src/tools/update-pull-request.js");
		const result = await updatePullRequestTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				pullRequestId: 1,
				status: "abandoned",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Updated pull request #1"));
		assert.ok(result.content[0].text.includes("status: abandoned"));
	});

	it("returns error for unknown PR", async () => {
		const { updatePullRequestTool } = await import("../../src/tools/update-pull-request.js");
		const result = await updatePullRequestTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				pullRequestId: 999,
				title: "X",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_add_pull_request_comment
// ---------------------------------------------------------------------------

describe("azure_devops_add_pull_request_comment (mock)", () => {
	it("adds a comment and returns confirmation", async () => {
		const { addPullRequestCommentTool } = await import("../../src/tools/add-pull-request-comment.js");
		const result = await addPullRequestCommentTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				pullRequestId: 1,
				content: "Looks great!",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Added comment"));
		assert.ok(result.content[0].text.includes("Looks great!"));
	});

	it("adds a comment with threadStatus", async () => {
		const { addPullRequestCommentTool } = await import("../../src/tools/add-pull-request-comment.js");
		const result = await addPullRequestCommentTool.execute(
			"",
			{
				repositoryId: "repo-webapp",
				pullRequestId: 1,
				content: "Please fix this",
				threadStatus: "active",
				mock: true,
			},
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Added comment"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_set_pull_request_vote
// ---------------------------------------------------------------------------

describe("azure_devops_set_pull_request_vote (mock)", () => {
	it("records approve vote", async () => {
		const { setPullRequestVoteTool } = await import("../../src/tools/set-pull-request-vote.js");
		const result = await setPullRequestVoteTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 1, vote: "approve", mock: true },
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Approved"));
		assert.equal(result.details.vote, 10);
	});

	it("records reject vote", async () => {
		const { setPullRequestVoteTool } = await import("../../src/tools/set-pull-request-vote.js");
		const result = await setPullRequestVoteTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 1, vote: "reject", mock: true },
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Rejected"));
		assert.equal(result.details.vote, -10);
	});

	it("records waiting-for-author vote", async () => {
		const { setPullRequestVoteTool } = await import("../../src/tools/set-pull-request-vote.js");
		const result = await setPullRequestVoteTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 1, vote: "waiting-for-author", mock: true },
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Waiting for author"));
		assert.equal(result.details.vote, -5);
	});

	it("records approve-with-suggestions vote", async () => {
		const { setPullRequestVoteTool } = await import("../../src/tools/set-pull-request-vote.js");
		const result = await setPullRequestVoteTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 1, vote: "approve-with-suggestions", mock: true },
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("Approved with suggestions"));
		assert.equal(result.details.vote, 5);
	});

	it("resets vote", async () => {
		const { setPullRequestVoteTool } = await import("../../src/tools/set-pull-request-vote.js");
		const result = await setPullRequestVoteTool.execute(
			"",
			{ repositoryId: "repo-webapp", pullRequestId: 1, vote: "reset", mock: true },
			undefined, noop, mockCtx,
		);
		assert.ok(result.content[0].text.includes("No vote"));
		assert.equal(result.details.vote, 0);
	});
});

// ---------------------------------------------------------------------------
// Safety model
// ---------------------------------------------------------------------------

describe("Phase 3 mutation tools safety", () => {
	it("identifies Phase 3 tools as mutations", () => {
		assert.equal(isMutationTool("azure_devops_create_pull_request"), true);
		assert.equal(isMutationTool("azure_devops_update_pull_request"), true);
		assert.equal(isMutationTool("azure_devops_add_pull_request_comment"), true);
		assert.equal(isMutationTool("azure_devops_set_pull_request_vote"), true);
	});

	it("does not flag Phase 3 read tools as mutations", () => {
		assert.equal(isMutationTool("azure_devops_list_repos"), false);
		assert.equal(isMutationTool("azure_devops_get_pull_request"), false);
		assert.equal(isMutationTool("azure_devops_list_pull_requests"), false);
		assert.equal(isMutationTool("azure_devops_list_policies"), false);
	});
});

describe("formatMutationSummary Phase 3 tools", () => {
	it("formats azure_devops_create_pull_request summary", () => {
		const summary = formatMutationSummary("azure_devops_create_pull_request", {
			title: "Add login",
			sourceRefName: "refs/heads/feature/login",
			targetRefName: "refs/heads/main",
		});
		assert.ok(summary.includes("Create PR"));
		assert.ok(summary.includes("Add login"));
		assert.ok(summary.includes("feature/login → main"));
	});

	it("formats azure_devops_update_pull_request summary", () => {
		const summary = formatMutationSummary("azure_devops_update_pull_request", {
			pullRequestId: 42,
			title: "New title",
			status: "abandoned",
		});
		assert.ok(summary.includes("Update PR #42"));
		assert.ok(summary.includes("title"));
		assert.ok(summary.includes("status → abandoned"));
	});

	it("formats azure_devops_add_pull_request_comment summary", () => {
		const summary = formatMutationSummary("azure_devops_add_pull_request_comment", {
			pullRequestId: 42,
			content: "This is a long comment that should be truncated at eighty characters to keep the summary readable",
		});
		assert.ok(summary.includes("Comment on PR #42"));
		assert.ok(summary.includes("This is a long comment"));
		assert.ok(summary.includes("..."));
	});

	it("formats azure_devops_set_pull_request_vote summary", () => {
		const summary = formatMutationSummary("azure_devops_set_pull_request_vote", {
			pullRequestId: 42,
			vote: "approve",
		});
		assert.ok(summary.includes("Vote on PR #42"));
		assert.ok(summary.includes("approve"));
	});
});
