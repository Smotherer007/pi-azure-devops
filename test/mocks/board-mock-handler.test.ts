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
	mockSetBoardColumns,
	mockSetIteration,
	mockSetCapacity,
} from "../../src/mocks/mock-handler.js";

beforeEach(() => clearFixtureCache());

describe("mockListTeams", () => {
	it("returns all 3 teams", () => {
		const result = mockListTeams();
		assert.ok(result.content[0].text.includes("Engineering"));
		assert.ok(result.content[0].text.includes("Platform"));
		assert.ok(result.content[0].text.includes("QA"));
		assert.equal((result.details as any).count, 3);
	});

	it("includes mock mode indicator", () => {
		const result = mockListTeams();
		assert.ok(result.content[0].text.includes("mock mode"));
	});
});

describe("mockListBoards", () => {
	it("returns boards for Engineering team", () => {
		const result = mockListBoards("Engineering");
		assert.ok(result.content[0].text.includes("Stories"));
		assert.ok(result.content[0].text.includes("Features"));
		assert.equal((result.details as any).count, 2);
	});

	it("returns boards for Platform team", () => {
		const result = mockListBoards("Platform");
		assert.ok(result.content[0].text.includes("Stories"));
		assert.ok(result.content[0].text.includes("Epics"));
		assert.equal((result.details as any).count, 2);
	});

	it("returns boards for QA team", () => {
		const result = mockListBoards("QA");
		assert.ok(result.content[0].text.includes("Stories"));
		assert.equal((result.details as any).count, 1);
	});

	it("returns error for unknown team", () => {
		const result = mockListBoards("Unknown");
		assert.ok(result.content[0].text.includes("❌"));
	});
});

describe("mockGetBoard", () => {
	it("returns Engineering Stories board with columns", () => {
		const result = mockGetBoard("Engineering", "stories");
		const text = result.content[0].text;
		assert.ok(text.includes("New"));
		assert.ok(text.includes("Active"));
		assert.ok(text.includes("Resolved"));
		assert.ok(text.includes("Closed"));
		assert.ok(text.includes("Mappings"));
	});

	it("returns Engineering Features board", () => {
		const result = mockGetBoard("Engineering", "features");
		const text = result.content[0].text;
		assert.ok(text.includes("Feature"));
		assert.ok(text.includes("New"));
		assert.ok(text.includes("In Progress"));
		assert.ok(text.includes("Done"));
	});

	it("returns error for unknown board", () => {
		const result = mockGetBoard("Engineering", "nonexistent");
		assert.ok(result.content[0].text.includes("❌"));
	});
});

describe("mockListIterations", () => {
	it("returns all iterations for Engineering", () => {
		const result = mockListIterations("Engineering");
		assert.ok(result.content[0].text.includes("Sprint 1"));
		assert.ok(result.content[0].text.includes("Sprint 5"));
		assert.equal((result.details as any).count, 5);
	});

	it("filters by current timeframe", () => {
		const result = mockListIterations("Engineering", "current");
		const text = result.content[0].text;
		assert.ok(text.includes("Sprint 3"));
		assert.ok(!text.includes("Sprint 1"));
		assert.ok(!text.includes("Sprint 5"));
		assert.equal((result.details as any).count, 1);
	});

	it("filters by past timeframe", () => {
		const result = mockListIterations("Engineering", "past");
		assert.equal((result.details as any).count, 2);
	});

	it("filters by future timeframe", () => {
		const result = mockListIterations("Engineering", "future");
		assert.equal((result.details as any).count, 2);
	});

	it("returns error for unknown team", () => {
		const result = mockListIterations("Unknown");
		assert.ok(result.content[0].text.includes("❌"));
	});

	it("returns Platform iterations", () => {
		const result = mockListIterations("Platform");
		assert.equal((result.details as any).count, 2);
	});
});

describe("mockGetIterationWorkItems", () => {
	it("returns work items for Engineering sprint-3", () => {
		const result = mockGetIterationWorkItems("Engineering", "sprint-3");
		const text = result.content[0].text;
		assert.ok((result.details as any).count > 0);
		assert.ok(text.includes("mock mode"));
	});

	it("returns empty for iteration with no items", () => {
		const result = mockGetIterationWorkItems("Engineering", "sprint-1");
		assert.ok(result.content[0].text.includes("No work items"));
	});

	it("returns work items for Platform sprint", () => {
		const result = mockGetIterationWorkItems("Platform", "plat-sprint-1");
		assert.ok((result.details as any).count > 0);
	});
});

describe("mockGetCapacity", () => {
	it("returns capacity for Engineering sprint-3", () => {
		const result = mockGetCapacity("Engineering", "sprint-3");
		const text = result.content[0].text;
		assert.ok(text.includes("Jane Developer"));
		assert.ok(text.includes("Alex Engineer"));
		assert.ok(text.includes("Sam DevOps"));
		assert.ok(text.includes("24"));
	});

	it("returns capacity for Engineering sprint-4", () => {
		const result = mockGetCapacity("Engineering", "sprint-4");
		const text = result.content[0].text;
		assert.ok(text.includes("13"));
		assert.ok(text.includes("0"));
	});

	it("returns error for unknown capacity key", () => {
		const result = mockGetCapacity("Unknown", "sprint-x");
		assert.ok(result.content[0].text.includes("❌"));
	});
});

describe("mockSetBoardColumns", () => {
	it("returns confirmation with column names", () => {
		const result = mockSetBoardColumns("Engineering", "stories", [
			{ name: "Todo" },
			{ name: "Done" },
		]);
		const text = result.content[0].text;
		assert.ok(text.includes("✅"));
		assert.ok(text.includes("Todo → Done"));
		assert.ok(text.includes("mock data"));
	});
});

describe("mockSetIteration", () => {
	it("returns add confirmation", () => {
		const result = mockSetIteration("Engineering", "sprint-6", "add");
		const text = result.content[0].text;
		assert.ok(text.includes("Added"));
		assert.ok(text.includes("sprint-6"));
		assert.ok(text.includes("Engineering"));
	});

	it("returns remove confirmation", () => {
		const result = mockSetIteration("Platform", "plat-sprint-1", "remove");
		const text = result.content[0].text;
		assert.ok(text.includes("Removed"));
		assert.ok(text.includes("Platform"));
	});
});

describe("mockSetCapacity", () => {
	it("returns confirmation with member count", () => {
		const result = mockSetCapacity("Engineering", "sprint-3", [
			{ teamMemberId: "user1" },
			{ teamMemberId: "user2" },
		]);
		const text = result.content[0].text;
		assert.ok(text.includes("2"));
		assert.ok(text.includes("mock data"));
	});
});
