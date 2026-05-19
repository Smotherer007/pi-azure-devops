import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	formatPipeline,
	formatRun,
	formatRunList,
	formatTimeline,
	formatDuration,
	formatTimelineRecord,
} from "../../src/utils/formatting.js";

// ---------------------------------------------------------------------------
// formatPipeline — edge cases
// ---------------------------------------------------------------------------

describe("formatPipeline edge cases", () => {
	it("handles pipeline with no configuration", () => {
		const result = formatPipeline({ id: 5, name: "Simple" });
		assert.ok(result.includes("Simple"));
		assert.ok(result.includes("id: 5"));
	});

	it("handles pipeline with empty configuration", () => {
		const result = formatPipeline({ id: 5, name: "Simple", configuration: {} });
		assert.ok(result.includes("?"));
	});
});

// ---------------------------------------------------------------------------
// formatRun — edge cases
// ---------------------------------------------------------------------------

describe("formatRun edge cases", () => {
	it("handles run with no pipeline info", () => {
		const result = formatRun({ id: 1, state: "completed" });
		assert.ok(result.includes("Run #1"));
		assert.ok(result.includes("?"));
	});

	it("handles run with empty template parameters", () => {
		const result = formatRun({ id: 1, templateParameters: {} });
		assert.ok(!result.includes("Parameters"));
	});

	it("handles cancelling state", () => {
		const result = formatRun({ id: 1, state: "cancelling" });
		assert.ok(result.includes("cancelling"));
	});
});

// ---------------------------------------------------------------------------
// formatRunList — edge cases
// ---------------------------------------------------------------------------

describe("formatRunList edge cases", () => {
	it("handles runs with no result", () => {
		const result = formatRunList([
			{ id: 44, pipeline: { name: "CI" }, state: "inProgress", result: null },
		]);
		assert.ok(result.includes("inProgress"));
	});
});

// ---------------------------------------------------------------------------
// formatTimeline — edge cases
// ---------------------------------------------------------------------------

describe("formatTimeline edge cases", () => {
	it("handles undefined records", () => {
		const result = formatTimeline({});
		assert.equal(result, "No timeline records.");
	});

	it("sorts by order", () => {
		const result = formatTimeline({
			records: [
				{ id: "b", order: 2, type: "Task", name: "Second" },
				{ id: "a", order: 1, type: "Task", name: "First" },
			],
		});
		const lines = result.split("\n");
		assert.ok(lines[0].includes("First"));
		assert.ok(lines[1].includes("Second"));
	});
});

// ---------------------------------------------------------------------------
// formatTimelineRecord — edge cases
// ---------------------------------------------------------------------------

describe("formatTimelineRecord edge cases", () => {
	it("handles missing name and type", () => {
		const result = formatTimelineRecord({});
		assert.ok(result.includes("?"));
	});

	it("shows result icon for failed", () => {
		const result = formatTimelineRecord({
			name: "Test",
			type: "Task",
			result: "failed",
			startTime: "2024-01-15T10:00:00Z",
			finishTime: "2024-01-15T10:05:00Z",
		});
		assert.ok(result.includes("🔴"));
	});

	it("shows state icon for in-progress", () => {
		const result = formatTimelineRecord({
			name: "Test",
			type: "Task",
			state: "inProgress",
		});
		assert.ok(result.includes("⏳"));
	});
});

// ---------------------------------------------------------------------------
// formatDuration — edge cases
// ---------------------------------------------------------------------------

describe("formatDuration edge cases", () => {
	it("returns 0s for same timestamps", () => {
		const result = formatDuration("2024-01-15T10:00:00Z", "2024-01-15T10:00:00Z");
		assert.equal(result, "0s");
	});

	it("handles null finishedDate (in-progress)", () => {
		const result = formatDuration("2024-01-15T10:00:00Z", null);
		assert.ok(result.includes("m") || result.includes("h") || result.includes("s"));
	});
});
