/**
 * azure_devops_get_run_artifacts — Get artifacts produced by a pipeline run.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getBuildApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatArtifactList } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockGetRunArtifacts } from "../mocks/mock-handler.js";

export const getRunArtifactsTool = {
	name: "azure_devops_get_run_artifacts",
	description:
		"Get artifacts produced by a pipeline run (build). Returns artifact name, type, and resource URL.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		pipelineId: Type.Number({ description: "Pipeline ID" }),
		runId: Type.Number({ description: "Run (build) ID" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get build artifacts for a run",

	async execute(
		_toolCallId: string,
		params: { pipelineId: number; runId: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockGetRunArtifacts(params.pipelineId, params.runId);
		}

		try {
			const buildApi = await getBuildApi(config, signal);
			const artifacts = await buildApi.getArtifacts(config.project, params.runId);

			if (!artifacts || artifacts.length === 0) {
				return textResult(`No artifacts for run #${params.runId}.`);
			}

			return textResult(formatArtifactList(artifacts as any), { count: artifacts.length });
		} catch (err) {
			return errorResult(`Failed to get artifacts for run #${params.runId}: ${formatAdoError(err)}`);
		}
	},
};
