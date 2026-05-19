/**
 * azure_devops_get_test_run — Get a test run by ID with statistics.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getTestResultsApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatTestRun } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockGetTestRun } from "../mocks/mock-handler.js";

export const getTestRunTool = {
	name: "azure_devops_get_test_run",
	description:
		"Get a test run by ID with pass/fail statistics. Returns run name, state, plan, pass/fail/total counts, dates, and owner.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		runId: Type.Number({ description: "Test run ID" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get test run detail by ID",

	async execute(
		_toolCallId: string,
		params: { runId: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockGetTestRun(params.runId);
		}

		try {
			const testResultsApi = await getTestResultsApi(config, signal);
			const run = await testResultsApi.getTestRunById(config.project, params.runId, true);

			if (!run) {
				return errorResult(`Test run #${params.runId} not found.`);
			}

			return textResult(formatTestRun(run as any), { runId: run.id });
		} catch (err) {
			return errorResult(`Failed to get test run #${params.runId}: ${formatAdoError(err)}`);
		}
	},
};
