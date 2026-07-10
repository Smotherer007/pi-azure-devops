/**
 * azure_devops_get_test_plan — Get a single test plan by ID.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getTestPlanApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatTestPlan } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockGetTestPlan } from "../mocks/mock-handler.ts";

export const getTestPlanTool = {
	name: "azure_devops_get_test_plan",
	description:
		"Get a single test plan by ID. Returns name, state, iteration, dates, owner, root suite, and area path.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		planId: Type.Number({ description: "Test plan ID" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get test plan detail by ID",

	async execute(
		_toolCallId: string,
		params: { planId: number; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockGetTestPlan(params.planId);
		}

		try {
			const testPlanApi = await getTestPlanApi(config, signal);
			const plan = await testPlanApi.getTestPlanById(config.project, params.planId);

			if (!plan) {
				return errorResult(`Test plan #${params.planId} not found.`);
			}

			return textResult(formatTestPlan(plan as any), { planId: plan.id });
		} catch (err) {
			return errorResult(`Failed to get test plan #${params.planId}: ${formatAdoError(err)}`);
		}
	},
};
