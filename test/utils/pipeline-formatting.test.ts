import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	formatPipeline,
	formatPipelineList,
	formatRun,
	formatRunList,
	formatArtifact,
	formatArtifactList,
	formatTimeline,
	formatDuration,
} from "../../src/utils/formatting.js";

// ---------------------------------------------------------------------------
// formatPipeline
// ---------------------------------------------------------------------------

describe("formatPipeline", () => {
	it("formats a complete pipeline", () => {
		const result = formatPipeline({
			id: 1,
			name: "CI Pipeline",
			folder: "\\",
			configuration: {
				type: "yaml",
				path: "azure-pipelines.yml",
				repository: { name: "webapp" },
			},
			url: "https://dev.azure.com/test/_apis/pipelines/1",
		});
		assert.ok(result.includes("CI Pipeline"));
		assert.ok(result.includes("id: 1"));
		assert.ok(result.includes("yaml"));
		assert.ok(result.includes("azure-pipelines.yml"));
		assert.ok(result.includes("webapp"));
	});

	it("handles missing fields", () => {
		const result = formatPipeline({});
		assert.ok(result.includes("Unknown"));
	});
});

// ---------------------------------------------------------------------------
// formatPipelineList
// ---------------------------------------------------------------------------

describe("formatPipelineList", () => {
	it("formats multiple pipelines", () => {
		const result = formatPipelineList([
			{ id: 1, name: "CI" },
			{ id: 2, name: "Deploy" },
		]);
		assert.ok(result.includes("CI"));
		assert.ok(result.includes("Deploy"));
	});

	it("returns empty message for no pipelines", () => {
		const result = formatPipelineList([]);
		assert.equal(result, "No pipelines found.");
	});
});

// ---------------------------------------------------------------------------
// formatRun
// ---------------------------------------------------------------------------

describe("formatRun", () => {
	it("formats a completed succeeded run", () => {
		const result = formatRun({
			id: 42,
			pipeline: { id: 1, name: "CI Pipeline" },
			state: "completed",
			result: "succeeded",
			createdDate: "2024-01-15T10:00:00Z",
			finishedDate: "2024-01-15T10:12:30Z",
			resources: {
				repositories: {
					self: { refName: "refs/heads/main" },
				},
			},
		});
		assert.ok(result.includes("Run #42"));
		assert.ok(result.includes("CI Pipeline"));
		assert.ok(result.includes("completed"));
		assert.ok(result.includes("succeeded"));
		assert.ok(result.includes("main"));
	});

	it("formats an in-progress run", () => {
		const result = formatRun({
			id: 44,
			pipeline: { id: 1, name: "CI Pipeline" },
			state: "inProgress",
			result: null,
		});
		assert.ok(result.includes("inProgress"));
		assert.ok(!result.includes("Result"));
	});

	it("includes template parameters", () => {
		const result = formatRun({
			id: 15,
			templateParameters: { environment: "production" },
		});
		assert.ok(result.includes("environment=production"));
	});
});

// ---------------------------------------------------------------------------
// formatRunList
// ---------------------------------------------------------------------------

describe("formatRunList", () => {
	it("formats multiple runs", () => {
		const result = formatRunList([
			{
				id: 42,
				pipeline: { name: "CI" },
				state: "completed",
				result: "succeeded",
				createdDate: "2024-01-15T10:00:00Z",
				finishedDate: "2024-01-15T10:12:30Z",
			},
			{
				id: 43,
				pipeline: { name: "CI" },
				state: "completed",
				result: "failed",
				createdDate: "2024-01-15T14:00:00Z",
				finishedDate: "2024-01-15T14:08:45Z",
			},
		]);
		assert.ok(result.includes("#42"));
		assert.ok(result.includes("#43"));
		assert.ok(result.includes("succeeded"));
		assert.ok(result.includes("failed"));
	});

	it("returns empty message for no runs", () => {
		const result = formatRunList([]);
		assert.equal(result, "No runs found.");
	});
});

// ---------------------------------------------------------------------------
// formatArtifact / formatArtifactList
// ---------------------------------------------------------------------------

describe("formatArtifact", () => {
	it("formats a complete artifact", () => {
		const result = formatArtifact({
			id: 1,
			name: "drop",
			resource: {
				type: "FilePath",
				data: "\\\\server\\drops\\42",
				url: "https://dev.azure.com/test/artifacts",
			},
		});
		assert.ok(result.includes("drop"));
		assert.ok(result.includes("FilePath"));
	});
});

describe("formatArtifactList", () => {
	it("formats multiple artifacts", () => {
		const result = formatArtifactList([
			{ id: 1, name: "drop" },
			{ id: 2, name: "logs" },
		]);
		assert.ok(result.includes("drop"));
		assert.ok(result.includes("logs"));
	});

	it("returns empty message for no artifacts", () => {
		const result = formatArtifactList([]);
		assert.equal(result, "No artifacts found.");
	});
});

// ---------------------------------------------------------------------------
// formatTimeline
// ---------------------------------------------------------------------------

describe("formatTimeline", () => {
	it("formats a complete timeline", () => {
		const result = formatTimeline({
			records: [
				{
					id: "stage-1",
					parentId: null,
					type: "Stage",
					name: "Build",
					order: 1,
					state: "completed",
					result: "succeeded",
					startTime: "2024-01-15T10:00:05Z",
					finishTime: "2024-01-15T10:12:30Z",
					errorCount: 0,
					warningCount: 0,
				},
				{
					id: "job-1",
					parentId: "stage-1",
					type: "Job",
					name: "Build Job",
					order: 1,
					state: "completed",
					result: "succeeded",
					startTime: "2024-01-15T10:00:10Z",
					finishTime: "2024-01-15T10:12:25Z",
				},
			],
		});
		assert.ok(result.includes("Build"));
		assert.ok(result.includes("Build Job"));
	});

	it("returns empty message for no records", () => {
		const result = formatTimeline({ records: [] });
		assert.equal(result, "No timeline records.");
	});

	it("shows error/warning counts", () => {
		const result = formatTimeline({
			records: [
				{
					id: "t-1",
					type: "Task",
					name: "Test",
					order: 1,
					state: "completed",
					result: "failed",
					errorCount: 2,
					warningCount: 1,
				},
			],
		});
		assert.ok(result.includes("2 error(s)"));
		assert.ok(result.includes("1 warning(s)"));
	});
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe("formatDuration", () => {
	it("returns seconds for short durations", () => {
		const result = formatDuration("2024-01-15T10:00:00Z", "2024-01-15T10:00:30Z");
		assert.equal(result, "30s");
	});

	it("returns minutes and seconds", () => {
		const result = formatDuration("2024-01-15T10:00:00Z", "2024-01-15T10:12:30Z");
		assert.equal(result, "12m 30s");
	});

	it("returns hours and minutes", () => {
		const result = formatDuration("2024-01-15T10:00:00Z", "2024-01-15T12:30:00Z");
		assert.equal(result, "2h 30m");
	});

	it("returns ? for missing start date", () => {
		const result = formatDuration(undefined, "2024-01-15T10:00:00Z");
		assert.equal(result, "?");
	});
});
