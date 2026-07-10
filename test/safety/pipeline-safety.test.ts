import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isMutationTool,
	shouldBlock,
	formatMutationSummary,
} from "../../src/safety/index.ts";

// ---------------------------------------------------------------------------
// isMutationTool — Pipeline tools
// ---------------------------------------------------------------------------

describe("isMutationTool — Pipeline tools", () => {
	const pipelineMutations = [
		"azure_devops_run_pipeline",
		"azure_devops_cancel_run",
		"azure_devops_retry_run",
	];

	for (const tool of pipelineMutations) {
		it(`identifies ${tool} as mutation`, () => {
			assert.equal(isMutationTool(tool), true);
		});
	}

	const pipelineReads = [
		"azure_devops_list_pipelines",
		"azure_devops_get_pipeline",
		"azure_devops_list_runs",
		"azure_devops_get_run",
		"azure_devops_get_run_artifacts",
		"azure_devops_get_run_logs",
		"azure_devops_get_run_timeline",
	];

	for (const tool of pipelineReads) {
		it(`does not flag ${tool} as mutation`, () => {
			assert.equal(isMutationTool(tool), false);
		});
	}
});

// ---------------------------------------------------------------------------
// shouldBlock — Pipeline tools
// ---------------------------------------------------------------------------

describe("shouldBlock — Pipeline tools", () => {
	const pipelineMutations = [
		"azure_devops_run_pipeline",
		"azure_devops_cancel_run",
		"azure_devops_retry_run",
	];

	for (const tool of pipelineMutations) {
		it(`blocks ${tool} in readonly mode`, () => {
			const result = shouldBlock("readonly", tool);
			assert.ok(result);
			assert.ok(result!.includes("blocked in readonly"));
		});

		it(`allows ${tool} in open mode`, () => {
			assert.equal(shouldBlock("open", tool), undefined);
		});

		it(`does not block ${tool} in confirm mode (interceptor handles)`, () => {
			assert.equal(shouldBlock("confirm", tool), undefined);
		});
	}

	const pipelineReads = [
		"azure_devops_list_pipelines",
		"azure_devops_get_pipeline",
		"azure_devops_list_runs",
	];

	for (const tool of pipelineReads) {
		it(`does not block read tool ${tool} in any mode`, () => {
			assert.equal(shouldBlock("readonly", tool), undefined);
			assert.equal(shouldBlock("confirm", tool), undefined);
			assert.equal(shouldBlock("open", tool), undefined);
		});
	}
});

// ---------------------------------------------------------------------------
// formatMutationSummary — Pipeline tools
// ---------------------------------------------------------------------------

describe("formatMutationSummary — Pipeline tools", () => {
	it("formats azure_devops_run_pipeline with branch", () => {
		const summary = formatMutationSummary("azure_devops_run_pipeline", {
			pipelineId: 1,
			branch: "main",
		});
		assert.ok(summary.includes("Run pipeline #1"));
		assert.ok(summary.includes("main"));
	});

	it("formats azure_devops_run_pipeline with template parameters", () => {
		const summary = formatMutationSummary("azure_devops_run_pipeline", {
			pipelineId: 2,
			branch: "release/v2",
			templateParameters: { environment: "production", region: "us-east" },
		});
		assert.ok(summary.includes("pipeline #2"));
		assert.ok(summary.includes("release/v2"));
		assert.ok(summary.includes("environment=production"));
		assert.ok(summary.includes("region=us-east"));
	});

	it("formats azure_devops_run_pipeline with no branch", () => {
		const summary = formatMutationSummary("azure_devops_run_pipeline", {
			pipelineId: 1,
		});
		assert.ok(summary.includes("(default)"));
	});

	it("formats azure_devops_cancel_run", () => {
		const summary = formatMutationSummary("azure_devops_cancel_run", {
			pipelineId: 1,
			runId: 44,
		});
		assert.ok(summary.includes("Cancel run #44"));
		assert.ok(summary.includes("pipeline #1"));
	});

	it("formats azure_devops_retry_run", () => {
		const summary = formatMutationSummary("azure_devops_retry_run", {
			pipelineId: 1,
			runId: 43,
		});
		assert.ok(summary.includes("Retry run #43"));
		assert.ok(summary.includes("pipeline #1"));
	});
});
