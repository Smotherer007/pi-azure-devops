/**
 * azure_devops_list_iterations — List sprints/iterations for a team.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getWorkApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatIterationList } from "../utils/formatting.ts";
import { isMock, TeamParam, resolveTeamContext, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockListIterations } from "../mocks/mock-handler.ts";

export const listIterationsTool = {
	name: "azure_devops_list_iterations",
	description:
		"List sprints/iterations for an Azure DevOps team. Optionally filter by timeframe: 'current', 'past', or 'future'.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		team: TeamParam,
		timeframe: Type.Optional(Type.String({
			description: "Filter by timeframe: 'current', 'past', or 'future'",
		})),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List Azure DevOps sprints for a team",
	promptGuidelines: [
		"Use azure_devops_list_iterations to find sprint IDs and dates.",
		"Pass timeframe='current' to get the active sprint.",
	],

	async execute(
		_toolCallId: string,
		params: { team?: string; timeframe?: string; mock?: boolean ; org?: string; project?: string},
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
			return mockListIterations(teamCtx.team, params.timeframe);
		}

		try {
			const workApi = await getWorkApi(config, signal);
			const iterations = await workApi.getTeamIterations(teamCtx, params.timeframe);

			if (!iterations || iterations.length === 0) {
				const tfDesc = params.timeframe ? ` (${params.timeframe})` : "";
				return textResult(`No iterations found for team "${teamCtx.team}"${tfDesc}.`);
			}

			return textResult(
				formatIterationList(iterations as any),
				{ team: teamCtx.team, count: iterations.length },
			);
		} catch (err) {
			return errorResult(`Failed to list iterations for "${teamCtx.team}": ${formatAdoError(err)}`);
		}
	},
};
