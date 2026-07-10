/**
 * azure_devops_get_run_timeline — Get stages/jobs/tasks timeline for a pipeline run.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getBuildApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatTimeline } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockGetRunTimeline } from "../mocks/mock-handler.ts";

export const getRunTimelineTool = {
	name: "azure_devops_get_run_timeline",
	description:
		"Get the stages/jobs/tasks timeline for a pipeline run. Shows hierarchy, state, result, duration, and error counts.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		pipelineId: Type.Number({ description: "Pipeline ID" }),
		runId: Type.Number({ description: "Run (build) ID" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get build timeline for a run",
	promptGuidelines: [
		"Use azure_devops_get_run_timeline to inspect failed runs — it shows which stage/job/task failed.",
		"Timeline records are hierarchical: Stage → Job → Task.",
	],

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
			return mockGetRunTimeline(params.pipelineId, params.runId);
		}

		try {
			const buildApi = await getBuildApi(config, signal);
			const timeline = await buildApi.getBuildTimeline(config.project, params.runId);

			if (!timeline || !timeline.records || timeline.records.length === 0) {
				return textResult(`No timeline for run #${params.runId}.`);
			}

			return textResult(
				`Timeline for run #${params.runId}:\n\n${formatTimeline(timeline as any)}`,
				{ count: timeline.records.length },
			);
		} catch (err) {
			return errorResult(`Failed to get timeline for run #${params.runId}: ${formatAdoError(err)}`);
		}
	},
};
