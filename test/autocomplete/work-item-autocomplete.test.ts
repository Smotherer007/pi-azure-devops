import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	extractWorkItemToken,
	filterWorkItems,
	formatWorkItemItem,
	loadWorkItemsFromMock,
} from "../../src/autocomplete/work-item-autocomplete.js";
import type { WorkItemSummary } from "../../src/autocomplete/work-item-autocomplete.js";

// We import the module to test individual exported functions.
// Note: extractWorkItemToken, filterWorkItems, formatWorkItemItem, loadWorkItemsFromMock
// need to be exported for testing. Let's test the logic we can access.

// Since these are internal functions, we test via the exported registerAutocomplete
// by exercising the filtering/formatting logic through mock data.

const sampleItems: WorkItemSummary[] = [
	{ id: 101, title: "Implement user authentication", state: "Active", type: "User Story" },
	{ id: 102, title: "Fix login crash on mobile", state: "New", type: "Bug" },
	{ id: 103, title: "Write API documentation", state: "Active", type: "Task" },
	{ id: 104, title: "Set up CI pipeline", state: "Done", type: "Task" },
	{ id: 105, title: "Add export to CSV feature", state: "New", type: "User Story" },
	{ id: 1205, title: "Migrate database to v3", state: "Active", type: "Task" },
];

// ---------------------------------------------------------------------------
// filterWorkItems (tested indirectly through exported registerAutocomplete or directly if exported)
// ---------------------------------------------------------------------------

describe("filterWorkItems", () => {
	it("returns first MAX_SUGGESTIONS when no query", () => {
		const results = filterWorkItems(sampleItems, "");
		assert.ok(results.length <= 20);
		assert.equal(results[0].value, "#101");
	});

	it("matches by numeric prefix", () => {
		const results = filterWorkItems(sampleItems, "10");
		assert.ok(results.length > 0);
		assert.ok(results.every((r) => r.value.startsWith("#10")));
	});

	it("matches by specific ID", () => {
		const results = filterWorkItems(sampleItems, "102");
		assert.ok(results.length > 0);
		assert.equal(results[0].value, "#102");
		assert.ok(results[0].description!.includes("Fix login crash"));
	});

	it("fuzzy matches by title text", () => {
		const results = filterWorkItems(sampleItems, "auth");
		assert.ok(results.length > 0);
		assert.ok(results.some((r) => r.description!.includes("authentication")));
	});

	it("fuzzy matches partial title", () => {
		const results = filterWorkItems(sampleItems, "csv");
		assert.ok(results.length > 0);
		assert.ok(results.some((r) => r.description!.includes("CSV")));
	});

	it("returns empty for non-matching query", () => {
		const results = filterWorkItems(sampleItems, "zzzznonexistent");
		assert.equal(results.length, 0);
	});

	it("handles 4-digit IDs", () => {
		const results = filterWorkItems(sampleItems, "120");
		assert.ok(results.length > 0);
		assert.equal(results[0].value, "#1205");
	});
});

// ---------------------------------------------------------------------------
// formatWorkItemItem
// ---------------------------------------------------------------------------

describe("formatWorkItemItem", () => {
	it("formats with state and title", () => {
		const item = formatWorkItemItem(sampleItems[0]);
		assert.equal(item.value, "#101");
		assert.equal(item.label, "#101");
		assert.ok(item.description!.includes("[Active]"));
		assert.ok(item.description!.includes("Implement user authentication"));
	});

	it("formats bug items", () => {
		const item = formatWorkItemItem(sampleItems[1]);
		assert.equal(item.value, "#102");
		assert.ok(item.description!.includes("[New]"));
		assert.ok(item.description!.includes("Fix login crash"));
	});
});

// ---------------------------------------------------------------------------
// loadWorkItemsFromMock
// ---------------------------------------------------------------------------

describe("loadWorkItemsFromMock", () => {
	it("returns work items from mock fixtures", () => {
		const items = loadWorkItemsFromMock();
		assert.ok(items.length > 0);
		// Should include fixture items: 101, 102, 103, 104, 105
		assert.ok(items.some((i) => i.id === 101));
		assert.ok(items.some((i) => i.id === 102));
	});

	it("each item has required fields", () => {
		const items = loadWorkItemsFromMock();
		for (const item of items) {
			assert.ok(typeof item.id === "number");
			assert.ok(typeof item.title === "string");
			assert.ok(typeof item.state === "string");
			assert.ok(typeof item.type === "string");
		}
	});
});
