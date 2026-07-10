/**
 * azure_devops_get_board — Get full board detail with columns, rows, and state mappings.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getWorkApi } from "../utils/connection.ts";
import { formatAdoError, isNotFoundError } from "../utils/errors.ts";
import { formatBoard } from "../utils/formatting.ts";
import { isMock, TeamParam, resolveTeamContext, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockGetBoard } from "../mocks/mock-handler.ts";

export const getBoardTool = {
	name: "azure_devops_get_board",
	description:
		"Get full detail of an Azure DevOps board — columns with state mappings, item limits, and rows. Requires board ID.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		boardId: Type.String({ description: "Board ID (e.g. 'Stories', 'Features', 'Epics')" }),
		team: TeamParam,
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get Azure DevOps board detail",
	promptGuidelines: [
		"Use azure_devops_get_board to inspect board column configuration and state mappings.",
		"The boardId is typically the backlog category name: 'Stories', 'Features', or 'Epics'.",
	],

	async execute(
		_toolCallId: string,
		params: { boardId: string; team?: string; mock?: boolean ; org?: string; project?: string},
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
			return mockGetBoard(teamCtx.team, params.boardId);
		}

		try {
			const workApi = await getWorkApi(config, signal);
			const board = await workApi.getBoard(teamCtx, params.boardId);

			if (!board) {
				return errorResult(`Board "${params.boardId}" not found for team "${teamCtx.team}".`);
			}

			return textResult(formatBoard(board as any), { team: teamCtx.team, boardId: params.boardId });
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Board "${params.boardId}" not found for team "${teamCtx.team}".`);
			}
			return errorResult(`Failed to get board "${params.boardId}": ${formatAdoError(err)}`);
		}
	},
};
