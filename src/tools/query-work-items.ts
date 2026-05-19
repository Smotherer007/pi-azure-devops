/**
 * azure_devops_query_work_items — Run a WIQL query to find work items.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getWorkItemTrackingApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatWorkItem, formatWorkItemList } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockQueryWorkItems } from "../mocks/mock-handler.js";

export const queryWorkItemsTool = {
	name: "azure_devops_query_work_items",
	description:
		"Run a WIQL query to find Azure DevOps work items. " +
		"Supports full WIQL syntax. Use to search by type, state, assigned to, area path, iteration path, etc.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		query: Type.String({
			description:
				"WIQL query string. Example: SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'",
		}),
		top: Type.Optional(Type.Number({ description: "Maximum results to return (default: from config)" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Query Azure DevOps work items using WIQL",
	promptGuidelines: [
		"Use azure_devops_query_work_items to search for work items by any criteria (state, type, assignee, area, etc.).",
	],

	async execute(
		_toolCallId: string,
		params: { query: string; top?: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);
		const top = params.top ?? config.maxQueryResults;

		if (isMock(config, params.mock)) {
			return mockQueryWorkItems(params.query, top);
		}

		try {
			const witApi = await getWorkItemTrackingApi(config, signal);

			// Execute WIQL query
			const queryResult = await witApi.queryByWiql(
				{ query: params.query },
				{ project: config.project },
				undefined,
				top,
			);

			if (!queryResult.workItems || queryResult.workItems.length === 0) {
				return textResult("No work items found matching the query.");
			}

			// Get full work items by IDs
			const ids = queryResult.workItems.map((wi) => wi.id!);
			const workItems = await witApi.getWorkItems(ids, undefined, undefined, undefined, undefined, config.project);

			if (!workItems || workItems.length === 0) {
				return textResult("No work items found matching the query.");
			}

			return textResult(
				`Found ${workItems.length} work item(s):\n\n${formatWorkItemList(workItems as any)}`,
				{ count: workItems.length },
			);
		} catch (err) {
			return errorResult(`Query failed: ${formatAdoError(err)}`);
		}
	},
};
