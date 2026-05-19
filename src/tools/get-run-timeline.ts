/**
 * azure_devops_get_run_timeline — Get stages/jobs/tasks timeline for a pipeline run.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getBuildApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatTimeline } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockGetRunTimeline } from "../mocks/mock-handler.js";

export const getRunTimelineTool = {
	name: "azure_devops_get_run_timeline",
	description:
		"Get the stages/jobs/tasks timeline for a pipeline run. Shows hierarchy, state, result, duration, and error counts.",
	parameters: Type.Object({
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
		params: { pipelineId: number; runId: number; mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

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
