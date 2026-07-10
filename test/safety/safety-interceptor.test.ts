import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isMutationTool,
	shouldBlock,
	formatMutationSummary,
} from "../../src/safety/index.ts";
import type { SafetyLevel } from "../../src/config/index.ts";

// ---------------------------------------------------------------------------
// isMutationTool
// ---------------------------------------------------------------------------

describe("isMutationTool", () => {
	it("identifies mutation tools", () => {
		assert.equal(isMutationTool("azure_devops_create_work_item"), true);
		assert.equal(isMutationTool("azure_devops_update_work_item"), true);
		assert.equal(isMutationTool("azure_devops_add_work_item_comment"), true);
		assert.equal(isMutationTool("azure_devops_manage_work_item_links"), true);
	});

	it("does not flag read tools", () => {
		assert.equal(isMutationTool("azure_devops_doctor"), false);
		assert.equal(isMutationTool("azure_devops_get_work_item"), false);
		assert.equal(isMutationTool("azure_devops_query_work_items"), false);
		assert.equal(isMutationTool("azure_devops_list_work_item_types"), false);
		assert.equal(isMutationTool("azure_devops_get_work_item_comments"), false);
		assert.equal(isMutationTool("azure_devops_get_work_item_revisions"), false);
	});

	it("does not flag unknown tools", () => {
		assert.equal(isMutationTool("bash"), false);
		assert.equal(isMutationTool("read"), false);
		assert.equal(isMutationTool("unknown_tool"), false);
	});
});

// ---------------------------------------------------------------------------
// shouldBlock
// ---------------------------------------------------------------------------

describe("shouldBlock", () => {
	it("blocks mutation tools in readonly mode", () => {
		const result = shouldBlock("readonly", "azure_devops_create_work_item");
		assert.ok(result);
		assert.ok(result!.includes("blocked in readonly"));
	});

	it("does not block read tools in readonly mode", () => {
		const result = shouldBlock("readonly", "azure_devops_get_work_item");
		assert.equal(result, undefined);
	});

	it("does not block any tool in open mode", () => {
		assert.equal(shouldBlock("open", "azure_devops_create_work_item"), undefined);
		assert.equal(shouldBlock("open", "azure_devops_update_work_item"), undefined);
		assert.equal(shouldBlock("open", "azure_devops_get_work_item"), undefined);
	});

	it("does not block mutation tools in confirm mode (handled by interceptor)", () => {
		assert.equal(shouldBlock("confirm", "azure_devops_create_work_item"), undefined);
		assert.equal(shouldBlock("confirm", "azure_devops_update_work_item"), undefined);
	});

	it("does not block read tools in confirm mode", () => {
		assert.equal(shouldBlock("confirm", "azure_devops_get_work_item"), undefined);
	});
});

// ---------------------------------------------------------------------------
// formatMutationSummary
// ---------------------------------------------------------------------------

describe("formatMutationSummary", () => {
	it("formats create summary", () => {
		const summary = formatMutationSummary("azure_devops_create_work_item", {
			type: "Bug",
			title: "Fix login crash",
		});
		assert.equal(summary, 'Create Bug: "Fix login crash"');
	});

	it("formats update summary with fields", () => {
		const summary = formatMutationSummary("azure_devops_update_work_item", {
			id: 1234,
			fields: { "System.State": "Closed", "System.Reason": "Completed" },
		});
		assert.ok(summary.includes("#1234"));
		assert.ok(summary.includes("System.State → Closed"));
		assert.ok(summary.includes("System.Reason → Completed"));
	});

	it("formats comment summary", () => {
		const summary = formatMutationSummary("azure_devops_add_work_item_comment", {
			workItemId: 101,
			text: "This looks good, approved.",
		});
		assert.ok(summary.includes("#101"));
		assert.ok(summary.includes("This looks good, approved."));
	});

	it("truncates long comments", () => {
		const longText = "a".repeat(120);
		const summary = formatMutationSummary("azure_devops_add_work_item_comment", {
			workItemId: 101,
			text: longText,
		});
		assert.ok(summary.includes("..."));
		assert.ok(summary.length < 150);
	});

	it("formats add link summary", () => {
		const summary = formatMutationSummary("azure_devops_manage_work_item_links", {
			workItemId: 100,
			operation: "add",
			relationType: "System.LinkTypes.Hierarchy-Forward",
			targetId: 200,
		});
		assert.ok(summary.includes("Add"));
		assert.ok(summary.includes("#100 → #200"));
		assert.ok(summary.includes("Hierarchy-Forward"));
	});

	it("formats remove link summary", () => {
		const summary = formatMutationSummary("azure_devops_manage_work_item_links", {
			workItemId: 100,
			operation: "remove",
			relationType: "System.LinkTypes.Related",
			targetId: 300,
		});
		assert.ok(summary.includes("Remove"));
		assert.ok(summary.includes("#100 ✕ #300"));
	});

	it("handles unknown tool gracefully", () => {
		const summary = formatMutationSummary("azure_devops_unknown_tool", { foo: "bar" });
		assert.ok(summary.includes("azure_devops_unknown_tool"));
	});
});
