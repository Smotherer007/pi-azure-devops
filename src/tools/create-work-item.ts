/**
 * azure_devops_create_work_item — Create a new work item.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getWorkItemTrackingApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatWorkItem } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockCreateWorkItem } from "../mocks/mock-handler.ts";

export const createWorkItemTool = {
	name: "azure_devops_create_work_item",
	description:
		"Create a new Azure DevOps work item. Requires type, title, and optionally description and custom fields.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		type: Type.String({ description: "Work item type (e.g., User Story, Bug, Task). Use azure_devops_list_work_item_types to see valid types." }),
		title: Type.String({ description: "Work item title" }),
		description: Type.Optional(Type.String({ description: "Work item description (supports HTML)" })),
		fields: Type.Optional(Type.Record(Type.String(), Type.String(), {
			description: "Additional fields to set, e.g. {\"System.Priority\": \"1\", \"System.Tags\": \"backend; critical\"}",
		})),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Create an Azure DevOps work item",
	promptGuidelines: [
		"Use azure_devops_create_work_item to create new work items. Always specify type and title.",
		"Use azure_devops_list_work_item_types first if unsure which types are valid for the project.",
	],

	async execute(
		_toolCallId: string,
		params: { type: string; title: string; description?: string; fields?: Record<string, string>; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockCreateWorkItem(params.type, params.title, params.description, params.fields);
		}

		try {
			const witApi = await getWorkItemTrackingApi(config, signal);

			// Build JSON Patch document
			const patchDocument: any[] = [];

			// Title
			patchDocument.push({
				op: 0, // Add
				path: "/fields/System.Title",
				value: params.title,
			});

			// Description
			if (params.description) {
				patchDocument.push({
					op: 0,
					path: "/fields/System.Description",
					value: params.description,
				});
			}

			// Additional fields
			if (params.fields) {
				for (const [key, value] of Object.entries(params.fields)) {
					patchDocument.push({
						op: 0,
						path: `/fields/${key}`,
						value,
					});
				}
			}

			const wi = await witApi.createWorkItem(
				{},
				patchDocument,
				config.project,
				params.type,
			);

			if (!wi || !wi.id) {
				return errorResult("Failed to create work item — no ID returned from API.");
			}

			return textResult(
				[
					`✅ Created work item #${wi.id}`,
					"",
					formatWorkItem(wi as any),
				].join("\n"),
				{ id: wi.id, type: params.type },
			);
		} catch (err) {
			return errorResult(`Failed to create work item: ${formatAdoError(err)}`);
		}
	},
};
