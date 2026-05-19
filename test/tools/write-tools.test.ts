import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createWorkItemTool } from "../../src/tools/create-work-item.js";
import { updateWorkItemTool } from "../../src/tools/update-work-item.js";
import { addWorkItemCommentTool } from "../../src/tools/add-work-item-comment.js";
import { manageWorkItemLinksTool } from "../../src/tools/manage-work-item-links.js";
import type { AzureDevOpsConfig } from "../../src/config/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(): AzureDevOpsConfig {
	return {
		orgUrl: "https://dev.azure.com/testorg",
		project: "TestProject",
		authMethod: "pat",
		safetyLevel: "open", // Open so tools execute without safety gate
		defaultWorkItemType: "User Story",
		maxQueryResults: 100,
		autocomplete: true,
		mock: true,
	};
}

const mockCtx = { cwd: process.cwd(), config: makeConfig() };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("azure_devops_create_work_item (mock)", () => {
	it("creates a work item and returns confirmation", async () => {
		const result = await createWorkItemTool.execute(
			"_",
			{ type: "Bug", title: "Fix login crash" },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("✅"));
		assert.ok(result.content[0].text.includes("Bug"));
		assert.ok(result.content[0].text.includes("Fix login crash"));
		assert.equal(result.details.type, "Bug");
		assert.equal(result.details.title, "Fix login crash");
		assert.ok(typeof result.details.id === "number");
	});

	it("creates with description", async () => {
		const result = await createWorkItemTool.execute(
			"_",
			{ type: "User Story", title: "As a user...", description: "Detailed description here" },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("✅"));
	});

	it("creates with additional fields", async () => {
		const result = await createWorkItemTool.execute(
			"_",
			{
				type: "Task",
				title: "Set up CI",
				fields: { "System.Priority": "1", "System.Tags": "devops" },
			},
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("✅"));
		assert.ok(result.content[0].text.includes("mock"));
	});
});

describe("azure_devops_update_work_item (mock)", () => {
	it("updates fields on existing work item", async () => {
		const result = await updateWorkItemTool.execute(
			"_",
			{ id: 101, fields: { "System.State": "Closed", "System.Reason": "Completed" } },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("✅"));
		assert.ok(result.content[0].text.includes("System.State"));
		assert.ok(result.content[0].text.includes("Closed"));
		assert.equal(result.details.id, 101);
	});

	it("returns error for non-existent work item", async () => {
		const result = await updateWorkItemTool.execute(
			"_",
			{ id: 9999, fields: { "System.State": "Closed" } },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("❌"));
	});

	it("updates a single field", async () => {
		const result = await updateWorkItemTool.execute(
			"_",
			{ id: 102, fields: { "System.AssignedTo": "jane@contoso.com" } },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("✅"));
	});
});

describe("azure_devops_add_work_item_comment (mock)", () => {
	it("adds comment and returns confirmation", async () => {
		const result = await addWorkItemCommentTool.execute(
			"_",
			{ workItemId: 101, text: "Looking good, approved!" },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("✅"));
		assert.ok(result.content[0].text.includes("Looking good, approved!"));
		assert.equal(result.details.workItemId, 101);
	});

	it("adds comment to another work item", async () => {
		const result = await addWorkItemCommentTool.execute(
			"_",
			{ workItemId: 102, text: "Reproduced. Investigating." },
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("✅"));
	});
});

describe("azure_devops_manage_work_item_links (mock)", () => {
	it("adds a parent/child link", async () => {
		const result = await manageWorkItemLinksTool.execute(
			"_",
			{
				workItemId: 101,
				operation: "add",
				relationType: "System.LinkTypes.Hierarchy-Forward",
				targetId: 102,
			},
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("✅"));
		assert.ok(result.content[0].text.includes("Added"));
		assert.ok(result.content[0].text.includes("#101 → #102"));
		assert.equal(result.details.workItemId, 101);
		assert.equal(result.details.targetId, 102);
	});

	it("removes a related link", async () => {
		const result = await manageWorkItemLinksTool.execute(
			"_",
			{
				workItemId: 101,
				operation: "remove",
				relationType: "System.LinkTypes.Related",
				targetId: 103,
			},
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Removed"));
		assert.ok(result.content[0].text.includes("#101"));
		assert.ok(result.content[0].text.includes("#103"));
	});

	it("adds a dependency link", async () => {
		const result = await manageWorkItemLinksTool.execute(
			"_",
			{
				workItemId: 104,
				operation: "add",
				relationType: "System.LinkTypes.Dependency",
				targetId: 105,
			},
			undefined,
			undefined,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Added"));
		assert.ok(result.content[0].text.includes("Dependency"));
	});
});
