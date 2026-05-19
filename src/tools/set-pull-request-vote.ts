/**
 * azure_devops_set_pull_request_vote — Vote on a pull request.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getGitApi } from "../utils/connection.js";
import { formatAdoError, isNotFoundError } from "../utils/errors.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockSetPullRequestVote } from "../mocks/mock-handler.js";

const VOTE_MAP: Record<string, number> = {
	approve: 10,
	"approve-with-suggestions": 5,
	"waiting-for-author": -5,
	reject: -10,
	reset: 0,
};

const VOTE_LABELS: Record<string, string> = {
	approve: "Approved",
	"approve-with-suggestions": "Approved with suggestions",
	"waiting-for-author": "Waiting for author",
	reject: "Rejected",
	reset: "Vote reset (no vote)",
};

export const setPullRequestVoteTool = {
	name: "azure_devops_set_pull_request_vote",
	description:
		"Vote on an Azure DevOps pull request. Use approve, approve-with-suggestions, waiting-for-author, reject, or reset.",
	parameters: Type.Object({
		repositoryId: Type.String({ description: "Repository ID or name" }),
		pullRequestId: Type.Number({ description: "Pull request ID" }),
		vote: Type.Union([
			Type.Literal("approve"),
			Type.Literal("approve-with-suggestions"),
			Type.Literal("waiting-for-author"),
			Type.Literal("reject"),
			Type.Literal("reset"),
		], { description: "Vote value: approve, approve-with-suggestions, waiting-for-author, reject, or reset" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Vote on an Azure DevOps pull request",
	promptGuidelines: [
		"Use azure_devops_set_pull_request_vote to approve, reject, or request changes on a PR.",
		"'approve' = approve, 'approve-with-suggestions' = approve with minor comments, 'waiting-for-author' = request changes, 'reject' = reject.",
	],

	async execute(
		_toolCallId: string,
		params: {
			repositoryId: string;
			pullRequestId: number;
			vote: string;
			mock?: boolean;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);
		const voteValue = VOTE_MAP[params.vote];

		if (isMock(config, params.mock)) {
			return mockSetPullRequestVote(params.repositoryId, params.pullRequestId, voteValue);
		}

		try {
			const gitApi = await getGitApi(config, signal);

			// Use empty string as reviewerId to represent the current user
			const result = await gitApi.createPullRequestReviewer(
				{ vote: voteValue } as any,
				params.repositoryId,
				params.pullRequestId,
				"", // current authenticated user
				config.project,
			);

			const label = VOTE_LABELS[params.vote] ?? params.vote;
			return textResult(
				[
					`✅ Set vote on PR #${params.pullRequestId}: ${label}`,
				].join("\n"),
				{ pullRequestId: params.pullRequestId, repositoryId: params.repositoryId, vote: voteValue, voteLabel: label },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`PR #${params.pullRequestId} or repository "${params.repositoryId}" not found.`);
			}
			return errorResult(`Failed to set vote on PR #${params.pullRequestId}: ${formatAdoError(err)}`);
		}
	},
};
