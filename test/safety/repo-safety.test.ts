import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isMutationTool,
	shouldBlock,
	formatMutationSummary,
} from "../../src/safety/index.js";

// ---------------------------------------------------------------------------
// isMutationTool — Phase 3 PR tools
// ---------------------------------------------------------------------------

describe("isMutationTool — Phase 3 PR tools", () => {
	const prMutations = [
		"azure_devops_create_pull_request",
		"azure_devops_update_pull_request",
		"azure_devops_add_pull_request_comment",
		"azure_devops_set_pull_request_vote",
	];

	for (const tool of prMutations) {
		it(`identifies ${tool} as mutation`, () => {
			assert.equal(isMutationTool(tool), true);
		});
	}

	const prReads = [
		"azure_devops_list_repos",
		"azure_devops_get_repo",
		"azure_devops_list_branches",
		"azure_devops_list_pull_requests",
		"azure_devops_get_pull_request",
		"azure_devops_get_pull_request_threads",
		"azure_devops_get_pull_request_commits",
		"azure_devops_list_policies",
		"azure_devops_get_policy_evaluations",
	];

	for (const tool of prReads) {
		it(`does not flag ${tool} as mutation`, () => {
			assert.equal(isMutationTool(tool), false);
		});
	}
});

// ---------------------------------------------------------------------------
// shouldBlock — Phase 3 PR tools
// ---------------------------------------------------------------------------

describe("shouldBlock — Phase 3 PR tools", () => {
	const prMutations = [
		"azure_devops_create_pull_request",
		"azure_devops_update_pull_request",
		"azure_devops_add_pull_request_comment",
		"azure_devops_set_pull_request_vote",
	];

	for (const tool of prMutations) {
		it(`blocks ${tool} in readonly mode`, () => {
			const result = shouldBlock("readonly", tool);
			assert.ok(result);
			assert.ok(result!.includes("blocked in readonly"));
		});
	}

	for (const tool of prMutations) {
		it(`allows ${tool} in open mode`, () => {
			assert.equal(shouldBlock("open", tool), undefined);
		});
	}

	for (const tool of prMutations) {
		it(`does not block ${tool} in confirm mode (interceptor handles)`, () => {
			assert.equal(shouldBlock("confirm", tool), undefined);
		});
	}

	const prReads = [
		"azure_devops_list_repos",
		"azure_devops_get_pull_request",
		"azure_devops_list_policies",
		"azure_devops_get_policy_evaluations",
	];

	for (const tool of prReads) {
		it(`does not block read tool ${tool} in any mode`, () => {
			assert.equal(shouldBlock("readonly", tool), undefined);
			assert.equal(shouldBlock("confirm", tool), undefined);
			assert.equal(shouldBlock("open", tool), undefined);
		});
	}
});

// ---------------------------------------------------------------------------
// formatMutationSummary — Phase 3 PR tools
// ---------------------------------------------------------------------------

describe("formatMutationSummary — Phase 3 PR tools", () => {
	it("formats create PR summary", () => {
		const summary = formatMutationSummary("azure_devops_create_pull_request", {
			title: "Add OAuth support",
			sourceRefName: "refs/heads/feature/oauth",
			targetRefName: "refs/heads/main",
			repositoryId: "repo-webapp",
		});
		assert.ok(summary.includes("Create PR"));
		assert.ok(summary.includes("Add OAuth support"));
		assert.ok(summary.includes("feature/oauth → main"));
	});

	it("formats create PR with missing fields", () => {
		const summary = formatMutationSummary("azure_devops_create_pull_request", {});
		assert.ok(summary.includes("Create PR"));
	});

	it("formats update PR summary with title", () => {
		const summary = formatMutationSummary("azure_devops_update_pull_request", {
			pullRequestId: 42,
			title: "New title",
		});
		assert.ok(summary.includes("Update PR #42"));
		assert.ok(summary.includes("title"));
	});

	it("formats update PR summary with status", () => {
		const summary = formatMutationSummary("azure_devops_update_pull_request", {
			pullRequestId: 42,
			status: "abandoned",
		});
		assert.ok(summary.includes("status → abandoned"));
	});

	it("formats update PR summary with no changes", () => {
		const summary = formatMutationSummary("azure_devops_update_pull_request", {
			pullRequestId: 42,
		});
		assert.ok(summary.includes("no changes"));
	});

	it("formats add PR comment summary", () => {
		const summary = formatMutationSummary("azure_devops_add_pull_request_comment", {
			pullRequestId: 42,
			content: "LGTM!",
		});
		assert.ok(summary.includes("Comment on PR #42"));
		assert.ok(summary.includes("LGTM!"));
	});

	it("truncates long PR comment content", () => {
		const longContent = "x".repeat(200);
		const summary = formatMutationSummary("azure_devops_add_pull_request_comment", {
			pullRequestId: 42,
			content: longContent,
		});
		assert.ok(summary.includes("..."));
		assert.ok(summary.length < 200);
	});

	it("formats set PR vote summary", () => {
		const summary = formatMutationSummary("azure_devops_set_pull_request_vote", {
			pullRequestId: 42,
			vote: "approve",
		});
		assert.ok(summary.includes("Vote on PR #42"));
		assert.ok(summary.includes("approve"));
	});

	it("formats set PR vote with reject", () => {
		const summary = formatMutationSummary("azure_devops_set_pull_request_vote", {
			pullRequestId: 99,
			vote: "reject",
		});
		assert.ok(summary.includes("reject"));
	});
});
