import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveTeamContext, MUTATION_TOOLS, isMutationTool } from "../../src/tools/shared.js";

describe("resolveTeamContext", () => {
	const config = {
		orgUrl: "https://dev.azure.com/testorg",
		project: "TestProject",
		team: "Engineering",
		authMethod: "pat" as const,
		safetyLevel: "confirm" as const,
		defaultWorkItemType: "User Story",
		maxQueryResults: 100,
		autocomplete: true,
		mock: true,
	};

	it("returns TeamContext from config when no param", () => {
		const ctx = resolveTeamContext(config);
		assert.deepEqual(ctx, { project: "TestProject", team: "Engineering" });
	});

	it("returns TeamContext using param override", () => {
		const ctx = resolveTeamContext(config, "Platform");
		assert.deepEqual(ctx, { project: "TestProject", team: "Platform" });
	});

	it("trims whitespace from param", () => {
		const ctx = resolveTeamContext(config, "  Platform  ");
		assert.deepEqual(ctx, { project: "TestProject", team: "Platform" });
	});

	it("returns undefined when no config team and no param", () => {
		const noTeamConfig = { ...config, team: undefined };
		const ctx = resolveTeamContext(noTeamConfig);
		assert.equal(ctx, undefined);
	});

	it("returns TeamContext from param when config team is undefined", () => {
		const noTeamConfig = { ...config, team: undefined };
		const ctx = resolveTeamContext(noTeamConfig, "QA");
		assert.deepEqual(ctx, { project: "TestProject", team: "QA" });
	});

	it("prefers param over config team", () => {
		const ctx = resolveTeamContext(config, "QA");
		assert.deepEqual(ctx, { project: "TestProject", team: "QA" });
	});

	it("ignores empty string param, falls back to config team", () => {
		const ctx = resolveTeamContext(config, "");
		assert.deepEqual(ctx, { project: "TestProject", team: "Engineering" });
	});

	it("ignores whitespace-only param, falls back to config team", () => {
		const ctx = resolveTeamContext(config, "   ");
		assert.deepEqual(ctx, { project: "TestProject", team: "Engineering" });
	});

	it("returns undefined when both config team and param are empty", () => {
		const noTeamConfig = { ...config, team: undefined };
		const ctx = resolveTeamContext(noTeamConfig, "");
		assert.equal(ctx, undefined);
	});
});

describe("Phase 5 mutation tools", () => {
	it("registers azure_devops_set_board_columns as mutation", () => {
		assert.ok(MUTATION_TOOLS.has("azure_devops_set_board_columns"));
		assert.ok(isMutationTool("azure_devops_set_board_columns"));
	});

	it("registers azure_devops_set_iteration as mutation", () => {
		assert.ok(MUTATION_TOOLS.has("azure_devops_set_iteration"));
		assert.ok(isMutationTool("azure_devops_set_iteration"));
	});

	it("registers azure_devops_set_capacity as mutation", () => {
		assert.ok(MUTATION_TOOLS.has("azure_devops_set_capacity"));
		assert.ok(isMutationTool("azure_devops_set_capacity"));
	});

	it("does not flag Phase 5 read tools as mutations", () => {
		assert.ok(!isMutationTool("azure_devops_list_teams"));
		assert.ok(!isMutationTool("azure_devops_list_boards"));
		assert.ok(!isMutationTool("azure_devops_get_board"));
		assert.ok(!isMutationTool("azure_devops_list_iterations"));
		assert.ok(!isMutationTool("azure_devops_get_iteration_work_items"));
		assert.ok(!isMutationTool("azure_devops_get_capacity"));
	});
});
