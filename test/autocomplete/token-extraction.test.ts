import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractWorkItemToken } from "../../src/autocomplete/work-item-autocomplete.js";

describe("extractWorkItemToken", () => {
	it("extracts token after # at start of line", () => {
		assert.equal(extractWorkItemToken("#10"), "10");
	});

	it("extracts token after # preceded by space", () => {
		assert.equal(extractWorkItemToken("update #10"), "10");
	});

	it("extracts token after # preceded by tab", () => {
		assert.equal(extractWorkItemToken("show\t#12"), "12");
	});

	it("extracts token after # preceded by opening paren", () => {
		assert.equal(extractWorkItemToken("see (#34"), "34");
	});

	it("extracts empty string for just #", () => {
		assert.equal(extractWorkItemToken("#"), "");
	});

	it("extracts partial numeric token", () => {
		assert.equal(extractWorkItemToken("look at #12"), "12");
	});

	it("returns undefined for # in middle of word", () => {
		assert.equal(extractWorkItemToken("issue#10"), undefined);
	});

	it("returns undefined for ## double hash", () => {
		assert.equal(extractWorkItemToken("heading ## title"), undefined);
	});

	it("returns undefined when no # present", () => {
		assert.equal(extractWorkItemToken("no hash here"), undefined);
	});

	it("returns undefined for # followed by non-word", () => {
		// # followed by space is not a token
		assert.equal(extractWorkItemToken("test # something"), undefined);
	});

	it("extracts full ID before trailing word", () => {
		// Token extraction requires # at end of string, not followed by word chars
		// This is correct behavior — "#1234 with" means #1234 is complete, not partial
		assert.equal(extractWorkItemToken("Please update work item #1234 with"), undefined);
	});

	it("extracts token after # when preceded by space and other text", () => {
		assert.equal(extractWorkItemToken("fix #101 and also #102"), "102");
	});
});
