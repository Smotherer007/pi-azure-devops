/**
 * azure_devops_get_capacity — Get sprint capacity for all team members with totals.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getWorkApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatCapacity } from "../utils/formatting.js";
import { isMock, TeamParam, resolveTeamContext, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockGetCapacity } from "../mocks/mock-handler.js";

export const getCapacityTool = {
	name: "azure_devops_get_capacity",
	description:
		"Get sprint capacity for an Azure DevOps team — per-member activities, capacity per day, days off, and team totals.",
	parameters: Type.Object({
		iterationId: Type.String({ description: "Iteration/sprint GUID or ID" }),
		team: TeamParam,
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get Azure DevOps sprint capacity",
	promptGuidelines: [
		"Use azure_devops_get_capacity to see how much capacity the team has in a sprint.",
		"You need the iterationId from azure_devops_list_iterations first.",
	],

	async execute(
		_toolCallId: string,
		params: { iterationId: string; team?: string; mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

		const teamCtx = resolveTeamContext(config, params.team);
		if (!teamCtx) {
			return errorResult("No team specified. Set AZURE_DEVOPS_TEAM (env), azure-devops.team (settings), or pass the team parameter.");
		}

		if (isMock(config, params.mock)) {
			return mockGetCapacity(teamCtx.team, params.iterationId);
		}

		try {
			const workApi = await getWorkApi(config, signal);
			const capacity = await workApi.getCapacitiesWithIdentityRefAndTotals(teamCtx, params.iterationId);

			if (!capacity) {
				return errorResult(`No capacity data for iteration ${params.iterationId} and team "${teamCtx.team}".`);
			}

			return textResult(
				formatCapacity(capacity as any),
				{ team: teamCtx.team, iterationId: params.iterationId },
			);
		} catch (err) {
			return errorResult(`Failed to get capacity: ${formatAdoError(err)}`);
		}
	},
};
