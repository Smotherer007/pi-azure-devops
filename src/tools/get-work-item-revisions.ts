/**
 * azure_devops_get_work_item_revisions — Get revision history for a work item.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getWorkItemTrackingApi } from "../utils/connection.ts";
import { formatAdoError, isNotFoundError } from "../utils/errors.ts";
import { formatRevisions } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockGetWorkItemRevisions } from "../mocks/mock-handler.ts";

export const getWorkItemRevisionsTool = {
	name: "azure_devops_get_work_item_revisions",
	description:
		"Get revision history for an Azure DevOps work item. Shows all changes with who changed what and when.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		workItemId: Type.Number({ description: "Work item ID" }),
		top: Type.Optional(Type.Number({ description: "Maximum revisions to return (default: 50)" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get revision history for an Azure DevOps work item",
	promptGuidelines: [
		"Use azure_devops_get_work_item_revisions to see how a work item changed over time.",
	],

	async execute(
		_toolCallId: string,
		params: { workItemId: number; top?: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);
		const top = params.top ?? 50;

		if (isMock(config, params.mock)) {
			return mockGetWorkItemRevisions(params.workItemId);
		}

		try {
			const witApi = await getWorkItemTrackingApi(config, signal);
			const revisions = await witApi.getRevisions(
				params.workItemId,
				top,
				undefined,
				undefined,
				config.project,
			);

			if (!revisions || revisions.length === 0) {
				return textResult(
					`No revisions found for work item #${params.workItemId}.`,
					{ workItemId: params.workItemId, count: 0 },
				);
			}

			return textResult(
				`Revision history for #${params.workItemId}:\n\n${formatRevisions(revisions as any)}`,
				{ workItemId: params.workItemId, count: revisions.length },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Work item #${params.workItemId} not found.`);
			}
			return errorResult(`Failed to get revisions: ${formatAdoError(err)}`);
		}
	},
};
