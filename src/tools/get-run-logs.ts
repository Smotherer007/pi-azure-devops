/**
 * azure_devops_get_run_logs — Get log entries for a pipeline run.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getBuildApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockGetRunLogs } from "../mocks/mock-handler.ts";

export const getRunLogsTool = {
	name: "azure_devops_get_run_logs",
	description:
		"Get log entries for a pipeline run (build). Returns log IDs with line counts and timestamps.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		pipelineId: Type.Number({ description: "Pipeline ID" }),
		runId: Type.Number({ description: "Run (build) ID" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get build logs for a run",

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
			return mockGetRunLogs(params.pipelineId, params.runId);
		}

		try {
			const buildApi = await getBuildApi(config, signal);
			const logs = await buildApi.getBuildLogs(config.project, params.runId);

			if (!logs || logs.length === 0) {
				return textResult(`No logs for run #${params.runId}.`);
			}

			const lines = logs.map((log: any) => {
				const created = log.createdOn ? new Date(log.createdOn).toISOString().slice(0, 19).replace("T", " ") : "?";
				return `Log #${log.id ?? "?"} (${log.lineCount ?? 0} lines) — ${created}`;
			});

			return textResult(
				`Logs for run #${params.runId}:\n\n${lines.join("\n")}`,
				{ count: logs.length },
			);
		} catch (err) {
			return errorResult(`Failed to get logs for run #${params.runId}: ${formatAdoError(err)}`);
		}
	},
};
