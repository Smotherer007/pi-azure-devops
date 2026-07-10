/**
 * azure_devops_get_work_item — Fetch a single work item by ID with all fields.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getWorkItemTrackingApi } from "../utils/connection.ts";
import { formatAdoError, isNotFoundError } from "../utils/errors.ts";
import { formatWorkItem } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, resolveEffectiveConfig, OrgParam, ProjectParam, type ToolResult } from "./shared.ts";
import { mockGetWorkItem } from "../mocks/mock-handler.ts";

export const getWorkItemTool = {
	name: "azure_devops_get_work_item",
	description:
		"Fetch a single Azure DevOps work item by ID. Returns all fields, formatted for readability.",
	parameters: Type.Object({
		id: Type.Number({ description: "Work item ID" }),
		org: OrgParam,
		project: ProjectParam,
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Fetch an Azure DevOps work item by ID",
	promptGuidelines: [
		"Use azure_devops_get_work_item when the user mentions a specific work item number like #101.",
	],

	async execute(
		_toolCallId: string,
		params: { id: number; org?: string; project?: string; mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockGetWorkItem(params.id);
		}

		try {
			const witApi = await getWorkItemTrackingApi(config, signal);
			const wi = await witApi.getWorkItem(params.id, undefined, undefined, undefined, config.project);

			if (!wi || !wi.id) {
				return errorResult(`Work item #${params.id} not found.`);
			}

			return textResult(formatWorkItem(wi as any), { id: wi.id });
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Work item #${params.id} not found.`);
			}
			return errorResult(`Failed to fetch work item #${params.id}: ${formatAdoError(err)}`);
		}
	},
};
