/**
 * azure_devops_list_test_cases — List test cases in a suite.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getTestPlanApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatTestCaseList } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockListTestCases } from "../mocks/mock-handler.ts";

export const listTestCasesTool = {
	name: "azure_devops_list_test_cases",
	description:
		"List test cases in a test suite. Returns case ID, title, state, assigned to, priority, and configurations.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		planId: Type.Number({ description: "Test plan ID" }),
		suiteId: Type.Number({ description: "Test suite ID" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List test cases in a suite",
	promptGuidelines: [
		"Use azure_devops_list_test_cases to see what tests exist in a suite.",
		"Test case IDs can be used with test points to track execution status.",
	],

	async execute(
		_toolCallId: string,
		params: { planId: number; suiteId: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockListTestCases(params.planId, params.suiteId);
		}

		try {
			const testPlanApi = await getTestPlanApi(config, signal);
			const cases = await testPlanApi.getTestCaseList(
				config.project,
				params.planId,
				params.suiteId,
			);

			if (!cases || cases.length === 0) {
				return textResult(`No test cases found in suite #${params.suiteId}.`);
			}

			return textResult(
				formatTestCaseList(cases as any),
				{ planId: params.planId, suiteId: params.suiteId, count: cases.length },
			);
		} catch (err) {
			return errorResult(`Failed to list test cases in suite #${params.suiteId}: ${formatAdoError(err)}`);
		}
	},
};
