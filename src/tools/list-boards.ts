/**
 * azure_devops_list_boards — List boards for a team.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getWorkApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatBoardList } from "../utils/formatting.ts";
import { isMock, TeamParam, resolveTeamContext, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockListBoards } from "../mocks/mock-handler.ts";

export const listBoardsTool = {
	name: "azure_devops_list_boards",
	description:
		"List boards for an Azure DevOps team. Returns board name, ID, and URL. Requires a team (from config or parameter).",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		team: TeamParam,
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List boards for an Azure DevOps team",
	promptGuidelines: [
		"Use azure_devops_list_boards to see which boards a team has (Stories, Features, Epics, etc.).",
	],

	async execute(
		_toolCallId: string,
		params: { team?: string; mock?: boolean ; org?: string; project?: string},
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
			return mockListBoards(teamCtx.team);
		}

		try {
			const workApi = await getWorkApi(config, signal);
			const boards = await workApi.getBoards(teamCtx);

			if (!boards || boards.length === 0) {
				return textResult(`No boards found for team "${teamCtx.team}".`);
			}

			return textResult(formatBoardList(boards as any), { team: teamCtx.team, count: boards.length });
		} catch (err) {
			return errorResult(`Failed to list boards for "${teamCtx.team}": ${formatAdoError(err)}`);
		}
	},
};
