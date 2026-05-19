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
// azure_devops_list_runs — combined filters
// ---------------------------------------------------------------------------

describe("azure_devops_list_runs edge cases (mock)", () => {
	it("filters by pipeline + status together", async () => {
		const { listRunsTool } = await import("../../src/tools/list-runs.js");
		const result = await listRunsTool.execute(
			"",
			{ pipelineId: 1, status: "completed", mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.equal(result.details.count, 2);
	});

	it("filters by pipeline + result together", async () => {
		const { listRunsTool } = await import("../../src/tools/list-runs.js");
		const result = await listRunsTool.execute(
			"",
			{ pipelineId: 1, result: "succeeded", mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.equal(result.details.count, 1);
	});

	it("returns empty for non-existent pipeline", async () => {
		const { listRunsTool } = await import("../../src/tools/list-runs.js");
		const result = await listRunsTool.execute(
			"",
			{ pipelineId: 9999, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.equal(result.details.count, 0);
	});

	it("filters by branch with refs/heads prefix", async () => {
		const { listRunsTool } = await import("../../src/tools/list-runs.js");
		const result = await listRunsTool.execute(
			"",
			{ branch: "refs/heads/main", mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.equal(result.details.count, 3);
	});

	it("filters by feature branch", async () => {
		const { listRunsTool } = await import("../../src/tools/list-runs.js");
		const result = await listRunsTool.execute(
			"",
			{ branch: "feature/login", mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.equal(result.details.count, 1);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_run — edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_get_run edge cases (mock)", () => {
	it("returns error for wrong pipeline ID", async () => {
		const { getRunTool } = await import("../../src/tools/get-run.js");
		const result = await getRunTool.execute(
			"",
			{ pipelineId: 2, runId: 42, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_pipeline — edge cases
// ---------------------------------------------------------------------------

describe("azure_devops_get_pipeline edge cases (mock)", () => {
	it("returns pipeline 2 details", async () => {
		const { getPipelineTool } = await import("../../src/tools/get-pipeline.js");
		const result = await getPipelineTool.execute(
			"",
			{ pipelineId: 2, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Deploy Pipeline"));
		assert.ok(result.content[0].text.includes("deploy.yml"));
	});

	it("returns pipeline 3 details", async () => {
		const { getPipelineTool } = await import("../../src/tools/get-pipeline.js");
		const result = await getPipelineTool.execute(
			"",
			{ pipelineId: 3, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Test Pipeline"));
		assert.ok(result.content[0].text.includes("api-service"));
	});
});
