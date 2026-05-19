import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatAdoError, isAuthError, isNotFoundError } from "../../src/utils/errors.js";

describe("formatAdoError", () => {
	it("formats 401 Unauthorized errors", () => {
		assert.ok(formatAdoError(new Error("Request failed with status 401 Unauthorized")).includes("Authentication failed"));
	});

	it("formats 403 Forbidden errors", () => {
		assert.ok(formatAdoError(new Error("403 Forbidden")).includes("Permission denied"));
	});

	it("formats 404 Not Found errors", () => {
		assert.ok(formatAdoError(new Error("404 Not Found")).includes("Resource not found"));
	});

	it("formats TF401232 project not found", () => {
		assert.ok(formatAdoError(new Error("TF401232: Project not found")).includes("Project not found"));
	});

	it("formats TF401233 work item not found", () => {
		assert.ok(formatAdoError(new Error("TF401233: Work item does not exist")).includes("Work item not found"));
	});

	it("formats VS402335 invalid work item type", () => {
		assert.ok(formatAdoError(new Error("VS402335: Invalid type")).includes("Invalid work item type"));
	});

	it("formats rate limit errors", () => {
		assert.ok(formatAdoError(new Error("429 rate limited")).includes("Rate limited"));
	});

	it("formats ETIMEDOUT errors", () => {
		assert.ok(formatAdoError(new Error("ETIMEDOUT connection failed")).includes("Network error"));
	});

	it("formats ECONNREFUSED errors", () => {
		assert.ok(formatAdoError(new Error("ECONNREFUSED 127.0.0.1:443")).includes("Network error"));
	});

	it("formats ENOTFOUND DNS errors", () => {
		assert.ok(formatAdoError(new Error("ENOTFOUND dev.azure.com")).includes("DNS error"));
	});

	it("strips stack traces to first line", () => {
		const err = new Error("Something went wrong\n  at Object.foo (bar.ts:1)\n  at main (index.ts:5)");
		assert.equal(formatAdoError(err), "Something went wrong");
	});

	it("handles non-Error values", () => {
		assert.equal(formatAdoError("string error"), "string error");
		assert.equal(formatAdoError(42), "42");
		assert.equal(formatAdoError(null), "null");
	});

	it("handles undefined", () => {
		assert.equal(formatAdoError(undefined), "undefined");
	});
});

describe("isAuthError", () => {
	it("detects 401 errors", () => {
		assert.equal(isAuthError(new Error("401 Unauthorized")), true);
	});

	it("detects Unauthorized errors", () => {
		assert.equal(isAuthError(new Error("Unauthorized access")), true);
	});

	it("detects Forbidden errors", () => {
		assert.equal(isAuthError(new Error("Forbidden")), true);
	});

	it("returns false for non-auth errors", () => {
		assert.equal(isAuthError(new Error("Not found")), false);
	});

	it("returns false for non-Error values", () => {
		assert.equal(isAuthError("401"), false);
		assert.equal(isAuthError(null), false);
	});
});

describe("isNotFoundError", () => {
	it("detects 404 errors", () => {
		assert.equal(isNotFoundError(new Error("404 Not Found")), true);
	});

	it("detects TF401233 errors", () => {
		assert.equal(isNotFoundError(new Error("TF401233: item not found")), true);
	});

	it("detects Not Found errors", () => {
		assert.equal(isNotFoundError(new Error("Resource Not Found")), true);
	});

	it("returns false for other errors", () => {
		assert.equal(isNotFoundError(new Error("Server error")), false);
	});

	it("returns false for non-Error values", () => {
		assert.equal(isNotFoundError("404"), false);
	});
});
