/**
 * azure_devops_set_iteration — Add or remove an iteration from a team's sprint set.
 */

import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getWorkApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { isMock, TeamParam, resolveTeamContext, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockSetIteration } from "../mocks/mock-handler.js";

export const setIterationTool = {
	name: "azure_devops_set_iteration",
	description:
		"Add or remove an iteration/sprint from a team's sprint set. " +
		"Use 'add' to assign a sprint to a team, 'remove' to unassign it.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		iterationId: Type.String({ description: "Iteration GUID or path" }),
		operation: StringEnum(["add", "remove"] as const, { description: "Add or remove the iteration" }),
		team: TeamParam,
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Add or remove an Azure DevOps sprint from a team",
	promptGuidelines: [
		"Use azure_devops_set_iteration to assign or unassign sprints to a team.",
		"Use 'add' when planning a new sprint, 'remove' to clean up.",
	],

	async execute(
		_toolCallId: string,
		params: {
			iterationId: string;
			operation: "add" | "remove";
			team?: string;
			mock?: boolean; org?: string; project?: string;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		const teamCtx = resolveTeamContext(config, params.team);
		if (!teamCtx) {
			return errorResult("No team specified. Set AZURE_DEVOPS_TEAM (env), azure-devops.team (settings), or pass the team parameter.");
		}

		if (isMock(config, params.mock)) {
			return mockSetIteration(teamCtx.team, params.iterationId, params.operation);
		}

		try {
			const workApi = await getWorkApi(config, signal);

			if (params.operation === "add") {
				await workApi.postTeamIteration(
					{ id: params.iterationId } as any,
					teamCtx,
				);
				return textResult(
					`✅ Added iteration ${params.iterationId} to ${teamCtx.team}`,
					{ team: teamCtx.team, iterationId: params.iterationId, operation: "add" },
				);
			} else {
				await workApi.deleteTeamIteration(teamCtx, params.iterationId);
				return textResult(
					`✅ Removed iteration ${params.iterationId} from ${teamCtx.team}`,
					{ team: teamCtx.team, iterationId: params.iterationId, operation: "remove" },
				);
			}
		} catch (err) {
			const verb = params.operation === "add" ? "add" : "remove";
			return errorResult(`Failed to ${verb} iteration: ${formatAdoError(err)}`);
		}
	},
};
