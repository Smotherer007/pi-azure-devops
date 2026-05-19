import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	formatTeam,
	formatTeamList,
	formatBoardRef,
	formatBoardList,
	formatBoard,
	formatIteration,
	formatIterationList,
	formatCapacity,
} from "../../src/utils/formatting.js";

describe("formatTeam", () => {
	it("formats team with all fields", () => {
		const result = formatTeam({ id: "t1", name: "Engineering", description: "Core team", url: "https://example.com" });
		assert.ok(result.includes("Engineering"));
		assert.ok(result.includes("t1"));
		assert.ok(result.includes("Core team"));
		assert.ok(result.includes("https://example.com"));
	});

	it("handles missing fields", () => {
		const result = formatTeam({});
		assert.ok(result.includes("Unknown"));
	});
});

describe("formatTeamList", () => {
	it("formats multiple teams", () => {
		const result = formatTeamList([
			{ id: "t1", name: "Engineering" },
			{ id: "t2", name: "QA" },
		]);
		assert.ok(result.includes("Engineering"));
		assert.ok(result.includes("QA"));
	});

	it("returns message for empty list", () => {
		assert.equal(formatTeamList([]), "No teams found.");
	});
});

describe("formatBoardRef", () => {
	it("formats board reference with URL", () => {
		const result = formatBoardRef({ id: "stories", name: "Stories", url: "https://example.com" });
		assert.ok(result.includes("Stories"));
		assert.ok(result.includes("stories"));
		assert.ok(result.includes("https://example.com"));
	});

	it("handles missing fields", () => {
		const result = formatBoardRef({});
		assert.ok(result.includes("Unknown"));
	});
});

describe("formatBoardList", () => {
	it("formats multiple boards", () => {
		const result = formatBoardList([
			{ id: "stories", name: "Stories" },
			{ id: "features", name: "Features" },
		]);
		assert.ok(result.includes("Stories"));
		assert.ok(result.includes("Features"));
	});

	it("returns message for empty list", () => {
		assert.equal(formatBoardList([]), "No boards found.");
	});
});

describe("formatBoard", () => {
	it("formats full board with columns and state mappings", () => {
		const result = formatBoard({
			id: "stories",
			name: "Stories",
			canEdit: true,
			columns: [
				{
					id: "col-1",
					name: "New",
					columnType: 0,
					itemLimit: 10,
					stateMappings: { "User Story": "New", "Bug": "New" },
				},
				{
					id: "col-2",
					name: "Active",
					columnType: 1,
					itemLimit: 5,
					stateMappings: { "User Story": "Active" },
				},
				{
					id: "col-3",
					name: "Closed",
					columnType: 2,
					itemLimit: null,
					stateMappings: { "User Story": "Closed" },
				},
			],
			rows: [{ id: "r1", name: "" }],
			url: "https://example.com",
		});

		assert.ok(result.includes("Board: Stories"));
		assert.ok(result.includes("**Editable:** Yes"));
		assert.ok(result.includes("New"));
		assert.ok(result.includes("Incoming"));
		assert.ok(result.includes("Active"));
		assert.ok(result.includes("InProgress"));
		assert.ok(result.includes("Closed"));
		assert.ok(result.includes("Outgoing"));
		assert.ok(result.includes("limit: 10"));
		assert.ok(result.includes("User Story → New"));
		assert.ok(result.includes("Rows"));
		assert.ok(result.includes("URL"));
	});

	it("handles board with no columns or rows", () => {
		const result = formatBoard({ id: "x", name: "Empty Board" });
		assert.ok(result.includes("Empty Board"));
		assert.ok(!result.includes("Columns"));
	});

	it("handles column with no state mappings", () => {
		const result = formatBoard({
			columns: [{ name: "Todo", columnType: 0 }],
		});
		assert.ok(result.includes("Todo"));
		assert.ok(!result.includes("Mappings"));
	});
});

describe("formatIteration", () => {
	it("formats iteration with dates and timeframe", () => {
		const result = formatIteration({
			id: "sprint-1",
			name: "Sprint 1",
			path: "Project\\Sprint 1",
			attributes: {
				startDate: "2026-04-06T00:00:00Z",
				finishDate: "2026-04-19T00:00:00Z",
				timeFrame: "current",
			},
		});
		assert.ok(result.includes("Sprint 1"));
		assert.ok(result.includes("sprint-1"));
		assert.ok(result.includes("🔵 Current"));
		assert.ok(result.includes("2026-04-06"));
		assert.ok(result.includes("2026-04-19"));
		assert.ok(result.includes("Project\\Sprint 1"));
	});

	it("formats past iteration", () => {
		const result = formatIteration({
			name: "Sprint 0",
			attributes: { timeFrame: "past" },
		});
		assert.ok(result.includes("⚪ Past"));
	});

	it("formats future iteration", () => {
		const result = formatIteration({
			name: "Sprint X",
			attributes: { timeFrame: "future" },
		});
		assert.ok(result.includes("🟢 Future"));
	});

	it("handles missing attributes", () => {
		const result = formatIteration({ name: "Mystery Sprint" });
		assert.ok(result.includes("Mystery Sprint"));
	});
});

describe("formatIterationList", () => {
	it("formats multiple iterations", () => {
		const result = formatIterationList([
			{ name: "Sprint 1", attributes: { timeFrame: "past" } },
			{ name: "Sprint 2", attributes: { timeFrame: "current" } },
		]);
		assert.ok(result.includes("Sprint 1"));
		assert.ok(result.includes("Sprint 2"));
	});

	it("returns message for empty list", () => {
		assert.equal(formatIterationList([]), "No iterations found.");
	});
});

describe("formatCapacity", () => {
	it("formats capacity with team members", () => {
		const result = formatCapacity({
			totalCapacityPerDay: 24,
			totalDaysOff: 3,
			teamMembers: [
				{
					teamMember: { displayName: "Jane Developer", uniqueName: "jane@test.com" },
					activities: [
						{ name: "Development", capacityPerDay: 6 },
						{ name: "Code Review", capacityPerDay: 1 },
					],
					daysOff: [{ start: "2026-04-25T00:00:00Z", end: "2026-04-25T00:00:00Z" }],
				},
				{
					teamMember: { displayName: "Alex Engineer" },
					activities: [{ name: "Development", capacityPerDay: 7 }],
					daysOff: [],
				},
			],
		});

		assert.ok(result.includes("**Total capacity:** 24"));
		assert.ok(result.includes("**Total days off:** 3"));
		assert.ok(result.includes("Jane Developer"));
		assert.ok(result.includes("Development: 6h/day"));
		assert.ok(result.includes("Code Review: 1h/day"));
		assert.ok(result.includes("2026-04-25"));
		assert.ok(result.includes("Alex Engineer"));
		assert.ok(result.includes("none"));
	});

	it("handles empty team members", () => {
		const result = formatCapacity({ teamMembers: [] });
		assert.ok(result.includes("**Total capacity:** 0"));
	});

	it("handles member with no activities", () => {
		const result = formatCapacity({
			teamMembers: [{ teamMember: { displayName: "New Member" } }],
		});
		assert.ok(result.includes("no activities"));
	});
});
