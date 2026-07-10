/**
 * azure_devops_update_work_item — Update fields on an existing work item.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getWorkItemTrackingApi } from "../utils/connection.ts";
import { formatAdoError, isNotFoundError } from "../utils/errors.ts";
import { formatWorkItem } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockUpdateWorkItem } from "../mocks/mock-handler.ts";

export const updateWorkItemTool = {
	name: "azure_devops_update_work_item",
	description:
		"Update fields on an existing Azure DevOps work item using JSON Patch. " +
		"Provide the work item ID and a map of field names to new values.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		id: Type.Number({ description: "Work item ID to update" }),
		fields: Type.Record(Type.String(), Type.String(), {
			description: "Fields to update, e.g. {\"System.State\": \"Closed\", \"System.Reason\": \"Completed\"}",
		}),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Update an Azure DevOps work item's fields",
	promptGuidelines: [
		"Use azure_devops_update_work_item to change work item fields (state, assigned to, priority, etc.).",
	],

	async execute(
		_toolCallId: string,
		params: { id: number; fields: Record<string, string>; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockUpdateWorkItem(params.id, params.fields);
		}

		try {
			const witApi = await getWorkItemTrackingApi(config, signal);

			// Build JSON Patch document — use Replace (op: 2) for existing fields
			const patchDocument: any[] = [];
			for (const [key, value] of Object.entries(params.fields)) {
				patchDocument.push({
					op: 2, // Replace
					path: `/fields/${key}`,
					value,
				});
			}

			const wi = await witApi.updateWorkItem(
				{},
				patchDocument,
				params.id,
				config.project,
			);

			if (!wi || !wi.id) {
				return errorResult(`Failed to update work item #${params.id} — no data returned.`);
			}

			return textResult(
				[
					`✅ Updated work item #${wi.id}`,
					"",
					"Updated fields:",
					...Object.entries(params.fields).map(([k, v]) => `- **${k}:** ${v}`),
					"",
					formatWorkItem(wi as any),
				].join("\n"),
				{ id: wi.id, fields: params.fields },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Work item #${params.id} not found.`);
			}
			return errorResult(`Failed to update work item #${params.id}: ${formatAdoError(err)}`);
		}
	},
};
