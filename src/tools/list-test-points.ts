/**
 * azure_devops_list_test_points — List test points in a suite.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getTestPlanApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatTestPointList } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockListTestPoints } from "../mocks/mock-handler.js";

export const listTestPointsTool = {
	name: "azure_devops_list_test_points",
	description:
		"List test points in a test suite. Shows current outcome, assigned tester, and configuration for each point — useful for 'who's testing what' queries.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		planId: Type.Number({ description: "Test plan ID" }),
		suiteId: Type.Number({ description: "Test suite ID" }),
		testCaseId: Type.Optional(Type.String({ description: "Filter by test case ID" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List test points in a suite (outcome, tester, config)",
	promptGuidelines: [
		"Use azure_devops_list_test_points to see execution status per tester/configuration.",
		"Test points represent a test case × configuration × tester assignment.",
	],

	async execute(
		_toolCallId: string,
		params: { planId: number; suiteId: number; testCaseId?: string; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockListTestPoints(params.planId, params.suiteId);
		}

		try {
			const testPlanApi = await getTestPlanApi(config, signal);
			const points = await testPlanApi.getPointsList(
				config.project,
				params.planId,
				params.suiteId,
				undefined,
				params.testCaseId,
			);

			if (!points || points.length === 0) {
				return textResult(`No test points found in suite #${params.suiteId}.`);
			}

			return textResult(
				formatTestPointList(points as any),
				{ planId: params.planId, suiteId: params.suiteId, count: points.length },
			);
		} catch (err) {
			return errorResult(`Failed to list test points in suite #${params.suiteId}: ${formatAdoError(err)}`);
		}
	},
};
