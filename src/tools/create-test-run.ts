/**
 * azure_devops_create_test_run — Create a new test run from plan + suite point IDs.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getTestPlanApi, getTestResultsApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatTestRun } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockCreateTestRun } from "../mocks/mock-handler.js";

export const createTestRunTool = {
	name: "azure_devops_create_test_run",
	description:
		"Create a new test run from a test plan and selected suites. Collects test points from the specified suites and queues a run.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		planId: Type.Number({ description: "Test plan ID" }),
		suiteIds: Type.Array(Type.Number(), { description: "Suite IDs to include in the run" }),
		name: Type.Optional(Type.String({ description: "Run name (auto-generated if omitted)" })),
		comment: Type.Optional(Type.String({ description: "Comment for the run" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Create a test run from plan + suites",
	promptGuidelines: [
		"Use azure_devops_create_test_run to start a manual test execution session.",
		"You need the plan ID and at least one suite ID. Use azure_devops_list_test_suites first to find suite IDs.",
	],

	async execute(
		_toolCallId: string,
		params: {
			planId: number;
			suiteIds: number[];
			name?: string;
			comment?: string;
			mock?: boolean; org?: string; project?: string;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockCreateTestRun(params.planId, params.suiteIds, params.name);
		}

		try {
			const testPlanApi = await getTestPlanApi(config, signal);
			const testResultsApi = await getTestResultsApi(config, signal);

			const allPointIds: number[] = [];
			for (const suiteId of params.suiteIds) {
				const points = await testPlanApi.getPointsList(
					config.project,
					params.planId,
					suiteId,
				);
				if (points) {
					for (const p of points) {
						if (p.id) allPointIds.push(p.id);
					}
				}
			}

			if (allPointIds.length === 0) {
				return errorResult(
					`No test points found in the specified suites for plan #${params.planId}. ` +
					"Ensure the suites contain test cases with assigned configurations.",
				);
			}

			const runName = params.name ?? `Test Run - ${new Date().toISOString()}`;
			const runCreateModel: any = {
				name: runName,
				plan: { id: params.planId },
				pointIds: allPointIds,
				isAutomated: false,
				state: "NotStarted",
			};

			if (params.comment) {
				runCreateModel.comment = params.comment;
			}

			const run = await testResultsApi.createTestRun(runCreateModel, config.project);

			if (!run) {
				return errorResult("Failed to create test run — no response from API.");
			}

			return textResult(
				`✅ Created test run:\n\n${formatTestRun(run as any)}`,
				{ planId: params.planId, runId: run.id, name: runName },
			);
		} catch (err) {
			return errorResult(`Failed to create test run: ${formatAdoError(err)}`);
		}
	},
};
