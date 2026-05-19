/**
 * azure_devops_list_test_plans — List test plans in the project.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getTestPlanApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatTestPlanList } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockListTestPlans } from "../mocks/mock-handler.js";

export const listTestPlansTool = {
	name: "azure_devops_list_test_plans",
	description:
		"List test plans in the configured Azure DevOps project. Returns plan name, ID, state, dates, owner, and root suite.",
	parameters: Type.Object({
		owner: Type.Optional(Type.String({ description: "Filter by owner display name or email" })),
		filterActivePlans: Type.Optional(Type.Boolean({ description: "Only return active plans" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List test plans in the project",
	promptGuidelines: [
		"Use azure_devops_list_test_plans to discover available test plans before drilling into suites or cases.",
		"Plan ID is required for suite/case/point tools.",
	],

	async execute(
		_toolCallId: string,
		params: { owner?: string; filterActivePlans?: boolean; mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

		if (isMock(config, params.mock)) {
			return mockListTestPlans({ filterActivePlans: params.filterActivePlans });
		}

		try {
			const testPlanApi = await getTestPlanApi(config, signal);
			const plans = await testPlanApi.getTestPlans(
				config.project,
				params.owner,
				undefined,
				true,
				params.filterActivePlans,
			);

			if (!plans || plans.length === 0) {
				return textResult("No test plans found in this project.");
			}

			return textResult(formatTestPlanList(plans as any), { count: plans.length });
		} catch (err) {
			return errorResult(`Failed to list test plans: ${formatAdoError(err)}`);
		}
	},
};
