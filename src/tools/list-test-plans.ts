/**
 * azure_devops_list_test_plans — List test plans in the project.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getTestPlanApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatTestPlanList } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockListTestPlans } from "../mocks/mock-handler.ts";

export const listTestPlansTool = {
	name: "azure_devops_list_test_plans",
	description:
		"List test plans in the configured Azure DevOps project. Returns plan name, ID, state, dates, owner, and root suite.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
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
		params: { owner?: string; filterActivePlans?: boolean; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

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
