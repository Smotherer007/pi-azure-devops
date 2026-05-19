/**
 * azure_devops_set_pull_request_autocomplete — Enable or disable auto-complete on a PR.
 *
 * When enabled, the PR will be merged automatically once all branch policies pass.
 * When disabled, manual completion is required.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getGitApi } from "../utils/connection.js";
import { formatAdoError, isNotFoundError } from "../utils/errors.js";
import { isMock, textResult, errorResult, type ToolResult, resolveEffectiveConfig, OrgParam, ProjectParam } from "./shared.js";

export const setPullRequestAutocompleteTool = {
	name: "azure_devops_set_pull_request_autocomplete",
	description:
		"Enable or disable auto-complete on an Azure DevOps pull request. " +
		"When enabled, the PR merges automatically once all branch policies are satisfied.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		repositoryId: Type.String({ description: "Repository ID or name" }),
		pullRequestId: Type.Number({ description: "Pull request ID" }),
		enabled: Type.Boolean({ description: "true to enable auto-complete, false to disable" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Enable or disable auto-complete on a PR",
	promptGuidelines: [
		"Use azure_devops_set_pull_request_autocomplete to auto-merge a PR when policies pass.",
	],

	async execute(
		_toolCallId: string,
		params: {
			repositoryId: string;
			pullRequestId: number;
			enabled: boolean;
			mock?: boolean; org?: string; project?: string;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return textResult(
				params.enabled
					? `✅ Auto-complete enabled for PR #${params.pullRequestId} (mock mode)\n\n⚠️ This is mock data — no pull request was actually updated.`
					: `✅ Auto-complete disabled for PR #${params.pullRequestId} (mock mode)\n\n⚠️ This is mock data — no pull request was actually updated.`,
				{ pullRequestId: params.pullRequestId, repositoryId: params.repositoryId, autoComplete: params.enabled, mock: true },
			);
		}

		try {
			const gitApi = await getGitApi(config, signal);

			// Set autoCompleteSetBy to the current identity (empty id = current user),
			// or null to disable.
			const patch: Record<string, unknown> = {
				autoCompleteSetBy: params.enabled ? { id: "" } : null,
			};

			const pr = await gitApi.updatePullRequest(
				patch as any,
				params.repositoryId,
				params.pullRequestId,
				config.project,
			);

			if (!pr || !pr.pullRequestId) {
				return errorResult(`Failed to update auto-complete for PR #${params.pullRequestId}.`);
			}

			const statusText = params.enabled ? "enabled" : "disabled";
			return textResult(
				`✅ Auto-complete ${statusText} for PR #${params.pullRequestId}` +
				(params.enabled ? "\n\nThe PR will merge automatically once all branch policies pass." : ""),
				{ pullRequestId: pr.pullRequestId, repositoryId: params.repositoryId, autoComplete: params.enabled },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Pull request #${params.pullRequestId} not found.`);
			}
			return errorResult(`Failed to set auto-complete for PR #${params.pullRequestId}: ${formatAdoError(err)}`);
		}
	},
};
