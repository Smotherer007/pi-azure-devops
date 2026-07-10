/**
 * Safety model — gates mutation operations based on user configuration.
 *
 * Three levels:
 * - open: no confirmation, mutations proceed freely
 * - confirm: user confirmation dialog before each mutation
 * - readonly: mutation tools blocked entirely
 */

import type { SafetyLevel } from "../config/index.ts";
import { MUTATION_TOOLS } from "../tools/shared.ts";

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Check if a tool is a mutation tool.
 */
export function isMutationTool(toolName: string): boolean {
	return MUTATION_TOOLS.has(toolName);
}

/**
 * Determine if a tool call should be blocked based on safety level.
 * Returns undefined if the call should proceed, or a block reason.
 */
export function shouldBlock(safetyLevel: SafetyLevel, toolName: string): string | undefined {
	if (!isMutationTool(toolName)) return undefined;

	switch (safetyLevel) {
		case "readonly":
			return `Tool "${toolName}" is blocked in readonly safety mode. Change AZURE_DEVOPS_SAFETY_LEVEL or azure-devops.safetyLevel to "open" or "confirm".`;
		case "open":
			return undefined;
		case "confirm":
			// Handled by the interceptor — not blocked here
			return undefined;
		default:
			return undefined;
	}
}

// ---------------------------------------------------------------------------
// Confirmation summaries
// ---------------------------------------------------------------------------

interface MutationParams {
	[key: string]: unknown;
}

/**
 * Format a human-readable summary of a mutation operation for confirmation.
 */
export function formatMutationSummary(toolName: string, params: MutationParams): string {
	switch (toolName) {
		case "azure_devops_create_work_item": {
			const type = String(params.type ?? "work item");
			const title = String(params.title ?? "(untitled)");
			return `Create ${type}: "${title}"`;
		}
		case "azure_devops_update_work_item": {
			const id = params.id ?? params.workItemId ?? "?";
			const fields = params.fields as Record<string, string> | undefined;
			const fieldSummary = fields
				? Object.entries(fields)
						.map(([k, v]) => `${k} → ${v}`)
						.join(", ")
				: "(no fields)";
			return `Update #${id}: ${fieldSummary}`;
		}
		case "azure_devops_add_work_item_comment": {
			const id = params.workItemId ?? "?";
			const text = String(params.text ?? "").slice(0, 80);
			const ellipsis = String(params.text ?? "").length > 80 ? "..." : "";
			return `Comment on #${id}: "${text}${ellipsis}"`;
		}
		case "azure_devops_manage_work_item_links": {
			const operation = String(params.operation ?? "add");
			const sourceId = params.workItemId ?? "?";
			const targetId = params.targetId ?? "?";
			const relType = String(params.relationType ?? "link");
			return `${operation === "add" ? "Add" : "Remove"} ${relType} link: #${sourceId} ${operation === "add" ? "→" : "✕"} #${targetId}`;
		}
		case "azure_devops_set_board_columns": {
			const boardId = String(params.boardId ?? "?");
			const team = String(params.team ?? "(default team)");
			const columns = params.columns as Array<{ name?: string }> | undefined;
			const colNames = columns?.map((c) => c.name ?? "?").join(" → ") ?? "(none)";
			return `Set board columns for "${boardId}" (${team}): ${colNames}`;
		}
		case "azure_devops_set_iteration": {
			const op = String(params.operation ?? "add");
			const iterationId = String(params.iterationId ?? "?");
			const team = String(params.team ?? "(default team)");
			return `${op === "add" ? "Add" : "Remove"} iteration ${iterationId} ${op === "add" ? "to" : "from"} ${team}`;
		}
		case "azure_devops_set_capacity": {
			const iterationId = String(params.iterationId ?? "?");
			const capacities = params.capacities as Array<unknown> | undefined;
			const count = capacities?.length ?? 0;
			return `Set capacity for ${count} team member(s) in iteration ${iterationId}`;
		}
		case "azure_devops_create_pull_request": {
			const title = String(params.title ?? "(untitled)");
			const source = String(params.sourceRefName ?? "?").replace("refs/heads/", "");
			const target = String(params.targetRefName ?? "?").replace("refs/heads/", "");
			return `Create PR: "${title}" (${source} → ${target})`;
		}
		case "azure_devops_update_pull_request": {
			const prId = params.pullRequestId ?? "?";
			const fields: string[] = [];
			if (params.title) fields.push("title");
			if (params.description) fields.push("description");
			if (params.status) fields.push(`status → ${params.status}`);
			return `Update PR #${prId}: ${fields.join(", ") || "no changes"}`;
		}
		case "azure_devops_add_pull_request_comment": {
			const prId = params.pullRequestId ?? "?";
			const text = String(params.content ?? "").slice(0, 80);
			const ellipsis = String(params.content ?? "").length > 80 ? "..." : "";
			return `Comment on PR #${prId}: "${text}${ellipsis}"`;
		}
		case "azure_devops_set_pull_request_vote": {
			const prId = params.pullRequestId ?? "?";
			const vote = String(params.vote ?? "?");
			return `Vote on PR #${prId}: ${vote}`;
		}
		case "azure_devops_set_pull_request_autocomplete": {
			const prId = params.pullRequestId ?? "?";
			const enabled = params.enabled ? "enable" : "disable";
			return `Auto-complete PR #${prId}: ${enabled}`;
		}
		case "azure_devops_link_pr_work_items": {
			const prId = params.pullRequestId ?? "?";
			const ids = (params.workItemIds as number[] ?? []).map((id) => `#${id}`).join(", ");
			const op = String(params.operation ?? "add");
			return `Link work items to PR #${prId}: ${ids} (${op})`;
		}
		case "azure_devops_run_pipeline": {
			const pId = params.pipelineId ?? "?";
			const branch = String(params.branch ?? "(default)");
			const tParams = params.templateParameters as Record<string, string> | undefined;
			const paramStr = tParams && Object.keys(tParams).length > 0
				? ` with params: ${Object.entries(tParams).map(([k, v]) => `${k}=${v}`).join(", ")}`
				: "";
			return `Run pipeline #${pId} on branch ${branch}${paramStr}`;
		}
		case "azure_devops_cancel_run": {
			const pId = params.pipelineId ?? "?";
			const rId = params.runId ?? "?";
			return `Cancel run #${rId} (pipeline #${pId})`;
		}
		case "azure_devops_retry_run": {
			const pId = params.pipelineId ?? "?";
			const rId = params.runId ?? "?";
			return `Retry run #${rId} (pipeline #${pId})`;
		}
		case "azure_devops_create_test_run": {
			const planId = params.planId ?? "?";
			const name = String(params.name ?? "(auto-named)");
			return `Create test run: '${name}' (plan #${planId})`;
		}
		case "azure_devops_update_test_results": {
			const runId = params.runId ?? "?";
			const results = params.results as Array<unknown> | undefined;
			const n = results?.length ?? 0;
			return `Update ${n} test result(s) in run #${runId}`;
		}
		default:
			return `${toolName}: ${JSON.stringify(params).slice(0, 100)}`;
	}
}
