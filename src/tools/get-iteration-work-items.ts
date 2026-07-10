/**
 * azure_devops_get_iteration_work_items — Get work items in a sprint/iteration.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getWorkApi, getWorkItemTrackingApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatWorkItemList } from "../utils/formatting.ts";
import { isMock, TeamParam, resolveTeamContext, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockGetIterationWorkItems } from "../mocks/mock-handler.ts";

export const getIterationWorkItemsTool = {
	name: "azure_devops_get_iteration_work_items",
	description:
		"Get work items in a specific Azure DevOps sprint/iteration. Returns work item IDs, titles, states, and types.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		iterationId: Type.String({ description: "Iteration/sprint GUID or ID" }),
		team: TeamParam,
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get work items in an Azure DevOps sprint",
	promptGuidelines: [
		"Use azure_devops_get_iteration_work_items to see what's in a sprint.",
		"You need the iterationId from azure_devops_list_iterations first.",
	],

	async execute(
		_toolCallId: string,
		params: { iterationId: string; team?: string; mock?: boolean ; org?: string; project?: string},
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
			return mockGetIterationWorkItems(teamCtx.team, params.iterationId);
		}

		try {
			const workApi = await getWorkApi(config, signal);
			const result = await workApi.getIterationWorkItems(teamCtx, params.iterationId);

			const relations = result?.workItemRelations ?? [];
			// Extract target IDs from relations
			const ids = relations
				.filter((r) => r.target?.id)
				.map((r) => r.target!.id!);

			if (ids.length === 0) {
				return textResult(
					`No work items in iteration ${params.iterationId} for "${teamCtx.team}".`,
					{ team: teamCtx.team, iterationId: params.iterationId, count: 0 },
				);
			}

			// Fetch work item details for titles/states
			const witApi = await getWorkItemTrackingApi(config, signal);
			const workItems = await witApi.getWorkItems(ids, undefined, undefined, undefined, undefined, config.project);
			const items = workItems ?? [];

			return textResult(
				`Work items in iteration ${params.iterationId} for "${teamCtx.team}" (${items.length}):\n\n${formatWorkItemList(items as any)}`,
				{ team: teamCtx.team, iterationId: params.iterationId, count: items.length },
			);
		} catch (err) {
			return errorResult(`Failed to get iteration work items: ${formatAdoError(err)}`);
		}
	},
};
