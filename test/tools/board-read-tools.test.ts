import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { resolveConfig, type AzureDevOpsConfig } from "../../src/config/index.ts";

// Build a mock config with team set
function mockConfig(team?: string): AzureDevOpsConfig {
	return {
		orgUrl: "https://dev.azure.com/testorg",
		project: "TestProject",
		team,
		authMethod: "pat",
		safetyLevel: "confirm",
		defaultWorkItemType: "User Story",
		maxQueryResults: 100,
		autocomplete: true,
		mock: true,
	};
}

// Import tools — they all support mock mode
import { listTeamsTool } from "../../src/tools/list-teams.ts";
import { listBoardsTool } from "../../src/tools/list-boards.ts";
import { getBoardTool } from "../../src/tools/get-board.ts";
import { listIterationsTool } from "../../src/tools/list-iterations.ts";
import { getIterationWorkItemsTool } from "../../src/tools/get-iteration-work-items.ts";
import { getCapacityTool } from "../../src/tools/get-capacity.ts";

const noSignal = undefined as any;
const noUpdate = undefined as any;
const toolCallId = "test-call";

describe("azure_devops_list_teams (mock)", () => {
	it("returns all teams", async () => {
		const result = await listTeamsTool.execute(
			toolCallId, { mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("Engineering"));
		assert.ok(text.includes("Platform"));
		assert.ok(text.includes("QA"));
		assert.ok(text.includes("mock mode"));
	});
});

describe("azure_devops_list_boards (mock)", () => {
	it("returns boards when team provided via param", async () => {
		const result = await listBoardsTool.execute(
			toolCallId, { team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("Stories"));
		assert.ok(text.includes("Features"));
	});

	it("returns boards when team from config", async () => {
		const result = await listBoardsTool.execute(
			toolCallId, { mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("Platform") },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("Epics"));
	});

	it("returns error when no team available", async () => {
		const result = await listBoardsTool.execute(
			toolCallId, { mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
		assert.ok(result.content[0].text.includes("No team specified"));
	});
});

describe("azure_devops_get_board (mock)", () => {
	it("returns board detail with columns", async () => {
		const result = await getBoardTool.execute(
			toolCallId, { boardId: "stories", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("New"));
		assert.ok(text.includes("Active"));
		assert.ok(text.includes("Closed"));
		assert.ok(text.includes("Mappings"));
	});

	it("returns error for unknown board", async () => {
		const result = await getBoardTool.execute(
			toolCallId, { boardId: "nonexistent", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
	});

	it("returns error when no team", async () => {
		const result = await getBoardTool.execute(
			toolCallId, { boardId: "stories", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
	});
});

describe("azure_devops_list_iterations (mock)", () => {
	it("returns all iterations for a team", async () => {
		const result = await listIterationsTool.execute(
			toolCallId, { team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("Sprint 1"));
		assert.ok(text.includes("Sprint 5"));
	});

	it("filters by current timeframe", async () => {
		const result = await listIterationsTool.execute(
			toolCallId, { team: "Engineering", timeframe: "current", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("Sprint 3"));
		assert.ok(!text.includes("Sprint 1"));
	});

	it("uses team from config", async () => {
		const result = await listIterationsTool.execute(
			toolCallId, { mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("Platform") },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("Platform Sprint"));
	});

	it("returns error when no team", async () => {
		const result = await listIterationsTool.execute(
			toolCallId, { mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
	});
});

describe("azure_devops_get_iteration_work_items (mock)", () => {
	it("returns work items for a sprint", async () => {
		const result = await getIterationWorkItemsTool.execute(
			toolCallId, { iterationId: "sprint-3", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("mock mode"));
		assert.ok((result.details as any).count > 0);
	});

	it("returns empty for sprint with no items", async () => {
		const result = await getIterationWorkItemsTool.execute(
			toolCallId, { iterationId: "sprint-1", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("No work items"));
	});

	it("returns error when no team", async () => {
		const result = await getIterationWorkItemsTool.execute(
			toolCallId, { iterationId: "sprint-3", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
	});
});

describe("azure_devops_get_capacity (mock)", () => {
	it("returns capacity with team members", async () => {
		const result = await getCapacityTool.execute(
			toolCallId, { iterationId: "sprint-3", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("Jane Developer"));
		assert.ok(text.includes("Alex Engineer"));
		assert.ok(text.includes("Sam DevOps"));
	});

	it("returns error for unknown iteration", async () => {
		const result = await getCapacityTool.execute(
			toolCallId, { iterationId: "sprint-x", team: "Unknown", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
	});

	it("returns error when no team", async () => {
		const result = await getCapacityTool.execute(
			toolCallId, { iterationId: "sprint-3", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
	});
});
