import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
	clearConnectionCache,
} from "../../src/utils/connection.ts";

// We test by importing the module and verifying it exports the expected functions.
// Integration tests with a real Azure DevOps connection are covered by tool-level tests.
// Here we test the export surface and connection caching behavior.

describe("connection exports", () => {
	it("exports getGitApi function", async () => {
		const { getGitApi } = await import("../../src/utils/connection.ts");
		assert.equal(typeof getGitApi, "function");
	});

	it("exports getPolicyApi function", async () => {
		const { getPolicyApi } = await import("../../src/utils/connection.ts");
		assert.equal(typeof getPolicyApi, "function");
	});

	it("exports getConnection function", async () => {
		const { getConnection } = await import("../../src/utils/connection.ts");
		assert.equal(typeof getConnection, "function");
	});

	it("exports clearConnectionCache function", () => {
		assert.equal(typeof clearConnectionCache, "function");
	});

	it("exports getWorkItemTrackingApi function", async () => {
		const { getWorkItemTrackingApi } = await import("../../src/utils/connection.ts");
		assert.equal(typeof getWorkItemTrackingApi, "function");
	});

	it("exports getWorkApi function", async () => {
		const { getWorkApi } = await import("../../src/utils/connection.ts");
		assert.equal(typeof getWorkApi, "function");
	});

	it("exports getCoreApi function", async () => {
		const { getCoreApi } = await import("../../src/utils/connection.ts");
		assert.equal(typeof getCoreApi, "function");
	});

	it("exports getBuildApi function", async () => {
		const { getBuildApi } = await import("../../src/utils/connection.ts");
		assert.equal(typeof getBuildApi, "function");
	});

	it("exports getPipelinesApi function", async () => {
		const { getPipelinesApi } = await import("../../src/utils/connection.ts");
		assert.equal(typeof getPipelinesApi, "function");
	});

	it("exports getTestPlanApi function", async () => {
		const { getTestPlanApi } = await import("../../src/utils/connection.ts");
		assert.equal(typeof getTestPlanApi, "function");
	});

	it("exports getTestResultsApi function", async () => {
		const { getTestResultsApi } = await import("../../src/utils/connection.ts");
		assert.equal(typeof getTestResultsApi, "function");
	});
});

describe("clearConnectionCache", () => {
	it("can be called without error", () => {
		clearConnectionCache();
		clearConnectionCache();
		// No assertion needed — just verifies no throw
		assert.ok(true);
	});
});
