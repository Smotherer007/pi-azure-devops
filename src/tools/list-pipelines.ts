/**
 * azure_devops_list_pipelines — List YAML pipelines in the project.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getPipelinesApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatPipelineList } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockListPipelines } from "../mocks/mock-handler.ts";

export const listPipelinesTool = {
	name: "azure_devops_list_pipelines",
	description:
		"List YAML pipelines (definitions) in the configured Azure DevOps project. Returns pipeline name, ID, folder, and YAML path.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		top: Type.Optional(Type.Number({ description: "Maximum number of pipelines to return", default: 50 })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List pipelines in the project",
	promptGuidelines: [
		"Use azure_devops_list_pipelines to discover available pipelines before running or inspecting runs.",
		"Pipeline ID is required for most pipeline-related tools.",
	],

	async execute(
		_toolCallId: string,
		params: { top?: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockListPipelines();
		}

		try {
			const pipelinesApi = await getPipelinesApi(config, signal);
			const pipelines = await pipelinesApi.listPipelines(config.project, undefined, params.top);

			if (!pipelines || pipelines.length === 0) {
				return textResult("No pipelines found in this project.");
			}

			return textResult(formatPipelineList(pipelines as any), { count: pipelines.length });
		} catch (err) {
			return errorResult(`Failed to list pipelines: ${formatAdoError(err)}`);
		}
	},
};
