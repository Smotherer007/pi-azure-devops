/**
 * azure_devops_list_test_suites — List test suites for a plan.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getTestPlanApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatTestSuiteList } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockListTestSuites } from "../mocks/mock-handler.js";

export const listTestSuitesTool = {
	name: "azure_devops_list_test_suites",
	description:
		"List test suites for a test plan. Returns suite ID, name, type (static, dynamic, requirement-based), parent, and test case count.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		planId: Type.Number({ description: "Test plan ID" }),
		expand: Type.Optional(Type.Number({ description: "Suite expand level (0=none, 1=children, 2=defaultTesters)" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List test suites for a plan",
	promptGuidelines: [
		"Use azure_devops_list_test_suites to browse the suite hierarchy within a test plan.",
		"Suite ID is required for listing test cases and test points.",
	],

	async execute(
		_toolCallId: string,
		params: { planId: number; expand?: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockListTestSuites(params.planId);
		}

		try {
			const testPlanApi = await getTestPlanApi(config, signal);
			const suites = await testPlanApi.getTestSuitesForPlan(
				config.project,
				params.planId,
				params.expand,
			);

			if (!suites || suites.length === 0) {
				return textResult(`No test suites found for plan #${params.planId}.`);
			}

			return textResult(
				formatTestSuiteList(suites as any),
				{ planId: params.planId, count: suites.length },
			);
		} catch (err) {
			return errorResult(`Failed to list test suites for plan #${params.planId}: ${formatAdoError(err)}`);
		}
	},
};
