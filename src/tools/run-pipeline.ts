/**
 * azure_devops_run_pipeline — Queue a new pipeline run.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getPipelinesApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatRun } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockRunPipeline } from "../mocks/mock-handler.js";

export const runPipelineTool = {
	name: "azure_devops_run_pipeline",
	description:
		"Queue a new pipeline run. Optionally specify branch, template parameters, stages to skip, and variables.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		pipelineId: Type.Number({ description: "Pipeline ID to run" }),
		pipelineVersion: Type.Optional(Type.Number({ description: "Specific pipeline version to run" })),
		branch: Type.Optional(Type.String({ description: "Branch to build (e.g. main, feature/login). Defaults to repo default." })),
		templateParameters: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Template parameters as key-value pairs" })),
		stagesToSkip: Type.Optional(Type.Array(Type.String(), { description: "Stage names to skip" })),
		variables: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Build variables as key-value pairs" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Queue a new pipeline run",
	promptGuidelines: [
		"Use azure_devops_run_pipeline to trigger a CI/CD pipeline.",
		"Template parameters must match the YAML pipeline parameter names exactly.",
	],

	async execute(
		_toolCallId: string,
		params: {
			pipelineId: number;
			pipelineVersion?: number;
			branch?: string;
			templateParameters?: Record<string, string>;
			stagesToSkip?: string[];
			variables?: Record<string, string>;
			mock?: boolean; org?: string; project?: string;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockRunPipeline(params.pipelineId, params.branch, params.templateParameters);
		}

		try {
			const pipelinesApi = await getPipelinesApi(config, signal);

			const runParameters: any = {};

			if (params.branch) {
				const refName = params.branch.startsWith("refs/") ? params.branch : `refs/heads/${params.branch}`;
				runParameters.resources = {
					repositories: {
						self: { refName },
					},
				};
			}

			if (params.templateParameters) {
				runParameters.templateParameters = params.templateParameters;
			}

			if (params.stagesToSkip && params.stagesToSkip.length > 0) {
				runParameters.stagesToSkip = params.stagesToSkip;
			}

			if (params.variables) {
				runParameters.variables = Object.fromEntries(
					Object.entries(params.variables).map(([k, v]) => [k, { value: v }]),
				);
			}

			const run = await pipelinesApi.runPipeline(
				runParameters,
				config.project,
				params.pipelineId,
				params.pipelineVersion,
			);

			if (!run) {
				return errorResult("Failed to queue pipeline run — no response.");
			}

			return textResult(
				`✅ Queued pipeline run:\n\n${formatRun(run as any)}`,
				{ pipelineId: params.pipelineId, runId: run.id },
			);
		} catch (err) {
			return errorResult(`Failed to run pipeline #${params.pipelineId}: ${formatAdoError(err)}`);
		}
	},
};
