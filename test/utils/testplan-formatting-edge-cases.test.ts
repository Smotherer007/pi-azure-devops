import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	formatTestPlan,
	formatTestSuite,
	formatTestRun,
	formatTestResult,
	formatTestPoint,
} from "../../src/utils/formatting.js";

// ---------------------------------------------------------------------------
// Plans with no dates
// ---------------------------------------------------------------------------

describe("formatTestPlan edge cases", () => {
	it("handles plan with no dates", () => {
		const text = formatTestPlan({ id: 1, name: "No-Date Plan", state: "active" });
		assert.ok(text.includes("No-Date Plan"));
		assert.ok(!text.includes("undefined"));
	});

	it("handles plan with no owner", () => {
		const text = formatTestPlan({ id: 2, name: "Unowned Plan" });
		assert.ok(text.includes("Unowned Plan"));
	});

	it("handles plan with no state", () => {
		const text = formatTestPlan({ id: 3, name: "Stateless Plan" });
		assert.ok(text.includes("Stateless Plan"));
	});

	it("handles plan with no root suite", () => {
		const text = formatTestPlan({ id: 4, name: "No Root Suite Plan", state: "active" });
		assert.ok(text.includes("No Root Suite Plan"));
	});
});

// ---------------------------------------------------------------------------
// Suites with deep nesting
// ---------------------------------------------------------------------------

describe("formatTestSuite edge cases", () => {
	it("handles suite with no parent", () => {
		const text = formatTestSuite({ id: 201, name: "Root Suite" });
		assert.ok(text.includes("Root Suite"));
	});

	it("handles suite with zero test cases", () => {
		const text = formatTestSuite({ id: 202, name: "Empty Suite", testCaseCount: 0 });
		assert.ok(text.includes("Empty Suite"));
	});

	it("handles suite with no suite type", () => {
		const text = formatTestSuite({ id: 203, name: "Typeless Suite" });
		assert.ok(text.includes("Typeless Suite"));
	});
});

// ---------------------------------------------------------------------------
// Test runs with zero tests
// ---------------------------------------------------------------------------

describe("formatTestRun edge cases", () => {
	it("handles run with zero tests", () => {
		const text = formatTestRun({ id: 1, name: "Empty Run", totalTests: 0, passedTests: 0 });
		assert.ok(text.includes("Empty Run"));
	});

	it("handles run with no state", () => {
		const text = formatTestRun({ id: 2, name: "Stateless Run" });
		assert.ok(text.includes("Stateless Run"));
	});

	it("handles run with no dates", () => {
		const text = formatTestRun({ id: 3, name: "No Dates Run", state: "Completed" });
		assert.ok(text.includes("No Dates Run"));
		assert.ok(!text.includes("undefined"));
	});
});

// ---------------------------------------------------------------------------
// Test results with long error messages
// ---------------------------------------------------------------------------

describe("formatTestResult edge cases", () => {
	it("handles result with long error message", () => {
		const longError = "Error: ".padEnd(500, "X");
		const text = formatTestResult({
			id: 1,
			testCase: { name: "Long Error Test" },
			outcome: "Failed",
			errorMessage: longError,
		});
		assert.ok(text.includes("Long Error Test") || text.includes("Failed") || text.includes("failed"));
	});

	it("handles result with no test case name", () => {
		const text = formatTestResult({ id: 2, outcome: "Passed" });
		assert.ok(text.includes("Passed") || text.includes("passed") || text.includes("2"));
	});

	it("handles result with comment", () => {
		const text = formatTestResult({
			id: 3,
			testCase: { name: "Commented Test" },
			outcome: "Blocked",
			comment: "Waiting for deployment",
		});
		assert.ok(text.length > 0);
	});
});

// ---------------------------------------------------------------------------
// Test points with various outcomes
// ---------------------------------------------------------------------------

describe("formatTestPoint edge cases", () => {
	it("handles point with no outcome", () => {
		const text = formatTestPoint({
			id: 1,
			testCaseReference: { id: 1001, name: "Unexecuted Test" },
		});
		assert.ok(text.includes("Unexecuted Test") || text.includes("1001"));
	});

	it("handles point with blocked outcome", () => {
		const text = formatTestPoint({
			id: 2,
			testCaseReference: { id: 1002, name: "Blocked Test" },
			outcome: "blocked",
		});
		assert.ok(text.length > 0);
	});
});
