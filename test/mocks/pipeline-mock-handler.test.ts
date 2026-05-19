import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	mockListPipelines,
	mockGetPipeline,
	mockListRuns,
	mockGetRun,
	mockGetRunArtifacts,
	mockGetRunLogs,
	mockGetRunTimeline,
	mockRunPipeline,
	mockCancelRun,
	mockRetryRun,
} from "../../src/mocks/mock-handler.js";

// ---------------------------------------------------------------------------
// mockListPipelines
// ---------------------------------------------------------------------------

describe("mockListPipelines", () => {
	it("returns all pipelines", () => {
		const result = mockListPipelines();
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("CI Pipeline"));
		assert.ok(result.content[0].text.includes("Deploy Pipeline"));
		assert.ok(result.content[0].text.includes("Test Pipeline"));
	});
});

// ---------------------------------------------------------------------------
// mockGetPipeline
// ---------------------------------------------------------------------------

describe("mockGetPipeline", () => {
	it("returns pipeline by ID", () => {
		const result = mockGetPipeline(1);
		assert.ok(result.content[0].text.includes("CI Pipeline"));
		assert.equal(result.details.pipelineId, 1);
	});

	it("returns error for unknown ID", () => {
		const result = mockGetPipeline(999);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// mockListRuns
// ---------------------------------------------------------------------------

describe("mockListRuns", () => {
	it("returns all runs without filter", () => {
		const result = mockListRuns();
		assert.equal(result.details.count, 5);
	});

	it("filters by pipeline ID", () => {
		const result = mockListRuns({ pipelineId: 1 });
		assert.equal(result.details.count, 3);
	});

	it("filters by status", () => {
		const result = mockListRuns({ status: "inProgress" });
		assert.equal(result.details.count, 1);
	});

	it("filters by result", () => {
		const result = mockListRuns({ result: "failed" });
		assert.equal(result.details.count, 1);
	});

	it("filters by branch", () => {
		const result = mockListRuns({ branch: "main" });
		assert.equal(result.details.count, 3);
	});

	it("filters by branch with refs prefix", () => {
		const result = mockListRuns({ branch: "refs/heads/develop" });
		assert.equal(result.details.count, 1);
	});
});

// ---------------------------------------------------------------------------
// mockGetRun
// ---------------------------------------------------------------------------

describe("mockGetRun", () => {
	it("returns run by pipeline and run ID", () => {
		const result = mockGetRun(1, 42);
		assert.ok(result.content[0].text.includes("CI Pipeline"));
		assert.equal(result.details.runId, 42);
	});

	it("returns error for unknown run", () => {
		const result = mockGetRun(1, 9999);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});

	it("returns error when run exists in different pipeline", () => {
		const result = mockGetRun(2, 42);
		assert.ok(result.content[0].text.includes("not found"));
	});
});

// ---------------------------------------------------------------------------
// mockGetRunArtifacts
// ---------------------------------------------------------------------------

describe("mockGetRunArtifacts", () => {
	it("returns artifacts for run with artifacts", () => {
		const result = mockGetRunArtifacts(1, 42);
		assert.equal(result.details.count, 2);
		assert.ok(result.content[0].text.includes("drop"));
	});

	it("returns empty for run without artifacts", () => {
		const result = mockGetRunArtifacts(1, 43);
		assert.equal(result.details.count, 0);
		assert.ok(result.content[0].text.includes("No artifacts"));
	});
});

// ---------------------------------------------------------------------------
// mockGetRunLogs
// ---------------------------------------------------------------------------

describe("mockGetRunLogs", () => {
	it("returns logs for run with logs", () => {
		const result = mockGetRunLogs(1, 42);
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("Log #1"));
	});

	it("returns empty for run without logs", () => {
		const result = mockGetRunLogs(1, 43);
		assert.equal(result.details.count, 0);
		assert.ok(result.content[0].text.includes("No logs"));
	});
});

// ---------------------------------------------------------------------------
// mockGetRunTimeline
// ---------------------------------------------------------------------------

describe("mockGetRunTimeline", () => {
	it("returns timeline for succeeded run", () => {
		const result = mockGetRunTimeline(1, 42);
		assert.equal(result.details.count, 5);
		assert.ok(result.content[0].text.includes("Build"));
	});

	it("returns timeline for failed run", () => {
		const result = mockGetRunTimeline(1, 43);
		assert.equal(result.details.count, 3);
	});

	it("returns empty for run without timeline", () => {
		const result = mockGetRunTimeline(2, 15);
		assert.equal(result.details.count, 0);
		assert.ok(result.content[0].text.includes("No timeline"));
	});
});

// ---------------------------------------------------------------------------
// mockRunPipeline
// ---------------------------------------------------------------------------

describe("mockRunPipeline", () => {
	it("returns new run for known pipeline", () => {
		const result = mockRunPipeline(1);
		assert.ok(result.content[0].text.includes("Queued"));
		assert.ok(result.content[0].text.includes("CI Pipeline"));
		assert.equal(result.details.pipelineId, 1);
	});

	it("returns error for unknown pipeline", () => {
		const result = mockRunPipeline(999);
		assert.ok(result.content[0].text.includes("not found"));
	});

	it("includes template parameters", () => {
		const result = mockRunPipeline(2, "main", { environment: "prod" });
		assert.ok(result.content[0].text.includes("environment=prod"));
	});

	it("defaults to main branch", () => {
		const result = mockRunPipeline(1);
		assert.ok(result.content[0].text.includes("main"));
	});
});

// ---------------------------------------------------------------------------
// mockCancelRun
// ---------------------------------------------------------------------------

describe("mockCancelRun", () => {
	it("cancels in-progress run", () => {
		const result = mockCancelRun(1, 44);
		assert.ok(result.content[0].text.includes("Cancelled"));
		assert.ok(result.content[0].text.includes("cancelling"));
	});

	it("returns error for completed run", () => {
		const result = mockCancelRun(1, 42);
		assert.ok(result.content[0].text.includes("not in progress"));
	});

	it("returns error for unknown run", () => {
		const result = mockCancelRun(1, 9999);
		assert.ok(result.content[0].text.includes("not found"));
	});
});

// ---------------------------------------------------------------------------
// mockRetryRun
// ---------------------------------------------------------------------------

describe("mockRetryRun", () => {
	it("retries a run and returns new ID", () => {
		const result = mockRetryRun(1, 43);
		assert.ok(result.content[0].text.includes("Retried"));
		assert.equal(result.details.originalRunId, 43);
		assert.equal(result.details.newRunId, 1043);
	});

	it("returns error for unknown run", () => {
		const result = mockRetryRun(1, 9999);
		assert.ok(result.content[0].text.includes("not found"));
	});
});
