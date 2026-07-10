import { describe, it } from "node:test";
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

import { setBoardColumnsTool } from "../../src/tools/set-board-columns.ts";
import { setIterationTool } from "../../src/tools/set-iteration.ts";
import { setCapacityTool } from "../../src/tools/set-capacity.ts";

const noSignal = undefined as any;
const noUpdate = undefined as any;
const toolCallId = "test-call";

describe("azure_devops_set_board_columns edge cases", () => {
	it("returns details with team and boardId", async () => {
		const result = await setBoardColumnsTool.execute(
			toolCallId,
			{ boardId: "stories", team: "Engineering", columns: [{ name: "New" }, { name: "Done" }], mock: true },
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).team, "Engineering");
		assert.equal((result.details as any).boardId, "stories");
	});

	it("handles single column", async () => {
		const result = await setBoardColumnsTool.execute(
			toolCallId,
			{ boardId: "stories", team: "Engineering", columns: [{ name: "All" }], mock: true },
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("All"));
	});

	it("handles columns with state mappings", async () => {
		const result = await setBoardColumnsTool.execute(
			toolCallId,
			{
				boardId: "stories",
				team: "Engineering",
				columns: [
					{ name: "New", stateMappings: { "User Story": "New", "Bug": "New" } },
					{ name: "Done", stateMappings: { "User Story": "Closed", "Bug": "Closed" } },
				],
				mock: true,
			},
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("✅"));
	});

	it("param team overrides config team", async () => {
		const result = await setBoardColumnsTool.execute(
			toolCallId,
			{ boardId: "stories", team: "QA", columns: [{ name: "New" }], mock: true },
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("Engineering") },
		);
		assert.ok(result.content[0].text.includes("✅"));
		assert.ok(result.content[0].text.includes("QA"));
	});
});

describe("azure_devops_set_iteration edge cases", () => {
	it("returns details with operation", async () => {
		const result = await setIterationTool.execute(
			toolCallId,
			{ iterationId: "sprint-3", operation: "add", team: "Engineering", mock: true },
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).operation, "add");
		assert.equal((result.details as any).iterationId, "sprint-3");
	});

	it("param team overrides config team", async () => {
		const result = await setIterationTool.execute(
			toolCallId,
			{ iterationId: "sprint-1", operation: "remove", team: "Platform", mock: true },
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("Engineering") },
		);
		assert.ok(result.content[0].text.includes("Platform"));
	});
});

describe("azure_devops_set_capacity edge cases", () => {
	it("returns details with member count", async () => {
		const result = await setCapacityTool.execute(
			toolCallId,
			{
				iterationId: "sprint-3",
				team: "Engineering",
				capacities: [
					{ teamMemberId: "user1", activities: [{ name: "Dev", capacityPerDay: 6 }] },
					{ teamMemberId: "user2", activities: [{ name: "Dev", capacityPerDay: 5 }] },
				],
				mock: true,
			},
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.equal((result.details as any).memberCount, 2);
	});

	it("handles member with multiple activities and days off", async () => {
		const result = await setCapacityTool.execute(
			toolCallId,
			{
				iterationId: "sprint-3",
				team: "Engineering",
				capacities: [{
					teamMemberId: "jane@contoso.com",
					activities: [
						{ name: "Development", capacityPerDay: 4 },
						{ name: "Code Review", capacityPerDay: 2 },
						{ name: "Mentoring", capacityPerDay: 1 },
					],
					daysOff: [
						{ start: "2026-04-25T00:00:00Z", end: "2026-04-25T00:00:00Z" },
						{ start: "2026-04-28T00:00:00Z", end: "2026-04-29T00:00:00Z" },
					],
				}],
				mock: true,
			},
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig() },
		);
		assert.ok(result.content[0].text.includes("✅"));
	});

	it("param team overrides config team", async () => {
		const result = await setCapacityTool.execute(
			toolCallId,
			{
				iterationId: "sprint-3",
				team: "QA",
				capacities: [{ teamMemberId: "user1", activities: [{ name: "Testing", capacityPerDay: 8 }] }],
				mock: true,
			},
			noSignal, noUpdate,
			{ cwd: "/tmp", config: mockConfig("Engineering") },
		);
		assert.ok(result.content[0].text.includes("✅"));
	});
});
