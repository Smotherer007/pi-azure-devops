/**
 * azure_devops_get_work_item_comments — Retrieve comments on a work item.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getWorkItemTrackingApi } from "../utils/connection.js";
import { formatAdoError, isNotFoundError } from "../utils/errors.js";
import { formatComments } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockGetWorkItemComments } from "../mocks/mock-handler.js";

export const getWorkItemCommentsTool = {
	name: "azure_devops_get_work_item_comments",
	description:
		"Retrieve all comments on an Azure DevOps work item. Returns comment text, author, and date.",
	parameters: Type.Object({
		workItemId: Type.Number({ description: "Work item ID" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get comments on an Azure DevOps work item",
	promptGuidelines: [
		"Use azure_devops_get_work_item_comments to see discussion history on a work item.",
	],

	async execute(
		_toolCallId: string,
		params: { workItemId: number; mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

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
