/**
 * azure_devops_get_policy_evaluations — Get policy evaluation status for a PR.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getPolicyApi, getCoreApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatPolicyEvaluation } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockGetPolicyEvaluations } from "../mocks/mock-handler.ts";

export const getPolicyEvaluationsTool = {
	name: "azure_devops_get_policy_evaluations",
	description:
		"Get policy evaluation status for an Azure DevOps pull request. Shows whether each policy (reviewers, build, etc.) is approved, pending, or rejected.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
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
		params: { pullRequestId: number; repositoryId?: string; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockGetPolicyEvaluations(`vstfs://CodeReview/CodeReviewId/${params.pullRequestId}`);
		}

		try {
			const coreApi = await getCoreApi(config, signal);
			const projects = await coreApi.getProjects();
			const projectRef = projects?.find((p) => p.name === config.project);
			const projectId = projectRef?.id ?? config.project;

			const policyApi = await getPolicyApi(config, signal);
			const artifactId = `vstfs:///CodeReview/CodeReviewId/${projectId}/${params.pullRequestId}`;

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
