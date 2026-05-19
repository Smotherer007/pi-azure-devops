/**
 * azure_devops_manage_work_item_links — Add/remove relation links between work items.
 */

import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getWorkItemTrackingApi } from "../utils/connection.js";
import { formatAdoError, isNotFoundError } from "../utils/errors.js";
import { formatWorkItem } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.js";
import { mockManageWorkItemLinks } from "../mocks/mock-handler.js";

export const manageWorkItemLinksTool = {
	name: "azure_devops_manage_work_item_links",
	description:
		"Add or remove relation links between Azure DevOps work items. " +
		"Common relation types: System.LinkTypes.Hierarchy-Forward (parent/child), " +
		"System.LinkTypes.Related, System.LinkTypes.Duplicate, System.LinkTypes.Dependency.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		workItemId: Type.Number({ description: "Source work item ID" }),
		operation: StringEnum(["add", "remove"] as const, { description: "Add or remove the link" }),
		relationType: Type.String({
			description: "Relation type, e.g. System.LinkTypes.Hierarchy-Forward, System.LinkTypes.Related",
		}),
		targetId: Type.Number({ description: "Target work item ID" }),
		comment: Type.Optional(Type.String({ description: "Optional comment for the link" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Add or remove links between Azure DevOps work items",
	promptGuidelines: [
		"Use azure_devops_manage_work_item_links to create parent/child, related, duplicate, or dependency links.",
	],

	async execute(
		_toolCallId: string,
		params: {
			workItemId: number;
			operation: "add" | "remove";
			relationType: string;
			targetId: number;
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
			return mockManageWorkItemLinks(
				params.workItemId,
				params.operation,
				params.relationType,
				params.targetId,
			);
		}

		try {
			const witApi = await getWorkItemTrackingApi(config, signal);

			// Build JSON Patch operation for relations
			const patchDocument: any[] = [];

			if (params.operation === "add") {
				const relation: Record<string, unknown> = {
					rel: params.relationType,
					url: `${config.orgUrl}/_apis/wit/workItems/${params.targetId}`,
				};
				if (params.comment) {
					relation.attributes = { comment: params.comment };
				}
				patchDocument.push({
					op: 0, // Add
					path: "/relations/-",
					value: relation,
				});
			} else {
				// Remove: need to find the relation index first
				const wi = await witApi.getWorkItem(params.workItemId, undefined, undefined, undefined, config.project);
				if (!wi || !wi.relations) {
					return errorResult(`No relations found on work item #${params.workItemId}.`);
				}

				const relIndex = wi.relations.findIndex(
					(r) => r.rel === params.relationType && r.url?.endsWith(`/workItems/${params.targetId}`),
				);

				if (relIndex === -1) {
					return errorResult(
						`No ${params.relationType} link to #${params.targetId} found on work item #${params.workItemId}.`,
					);
				}

				patchDocument.push({
					op: 1, // Remove
					path: `/relations/${relIndex}`,
				});
			}

			const updated = await witApi.updateWorkItem(
				{},
				patchDocument,
				params.workItemId,
				config.project,
			);

			const verb = params.operation === "add" ? "Added" : "Removed";
			return textResult(
				[
					`✅ ${verb} ${params.relationType} link: #${params.workItemId} ${params.operation === "add" ? "→" : "✕"} #${params.targetId}`,
					"",
					updated ? formatWorkItem(updated as any) : "",
				].join("\n"),
				{ workItemId: params.workItemId, operation: params.operation, targetId: params.targetId },
			);
		} catch (err) {
			if (isNotFoundError(err)) {
				return errorResult(`Work item not found.`);
			}
			return errorResult(`Failed to manage link: ${formatAdoError(err)}`);
		}
	},
};
