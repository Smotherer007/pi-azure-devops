import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AzureDevOpsConfig } from "../../src/config/index.js";

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

import { setBoardColumnsTool } from "../../src/tools/set-board-columns.js";
import { setIterationTool } from "../../src/tools/set-iteration.js";
import { setCapacityTool } from "../../src/tools/set-capacity.js";

const noSignal = undefined as any;
const noUpdate = undefined as any;
const toolCallId = "test-call";

describe("azure_devops_set_board_columns (mock)", () => {
	it("updates columns and returns confirmation", async () => {
		const result = await setBoardColumnsTool.execute(
			toolCallId,
			{
				boardId: "stories",
				team: "Engineering",
				columns: [
					{ name: "Todo", itemLimit: 5 },
					{ name: "In Progress", itemLimit: 3 },
					{ name: "Done" },
				],
				mock: true,
			},
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("✅"));
		assert.ok(text.includes("Todo → In Progress → Done"));
		assert.ok(text.includes("mock data"));
	});

	it("uses team from config", async () => {
		const result = await setBoardColumnsTool.execute(
			toolCallId,
			{
				boardId: "stories",
				columns: [{ name: "New" }, { name: "Closed" }],
				mock: true,
			},
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("Platform") },
		);
		assert.ok(result.content[0].text.includes("✅"));
	});

	it("returns error when no team", async () => {
		const result = await setBoardColumnsTool.execute(
			toolCallId,
			{ boardId: "stories", columns: [{ name: "New" }], mock: true },
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
		assert.ok(result.content[0].text.includes("No team specified"));
	});
});

describe("azure_devops_set_iteration (mock)", () => {
	it("adds iteration and returns confirmation", async () => {
		const result = await setIterationTool.execute(
			toolCallId,
			{ iterationId: "sprint-6", operation: "add", team: "Engineering", mock: true },
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("✅"));
		assert.ok(text.includes("Added"));
		assert.ok(text.includes("sprint-6"));
		assert.ok(text.includes("Engineering"));
	});

	it("removes iteration and returns confirmation", async () => {
		const result = await setIterationTool.execute(
			toolCallId,
			{ iterationId: "sprint-1", operation: "remove", team: "Platform", mock: true },
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("✅"));
		assert.ok(text.includes("Removed"));
		assert.ok(text.includes("sprint-1"));
		assert.ok(text.includes("Platform"));
	});

	it("uses team from config", async () => {
		const result = await setIterationTool.execute(
			toolCallId,
			{ iterationId: "sprint-2", operation: "add", mock: true },
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("QA") },
		);
		assert.ok(result.content[0].text.includes("QA"));
	});

	it("returns error when no team", async () => {
		const result = await setIterationTool.execute(
			toolCallId,
			{ iterationId: "sprint-2", operation: "add", mock: true },
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
	});
});

describe("azure_devops_set_capacity (mock)", () => {
	it("sets capacity and returns confirmation", async () => {
		const result = await setCapacityTool.execute(
			toolCallId,
			{
				iterationId: "sprint-3",
				team: "Engineering",
				capacities: [
					{
						teamMemberId: "jane@contoso.com",
						activities: [
							{ name: "Development", capacityPerDay: 6 },
							{ name: "Code Review", capacityPerDay: 1 },
						],
						daysOff: [{ start: "2026-04-25T00:00:00Z", end: "2026-04-25T00:00:00Z" }],
					},
					{
						teamMemberId: "alex@contoso.com",
						activities: [{ name: "Development", capacityPerDay: 7 }],
					},
				],
				mock: true,
			},
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("✅"));
		assert.ok(text.includes("2"));
		assert.ok(text.includes("mock data"));
	});

	it("uses team from config", async () => {
		const result = await setCapacityTool.execute(
			toolCallId,
			{
				iterationId: "sprint-1",
				capacities: [
					{
						teamMemberId: "user@test.com",
						activities: [{ name: "Testing", capacityPerDay: 8 }],
					},
				],
				mock: true,
			},
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("QA") },
		);
		assert.ok(result.content[0].text.includes("✅"));
	});

	it("returns error when no team", async () => {
		const result = await setCapacityTool.execute(
			toolCallId,
			{
				iterationId: "sprint-3",
				capacities: [{ teamMemberId: "user@test.com", activities: [{ name: "Dev", capacityPerDay: 8 }] }],
				mock: true,
			},
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("❌"));
	});

	it("handles empty capacities array", async () => {
		const result = await setCapacityTool.execute(
			toolCallId,
			{ iterationId: "sprint-3", team: "Engineering", capacities: [], mock: true },
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		const text = result.content[0].text;
		assert.ok(text.includes("✅"));
		assert.ok(text.includes("0"));
	});
});
