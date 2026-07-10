/**
 * azure_devops_list_pull_requests — List/search pull requests with optional filters.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getGitApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatPullRequestList } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockListPullRequests } from "../mocks/mock-handler.ts";

const PR_STATUS_MAP: Record<string, number> = {
	active: 1,
	abandoned: 2,
	completed: 3,
	all: 4,
};

export const listPullRequestsTool = {
	name: "azure_devops_list_pull_requests",
	description:
		"List or search Azure DevOps pull requests. Supports filtering by status, repository, creator, and branch names. Returns PR ID, title, status, author, and branch info.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		repositoryId: Type.Optional(Type.String({ description: "Repository ID or name to scope results" })),
		status: Type.Optional(Type.Union([
			Type.Literal("active"),
			Type.Literal("abandoned"),
			Type.Literal("completed"),
			Type.Literal("all"),
		], { description: "Filter by PR status. Defaults to active." })),
		creator: Type.Optional(Type.String({ description: "Filter by creator display name or email" })),
		reviewer: Type.Optional(Type.String({ description: "Filter by reviewer display name or email" })),
		sourceRefName: Type.Optional(Type.String({ description: "Filter by source branch (e.g. refs/heads/feature/login)" })),
		targetRefName: Type.Optional(Type.String({ description: "Filter by target branch (e.g. refs/heads/main)" })),
		top: Type.Optional(Type.Number({ description: "Maximum number of results", default: 100 })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List pull requests in Azure DevOps",
	promptGuidelines: [
		"Use azure_devops_list_pull_requests to find PRs before reviewing or voting.",
		"Defaults to active PRs if no status filter is provided.",
		"Use repositoryId to scope to a specific repo, or omit for project-wide search.",
	],

	async execute(
		_toolCallId: string,
		params: {
			repositoryId?: string;
			status?: string;
			creator?: string;
			reviewer?: string;
			sourceRefName?: string;
			targetRefName?: string;
			top?: number;
			mock?: boolean; org?: string; project?: string;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockListPullRequests({
				status: params.status,
				creator: params.creator,
				repositoryId: params.repositoryId,
			});
		}

		try {
			const gitApi = await getGitApi(config, signal);
			const criteria: Record<string, unknown> = {};

			if (params.status && PR_STATUS_MAP[params.status] !== undefined) {
				criteria.status = PR_STATUS_MAP[params.status];
			}
			if (params.sourceRefName) criteria.sourceRefName = params.sourceRefName;
			if (params.targetRefName) criteria.targetRefName = params.targetRefName;

			let prs;
			const top = params.top ?? 100;

			if (params.repositoryId) {
				prs = await gitApi.getPullRequests(
					params.repositoryId,
					criteria as any,
					config.project,
					undefined,
					undefined,
					top,
				);
			} else {
				prs = await gitApi.getPullRequestsByProject(
					config.project,
					criteria as any,
					undefined,
					undefined,
					top,
				);
			}

			if (!prs || prs.length === 0) {
				return textResult("No pull requests found matching the criteria.");
			}

			return textResult(
				formatPullRequestList(prs as any),
				{
					count: prs.length,
					...(params.repositoryId ? { repositoryId: params.repositoryId } : {}),
				},
			);
		} catch (err) {
			return errorResult(`Failed to list pull requests: ${formatAdoError(err)}`);
		}
	},
};
