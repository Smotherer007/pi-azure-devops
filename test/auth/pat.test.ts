import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPatAuth } from "../../src/auth/pat.js";

describe("createPatAuth", () => {
	it("returns undefined for undefined token", () => {
		assert.equal(createPatAuth(undefined), undefined);
	});

	it("returns undefined for empty string token", () => {
		assert.equal(createPatAuth(""), undefined);
	});

	it("returns auth result for valid token", () => {
		const result = createPatAuth("my-pat-token-12345");
		assert.ok(result);
		assert.equal(result.method, "pat");
		assert.ok(result.handler);
	});

	it("returns different handlers for different tokens", () => {
		const a = createPatAuth("token-a");
		const b = createPatAuth("token-b");
		assert.ok(a);
		assert.ok(b);
		assert.notStrictEqual(a.handler, b.handler);
	});
});
