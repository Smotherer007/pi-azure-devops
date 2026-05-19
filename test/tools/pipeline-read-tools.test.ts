import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { type AzureDevOpsConfig } from "../../src/config/index.js";

function makeConfig(overrides: Partial<AzureDevOpsConfig> = {}): AzureDevOpsConfig {
	return {
		orgUrl: "https://dev.azure.com/testorg",
		project: "TestProject",
		authMethod: "pat",
		safetyLevel: "confirm",
		defaultWorkItemType: "User Story",
		maxQueryResults: 100,
		autocomplete: true,
		mock: false,
		...overrides,
	};
}

const mockCtx = { cwd: "/test", config: makeConfig({ mock: true }) };
const noop = undefined as any;

// ---------------------------------------------------------------------------
// azure_devops_list_pipelines
// ---------------------------------------------------------------------------

describe("azure_devops_list_pipelines (mock)", () => {
	it("returns all pipelines", async () => {
		const { listPipelinesTool } = await import("../../src/tools/list-pipelines.js");
		const result = await listPipelinesTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("CI Pipeline"));
		assert.ok(result.content[0].text.includes("Deploy Pipeline"));
		assert.ok(result.content[0].text.includes("Test Pipeline"));
	});

	it("includes mock indicator", async () => {
		const { listPipelinesTool } = await import("../../src/tools/list-pipelines.js");
		const result = await listPipelinesTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("mock"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_pipeline
// ---------------------------------------------------------------------------

describe("azure_devops_get_pipeline (mock)", () => {
	it("returns pipeline by ID", async () => {
		const { getPipelineTool } = await import("../../src/tools/get-pipeline.js");
		const result = await getPipelineTool.execute("", { pipelineId: 1, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("CI Pipeline"));
		assert.equal(result.details.pipelineId, 1);
	});

	it("returns error for unknown pipeline", async () => {
		const { getPipelineTool } = await import("../../src/tools/get-pipeline.js");
		const result = await getPipelineTool.execute("", { pipelineId: 999, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_list_runs
// ---------------------------------------------------------------------------

describe("azure_devops_list_runs (mock)", () => {
	it("returns all runs", async () => {
		const { listRunsTool } = await import("../../src/tools/list-runs.js");
		const result = await listRunsTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 5);
		assert.ok(result.content[0].text.includes("CI Pipeline"));
	});

	it("filters by pipeline", async () => {
		const { listRunsTool } = await import("../../src/tools/list-runs.js");
		const result = await listRunsTool.execute("", { pipelineId: 1, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
	});

	it("filters by status", async () => {
		const { listRunsTool } = await import("../../src/tools/list-runs.js");
		const result = await listRunsTool.execute("", { status: "inProgress", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 1);
	});

	it("filters by result", async () => {
		const { listRunsTool } = await import("../../src/tools/list-runs.js");
		const result = await listRunsTool.execute("", { result: "failed", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 1);
	});

	it("filters by branch", async () => {
		const { listRunsTool } = await import("../../src/tools/list-runs.js");
		const result = await listRunsTool.execute("", { branch: "main", mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_run
// ---------------------------------------------------------------------------

describe("azure_devops_get_run (mock)", () => {
	it("returns run by pipeline and run ID", async () => {
		const { getRunTool } = await import("../../src/tools/get-run.js");
		const result = await getRunTool.execute("", { pipelineId: 1, runId: 42, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("CI Pipeline"));
		assert.equal(result.details.runId, 42);
	});

	it("returns error for unknown run", async () => {
		const { getRunTool } = await import("../../src/tools/get-run.js");
		const result = await getRunTool.execute("", { pipelineId: 1, runId: 9999, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_run_artifacts
// ---------------------------------------------------------------------------

describe("azure_devops_get_run_artifacts (mock)", () => {
	it("returns artifacts for known run", async () => {
		const { getRunArtifactsTool } = await import("../../src/tools/get-run-artifacts.js");
		const result = await getRunArtifactsTool.execute("", { pipelineId: 1, runId: 42, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 2);
		assert.ok(result.content[0].text.includes("drop"));
		assert.ok(result.content[0].text.includes("logs"));
	});

	it("returns empty for run with no artifacts", async () => {
		const { getRunArtifactsTool } = await import("../../src/tools/get-run-artifacts.js");
		const result = await getRunArtifactsTool.execute("", { pipelineId: 1, runId: 43, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 0);
		assert.ok(result.content[0].text.includes("No artifacts"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_run_logs
// ---------------------------------------------------------------------------

describe("azure_devops_get_run_logs (mock)", () => {
	it("returns logs for known run", async () => {
		const { getRunLogsTool } = await import("../../src/tools/get-run-logs.js");
		const result = await getRunLogsTool.execute("", { pipelineId: 1, runId: 42, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("Log #1"));
		assert.ok(result.content[0].text.includes("Log #2"));
	});

	it("returns empty for run with no logs", async () => {
		const { getRunLogsTool } = await import("../../src/tools/get-run-logs.js");
		const result = await getRunLogsTool.execute("", { pipelineId: 1, runId: 43, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 0);
		assert.ok(result.content[0].text.includes("No logs"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_run_timeline
// ---------------------------------------------------------------------------

describe("azure_devops_get_run_timeline (mock)", () => {
	it("returns timeline for known run", async () => {
		const { getRunTimelineTool } = await import("../../src/tools/get-run-timeline.js");
		const result = await getRunTimelineTool.execute("", { pipelineId: 1, runId: 42, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 5);
		assert.ok(result.content[0].text.includes("Build"));
		assert.ok(result.content[0].text.includes("npm install"));
		assert.ok(result.content[0].text.includes("npm test"));
	});

	it("returns timeline for failed run", async () => {
		const { getRunTimelineTool } = await import("../../src/tools/get-run-timeline.js");
		const result = await getRunTimelineTool.execute("", { pipelineId: 1, runId: 43, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("failed") || result.content[0].text.includes("🔴"));
	});

	it("returns empty for run with no timeline", async () => {
		const { getRunTimelineTool } = await import("../../src/tools/get-run-timeline.js");
		const result = await getRunTimelineTool.execute("", { pipelineId: 2, runId: 15, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 0);
		assert.ok(result.content[0].text.includes("No timeline"));
	});
});
