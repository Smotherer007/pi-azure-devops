/**
 * azure_devops_link_pr_work_items — Link or unlink work items from a pull request.
 *
 * Links work items to a PR so they appear in the PR's "Work Items" panel and
 * are transitioned when the PR completes.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getGitApi } from "../utils/connection.js";
import { formatAdoError, isNotFoundError } from "../utils/errors.js";
import { isMock, textResult, errorResult, type ToolResult, resolveEffectiveConfig, OrgParam, ProjectParam } from "./shared.js";

export const linkPrWorkItemsTool = {
	name: "azure_devops_link_pr_work_items",
	description:
		"Link or unlink work items to/from an Azure DevOps pull request. " +
		"Linked work items appear in the PR overview and can be transitioned on PR completion.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		repositoryId: Type.String({ description: "Repository ID or name" }),
		pullRequestId: Type.Number({ description: "Pull request ID" }),
		workItemIds: Type.Array(Type.Number(), { description: "Work item IDs to link or unlink" }),
		operation: Type.Union([
			Type.Literal("add"),
			Type.Literal("remove"),
		], { description: "'add' to link work items, 'remove' to unlink them" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Link or unlink work items on a pull request",
	promptGuidelines: [
		"Use azure_devops_link_pr_work_items to associate work items with a pull request.",
		"Set operation to 'add' to link or 'remove' to unlink work items from a PR.",
	],

	async execute(
		_toolCallId: string,
		params: {
			repositoryId: string;
			pullRequestId: number;
			workItemIds: number[];
			operation: "add" | "remove";
			mock?: boolean; org?: string; project?: string;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			const verb = params.operation === "add" ? "Linked" : "Unlinked";
			const ids = params.workItemIds.map((id) => `#${id}`).join(", ");
			return textResult(
				`✅ ${verb} work item(s) ${ids} ${params.operation === "add" ? "to" : "from"} PR #${params.pullRequestId} (mock mode)\n\n⚠️ This is mock data — no changes were actually made.`,
				{ pullRequestId: params.pullRequestId, repositoryId: params.repositoryId, workItemIds: params.workItemIds, operation: params.operation, mock: true },
			);
		}

		try {
			const gitApi = await getGitApi(config, signal);

			// 1. Read current PR to get existing work item refs
			const pr = await gitApi.getPullRequest(
				params.repositoryId,
				params.pullRequestId,
				config.project,
				undefined,
				undefined,
				undefined,
				false,
				true, // includeWorkItemRefs
			);

			if (!pr || !pr.pullRequestId) {
				return errorResult(`Pull request #${params.pullRequestId} not found.`);
			}

			// 2. Build the new work item refs list
			const existingRefs: { id: string; url: string }[] = (pr.workItemRefs || []).map((ref) => ({
				id: ref.id || "",
				url: ref.url || "",
			}));

			const baseUrl = `${config.orgUrl}`;

			if (params.operation === "add") {
				for (const wiId of params.workItemIds) {
					const idStr = String(wiId);
					if (!existingRefs.some((ref) => ref.id === idStr)) {
						existingRefs.push({
							id: idStr,
							url: `${baseUrl}/_apis/wit/workItems/${wiId}`,
						});
					}
				}
			} else {
				const removeSet = new Set(params.workItemIds.map(String));
				const filtered = existingRefs.filter((ref) => !removeSet.has(ref.id));
				existingRefs.length = 0;
				existingRefs.push(...filtered);
			}

			// 3. Update the PR with the new work item refs
			const updatedPr = await gitApi.updatePullRequest(
				{ workItemRefs: existingRefs } as any,
				params.repositoryId,
				params.pullRequestId,
				config.project,
			);

			if (!updatedPr || !updatedPr.pullRequestId) {
				return errorResult(`Failed to update work item links for PR #${params.pullRequestId}.`);
			}

			const verb = params.operation === "add" ? "Linked" : "Unlinked";
			const ids = params.workItemIds.map((id) => `#${id}`).join(", ");
			return textResult(
				`✅ ${verb} work item(s) ${ids} ${params.operation === "add" ? "to" : "from"} PR #${params.pullRequestId}`,
				{ pullRequestId: updatedPr.pullRequestId, repositoryId: params.repositoryId, workItemIds: params.workItemIds, operation: params.operation },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Pull request #${params.pullRequestId} or repository "${params.repositoryId}" not found.`);
			}
			return errorResult(`Failed to link work items to PR #${params.pullRequestId}: ${formatAdoError(err)}`);
		}
	},
};
