import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
	mockGetWorkItem,
	mockQueryWorkItems,
	mockListWorkItemTypes,
	mockGetWorkItemComments,
	mockGetWorkItemRevisions,
	mockCreateWorkItem,
	mockUpdateWorkItem,
	mockAddWorkItemComment,
	mockManageWorkItemLinks,
	clearFixtureCache,
} from "../../src/mocks/mock-handler.js";

beforeEach(() => {
	clearFixtureCache();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("mockGetWorkItem", () => {
	it("returns a formatted work item for a valid ID", () => {
		const result = mockGetWorkItem(101);
		assert.ok(!result.content[0].text.includes("❌"));
		assert.ok(result.content[0].text.includes("Implement user authentication flow"));
		assert.ok(result.content[0].text.includes("Active"));
		assert.equal(result.details.mock, true);
	});

	it("returns error for non-existent ID", () => {
		const result = mockGetWorkItem(9999);
		assert.ok(result.content[0].text.includes("❌"));
		assert.ok(result.content[0].text.includes("not found"));
	});
});

describe("mockQueryWorkItems", () => {
	it("returns all work items with empty query", () => {
		const result = mockQueryWorkItems("SELECT [System.Id] FROM WorkItems");
		assert.ok(result.content[0].text.includes("5 work item(s)"));
	});

	it("filters by state=Active using WIQL", () => {
		const result = mockQueryWorkItems(
			"SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'",
		);
		assert.ok(result.content[0].text.includes("work item(s)"));
		assert.ok(!result.content[0].text.includes("Closed"));
		assert.ok(!result.content[0].text.includes("#103"));
	});

	it("filters by type=Bug using WIQL", () => {
		const result = mockQueryWorkItems(
			"SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug'",
		);
		assert.ok(result.content[0].text.includes("2 work item(s)"));
		assert.ok(result.content[0].text.includes("#102"));
		assert.ok(result.content[0].text.includes("#105"));
	});

	it("filters by state using keyword detection", () => {
		const result = mockQueryWorkItems("show me all active bugs");
		assert.ok(result.content[0].text.includes("#102"));
		assert.ok(!result.content[0].text.includes("#103"));
	});

	it("respects top parameter", () => {
		const result = mockQueryWorkItems("SELECT [System.Id] FROM WorkItems", 2);
		assert.ok(result.content[0].text.includes("2 work item(s)"));
	});

	it("returns empty results for non-matching query", () => {
		const result = mockQueryWorkItems(
			"SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Removed'",
		);
		assert.ok(result.content[0].text.includes("0 work item(s)"));
	});
});

describe("mockListWorkItemTypes", () => {
	it("returns all work item types", () => {
		const result = mockListWorkItemTypes();
		assert.ok(result.content[0].text.includes("User Story"));
		assert.ok(result.content[0].text.includes("Bug"));
		assert.ok(result.content[0].text.includes("Task"));
		assert.ok(result.content[0].text.includes("Feature"));
		assert.ok(result.content[0].text.includes("Epic"));
		assert.ok(result.content[0].text.includes("Issue"));
		assert.equal(result.details.count, 6);
	});
});

describe("mockGetWorkItemComments", () => {
	it("returns comments for work item 101", () => {
		const result = mockGetWorkItemComments(101);
		assert.ok(result.content[0].text.includes("Jane Developer"));
		assert.ok(result.content[0].text.includes("John PM"));
		assert.ok(result.content[0].text.includes("OAuth"));
		assert.equal(result.details.count, 3);
	});

	it("returns comments for work item 102", () => {
		const result = mockGetWorkItemComments(102);
		assert.ok(result.content[0].text.includes("Alex Engineer"));
		assert.ok(result.content[0].text.includes("polyfill"));
	});

	it("returns empty for work item with no comments", () => {
		const result = mockGetWorkItemComments(104);
		assert.ok(result.content[0].text.includes("No comments"));
	});
});

describe("mockGetWorkItemRevisions", () => {
	it("returns revisions for work item 101", () => {
		const result = mockGetWorkItemRevisions(101);
		assert.ok(result.content[0].text.includes("Rev 1"));
		assert.ok(result.content[0].text.includes("Rev 2"));
		assert.ok(result.content[0].text.includes("Rev 3"));
		assert.equal(result.details.count, 3);
	});

	it("returns empty for work item with no revisions", () => {
		const result = mockGetWorkItemRevisions(104);
		assert.ok(result.content[0].text.includes("No revisions"));
	});
});

describe("mockCreateWorkItem", () => {
	it("returns created work item with generated ID", () => {
		const result = mockCreateWorkItem("Bug", "Fix something broken");
		assert.ok(result.content[0].text.includes("✅"));
		assert.ok(result.content[0].text.includes("Fix something broken"));
		assert.ok(result.content[0].text.includes("Bug"));
		assert.equal(result.details.type, "Bug");
		assert.equal(result.details.title, "Fix something broken");
		assert.ok(typeof result.details.id === "number");
	});
});

describe("mockUpdateWorkItem", () => {
	it("returns updated fields for existing work item", () => {
		const result = mockUpdateWorkItem(101, {
			"System.State": "Closed",
			"System.Reason": "Completed",
		});
		assert.ok(result.content[0].text.includes("✅"));
		assert.ok(result.content[0].text.includes("System.State"));
		assert.ok(result.content[0].text.includes("Closed"));
	});

	it("returns error for non-existent work item", () => {
		const result = mockUpdateWorkItem(9999, { "System.State": "Closed" });
		assert.ok(result.content[0].text.includes("❌"));
	});
});

describe("mockAddWorkItemComment", () => {
	it("returns confirmation with comment text", () => {
		const result = mockAddWorkItemComment(101, "This is a test comment");
		assert.ok(result.content[0].text.includes("✅"));
		assert.ok(result.content[0].text.includes("This is a test comment"));
		assert.equal(result.details.workItemId, 101);
	});
});

describe("mockManageWorkItemLinks", () => {
	it("returns confirmation for add operation", () => {
		const result = mockManageWorkItemLinks(101, "add", "System.LinkTypes.Hierarchy-Forward", 102);
		assert.ok(result.content[0].text.includes("✅"));
		assert.ok(result.content[0].text.includes("Added"));
		assert.ok(result.content[0].text.includes("#101"));
		assert.ok(result.content[0].text.includes("#102"));
	});

	it("returns confirmation for remove operation", () => {
		const result = mockManageWorkItemLinks(101, "remove", "System.LinkTypes.Hierarchy-Forward", 102);
		assert.ok(result.content[0].text.includes("Removed"));
	});
});
