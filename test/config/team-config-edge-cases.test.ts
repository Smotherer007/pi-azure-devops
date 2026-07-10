import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("resolveConfig team precedence", () => {
	// Team resolution is tested in team-config.test.ts with file-based config.
	// This file covers edge cases for the resolveTeamContext helper.
});

describe("resolveTeamContext edge cases", () => {
	it("handles team with surrounding spaces in param", async () => {
		const { resolveTeamContext } = await import("../../src/tools/shared.ts");
		const config = {
			orgUrl: "https://dev.azure.com/testorg",
			project: "TestProject",
			team: "ConfigTeam",
			authMethod: "pat" as const,
			safetyLevel: "confirm" as const,
			defaultWorkItemType: "User Story",
			maxQueryResults: 100,
			autocomplete: true,
			mock: true,
		};
		const ctx = resolveTeamContext(config, "  ParamTeam  ");
		assert.deepEqual(ctx, { project: "TestProject", team: "ParamTeam" });
	});

	it("returns undefined when both are whitespace-only", async () => {
		const { resolveTeamContext } = await import("../../src/tools/shared.ts");
		const config = {
			orgUrl: "https://dev.azure.com/testorg",
			project: "TestProject",
			team: undefined,
			authMethod: "pat" as const,
			safetyLevel: "confirm" as const,
			defaultWorkItemType: "User Story",
			maxQueryResults: 100,
			autocomplete: true,
			mock: true,
		};
		const ctx = resolveTeamContext(config, "  ");
		assert.equal(ctx, undefined);
	});

	it("param takes precedence over config team", async () => {
		const { resolveTeamContext } = await import("../../src/tools/shared.ts");
		const config = {
			orgUrl: "https://dev.azure.com/testorg",
			project: "TestProject",
			team: "ConfigTeam",
			authMethod: "pat" as const,
			safetyLevel: "confirm" as const,
			defaultWorkItemType: "User Story",
			maxQueryResults: 100,
			autocomplete: true,
			mock: true,
		};
		const ctx = resolveTeamContext(config, "ParamTeam");
		assert.deepEqual(ctx, { project: "TestProject", team: "ParamTeam" });
	});

	it("falls back to config team when param is undefined", async () => {
		const { resolveTeamContext } = await import("../../src/tools/shared.ts");
		const config = {
			orgUrl: "https://dev.azure.com/testorg",
			project: "TestProject",
			team: "ConfigTeam",
			authMethod: "pat" as const,
			safetyLevel: "confirm" as const,
			defaultWorkItemType: "User Story",
			maxQueryResults: 100,
			autocomplete: true,
			mock: true,
		};
		const ctx = resolveTeamContext(config, undefined);
		assert.deepEqual(ctx, { project: "TestProject", team: "ConfigTeam" });
	});
});
