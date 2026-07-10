import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { AzureDevOpsConfig } from "../../src/config/index.ts";

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

import { listTeamsTool } from "../../src/tools/list-teams.ts";
import { listBoardsTool } from "../../src/tools/list-boards.ts";
import { getBoardTool } from "../../src/tools/get-board.ts";
import { listIterationsTool } from "../../src/tools/list-iterations.ts";
import { getIterationWorkItemsTool } from "../../src/tools/get-iteration-work-items.ts";
import { getCapacityTool } from "../../src/tools/get-capacity.ts";

const noSignal = undefined as any;
const noUpdate = undefined as any;
const toolCallId = "test-call";

describe("azure_devops_list_teams edge cases", () => {
	it("returns team count in details", async () => {
		const result = await listTeamsTool.execute(
			toolCallId, { mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).count, 3);
		assert.equal((result.details as any).mock, true);
	});

	it("returns text content type", async () => {
		const result = await listTeamsTool.execute(
			toolCallId, { mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal(result.content[0].type, "text");
	});

	it("works without team in config (team is not needed)", async () => {
		const result = await listTeamsTool.execute(
			toolCallId, { mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(!result.content[0].text.includes("❌"));
	});

	it("works with team in config (ignored)", async () => {
		const result = await listTeamsTool.execute(
			toolCallId, { mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("Engineering") },
		);
		assert.ok(result.content[0].text.includes("Engineering"));
	});
});

describe("azure_devops_list_boards edge cases", () => {
	it("returns board count in details", async () => {
		const result = await listBoardsTool.execute(
			toolCallId, { team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).count, 2);
		assert.equal((result.details as any).team, "Engineering");
	});

	it("returns QA boards", async () => {
		const result = await listBoardsTool.execute(
			toolCallId, { team: "QA", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("Stories"));
		assert.equal((result.details as any).count, 1);
	});

	it("returns error for unknown team name", async () => {
		const result = await listBoardsTool.execute(
			toolCallId, { team: "NonexistentTeam", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
	});

	it("param team overrides config team", async () => {
		const result = await listBoardsTool.execute(
			toolCallId, { team: "QA", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("Engineering") },
		);
		assert.equal((result.details as any).team, "QA");
	});
});

describe("azure_devops_get_board edge cases", () => {
	it("returns Platform stories board", async () => {
		const result = await getBoardTool.execute(
			toolCallId, { boardId: "stories", team: "Platform", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("To Do"));
		assert.ok(result.content[0].text.includes("Doing"));
	});

	it("returns Engineering features board", async () => {
		const result = await getBoardTool.execute(
			toolCallId, { boardId: "features", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("Feature"));
		assert.ok(result.content[0].text.includes("In Progress"));
	});

	it("returns details in result details", async () => {
		const result = await getBoardTool.execute(
			toolCallId, { boardId: "stories", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).team, "Engineering");
		assert.equal((result.details as any).boardId, "stories");
	});

	it("param team overrides config team", async () => {
		const result = await getBoardTool.execute(
			toolCallId, { boardId: "stories", team: "Platform", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("Engineering") },
		);
		assert.ok(result.content[0].text.includes("To Do"));
	});
});

describe("azure_devops_list_iterations edge cases", () => {
	it("filters by past timeframe", async () => {
		const result = await listIterationsTool.execute(
			toolCallId, { team: "Engineering", timeframe: "past", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).count, 2);
	});

	it("filters by future timeframe", async () => {
		const result = await listIterationsTool.execute(
			toolCallId, { team: "Engineering", timeframe: "future", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).count, 2);
	});

	it("returns QA iterations", async () => {
		const result = await listIterationsTool.execute(
			toolCallId, { team: "QA", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).count, 1);
	});

	it("returns error for unknown team iterations", async () => {
		const result = await listIterationsTool.execute(
			toolCallId, { team: "NonexistentTeam", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
	});

	it("returns 0 results for timeframe with no matches", async () => {
		// QA only has a current iteration, no future
		const result = await listIterationsTool.execute(
			toolCallId, { team: "QA", timeframe: "future", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).count, 0);
	});

	it("returns iteration details", async () => {
		const result = await listIterationsTool.execute(
			toolCallId, { team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).team, "Engineering");
	});
});

describe("azure_devops_get_iteration_work_items edge cases", () => {
	it("returns sprint-4 work items", async () => {
		const result = await getIterationWorkItemsTool.execute(
			toolCallId, { iterationId: "sprint-4", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok((result.details as any).count > 0);
	});

	it("returns iteration details", async () => {
		const result = await getIterationWorkItemsTool.execute(
			toolCallId, { iterationId: "sprint-3", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).iterationId, "sprint-3");
		assert.equal((result.details as any).team, "Engineering");
	});

	it("returns Platform sprint work items", async () => {
		const result = await getIterationWorkItemsTool.execute(
			toolCallId, { iterationId: "plat-sprint-1", team: "Platform", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok((result.details as any).count > 0);
	});
});

describe("azure_devops_get_capacity edge cases", () => {
	it("returns sprint-4 capacity", async () => {
		const result = await getCapacityTool.execute(
			toolCallId, { iterationId: "sprint-4", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("Jane Developer"));
		assert.ok(text.includes("Alex Engineer"));
	});

	it("returns capacity details", async () => {
		const result = await getCapacityTool.execute(
			toolCallId, { iterationId: "sprint-3", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).team, "Engineering");
		assert.equal((result.details as any).iterationId, "sprint-3");
	});

	it("param team overrides config team", async () => {
		const result = await getCapacityTool.execute(
			toolCallId, { iterationId: "sprint-3", team: "Engineering", mock: true }, noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("Platform") },
		);
		assert.ok(result.content[0].text.includes("Jane Developer"));
	});
});
