/**
 * azure_devops_update_test_results — Update test case outcomes in a run.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getTestResultsApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatTestResultList } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockUpdateTestResults } from "../mocks/mock-handler.ts";

const OUTCOME_MAP: Record<string, number> = {
	passed: 2,
	failed: 3,
	inconclusive: 4,
	timeout: 5,
	aborted: 6,
	blocked: 7,
	notExecuted: 8,
	warning: 9,
	error: 10,
	notApplicable: 11,
	paused: 12,
	inProgress: 13,
	notImpacted: 14,
};

export const updateTestResultsTool = {
	name: "azure_devops_update_test_results",
	description:
		"Update test case results in a test run. Set outcome (passed, failed, blocked, etc.) and optional comment for each result.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		runId: Type.Number({ description: "Test run ID" }),
		results: Type.Array(
			Type.Object({
				id: Type.Number({ description: "Test case result ID (from test run results)" }),
				outcome: Type.String({ description: "Outcome: passed, failed, blocked, inconclusive, timeout, aborted, notExecuted, warning, error, notApplicable, paused, inProgress, notImpacted" }),
				comment: Type.Optional(Type.String({ description: "Comment for this result" })),
			}),
			{ description: "Array of result updates" },
		),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Update test outcomes in a run",
	promptGuidelines: [
		"Use azure_devops_update_test_results to record pass/fail outcomes for test cases in a run.",
		"Get the result IDs from azure_devops_get_test_run or the test results API first.",
	],

	async execute(
		_toolCallId: string,
		params: {
			runId: number;
			results: Array<{ id: number; outcome: string; comment?: string }>;
			mock?: boolean; org?: string; project?: string;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockUpdateTestResults(
				params.runId,
				params.results.map((r) => ({
					testCaseResultId: r.id,
					outcome: r.outcome,
					comment: r.comment,
				})),
			);
		}

		try {
			const testResultsApi = await getTestResultsApi(config, signal);

			const updatePayload = params.results.map((r) => {
				const outcomeValue = OUTCOME_MAP[r.outcome];
				if (outcomeValue === undefined) {
					throw new Error(`Unknown outcome "${r.outcome}". Valid: ${Object.keys(OUTCOME_MAP).join(", ")}`);
				}
				const entry: any = {
					id: r.id,
					outcome: outcomeValue,
				};
				if (r.comment) {
					entry.comment = r.comment;
				}
				return entry;
			});

			const updated = await testResultsApi.updateTestResults(updatePayload, config.project, params.runId);

			if (!updated || updated.length === 0) {
				return errorResult("No results were updated — API returned empty response.");
			}

			return textResult(
				`✅ Updated ${updated.length} result(s) in run #${params.runId}:\n\n${formatTestResultList(updated as any)}`,
				{ runId: params.runId, updatedCount: updated.length },
			);
		} catch (err) {
			return errorResult(`Failed to update test results in run #${params.runId}: ${formatAdoError(err)}`);
		}
	},
};
