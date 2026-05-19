/**
 * azure_devops_list_teams — List all teams in the configured project.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getCoreApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatTeamList } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockListTeams } from "../mocks/mock-handler.js";

export const listTeamsTool = {
	name: "azure_devops_list_teams",
	description:
		"List all teams in the configured Azure DevOps project. Returns team name, description, and ID.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List Azure DevOps teams in the project",
	promptGuidelines: [
		"Use azure_devops_list_teams to discover which teams exist in the project.",
		"Team names are needed for board, iteration, and capacity tools.",
	],

	async execute(
		_toolCallId: string,
		params: { mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockListTeams();
		}

		try {
			const coreApi = await getCoreApi(config, signal);
			const teams = await coreApi.getTeams(config.project);

			if (!teams || teams.length === 0) {
				return textResult("No teams found in this project.");
			}

			return textResult(formatTeamList(teams as any), { count: teams.length });
		} catch (err) {
			return errorResult(`Failed to list teams: ${formatAdoError(err)}`);
		}
	},
};
