/**
 * azure_devops_get_pull_request_commits — Get commits in a pull request.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getGitApi } from "../utils/connection.ts";
import { formatAdoError, isNotFoundError } from "../utils/errors.ts";
import { formatCommitList } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockGetPullRequestCommits } from "../mocks/mock-handler.ts";

export const getPullRequestCommitsTool = {
	name: "azure_devops_get_pull_request_commits",
	description:
		"Get commits in an Azure DevOps pull request. Shows short SHA, author, message, and date for each commit.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		repositoryId: Type.String({ description: "Repository ID or name" }),
		pullRequestId: Type.Number({ description: "Pull request ID" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get commits in a PR",
	promptGuidelines: [
		"Use azure_devops_get_pull_request_commits to see what changes a PR contains.",
		"Useful for writing PR descriptions or understanding the scope of changes.",
	],

	async execute(
		_toolCallId: string,
		params: { repositoryId: string; pullRequestId: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockGetPullRequestCommits(params.repositoryId, params.pullRequestId);
		}

		try {
			const gitApi = await getGitApi(config, signal);
			const commits = await gitApi.getPullRequestCommits(
				params.repositoryId,
				params.pullRequestId,
				config.project,
			);

			if (!commits || commits.length === 0) {
				return textResult(
					`No commits in PR #${params.pullRequestId}.`,
					{ pullRequestId: params.pullRequestId, commitCount: 0 },
				);
			}

			return textResult(
				`Commits in PR #${params.pullRequestId}:\n\n${formatCommitList(commits as any)}`,
				{ pullRequestId: params.pullRequestId, commitCount: commits.length },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`PR #${params.pullRequestId} or repository "${params.repositoryId}" not found.`);
			}
			return errorResult(`Failed to get PR commits: ${formatAdoError(err)}`);
		}
	},
};
