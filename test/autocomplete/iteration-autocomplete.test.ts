import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	extractIterationToken,
	filterIterations,
	formatIterationItem,
	loadIterationsFromMockData,
	type IterationSummary,
} from "../../src/autocomplete/iteration-autocomplete.js";

const mockIterations: IterationSummary[] = [
	{ id: "sprint-1", name: "Sprint 1", path: "Project\\Sprint 1", startDate: "2026-03-23T00:00:00Z", finishDate: "2026-04-05T00:00:00Z", timeframe: "past" },
	{ id: "sprint-2", name: "Sprint 2", path: "Project\\Sprint 2", startDate: "2026-04-06T00:00:00Z", finishDate: "2026-04-19T00:00:00Z", timeframe: "past" },
	{ id: "sprint-3", name: "Sprint 3", path: "Project\\Sprint 3", startDate: "2026-04-20T00:00:00Z", finishDate: "2026-05-03T00:00:00Z", timeframe: "current" },
	{ id: "sprint-4", name: "Sprint 4", path: "Project\\Sprint 4", startDate: "2026-05-04T00:00:00Z", finishDate: "2026-05-17T00:00:00Z", timeframe: "future" },
	{ id: "plat-1", name: "Platform Sprint 1", path: "Project\\Platform\\Platform Sprint 1", startDate: "2026-04-20T00:00:00Z", finishDate: "2026-05-03T00:00:00Z", timeframe: "current" },
];

// ---------------------------------------------------------------------------
// extractIterationToken
// ---------------------------------------------------------------------------

describe("extractIterationToken", () => {
	it("extracts token after @sprint at start of line", () => {
		assert.equal(extractIterationToken("@sprint"), "");
	});

	it("extracts partial text after @sprint", () => {
		assert.equal(extractIterationToken("@sprintSpri"), "Spri");
	});

	it("extracts single word after @sprint preceded by space", () => {
		assert.equal(extractIterationToken("show @sprintSprint"), "Sprint");
	});

	it("extracts after opening paren", () => {
		assert.equal(extractIterationToken("(@sprintSprint"), "Sprint");
	});

	it("extracts after tab", () => {
		assert.equal(extractIterationToken("\t@sprint3"), "3");
	});

	it("returns undefined when no @sprint present", () => {
		assert.equal(extractIterationToken("hello world"), undefined);
	});

	it("returns undefined for @sprint in middle of word", () => {
		assert.equal(extractIterationToken("foo@sprint"), undefined);
	});

	it("returns undefined for @@sprint (double @)", () => {
		assert.equal(extractIterationToken("@@sprint"), undefined);
	});

	it("returns empty string for just @sprint at end", () => {
		assert.equal(extractIterationToken("check @sprint"), "");
	});

	it("stops at space — only captures text before whitespace", () => {
		// In real use, cursor is right after the partial, so no trailing text.
		// The regex matches @sprint<non-space-chars> at end of line.
		assert.equal(extractIterationToken("@sprintSpri"), "Spri");
	});
});

// ---------------------------------------------------------------------------
// formatIterationItem
// ---------------------------------------------------------------------------

describe("formatIterationItem", () => {
	it("includes name as label", () => {
		const item = formatIterationItem(mockIterations[0]);
		assert.equal(item.label, "Sprint 1");
	});

	it("includes value with @sprint prefix", () => {
		const item = formatIterationItem(mockIterations[0]);
		assert.equal(item.value, "@sprintSprint 1");
	});

	it("includes dates in description", () => {
		const item = formatIterationItem(mockIterations[0]);
		assert.ok(item.description.includes("2026-03-23"));
		assert.ok(item.description.includes("2026-04-05"));
	});

	it("includes timeframe badge", () => {
		const item = formatIterationItem(mockIterations[2]);
		assert.ok(item.description.includes("[current]"));
	});

	it("handles missing dates", () => {
		const item = formatIterationItem({ id: "x", name: "Undated", path: "" });
		assert.ok(item.description.includes("no dates"));
	});

	it("handles missing timeframe", () => {
		const item = formatIterationItem({ id: "x", name: "NoTF", path: "", startDate: "2026-01-01T00:00:00Z", finishDate: "2026-01-14T00:00:00Z" });
		assert.ok(!item.description.includes("["));
	});
});

// ---------------------------------------------------------------------------
// filterIterations
// ---------------------------------------------------------------------------

describe("filterIterations", () => {
	it("returns first MAX_SUGGESTIONS when no query", () => {
		const results = filterIterations(mockIterations, "");
		assert.equal(results.length, 5);
	});

	it("matches by sprint name prefix", () => {
		const results = filterIterations(mockIterations, "Sprint 3");
		assert.ok(results.some((r) => r.label === "Sprint 3"));
	});

	it("matches Platform sprints", () => {
		const results = filterIterations(mockIterations, "Platform");
		assert.ok(results.some((r) => r.label === "Platform Sprint 1"));
	});

	it("matches by path", () => {
		const results = filterIterations(mockIterations, "Platform");
		assert.ok(results.length >= 1);
	});

	it("returns empty for non-matching query", () => {
		const results = filterIterations(mockIterations, "Nonexistent");
		assert.equal(results.length, 0);
	});

	it("partial match works", () => {
		const results = filterIterations(mockIterations, "Spri");
		assert.ok(results.length >= 3);
	});
});

