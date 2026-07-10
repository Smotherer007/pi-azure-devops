/**
 * azure_devops_list_repos — List all Git repositories in the project.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getGitApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatRepoList } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockListRepos } from "../mocks/mock-handler.ts";

export const listReposTool = {
	name: "azure_devops_list_repos",
	description:
		"List all Git repositories in the configured Azure DevOps project. Returns repo name, ID, default branch, and size.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		includeHidden: Type.Optional(Type.Boolean({ description: "Include hidden repositories", default: false })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List Git repositories in the project",
	promptGuidelines: [
		"Use azure_devops_list_repos to discover available repositories before working with branches or PRs.",
		"Repository ID or name is required for branch and PR tools.",
	],

	async execute(
		_toolCallId: string,
		params: { includeHidden?: boolean; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockListRepos();
		}

		try {
			const gitApi = await getGitApi(config, signal);
			const repos = await gitApi.getRepositories(config.project, undefined, undefined, params.includeHidden);

			if (!repos || repos.length === 0) {
				return textResult("No repositories found in this project.");
			}

			return textResult(formatRepoList(repos as any), { count: repos.length });
		} catch (err) {
			return errorResult(`Failed to list repositories: ${formatAdoError(err)}`);
		}
	},
};
