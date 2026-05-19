/**
 * azure_devops_create_pull_request — Create a new pull request.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getGitApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatPullRequest } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockCreatePullRequest } from "../mocks/mock-handler.js";

export const createPullRequestTool = {
	name: "azure_devops_create_pull_request",
	description:
		"Create a new Azure DevOps pull request. Requires repository, source branch, target branch, and title.",
	parameters: Type.Object({
		repositoryId: Type.String({ description: "Repository ID or name" }),
		sourceRefName: Type.String({ description: "Source branch (e.g. refs/heads/feature/login)" }),
		targetRefName: Type.String({ description: "Target branch (e.g. refs/heads/main)" }),
		title: Type.String({ description: "Pull request title" }),
		description: Type.Optional(Type.String({ description: "Pull request description (supports markdown)" })),
		isDraft: Type.Optional(Type.Boolean({ description: "Create as draft PR", default: false })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Create an Azure DevOps pull request",
	promptGuidelines: [
		"Use azure_devops_create_pull_request to create new PRs. Always specify repository, source, target, and title.",
		"Use azure_devops_list_branches first to discover available branches.",
	],

	async execute(
		_toolCallId: string,
		params: {
			repositoryId: string;
			sourceRefName: string;
			targetRefName: string;
			title: string;
			description?: string;
			isDraft?: boolean;
			mock?: boolean;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

		if (isMock(config, params.mock)) {
			return mockCreatePullRequest(
				params.repositoryId,
				params.title,
				params.sourceRefName,
				params.targetRefName,
				params.description,
			);
		}

		try {
			const gitApi = await getGitApi(config, signal);

			const prToCreate: Record<string, unknown> = {
				sourceRefName: params.sourceRefName,
				targetRefName: params.targetRefName,
				title: params.title,
			};

			if (params.description) {
				prToCreate.description = params.description;
			}
			if (params.isDraft) {
				prToCreate.isDraft = true;
			}

			const pr = await gitApi.createPullRequest(
				prToCreate as any,
				params.repositoryId,
				config.project,
			);

			if (!pr || !pr.pullRequestId) {
				return errorResult("Failed to create pull request — no ID returned from API.");
			}

			return textResult(
				[
					`✅ Created pull request #${pr.pullRequestId}`,
					"",
					formatPullRequest(pr as any),
				].join("\n"),
				{ pullRequestId: pr.pullRequestId, repositoryId: params.repositoryId },
			);
		} catch (err) {
			return errorResult(`Failed to create pull request: ${formatAdoError(err)}`);
		}
	},
};
