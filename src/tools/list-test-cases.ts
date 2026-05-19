/**
 * azure_devops_list_test_cases — List test cases in a suite.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getTestPlanApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatTestCaseList } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockListTestCases } from "../mocks/mock-handler.js";

export const listTestCasesTool = {
	name: "azure_devops_list_test_cases",
	description:
		"List test cases in a test suite. Returns case ID, title, state, assigned to, priority, and configurations.",
	parameters: Type.Object({
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
		params: { planId: number; suiteId: number; mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

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
