/**
 * azure_devops_get_pull_request_threads — Get comment threads on a pull request.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getGitApi } from "../utils/connection.js";
import { formatAdoError, isNotFoundError } from "../utils/errors.js";
import { formatPullRequestThread } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockGetPullRequestThreads } from "../mocks/mock-handler.js";

export const getPullRequestThreadsTool = {
	name: "azure_devops_get_pull_request_threads",
	description:
		"Get comment threads on an Azure DevOps pull request. Shows thread status and all comments with authors.",
	parameters: Type.Object({
		repositoryId: Type.String({ description: "Repository ID or name" }),
		pullRequestId: Type.Number({ description: "Pull request ID" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get PR comment threads",
	promptGuidelines: [
		"Use azure_devops_get_pull_request_threads to review PR discussion and feedback.",
		"Threads show Active, Fixed, Won't Fix, Pending, etc. statuses.",
	],

	async execute(
		_toolCallId: string,
		params: { repositoryId: string; pullRequestId: number; mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

		if (isMock(config, params.mock)) {
			return mockGetPullRequestThreads(params.repositoryId, params.pullRequestId);
		}

		try {
			const gitApi = await getGitApi(config, signal);
			const threads = await gitApi.getThreads(
				params.repositoryId,
				params.pullRequestId,
				config.project,
			);

			if (!threads || threads.length === 0) {
				return textResult(
					`No comment threads on PR #${params.pullRequestId}.`,
					{ pullRequestId: params.pullRequestId, threadCount: 0 },
				);
			}

			const formatted = threads.map((t) => formatPullRequestThread(t as any)).join("\n");
			return textResult(
				`Comment threads on PR #${params.pullRequestId}:\n\n${formatted}`,
				{ pullRequestId: params.pullRequestId, threadCount: threads.length },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`PR #${params.pullRequestId} or repository "${params.repositoryId}" not found.`);
			}
			return errorResult(`Failed to get PR threads: ${formatAdoError(err)}`);
		}
	},
};
