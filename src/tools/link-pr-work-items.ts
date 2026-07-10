/**
 * azure_devops_link_pr_work_items — Link or unlink work items from a pull request.
 *
 * Uses the WorkItemTracking REST API with api-version=7.0 to add/remove
 * ArtifactLink relations on work items. The azure-devops-node-api SDK's
 * updateWorkItem uses 7.1-preview.3 which silently drops ArtifactLinks.
 *
 * The PR update endpoint also silently ignores workItemRefs in the body,
 * so ArtifactLink on the work item is the only reliable approach.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getGitApi, getWorkItemTrackingApi, getConnection } from "../utils/connection.ts";
import { formatAdoError, isNotFoundError } from "../utils/errors.ts";
import { isMock, textResult, errorResult, type ToolResult, resolveEffectiveConfig, OrgParam, ProjectParam } from "./shared.ts";

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
			// 1. Verify the PR exists and resolve project/repo GUIDs from it
			const gitApi = await getGitApi(config, signal);
			const pr = await gitApi.getPullRequest(
				params.repositoryId,
				params.pullRequestId,
				config.project,
			);

			if (!pr || !pr.pullRequestId) {
				return errorResult(`Pull request #${params.pullRequestId} not found.`);
			}

			// 2. Build the PR artifact URI — must use GUIDs and %2F separators
			// Format: vstfs:///Git/PullRequestId/{projectId}%2F{repoId}%2F{prId}
			const projectId = (pr.repository as any)?.project?.id || "";
			const repoGuid = (pr.repository as any)?.id || params.repositoryId;
			if (!projectId || !repoGuid) {
				return errorResult(`Could not resolve project/repo GUIDs from PR #${params.pullRequestId}.`);
			}
			const artifactUri = `vstfs:///Git/PullRequestId/${projectId}%2F${repoGuid}%2F${params.pullRequestId}`;

			// 3. Add or remove artifact links using REST API with api-version=7.0
			// The azure-devops-node-api SDK's updateWorkItem uses 7.1-preview.3,
			// which does NOT work for adding ArtifactLink relations. We must use
			// the connection's REST client with version 7.0 (same auth/connection).
			const connection = await getConnection(config, signal);
			const results: string[] = [];
			const errors: string[] = [];

			for (const wiId of params.workItemIds) {
				try {
					const wiUrl = `${config.orgUrl}/${config.project}/_apis/wit/workitems/${wiId}?api-version=7.0`;

					if (params.operation === "add") {
						// PATCH with json-patch+json to add the ArtifactLink
						await connection.rest.update(wiUrl, [
							{
								op: "add",
								path: "/relations/-",
								value: {
									rel: "ArtifactLink",
									url: artifactUri,
									attributes: { name: "Pull Request" },
								},
							},
						], {
							additionalHeaders: { "Content-Type": "application/json-patch+json" },
						});
						results.push(`#${wiId}`);
					} else {
						// Remove: fetch relations first to find the artifact link index
						const witApi = await getWorkItemTrackingApi(config, signal);
						const wi = await witApi.getWorkItem(wiId, undefined, undefined, 2 /* Relations */, config.project);
						const relations: Array<{ rel?: string; url?: string }> = (wi as any).relations ?? [];
						const idx = relations.findIndex(
							(r) => r.rel === "ArtifactLink" && r.url === artifactUri,
						);

						if (idx >= 0) {
							await connection.rest.update(wiUrl, [
								{ op: "remove", path: `/relations/${idx}` },
							], {
								additionalHeaders: { "Content-Type": "application/json-patch+json" },
							});
							results.push(`#${wiId}`);
						} else {
							errors.push(`#${wiId}: not linked to this PR`);
						}
					}
				} catch (err) {
					errors.push(`#${wiId}: ${formatAdoError(err)}`);
				}
			}

			// 4. Build the response
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
					artifactUri,
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
