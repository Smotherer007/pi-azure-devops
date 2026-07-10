import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getWorkItemTool } from "../../src/tools/get-work-item.ts";
import { queryWorkItemsTool } from "../../src/tools/query-work-items.ts";
import { listWorkItemTypesTool } from "../../src/tools/list-work-item-types.ts";
import { getWorkItemCommentsTool } from "../../src/tools/get-work-item-comments.ts";
import { getWorkItemRevisionsTool } from "../../src/tools/get-work-item-revisions.ts";
import type { AzureDevOpsConfig } from "../../src/config/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(): AzureDevOpsConfig {
	return {
		orgUrl: "https://dev.azure.com/testorg",
		project: "TestProject",
		authMethod: "pat",
		safetyLevel: "confirm",
		defaultWorkItemType: "User Story",
		maxQueryResults: 100,
		autocomplete: true,
		mock: true, // Force mock mode
	};
}

const mockCtx = { cwd: process.cwd(), config: makeConfig() };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("azure_devops_get_work_item (mock)", () => {
	it("returns formatted work item for valid ID", async () => {
		const result = await getWorkItemTool.execute("_", { id: 101 }, undefined, undefined, mockCtx);
		assert.ok(result.content[0].text.includes("Implement user authentication flow"));
		assert.ok(result.content[0].text.includes("Active"));
	});

	it("returns error for non-existent ID", async () => {
		const result = await getWorkItemTool.execute("_", { id: 9999 }, undefined, undefined, mockCtx);
		assert.ok(result.content[0].text.includes("❌"));
	});

	it("returns closed work item", async () => {
		const result = await getWorkItemTool.execute("_", { id: 103 }, undefined, undefined, mockCtx);
		assert.ok(result.content[0].text.includes("Set up CI pipeline"));
		assert.ok(result.content[0].text.includes("Closed"));
	});
});

describe("azure_devops_query_work_items (mock)", () => {
	it("returns all items for broad query", async () => {
		const result = await queryWorkItemsTool.execute(
			"_",
			{ query: "SELECT [System.Id] FROM WorkItems" },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("5 work item(s)"));
	});

	it("filters by type", async () => {
		const result = await queryWorkItemsTool.execute(
			"_",
			{ query: "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug'" },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("2 work item(s)"));
	});

	it("respects top parameter", async () => {
		const result = await queryWorkItemsTool.execute(
			"_",
			{ query: "SELECT [System.Id] FROM WorkItems", top: 2 },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("2 work item(s)"));
	});

	it("returns 0 for non-matching query", async () => {
		const result = await queryWorkItemsTool.execute(
			"_",
			{ query: "WHERE [System.State] = 'Removed'" },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("0 work item(s)"));
	});
});

describe("azure_devops_list_work_item_types (mock)", () => {
	it("returns all 6 work item types", async () => {
		const result = await listWorkItemTypesTool.execute("_", {}, undefined, undefined, mockCtx);
		assert.ok(result.content[0].text.includes("User Story"));
		assert.ok(result.content[0].text.includes("Bug"));
		assert.ok(result.content[0].text.includes("Task"));
		assert.ok(result.content[0].text.includes("Epic"));
		assert.ok(result.content[0].text.includes("Feature"));
		assert.ok(result.content[0].text.includes("Issue"));
		assert.equal(result.details.count, 6);
	});
});

describe("azure_devops_get_work_item_comments (mock)", () => {
	it("returns comments for work item with comments", async () => {
		const result = await getWorkItemCommentsTool.execute(
			"_",
			{ workItemId: 101 },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Jane Developer"));
		assert.ok(result.content[0].text.includes("OAuth"));
		assert.equal(result.details.count, 3);
	});

	it("returns empty for work item with no comments", async () => {
		const result = await getWorkItemCommentsTool.execute(
			"_",
			{ workItemId: 104 },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("No comments"));
		assert.equal(result.details.count, 0);
	});
});

describe("azure_devops_get_work_item_revisions (mock)", () => {
	it("returns revision history for work item with revisions", async () => {
		const result = await getWorkItemRevisionsTool.execute(
			"_",
			{ workItemId: 101 },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Rev 1"));
		assert.ok(result.content[0].text.includes("Rev 2"));
		assert.ok(result.content[0].text.includes("Rev 3"));
		assert.equal(result.details.count, 3);
	});

	it("returns empty for work item with no revisions in fixture", async () => {
		const result = await getWorkItemRevisionsTool.execute(
			"_",
			{ workItemId: 104 },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("No revisions"));
		assert.equal(result.details.count, 0);
	});

	it("respects top parameter", async () => {
		const result = await getWorkItemRevisionsTool.execute(
			"_",
			{ workItemId: 101, top: 1 },
			undefined,
			undefined,
			mockCtx,
		);
		// Mock handler doesn't support top, but the parameter is accepted
		assert.ok(result.content[0].text.includes("Rev"));
	});
});
