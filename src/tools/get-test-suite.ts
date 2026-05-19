/**
 * azure_devops_get_test_suite — Get a single test suite by plan and suite ID.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getTestPlanApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatTestSuite } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockGetTestSuite } from "../mocks/mock-handler.js";

export const getTestSuiteTool = {
	name: "azure_devops_get_test_suite",
	description:
		"Get a single test suite by plan ID and suite ID. Returns suite name, type, parent, children count, and test case count.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		planId: Type.Number({ description: "Test plan ID" }),
		suiteId: Type.Number({ description: "Test suite ID" }),
		expand: Type.Optional(Type.Number({ description: "Suite expand level (0=none, 1=children, 2=defaultTesters)" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get test suite detail by plan and suite ID",

	async execute(
		_toolCallId: string,
		params: { planId: number; suiteId: number; expand?: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockGetTestSuite(params.planId, params.suiteId);
		}

		try {
			const testPlanApi = await getTestPlanApi(config, signal);
			const suite = await testPlanApi.getTestSuiteById(
				config.project,
				params.planId,
				params.suiteId,
				params.expand,
			);

			if (!suite) {
				return errorResult(`Test suite #${params.suiteId} not found in plan #${params.planId}.`);
			}

			return textResult(
				formatTestSuite(suite as any),
				{ planId: params.planId, suiteId: suite.id },
			);
		} catch (err) {
			return errorResult(`Failed to get test suite #${params.suiteId}: ${formatAdoError(err)}`);
		}
	},
};
