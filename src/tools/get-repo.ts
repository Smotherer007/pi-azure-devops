/**
 * azure_devops_get_repo — Get a single repository by ID or name.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getGitApi } from "../utils/connection.js";
import { formatAdoError, isNotFoundError } from "../utils/errors.js";
import { formatRepo } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockGetRepo } from "../mocks/mock-handler.js";

export const getRepoTool = {
	name: "azure_devops_get_repo",
	description:
		"Get details of a single Azure DevOps Git repository by ID or name. Returns name, default branch, size, and URL.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		repositoryId: Type.String({ description: "Repository ID or name" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get details of an Azure DevOps repository",
	promptGuidelines: [
		"Use azure_devops_get_repo when you need details about a specific repository.",
		"Accepts both repository ID (GUID) and repository name.",
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
			return mockGetRepo(params.repositoryId);
		}

		try {
			const gitApi = await getGitApi(config, signal);
			const repo = await gitApi.getRepository(params.repositoryId, config.project);

			if (!repo || !repo.id) {
				return errorResult(`Repository "${params.repositoryId}" not found.`);
			}

			return textResult(formatRepo(repo as any), { repositoryId: repo.id });
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Repository "${params.repositoryId}" not found.`);
			}
			return errorResult(`Failed to get repository "${params.repositoryId}": ${formatAdoError(err)}`);
		}
	},
};
