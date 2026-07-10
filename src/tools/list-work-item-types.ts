/**
 * azure_devops_list_work_item_types — List available work item types for the project.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getWorkItemTrackingApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatWorkItemTypeList } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockListWorkItemTypes } from "../mocks/mock-handler.ts";

export const listWorkItemTypesTool = {
	name: "azure_devops_list_work_item_types",
	description:
		"List all available work item types for the Azure DevOps project. " +
		"Use before creating work items to determine valid types.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List Azure DevOps work item types",
	promptGuidelines: [
		"Use azure_devops_list_work_item_types before azure_devops_create_work_item to see valid types for the project.",
	],

	async execute(
		_toolCallId: string,
		params: { mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockListWorkItemTypes();
		}

		try {
			const witApi = await getWorkItemTrackingApi(config, signal);
			const types = await witApi.getWorkItemTypes(config.project);

			if (!types || types.length === 0) {
				return textResult("No work item types found for this project.");
			}

			return textResult(
				`Work item types for ${config.project}:\n\n${formatWorkItemTypeList(types as any)}`,
				{ count: types.length },
			);
		} catch (err) {
			return errorResult(`Failed to list work item types: ${formatAdoError(err)}`);
		}
	},
};
