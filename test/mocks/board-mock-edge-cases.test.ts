import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { clearFixtureCache } from "../../src/mocks/mock-handler.js";
import {
	mockListTeams,
	mockListBoards,
	mockGetBoard,
	mockListIterations,
	mockGetIterationWorkItems,
	mockGetCapacity,
} from "../../src/mocks/mock-handler.js";

beforeEach(() => clearFixtureCache());

describe("mock handler edge cases", () => {
	it("mockListTeams returns details with count", () => {
		const result = mockListTeams();
		assert.equal((result.details as any).count, 3);
		assert.equal((result.details as any).mock, true);
	});

	it("mockListBoards returns team in details", () => {
		const result = mockListBoards("Platform");
		assert.equal((result.details as any).team, "Platform");
		assert.equal((result.details as any).count, 2);
	});

	it("mockGetBoard returns team and boardId in details", () => {
		const result = mockGetBoard("Engineering", "stories");
		assert.equal((result.details as any).team, "Engineering");
		assert.equal((result.details as any).boardId, "stories");
	});

	it("mockGetBoard returns editable board", () => {
		const result = mockGetBoard("Engineering", "stories");
		assert.ok(result.content[0].text.includes("Editable"));
	});

	it("mockGetBoard returns column limits", () => {
		const result = mockGetBoard("Engineering", "stories");
		assert.ok(result.content[0].text.includes("limit: 10"));
		assert.ok(result.content[0].text.includes("limit: 5"));
	});

	it("mockListIterations returns team in details", () => {
		const result = mockListIterations("Engineering");
		assert.equal((result.details as any).team, "Engineering");
	});

	it("mockListIterations with empty result for non-matching timeframe", () => {
		const result = mockListIterations("QA", "past");
		assert.equal((result.details as any).count, 0);
	});

	it("mockGetIterationWorkItems returns iteration details", () => {
		const result = mockGetIterationWorkItems("Engineering", "sprint-3");
		assert.equal((result.details as any).team, "Engineering");
		assert.equal((result.details as any).iterationId, "sprint-3");
	});

	it("mockGetCapacity returns team and iteration in details", () => {
		const result = mockGetCapacity("Engineering", "sprint-3");
		assert.equal((result.details as any).team, "Engineering");
		assert.equal((result.details as any).iterationId, "sprint-3");
	});

	it("mockGetCapacity shows activities per day", () => {
		const result = mockGetCapacity("Engineering", "sprint-3");
		assert.ok(result.content[0].text.includes("6h/day"));
		assert.ok(result.content[0].text.includes("7h/day"));
	});

	it("mockGetCapacity shows total capacity", () => {
		const result = mockGetCapacity("Engineering", "sprint-3");
		assert.ok(result.content[0].text.includes("24"));
	});

	it("mockGetCapacity shows days off", () => {
		const result = mockGetCapacity("Engineering", "sprint-3");
		assert.ok(result.content[0].text.includes("2026-04-25"));
	});

	it("mockListBoards error has error details", () => {
		const result = mockListBoards("Nonexistent");
		assert.equal((result.details as any).error, true);
	});

	it("mockGetBoard error has error details", () => {
		const result = mockGetBoard("Engineering", "nonexistent");
		assert.equal((result.details as any).error, true);
	});

	it("mockGetCapacity error has error details", () => {
		const result = mockGetCapacity("Nonexistent", "sprint-x");
		assert.equal((result.details as any).error, true);
	});
});
