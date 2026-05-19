import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	formatWorkItem,
	formatWorkItemSummary,
	formatWorkItemList,
	formatWorkItemType,
	formatWorkItemTypeList,
	formatComments,
	formatRevisions,
} from "../../src/utils/formatting.js";

// Minimal work item shape matching the inferred type
function makeWorkItem(overrides: Record<string, unknown> = {}): any {
	return {
		id: 101,
		rev: 3,
		fields: {
			"System.Title": "Test work item",
			"System.WorkItemType": "User Story",
			"System.State": "Active",
			"System.Reason": "Implementation started",
			"System.AssignedTo": { displayName: "Jane Developer" },
			"System.AreaPath": "Project\\Engineering",
			"System.IterationPath": "Project\\Sprint 4",
			"System.Priority": 2,
			"System.Tags": "backend; critical",
			"System.Description": "<p>Detailed description</p>",
			...overrides,
		},
		url: "https://dev.azure.com/org/_apis/wit/workItems/101",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// formatWorkItem
// ---------------------------------------------------------------------------

describe("formatWorkItem", () => {
	it("includes ID and title", () => {
		const result = formatWorkItem(makeWorkItem());
		assert.ok(result.includes("# Work Item 101"));
		assert.ok(result.includes("Test work item"));
	});

	it("includes type, state, reason", () => {
		const result = formatWorkItem(makeWorkItem());
		assert.ok(result.includes("User Story"));
		assert.ok(result.includes("Active"));
		assert.ok(result.includes("Implementation started"));
	});

	it("includes assigned to (displayName object)", () => {
		const result = formatWorkItem(makeWorkItem());
		assert.ok(result.includes("Jane Developer"));
	});

	it("includes assigned to (string value)", () => {
		const result = formatWorkItem(makeWorkItem({
			"System.AssignedTo": "john@contoso.com",
		}));
		assert.ok(result.includes("john@contoso.com"));
	});

	it("shows unassigned when no assignee", () => {
		const result = formatWorkItem(makeWorkItem({
			"System.AssignedTo": undefined,
		}));
		assert.ok(result.includes("unassigned"));
	});

	it("includes area path and iteration", () => {
		const result = formatWorkItem(makeWorkItem());
		assert.ok(result.includes("Project\\Engineering"));
		assert.ok(result.includes("Sprint 4"));
	});

	it("includes priority", () => {
		const result = formatWorkItem(makeWorkItem());
		assert.ok(result.includes("Priority"));
		assert.ok(result.includes("2"));
	});

	it("includes description section", () => {
		const result = formatWorkItem(makeWorkItem());
		assert.ok(result.includes("## Description"));
		assert.ok(result.includes("<p>Detailed description</p>"));
	});

	it("includes tags", () => {
		const result = formatWorkItem(makeWorkItem());
		assert.ok(result.includes("backend; critical"));
	});

	it("includes URL", () => {
		const result = formatWorkItem(makeWorkItem());
		assert.ok(result.includes("https://dev.azure.com"));
	});

	it("handles empty fields", () => {
		const result = formatWorkItem({ id: 99, fields: undefined, url: undefined } as any);
		assert.ok(result.includes("99"));
		assert.ok(result.includes("(untitled)"));
		assert.ok(result.includes("Unknown"));
		assert.ok(result.includes("(unassigned)"));
	});

	it("includes severity when present", () => {
		const result = formatWorkItem(makeWorkItem({
			"Microsoft.VSTS.Common.Severity": "2 - High",
		}));
		assert.ok(result.includes("2 - High"));
	});
});

// ---------------------------------------------------------------------------
// formatWorkItemSummary
// ---------------------------------------------------------------------------

describe("formatWorkItemSummary", () => {
	it("formats compact summary line", () => {
		const result = formatWorkItemSummary(makeWorkItem());
		assert.equal(result, "#101 [User Story] [Active] Test work item");
	});

	it("handles missing fields gracefully", () => {
		const result = formatWorkItemSummary({ id: 1, fields: {} });
		assert.equal(result, "#1 [?] [?] (untitled)");
	});
});

// ---------------------------------------------------------------------------
// formatWorkItemList
// ---------------------------------------------------------------------------

describe("formatWorkItemList", () => {
	it("formats multiple items", () => {
		const items = [
			makeWorkItem({ id: 1, fields: { "System.Title": "First", "System.WorkItemType": "Bug", "System.State": "New" } }),
			makeWorkItem({ id: 2, fields: { "System.Title": "Second", "System.WorkItemType": "Task", "System.State": "Done" } }),
		];
		const result = formatWorkItemList(items);
		assert.ok(result.includes("#1"));
		assert.ok(result.includes("First"));
		assert.ok(result.includes("#2"));
		assert.ok(result.includes("Second"));
	});

	it("returns message for empty list", () => {
		assert.equal(formatWorkItemList([]), "No work items found.");
	});
});

// ---------------------------------------------------------------------------
// formatWorkItemType
// ---------------------------------------------------------------------------

describe("formatWorkItemType", () => {
	it("formats a work item type with states", () => {
		const result = formatWorkItemType({
			name: "Bug",
			referenceName: "Microsoft.VSTS.WorkItemTypes.Bug",
			description: "A code defect",
			states: [{ name: "New" }, { name: "Active" }, { name: "Closed" }],
		} as any);
		assert.ok(result.includes("**Bug**"));
		assert.ok(result.includes("Microsoft.VSTS.WorkItemTypes.Bug"));
		assert.ok(result.includes("A code defect"));
		assert.ok(result.includes("New, Active, Closed"));
	});

	it("handles type without description or states", () => {
		const result = formatWorkItemType({
			name: "Issue",
			referenceName: "Microsoft.VSTS.WorkItemTypes.Issue",
		} as any);
		assert.ok(result.includes("**Issue**"));
		assert.ok(!result.includes("States:"));
	});
});

// ---------------------------------------------------------------------------
// formatWorkItemTypeList
// ---------------------------------------------------------------------------

describe("formatWorkItemTypeList", () => {
	it("returns message for empty list", () => {
		assert.equal(formatWorkItemTypeList([]), "No work item types found.");
	});
});

// ---------------------------------------------------------------------------
// formatComments
// ---------------------------------------------------------------------------

describe("formatComments", () => {
	it("formats comments with author and date", () => {
		const result = formatComments({
			comments: [
				{
					createdBy: { displayName: "Jane" },
					createdDate: "2025-01-15T10:30:00Z",
					text: "This looks good!",
				},
				{
					createdBy: { displayName: "Bob" },
					createdDate: "2025-01-16T14:00:00Z",
					text: "Approved.",
				},
			],
		} as any);
		assert.ok(result.includes("Jane"));
		assert.ok(result.includes("This looks good!"));
		assert.ok(result.includes("Bob"));
		assert.ok(result.includes("Approved."));
	});

	it("returns no comments message for empty list", () => {
		assert.equal(formatComments({ comments: [] } as any), "No comments.");
	});

	it("handles missing author gracefully", () => {
		const result = formatComments({
			comments: [{ createdBy: undefined, createdDate: undefined, text: "Hello" }],
		} as any);
		assert.ok(result.includes("Unknown"));
		assert.ok(result.includes("Hello"));
	});
});

// ---------------------------------------------------------------------------
// formatRevisions
// ---------------------------------------------------------------------------

describe("formatRevisions", () => {
	it("formats revision entries", () => {
		const revisions = [
			{
				id: 101,
				rev: 1,
				fields: {
					"System.ChangedBy": { displayName: "Jane" },
					"System.ChangedDate": "2025-01-10T09:00:00Z",
					"System.State": "New",
				},
			},
			{
				id: 101,
				rev: 2,
				fields: {
					"System.ChangedBy": { displayName: "Bob" },
					"System.ChangedDate": "2025-01-12T14:00:00Z",
					"System.State": "Active",
				},
			},
		] as any[];

		const result = formatRevisions(revisions);
		assert.ok(result.includes("Rev 1"));
		assert.ok(result.includes("Jane"));
		assert.ok(result.includes("Rev 2"));
		assert.ok(result.includes("Bob"));
		assert.ok(result.includes("System.State"));
	});

	it("returns message for empty revisions", () => {
		assert.equal(formatRevisions([]), "No revisions found.");
	});

	it("handles string ChangedBy", () => {
		const revisions = [
			{
				id: 101,
				rev: 1,
				fields: {
					"System.ChangedBy": "jane@contoso.com",
					"System.ChangedDate": "2025-01-10T09:00:00Z",
				},
			},
		] as any[];

		const result = formatRevisions(revisions);
		assert.ok(result.includes("jane@contoso.com"));
	});

	it("handles missing ChangedBy", () => {
		const revisions = [
			{ id: 101, rev: 1, fields: {} },
		] as any[];

		const result = formatRevisions(revisions);
		assert.ok(result.includes("Unknown"));
	});
});
