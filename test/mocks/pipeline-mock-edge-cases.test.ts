import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	mockListRuns,
	mockGetPipeline,
	mockRunPipeline,
	mockCancelRun,
	mockRetryRun,
} from "../../src/mocks/mock-handler.js";

// ---------------------------------------------------------------------------
// Combined filter edge cases
// ---------------------------------------------------------------------------

describe("mockListRuns — combined filters", () => {
	it("pipeline + status filter", () => {
		const result = mockListRuns({ pipelineId: 1, status: "completed" });
		assert.equal(result.details.count, 2);
	});

	it("pipeline + result filter", () => {
		const result = mockListRuns({ pipelineId: 1, result: "succeeded" });
		assert.equal(result.details.count, 1);
	});

	it("no match returns zero count", () => {
		const result = mockListRuns({ pipelineId: 3, result: "failed" });
		assert.equal(result.details.count, 0);
	});

	it("pipeline 3 has one run", () => {
		const result = mockListRuns({ pipelineId: 3 });
		assert.equal(result.details.count, 1);
	});
});

// ---------------------------------------------------------------------------
// mockGetPipeline — all pipelines
// ---------------------------------------------------------------------------

describe("mockGetPipeline — all pipelines", () => {
	it("returns pipeline 1", () => {
		const result = mockGetPipeline(1);
		assert.ok(result.content[0].text.includes("azure-pipelines.yml"));
	});

	it("returns pipeline 2", () => {
		const result = mockGetPipeline(2);
		assert.ok(result.content[0].text.includes("deploy.yml"));
	});

	it("returns pipeline 3", () => {
		const result = mockGetPipeline(3);
		assert.ok(result.content[0].text.includes("tests.yml"));
	});
});

// ---------------------------------------------------------------------------
// mockRunPipeline — branch handling
// ---------------------------------------------------------------------------

describe("mockRunPipeline — branch handling", () => {
	it("uses specified branch", () => {
		const result = mockRunPipeline(1, "feature/test");
		assert.ok(result.content[0].text.includes("feature/test"));
	});

	it("defaults to main when no branch specified", () => {
		const result = mockRunPipeline(1, undefined);
		assert.ok(result.content[0].text.includes("main"));
	});
});

// ---------------------------------------------------------------------------
// mockCancelRun — state validation
// ---------------------------------------------------------------------------

describe("mockCancelRun — state validation", () => {
	it("cannot cancel succeeded run", () => {
		const result = mockCancelRun(3, 8);
		assert.ok(result.content[0].text.includes("not in progress"));
	});

	it("cannot cancel failed run", () => {
		const result = mockCancelRun(1, 43);
		assert.ok(result.content[0].text.includes("not in progress"));
	});
});

// ---------------------------------------------------------------------------
// mockRetryRun — ID calculation
// ---------------------------------------------------------------------------

describe("mockRetryRun — ID calculation", () => {
	it("adds 1000 to original run ID", () => {
		const result = mockRetryRun(1, 42);
		assert.equal(result.details.newRunId, 1042);
	});
});
