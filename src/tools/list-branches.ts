/**
 * azure_devops_list_branches — List branches in a repository.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getGitApi } from "../utils/connection.ts";
import { formatAdoError, isNotFoundError } from "../utils/errors.ts";
import { formatBranchList } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockListBranches } from "../mocks/mock-handler.ts";

export const listBranchesTool = {
	name: "azure_devops_list_branches",
	description:
		"List branches in an Azure DevOps Git repository. Shows branch name, latest commit, and ahead/behind counts.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		repositoryId: Type.String({ description: "Repository ID or name" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List branches in an Azure DevOps repository",
	promptGuidelines: [
		"Use azure_devops_list_branches to see available branches before creating or reviewing PRs.",
	],

	async execute(
		_toolCallId: string,
		params: { repositoryId: string; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockListBranches(params.repositoryId);
		}

		try {
			const gitApi = await getGitApi(config, signal);
			const branches = await gitApi.getBranches(params.repositoryId, config.project);

			if (!branches || branches.length === 0) {
				return textResult(`No branches found in repository "${params.repositoryId}".`);
			}

			return textResult(
				formatBranchList(branches as any),
				{ repositoryId: params.repositoryId, count: branches.length },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Repository "${params.repositoryId}" not found.`);
			}
			return errorResult(`Failed to list branches: ${formatAdoError(err)}`);
		}
	},
};
