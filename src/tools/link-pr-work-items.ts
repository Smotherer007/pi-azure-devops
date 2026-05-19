/**
 * azure_devops_link_pr_work_items — Link or unlink work items from a pull request.
 *
 * Uses the Pull Request Work Items REST API directly:
 *   Add:    PATCH /_apis/git/repositories/{repoId}/pullRequests/{prId}/workitems/{wiId}
 *   Remove: DELETE /_apis/git/repositories/{repoId}/pullRequests/{prId}/workitems/{wiId}
 *
 * The ArtifactLink approach via WorkItemTracking was unreliable — the link
 * didn't appear in the PR's "Work Items" tab. The REST API is the canonical way.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getGitApi, getCoreApi, getConnection } from "../utils/connection.js";
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
			// 1. Resolve the project ID (GUID) needed for the artifact URI
			const coreApi = await getCoreApi(config, signal);
			const project = await coreApi.getProject(config.project);
			if (!project || !project.id) {
				return errorResult(`Project "${config.project}" not found.`);
			}

			// 2. Verify the PR exists (also gives us the repo GUID if needed)
			const gitApi = await getGitApi(config, signal);
			const pr = await gitApi.getPullRequest(
				params.repositoryId,
				params.pullRequestId,
				config.project,
			);

			if (!pr || !pr.pullRequestId) {
				return errorResult(`Pull request #${params.pullRequestId} not found.`);
			}

			// 3. Resolve repository GUID (required by the REST API)
			const repoGuid = (pr.repository as any)?.id;
			if (!repoGuid) {
				return errorResult(`Could not determine repository GUID from PR #${params.pullRequestId}.`);
			}

			// 4. Add or remove work items using the PR Work Items REST API
			const connection = await getConnection(config, signal);
			const results: string[] = [];
			const errors: string[] = [];

			for (const wiId of params.workItemIds) {
				try {
					// Build the REST URL for this work item
					const url = `${config.orgUrl}/${config.project}/_apis/git/repositories/${repoGuid}/pullRequests/${params.pullRequestId}/workitems/${wiId}?api-version=7.1-preview.1`;

					if (params.operation === "add") {
						// PATCH adds the work item to the PR
						await connection.rest.update(url, null);
						results.push(`#${wiId}`);
					} else {
						// DELETE removes the work item from the PR
						await connection.rest.del(url);
						results.push(`#${wiId}`);
					}
				} catch (err) {
					errors.push(`#${wiId}: ${formatAdoError(err)}`);
				}
			}

			// 5. Build the response
			const verb = params.operation === "add" ? "Linked" : "Unlinked";
			const successPart = results.length > 0
				? `✅ ${verb} work item(s) ${results.join(", ")} ${params.operation === "add" ? "to" : "from"} PR #${params.pullRequestId}`
				: `⚠️ No work items were ${params.operation === "add" ? "linked" : "unlinked"}.`;

			const errorPart = errors.length > 0 ? `\n\n❌ Errors:\n${errors.map((e) => `- ${e}`).join("\n")}` : "";

			return textResult(
				`${successPart}${errorPart}`,
				{
					pullRequestId: params.pullRequestId,
					repositoryId: params.repositoryId,
					repoGuid,
					workItemIds: params.workItemIds,
					operation: params.operation,
					linked: results,
					errors: errors.length > 0 ? errors : undefined,
				},
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Pull request #${params.pullRequestId} or repository "${params.repositoryId}" not found.`);
			}
			return errorResult(`Failed to link work items to PR #${params.pullRequestId}: ${formatAdoError(err)}`);
		}
	},
};
