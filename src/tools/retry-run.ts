/**
 * azure_devops_retry_run — Retry a failed or partially succeeded pipeline run.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getBuildApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockRetryRun } from "../mocks/mock-handler.js";

export const retryRunTool = {
	name: "azure_devops_retry_run",
	description:
		"Retry a failed or partially succeeded pipeline run. Creates a new run based on the original.",
	parameters: Type.Object({
		pipelineId: Type.Number({ description: "Pipeline ID" }),
		runId: Type.Number({ description: "Run (build) ID to retry" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Retry a failed pipeline run",

	async execute(
		_toolCallId: string,
		params: { pipelineId: number; runId: number; mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

		if (isMock(config, params.mock)) {
			return mockRetryRun(params.pipelineId, params.runId);
		}

		try {
			const buildApi = await getBuildApi(config, signal);

			const updated = await buildApi.updateBuild(
				{} as any,
				config.project,
				params.runId,
				true, // retry
			);

			return textResult(
				[
					`✅ Retried run #${params.runId}`,
					"",
					`- **Pipeline:** #${params.pipelineId}`,
					`- **New run:** #${updated?.id ?? "?"}`,
					`- **Status:** ${updated?.status ?? "queued"}`,
				].join("\n"),
				{ pipelineId: params.pipelineId, originalRunId: params.runId, newRunId: updated?.id },
			);
		} catch (err) {
			return errorResult(`Failed to retry run #${params.runId}: ${formatAdoError(err)}`);
		}
	},
};
