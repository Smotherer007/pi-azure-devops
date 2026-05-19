/**
 * azure_devops_get_pull_request — Get full details of a single pull request.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getGitApi } from "../utils/connection.js";
import { formatAdoError, isNotFoundError } from "../utils/errors.js";
import { formatPullRequest } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockGetPullRequest } from "../mocks/mock-handler.js";

export const getPullRequestTool = {
	name: "azure_devops_get_pull_request",
	description:
		"Get full details of an Azure DevOps pull request. Returns title, description, reviewers with votes, merge status, and branch info.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		pullRequestId: Type.Number({ description: "Pull request ID" }),
		repositoryId: Type.Optional(Type.String({ description: "Repository ID or name (optional — uses project-wide lookup if omitted)" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get details of an Azure DevOps pull request",
	promptGuidelines: [
		"Use azure_devops_get_pull_request for full PR details including description and reviewer votes.",
		"Provide repositoryId for repo-scoped lookup, or omit for project-wide lookup.",
	],

	async execute(
		_toolCallId: string,
		params: { pullRequestId: number; repositoryId?: string; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockGetPullRequest(params.pullRequestId);
		}

		try {
			const gitApi = await getGitApi(config, signal);
			let pr;

			if (params.repositoryId) {
				pr = await gitApi.getPullRequest(
					params.repositoryId,
					params.pullRequestId,
					config.project,
				);
			} else {
				pr = await gitApi.getPullRequestById(params.pullRequestId, config.project);
			}

			if (!pr || !pr.pullRequestId) {
				return errorResult(`Pull request #${params.pullRequestId} not found.`);
			}

			return textResult(formatPullRequest(pr as any), { pullRequestId: pr.pullRequestId });
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Pull request #${params.pullRequestId} not found.`);
			}
			return errorResult(`Failed to get pull request #${params.pullRequestId}: ${formatAdoError(err)}`);
		}
	},
};
