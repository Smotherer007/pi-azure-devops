/**
 * azure_devops_add_work_item_comment — Add a comment to a work item.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getWorkItemTrackingApi } from "../utils/connection.js";
import { formatAdoError, isNotFoundError } from "../utils/errors.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockAddWorkItemComment } from "../mocks/mock-handler.js";

export const addWorkItemCommentTool = {
	name: "azure_devops_add_work_item_comment",
	description:
		"Add a comment to an Azure DevOps work item.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		workItemId: Type.Number({ description: "Work item ID to comment on" }),
		text: Type.String({ description: "Comment text" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Add a comment to an Azure DevOps work item",
	promptGuidelines: [
		"Use azure_devops_add_work_item_comment to add discussion notes to a work item.",
	],

	async execute(
		_toolCallId: string,
		params: { workItemId: number; text: string; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockAddWorkItemComment(params.workItemId, params.text);
		}

		try {
			const witApi = await getWorkItemTrackingApi(config, signal);
			const comment = await witApi.addComment(
				{ text: params.text },
				config.project,
				params.workItemId,
			);

			if (!comment || !comment.id) {
				return errorResult(`Failed to add comment to work item #${params.workItemId}.`);
			}

			return textResult(
				[
					`✅ Added comment to work item #${params.workItemId}`,
					"",
					`> ${params.text}`,
					"",
					`Comment ID: ${comment.id}`,
				].join("\n"),
				{ workItemId: params.workItemId, commentId: comment.id },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Work item #${params.workItemId} not found.`);
			}
			return errorResult(`Failed to add comment: ${formatAdoError(err)}`);
		}
	},
};
