/**
 * azure_devops_get_policy_evaluations — Get policy evaluation status for a PR.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getPolicyApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatPolicyEvaluation } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockGetPolicyEvaluations } from "../mocks/mock-handler.js";

export const getPolicyEvaluationsTool = {
	name: "azure_devops_get_policy_evaluations",
	description:
		"Get policy evaluation status for an Azure DevOps pull request. Shows whether each policy (reviewers, build, etc.) is approved, pending, or rejected.",
	parameters: Type.Object({
		pullRequestId: Type.Number({ description: "Pull request ID" }),
		repositoryId: Type.Optional(Type.String({ description: "Repository ID or name (used for artifact ID construction)" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Get PR policy evaluation status",
	promptGuidelines: [
		"Use azure_devops_get_policy_evaluations to check if a PR is ready to merge.",
		"Evaluations show approved ✅, running ⏳, or rejected ❌ for each policy.",
	],

	async execute(
		_toolCallId: string,
		params: { pullRequestId: number; repositoryId?: string; mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

		if (isMock(config, params.mock)) {
			return mockGetPolicyEvaluations(`vstfs://CodeReview/CodeReviewId/${params.pullRequestId}`);
		}

		try {
			const policyApi = await getPolicyApi(config, signal);
			const artifactId = `vstfs://CodeReview/CodeReviewId/${config.project}/${params.pullRequestId}`;

			const evaluations = await policyApi.getPolicyEvaluations(
				config.project,
				artifactId,
			);

			if (!evaluations || evaluations.length === 0) {
				return textResult(
					`No policy evaluations found for PR #${params.pullRequestId}.`,
					{ pullRequestId: params.pullRequestId, evaluationCount: 0 },
				);
			}

			const formatted = evaluations.map((e) => formatPolicyEvaluation(e as any)).join("\n");
			return textResult(
				`Policy evaluations for PR #${params.pullRequestId}:\n\n${formatted}`,
				{ pullRequestId: params.pullRequestId, evaluationCount: evaluations.length },
			);
		} catch (err) {
			return errorResult(`Failed to get policy evaluations for PR #${params.pullRequestId}: ${formatAdoError(err)}`);
		}
	},
};
