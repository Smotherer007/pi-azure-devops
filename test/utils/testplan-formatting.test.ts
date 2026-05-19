import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	formatTestPlan,
	formatTestPlanList,
	formatTestSuite,
	formatTestSuiteList,
	formatTestCase,
	formatTestCaseList,
	formatTestPoint,
	formatTestPointList,
	formatTestRun,
	formatTestRunList,
	formatTestResult,
	formatTestResultList,
} from "../../src/utils/formatting.js";

// ---------------------------------------------------------------------------
// formatTestPlan / formatTestPlanList
// ---------------------------------------------------------------------------

describe("formatTestPlan", () => {
	it("formats plan with all fields", () => {
		const text = formatTestPlan({
			id: 101,
			name: "Sprint 42 Testing",
			state: "active",
			startDate: "2026-01-01T00:00:00Z",
			endDate: "2026-01-14T00:00:00Z",
			owner: { displayName: "Alice" },
			rootSuite: { id: 201, name: "Sprint 42 Testing" },
		});
		assert.ok(text.includes("Sprint 42 Testing"));
		assert.ok(text.includes("101"));
		assert.ok(text.includes("active"));
	});

	it("handles missing optional fields", () => {
		const text = formatTestPlan({ id: 102, name: "Minimal Plan" });
		assert.ok(text.includes("Minimal Plan"));
		assert.ok(text.includes("102"));
	});
});

describe("formatTestPlanList", () => {
	it("formats multiple plans", () => {
		const text = formatTestPlanList([
			{ id: 101, name: "Plan A", state: "active" },
			{ id: 102, name: "Plan B", state: "inactive" },
		]);
		assert.ok(text.includes("Plan A"));
		assert.ok(text.includes("Plan B"));
	});

	it("handles empty list", () => {
		const text = formatTestPlanList([]);
		assert.ok(text.includes("No") || text.length === 0 || text.includes("0"));
	});
});

// ---------------------------------------------------------------------------
// formatTestSuite / formatTestSuiteList
// ---------------------------------------------------------------------------

describe("formatTestSuite", () => {
	it("formats suite with full data", () => {
		const text = formatTestSuite({
			id: 301,
			name: "Login Tests",
			suiteType: "StaticTestSuite",
			testCaseCount: 5,
			parentSuite: { id: 201, name: "Root Suite" },
		});
		assert.ok(text.includes("Login Tests"));
		assert.ok(text.includes("301"));
	});

	it("handles missing fields", () => {
		const text = formatTestSuite({ id: 302, name: "Empty Suite" });
		assert.ok(text.includes("Empty Suite"));
	});
});

describe("formatTestSuiteList", () => {
	it("formats multiple suites", () => {
		const text = formatTestSuiteList([
			{ id: 301, name: "Suite A" },
			{ id: 302, name: "Suite B" },
		]);
		assert.ok(text.includes("Suite A"));
		assert.ok(text.includes("Suite B"));
	});

	it("handles empty list", () => {
		const text = formatTestSuiteList([]);
		assert.ok(text.includes("No") || text.length === 0 || text.includes("0"));
	});
});

// ---------------------------------------------------------------------------
// formatTestCase / formatTestCaseList
// ---------------------------------------------------------------------------

describe("formatTestCase", () => {
	it("formats case with fields", () => {
		const text = formatTestCase({
			workItem: { id: 1001, name: "Verify login flow" },
			pointAssignments: [{ configurationName: "Windows Chrome" }],
		});
		assert.ok(text.includes("Verify login flow") || text.includes("1001"));
	});
});

describe("formatTestCaseList", () => {
	it("handles empty list", () => {
		const text = formatTestCaseList([]);
		assert.ok(text.includes("No") || text.length === 0 || text.includes("0"));
	});
});

// ---------------------------------------------------------------------------
// formatTestPoint / formatTestPointList
// ---------------------------------------------------------------------------

describe("formatTestPoint", () => {
	it("formats point with outcome", () => {
		const text = formatTestPoint({
			id: 1,
			testCaseReference: { id: 1001, name: "Login test" },
			outcome: "passed",
			lastRunId: 501,
		});
		assert.ok(text.includes("Login test") || text.includes("1001") || text.includes("passed"));
	});
});

describe("formatTestPointList", () => {
	it("handles empty list", () => {
		const text = formatTestPointList([]);
		assert.ok(text.includes("No") || text.length === 0 || text.includes("0"));
	});
});

// ---------------------------------------------------------------------------
// formatTestRun / formatTestRunList
// ---------------------------------------------------------------------------

describe("formatTestRun", () => {
	it("formats run with statistics", () => {
		const text = formatTestRun({
			id: 501,
			name: "Sprint 42 Run",
			state: "Completed",
			totalTests: 10,
			passedTests: 8,
			unanalyzedTests: 2,
			startedDate: "2026-01-10T10:00:00Z",
			completedDate: "2026-01-10T11:00:00Z",
		});
		assert.ok(text.includes("Sprint 42 Run"));
		assert.ok(text.includes("501"));
	});

	it("handles minimal fields", () => {
		const text = formatTestRun({ id: 502, name: "Minimal Run" });
		assert.ok(text.includes("Minimal Run"));
	});
});

describe("formatTestRunList", () => {
	it("formats multiple runs", () => {
		const text = formatTestRunList([
			{ id: 501, name: "Run A", state: "Completed" },
			{ id: 502, name: "Run B", state: "InProgress" },
		]);
		assert.ok(text.includes("Run A"));
		assert.ok(text.includes("Run B"));
	});

	it("handles empty list", () => {
		const text = formatTestRunList([]);
		assert.ok(text.includes("No") || text.length === 0 || text.includes("0"));
	});
});

// ---------------------------------------------------------------------------
// formatTestResult / formatTestResultList
// ---------------------------------------------------------------------------

describe("formatTestResult", () => {
	it("formats result with outcome", () => {
		const text = formatTestResult({
			id: 1,
			testCase: { id: 1001, name: "Login test" },
			outcome: "Passed",
			durationInMs: 5000,
		});
		assert.ok(text.includes("Login test") || text.includes("1001") || text.includes("Passed") || text.includes("passed"));
	});
});

describe("formatTestResultList", () => {
	it("formats multiple results", () => {
		const text = formatTestResultList([
			{ id: 1, testCase: { name: "Test A" }, outcome: "Passed" },
			{ id: 2, testCase: { name: "Test B" }, outcome: "Failed" },
		]);
		assert.ok(text.includes("Test A") || text.includes("Passed") || text.includes("passed"));
	});

	it("handles empty list", () => {
		const text = formatTestResultList([]);
		assert.ok(text.includes("No") || text.length === 0 || text.includes("0"));
	});
});
