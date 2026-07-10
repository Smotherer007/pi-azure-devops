/**
 * azure_devops_get_work_item_comments — Retrieve comments on a work item.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getWorkItemTrackingApi } from "../utils/connection.ts";
import { formatAdoError, isNotFoundError } from "../utils/errors.ts";
import { formatComments } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockGetWorkItemComments } from "../mocks/mock-handler.ts";

export const getWorkItemCommentsTool = {
	name: "azure_devops_get_work_item_comments",
	description:
		"Retrieve all comments on an Azure DevOps work item. Returns comment text, author, and date.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		workItemId: Type.Number({ description: "Work item ID" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get comments on an Azure DevOps work item",
	promptGuidelines: [
		"Use azure_devops_get_work_item_comments to see discussion history on a work item.",
	],

	async execute(
		_toolCallId: string,
		params: { workItemId: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockGetWorkItemComments(params.workItemId);
		}

		try {
			const witApi = await getWorkItemTrackingApi(config, signal);
			const commentList = await witApi.getComments(config.project, params.workItemId);

			if (!commentList || !commentList.comments || commentList.comments.length === 0) {
				return textResult(
					`No comments on work item #${params.workItemId}.`,
					{ workItemId: params.workItemId, count: 0 },
				);
			}

			return textResult(
				`Comments on #${params.workItemId}:\n\n${formatComments(commentList as any)}`,
				{ workItemId: params.workItemId, count: commentList.comments.length },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Work item #${params.workItemId} not found.`);
			}
			return errorResult(`Failed to get comments: ${formatAdoError(err)}`);
		}
	},
};
