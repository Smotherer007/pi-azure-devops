/**
 * azure_devops_update_pull_request — Update PR fields (title, description, status).
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getGitApi } from "../utils/connection.ts";
import { formatAdoError, isNotFoundError } from "../utils/errors.ts";
import { formatPullRequest } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockUpdatePullRequest } from "../mocks/mock-handler.ts";

const STATUS_MAP: Record<string, number> = {
	active: 1,
	abandoned: 2,
	completed: 3,
};

export const updatePullRequestTool = {
	name: "azure_devops_update_pull_request",
	description:
		"Update an Azure DevOps pull request — change title, description, or status (abandon/complete/reactivate).",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		repositoryId: Type.String({ description: "Repository ID or name" }),
		pullRequestId: Type.Number({ description: "Pull request ID" }),
		title: Type.Optional(Type.String({ description: "New title" })),
		description: Type.Optional(Type.String({ description: "New description" })),
		status: Type.Optional(Type.Union([
			Type.Literal("active"),
			Type.Literal("abandoned"),
			Type.Literal("completed"),
		], { description: "New status — active, abandoned, or completed" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Update an Azure DevOps pull request",
	promptGuidelines: [
		"Use azure_devops_update_pull_request to change PR title, description, or abandon/complete it.",
		"Set status to 'abandoned' to abandon, 'completed' to complete (merge), or 'active' to reactivate.",
	],

	async execute(
		_toolCallId: string,
		params: {
			repositoryId: string;
			pullRequestId: number;
			title?: string;
			description?: string;
			status?: string;
			mock?: boolean; org?: string; project?: string;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockUpdatePullRequest(params.repositoryId, params.pullRequestId, {
				title: params.title,
				description: params.description,
				status: params.status,
			});
		}

		try {
			const gitApi = await getGitApi(config, signal);

			const patch: Record<string, unknown> = {};
			if (params.title) patch.title = params.title;
			if (params.description) patch.description = params.description;
			if (params.status && STATUS_MAP[params.status] !== undefined) {
				patch.status = STATUS_MAP[params.status];
			}

			const pr = await gitApi.updatePullRequest(
				patch as any,
				params.repositoryId,
				params.pullRequestId,
				config.project,
			);

			if (!pr || !pr.pullRequestId) {
				return errorResult(`Failed to update pull request #${params.pullRequestId}.`);
			}

			const updated: string[] = [];
			if (params.title) updated.push("title");
			if (params.description) updated.push("description");
			if (params.status) updated.push(`status → ${params.status}`);

			return textResult(
				[
					`✅ Updated pull request #${params.pullRequestId}`,
					"",
					`Changed: ${updated.join(", ")}`,
					"",
					formatPullRequest(pr as any),
				].join("\n"),
				{ pullRequestId: pr.pullRequestId, repositoryId: params.repositoryId, fieldsUpdated: updated },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Pull request #${params.pullRequestId} not found.`);
			}
			return errorResult(`Failed to update pull request #${params.pullRequestId}: ${formatAdoError(err)}`);
		}
	},
};
