/**
 * azure_devops_list_policies — List branch/PR policies for the project.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getPolicyApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatPolicy } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockListPolicies } from "../mocks/mock-handler.js";

export const listPoliciesTool = {
	name: "azure_devops_list_policies",
	description:
		"List branch and PR policies configured for the Azure DevOps project. Shows policy type, blocking status, scope, and settings.",
	parameters: Type.Object({
		scope: Type.Optional(Type.String({ description: "Filter by scope (e.g. refs/heads/main)" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List Azure DevOps branch/PR policies",
	promptGuidelines: [
		"Use azure_devops_list_policies to understand what checks are required before merging.",
		"Common policies: minimum reviewers, build validation, required reviewers.",
	],

	async execute(
		_toolCallId: string,
		params: { scope?: string; mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

		if (isMock(config, params.mock)) {
			return mockListPolicies(params.scope);
		}

		try {
			const policyApi = await getPolicyApi(config, signal);
			const policies = await policyApi.getPolicyConfigurations(
				config.project,
				params.scope,
			);

			if (!policies || policies.length === 0) {
				return textResult("No policies configured for this project.");
			}

			const formatted = policies.map((p) => formatPolicy(p as any)).join("\n");
			return textResult(
				`Policy configurations:\n\n${formatted}`,
				{ count: policies.length },
			);
		} catch (err) {
			return errorResult(`Failed to list policies: ${formatAdoError(err)}`);
		}
	},
};
