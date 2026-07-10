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
} from "../../src/utils/formatting.ts";

describe("formatTeam edge cases", () => {
	it("handles team with only id and name", () => {
		const result = formatTeam({ id: "x", name: "Solo" });
		assert.ok(result.includes("Solo"));
		assert.ok(result.includes("x"));
		assert.ok(!result.includes("URL"));
	});
});

describe("formatBoard edge cases", () => {
	it("formats board with canEdit false", () => {
		const result = formatBoard({ id: "b1", name: "Test", canEdit: false });
		assert.ok(result.includes("**Editable:** No"));
	});

	it("formats column with null item limit", () => {
		const result = formatBoard({
			columns: [{ name: "All", itemLimit: null }],
		});
		assert.ok(!result.includes("limit"));
	});

	it("formats column with zero item limit", () => {
		const result = formatBoard({
			columns: [{ name: "Blocked", itemLimit: 0 }],
		});
		assert.ok(result.includes("limit: 0"));
	});
});

describe("formatIteration edge cases", () => {
	it("handles iteration with no path", () => {
		const result = formatIteration({
			id: "x",
			name: "Sprint",
			attributes: { timeFrame: "current" },
		});
		assert.ok(result.includes("Sprint"));
		assert.ok(!result.includes("Path:"));
	});

	it("handles iteration with no dates", () => {
		const result = formatIteration({
			name: "Undated Sprint",
			attributes: {},
		});
		assert.ok(result.includes("?"));
	});

	it("handles numeric TimeFrame enum 0 (Past)", () => {
		const result = formatIteration({
			name: "Sprint 0",
			attributes: { timeFrame: 0 as any },
		});
		assert.ok(result.includes("⚪ Past"));
	});

	it("handles numeric TimeFrame enum 1 (Current)", () => {
		const result = formatIteration({
			name: "Sprint 1",
			attributes: { timeFrame: 1 as any },
		});
		assert.ok(result.includes("🔵 Current"));
	});

	it("handles numeric TimeFrame enum 2 (Future)", () => {
		const result = formatIteration({
			name: "Sprint 2",
			attributes: { timeFrame: 2 as any },
		});
		assert.ok(result.includes("🟢 Future"));
	});
});

describe("formatCapacity edge cases", () => {
	it("formats capacity with no total fields", () => {
		const result = formatCapacity({});
		assert.ok(result.includes("**Total capacity:** 0 hours/day"));
		assert.ok(result.includes("**Total days off:** 0"));
	});

	it("formats multi-day days off as date range", () => {
		const result = formatCapacity({
			teamMembers: [{
				teamMember: { displayName: "Jane" },
				activities: [{ name: "Dev", capacityPerDay: 8 }],
				daysOff: [{ start: "2026-04-25T00:00:00Z", end: "2026-04-27T00:00:00Z" }],
			}],
		});
		assert.ok(result.includes("2026-04-25–2026-04-27"));
	});

	it("formats single-day days off without range", () => {
		const result = formatCapacity({
			teamMembers: [{
				teamMember: { displayName: "Jane" },
				activities: [{ name: "Dev", capacityPerDay: 8 }],
				daysOff: [{ start: "2026-04-25T00:00:00Z", end: "2026-04-25T00:00:00Z" }],
			}],
		});
		assert.ok(result.includes("2026-04-25"));
		// Single day should NOT have an en-dash range
		assert.ok(!result.includes("2026-04-25–"));
	});
});
