/**
 * azure_devops_cancel_run — Cancel an in-progress pipeline run.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getBuildApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockCancelRun } from "../mocks/mock-handler.ts";

/** BuildStatus.Cancelling — used to cancel an in-progress build */
const BUILD_STATUS_CANCELLING = 4;

export const cancelRunTool = {
	name: "azure_devops_cancel_run",
	description:
		"Cancel an in-progress pipeline run (build). Sets the build status to cancelling.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		pipelineId: Type.Number({ description: "Pipeline ID" }),
		runId: Type.Number({ description: "Run (build) ID to cancel" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Cancel a running pipeline",

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
			return mockCancelRun(params.pipelineId, params.runId);
		}

		try {
			const buildApi = await getBuildApi(config, signal);

			await buildApi.updateBuild(
				{ status: BUILD_STATUS_CANCELLING } as any,
				config.project,
				params.runId,
			);

			return textResult(
				[
					`✅ Cancelled run #${params.runId}`,
					"",
					`- **Pipeline:** #${params.pipelineId}`,
					`- **Status:** cancelling`,
				].join("\n"),
				{ pipelineId: params.pipelineId, runId: params.runId },
			);
		} catch (err) {
			return errorResult(`Failed to cancel run #${params.runId}: ${formatAdoError(err)}`);
		}
	},
};
