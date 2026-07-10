/**
 * azure_devops_list_test_runs — List test runs, optionally filtered by plan or build.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getTestResultsApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatTestRunList } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockListTestRuns } from "../mocks/mock-handler.ts";

export const listTestRunsTool = {
	name: "azure_devops_list_test_runs",
	description:
		"List test runs in the project. Optionally filter by plan ID, build URI, or owner. Returns run ID, name, state, pass/total counts, and date.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		planId: Type.Optional(Type.Number({ description: "Filter by test plan ID" })),
		buildUri: Type.Optional(Type.String({ description: "Filter by build URI" })),
		owner: Type.Optional(Type.String({ description: "Filter by owner display name" })),
		top: Type.Optional(Type.Number({ description: "Maximum number of runs to return", default: 25 })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List test runs with optional filters",
	promptGuidelines: [
		"Use azure_devops_list_test_runs to see recent test executions.",
		"Filter by planId to see runs for a specific test plan.",
	],

	async execute(
		_toolCallId: string,
		params: { planId?: number; buildUri?: string; owner?: string; top?: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockListTestRuns({ planId: params.planId });
		}

		try {
			const testResultsApi = await getTestResultsApi(config, signal);
			const runs = await testResultsApi.getTestRuns(
				config.project,
				params.buildUri,
				params.owner,
				undefined,
				params.planId,
				true,
				undefined,
				undefined,
				params.top ?? 25,
			);

			if (!runs || runs.length === 0) {
				return textResult("No test runs found matching the criteria.");
			}

			return textResult(formatTestRunList(runs as any), { count: runs.length });
		} catch (err) {
			return errorResult(`Failed to list test runs: ${formatAdoError(err)}`);
		}
	},
};
