/**
 * azure_devops_add_pull_request_comment — Add a comment to a PR (creates a new thread).
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getGitApi } from "../utils/connection.js";
import { formatAdoError, isNotFoundError } from "../utils/errors.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockAddPullRequestComment } from "../mocks/mock-handler.js";

const THREAD_STATUS_MAP: Record<string, number> = {
	active: 1,
	closed: 4,
	pending: 6,
};

export const addPullRequestCommentTool = {
	name: "azure_devops_add_pull_request_comment",
	description:
		"Add a comment to an Azure DevOps pull request. Creates a new comment thread on the PR.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		repositoryId: Type.String({ description: "Repository ID or name" }),
		pullRequestId: Type.Number({ description: "Pull request ID" }),
		content: Type.String({ description: "Comment text" }),
		threadStatus: Type.Optional(Type.Union([
			Type.Literal("active"),
			Type.Literal("closed"),
			Type.Literal("pending"),
		], { description: "Thread status. Defaults to active.", default: "active" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Comment on an Azure DevOps pull request",
	promptGuidelines: [
		"Use azure_devops_add_pull_request_comment to add feedback or questions on a PR.",
		"Set threadStatus to 'closed' to resolve a thread, or 'pending' for follow-up.",
	],

	async execute(
		_toolCallId: string,
		params: {
			repositoryId: string;
			pullRequestId: number;
			content: string;
			threadStatus?: string;
			mock?: boolean; org?: string; project?: string;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockAddPullRequestComment(params.repositoryId, params.pullRequestId, params.content);
		}

		try {
			const gitApi = await getGitApi(config, signal);

			const threadStatus = THREAD_STATUS_MAP[params.threadStatus ?? "active"] ?? 1;

			const thread = await gitApi.createThread(
				{
					status: threadStatus as any,
					comments: [
						{
							content: params.content,
							commentType: 1, // Text
						} as any,
					],
				} as any,
				params.repositoryId,
				params.pullRequestId,
				config.project,
			);

			if (!thread || !thread.id) {
				return errorResult(`Failed to add comment to PR #${params.pullRequestId}.`);
			}

			return textResult(
				[
					`✅ Added comment to PR #${params.pullRequestId} (thread #${thread.id})`,
					"",
					`> ${params.content}`,
				].join("\n"),
				{ pullRequestId: params.pullRequestId, repositoryId: params.repositoryId, threadId: thread.id },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`PR #${params.pullRequestId} or repository "${params.repositoryId}" not found.`);
			}
			return errorResult(`Failed to add comment to PR #${params.pullRequestId}: ${formatAdoError(err)}`);
		}
	},
};