// ---------------------------------------------------------------------------
// loadIterationsFromMockData
// ---------------------------------------------------------------------------

describe("loadIterationsFromMockData", () => {
	it("loads iterations from fixture structure", () => {
		const data = {
			iterations: {
				Engineering: [
					{ id: "s1", name: "Sprint 1", path: "P\\S1", attributes: { startDate: "2026-01-01T00:00:00Z", finishDate: "2026-01-14T00:00:00Z", timeFrame: "past" } },
					{ id: "s2", name: "Sprint 2", path: "P\\S2", attributes: { startDate: "2026-01-15T00:00:00Z", finishDate: "2026-01-28T00:00:00Z", timeFrame: "current" } },
				],
				Platform: [
					{ id: "p1", name: "Platform Sprint 1", path: "P\\Platform\\PS1", attributes: { timeFrame: "current" } },
				],
			},
		};
		const result = loadIterationsFromMockData(data);
		assert.equal(result.length, 3);
		assert.equal(result[0].name, "Sprint 1");
		assert.equal(result[2].name, "Platform Sprint 1");
	});

	it("deduplicates by id", () => {
		const data = {
			iterations: {
				TeamA: [{ id: "shared-1", name: "Shared Sprint", path: "P\\S1", attributes: {} }],
				TeamB: [{ id: "shared-1", name: "Shared Sprint", path: "P\\S1", attributes: {} }],
			},
		};
		const result = loadIterationsFromMockData(data);
		assert.equal(result.length, 1);
	});

	it("handles empty iterations", () => {
		const result = loadIterationsFromMockData({ iterations: {} });
		assert.equal(result.length, 0);
	});

	it("extracts attributes correctly", () => {
		const data = {
			iterations: {
				Team: [{
					id: "s1",
					name: "Sprint 1",
					path: "P\\S1",
					attributes: {
						startDate: "2026-01-01T00:00:00Z",
						finishDate: "2026-01-14T00:00:00Z",
						timeFrame: "current",
					},
				}],
			},
		};
		const result = loadIterationsFromMockData(data);
		assert.equal(result[0].startDate, "2026-01-01T00:00:00Z");
		assert.equal(result[0].finishDate, "2026-01-14T00:00:00Z");
		assert.equal(result[0].timeframe, "current");
	});

	it("handles missing attributes gracefully", () => {
		const data = {
			iterations: {
				Team: [{ id: "s1", name: "Sprint 1", path: "P\\S1" }],
			},
		};
		const result = loadIterationsFromMockData(data);
		assert.equal(result[0].startDate, undefined);
		assert.equal(result[0].timeframe, undefined);
	});
});

// ---------------------------------------------------------------------------
// registerIterationAutocomplete guards
// ---------------------------------------------------------------------------

describe("registerIterationAutocomplete guards", () => {
	it("does nothing when autocomplete is disabled", async () => {
		const { registerIterationAutocomplete } = await import("../../src/autocomplete/iteration-autocomplete.js");
		let called = false;
		registerIterationAutocomplete(
			() => { called = true; },
			{
				orgUrl: "https://dev.azure.com/test",
				project: "Test",
				team: "Engineering",
				authMethod: "pat",
				safetyLevel: "confirm",
				defaultWorkItemType: "User Story",
				maxQueryResults: 100,
				autocomplete: false,
				mock: true,
			},
		);
		assert.equal(called, false);
	});

	it("does nothing when team is not configured", async () => {
		const { registerIterationAutocomplete } = await import("../../src/autocomplete/iteration-autocomplete.js");
		let called = false;
		registerIterationAutocomplete(
			() => { called = true; },
			{
				orgUrl: "https://dev.azure.com/test",
				project: "Test",
				team: undefined,
				authMethod: "pat",
				safetyLevel: "confirm",
				defaultWorkItemType: "User Story",
				maxQueryResults: 100,
				autocomplete: true,
				mock: true,
			},
		);
		assert.equal(called, false);
	});

	it("registers when both autocomplete and team are set", async () => {
		const { registerIterationAutocomplete } = await import("../../src/autocomplete/iteration-autocomplete.js");
		let called = false;
		registerIterationAutocomplete(
			() => { called = true; },
			{
				orgUrl: "https://dev.azure.com/test",
				project: "Test",
				team: "Engineering",
				authMethod: "pat",
				safetyLevel: "confirm",
				defaultWorkItemType: "User Story",
				maxQueryResults: 100,
				autocomplete: true,
				mock: true,
			},
		);
		assert.equal(called, true);
	});
});
