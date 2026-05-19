/**
 * azure_devops_get_run — Get a single pipeline run detail.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getPipelinesApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatRun } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockGetRun } from "../mocks/mock-handler.js";

export const getRunTool = {
	name: "azure_devops_get_run",
	description:
		"Get a single pipeline run by pipeline ID and run ID. Returns state, result, duration, branch, and parameters.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		pipelineId: Type.Number({ description: "Pipeline ID" }),
		runId: Type.Number({ description: "Run ID" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get run detail by pipeline ID and run ID",

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
			return mockGetRun(params.pipelineId, params.runId);
		}

		try {
			const pipelinesApi = await getPipelinesApi(config, signal);
			const run = await pipelinesApi.getRun(config.project, params.pipelineId, params.runId);

			if (!run) {
				return errorResult(`Run #${params.runId} not found for pipeline #${params.pipelineId}.`);
			}

			return textResult(formatRun(run as any), { pipelineId: params.pipelineId, runId: run.id });
		} catch (err) {
			return errorResult(`Failed to get run #${params.runId}: ${formatAdoError(err)}`);
		}
	},
};
