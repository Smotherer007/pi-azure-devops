/**
 * azure_devops_get_pipeline — Get a single pipeline by ID.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getPipelinesApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatPipeline } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockGetPipeline } from "../mocks/mock-handler.js";

export const getPipelineTool = {
	name: "azure_devops_get_pipeline",
	description:
		"Get a single YAML pipeline definition by ID. Returns name, folder, YAML path, and repository info.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		pipelineId: Type.Number({ description: "Pipeline ID" }),
		pipelineVersion: Type.Optional(Type.Number({ description: "Specific pipeline version" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get pipeline detail by ID",

	async execute(
		_toolCallId: string,
		params: { pipelineId: number; pipelineVersion?: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockGetPipeline(params.pipelineId);
		}

		try {
			const pipelinesApi = await getPipelinesApi(config, signal);
			const pipeline = await pipelinesApi.getPipeline(config.project, params.pipelineId, params.pipelineVersion);

			if (!pipeline) {
				return errorResult(`Pipeline #${params.pipelineId} not found.`);
			}

			return textResult(formatPipeline(pipeline as any), { pipelineId: pipeline.id });
		} catch (err) {
			return errorResult(`Failed to get pipeline #${params.pipelineId}: ${formatAdoError(err)}`);
		}
	},
};
