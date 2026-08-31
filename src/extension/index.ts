import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { Box, Text } from "@earendil-works/pi-tui";
import {
	buildConnectionCard,
	buildConnectionLabel,
	formatStatusText,
	type ConnectionCard,
} from "../status.ts";
import { resolveConfig, tryResolveConfig, ensureConfigTemplate, type AzureDevOpsConfig } from "../config/index.ts";
import { isMutationTool, formatMutationSummary } from "../safety/index.ts";
import { doctorTool } from "../tools/doctor.ts";
import { getWorkItemTool } from "../tools/get-work-item.ts";
import { queryWorkItemsTool } from "../tools/query-work-items.ts";
import { listWorkItemTypesTool } from "../tools/list-work-item-types.ts";
import { getWorkItemCommentsTool } from "../tools/get-work-item-comments.ts";
import { getWorkItemRevisionsTool } from "../tools/get-work-item-revisions.ts";
import { createWorkItemTool } from "../tools/create-work-item.ts";
import { updateWorkItemTool } from "../tools/update-work-item.ts";
import { addWorkItemCommentTool } from "../tools/add-work-item-comment.ts";
import { manageWorkItemLinksTool } from "../tools/manage-work-item-links.ts";
import { listTeamsTool } from "../tools/list-teams.ts";
import { listBoardsTool } from "../tools/list-boards.ts";
import { getBoardTool } from "../tools/get-board.ts";
import { listIterationsTool } from "../tools/list-iterations.ts";
import { getIterationWorkItemsTool } from "../tools/get-iteration-work-items.ts";
import { getCapacityTool } from "../tools/get-capacity.ts";
import { setBoardColumnsTool } from "../tools/set-board-columns.ts";
import { setIterationTool } from "../tools/set-iteration.ts";
import { setCapacityTool } from "../tools/set-capacity.ts";
import { listReposTool } from "../tools/list-repos.ts";
import { getRepoTool } from "../tools/get-repo.ts";
import { listBranchesTool } from "../tools/list-branches.ts";
import { listPullRequestsTool } from "../tools/list-pull-requests.ts";
import { getPullRequestTool } from "../tools/get-pull-request.ts";
import { getPullRequestThreadsTool } from "../tools/get-pull-request-threads.ts";
import { getPullRequestCommitsTool } from "../tools/get-pull-request-commits.ts";
import { listPoliciesTool } from "../tools/list-policies.ts";
import { getPolicyEvaluationsTool } from "../tools/get-policy-evaluations.ts";
import { createPullRequestTool } from "../tools/create-pull-request.ts";
import { updatePullRequestTool } from "../tools/update-pull-request.ts";
import { addPullRequestCommentTool } from "../tools/add-pull-request-comment.ts";
import { setPullRequestVoteTool } from "../tools/set-pull-request-vote.ts";
import { setPullRequestAutocompleteTool } from "../tools/set-pull-request-autocomplete.ts";
import { linkPrWorkItemsTool } from "../tools/link-pr-work-items.ts";
import { listPipelinesTool } from "../tools/list-pipelines.ts";
import { getPipelineTool } from "../tools/get-pipeline.ts";
import { listRunsTool } from "../tools/list-runs.ts";
import { getRunTool } from "../tools/get-run.ts";
import { getRunArtifactsTool } from "../tools/get-run-artifacts.ts";
import { getRunLogsTool } from "../tools/get-run-logs.ts";
import { getRunTimelineTool } from "../tools/get-run-timeline.ts";
import { runPipelineTool } from "../tools/run-pipeline.ts";
import { cancelRunTool } from "../tools/cancel-run.ts";
import { retryRunTool } from "../tools/retry-run.ts";
import { listTestPlansTool } from "../tools/list-test-plans.ts";
import { getTestPlanTool } from "../tools/get-test-plan.ts";
import { listTestSuitesTool } from "../tools/list-test-suites.ts";
import { getTestSuiteTool } from "../tools/get-test-suite.ts";
import { listTestCasesTool } from "../tools/list-test-cases.ts";
import { listTestPointsTool } from "../tools/list-test-points.ts";
import { getTestRunTool } from "../tools/get-test-run.ts";
import { listTestRunsTool } from "../tools/list-test-runs.ts";
import { createTestRunTool } from "../tools/create-test-run.ts";
import { updateTestResultsTool } from "../tools/update-test-results.ts";
import { registerAutocomplete } from "../autocomplete/work-item-autocomplete.ts";
import { registerIterationAutocomplete } from "../autocomplete/iteration-autocomplete.ts";

/** All tools to register */
const tools = [
	doctorTool,
	getWorkItemTool,
	queryWorkItemsTool,
	listWorkItemTypesTool,
	getWorkItemCommentsTool,
	getWorkItemRevisionsTool,
	createWorkItemTool,
	updateWorkItemTool,
	addWorkItemCommentTool,
	manageWorkItemLinksTool,
	// Phase 5: Boards & Backlogs
	listTeamsTool,
	listBoardsTool,
	getBoardTool,
	listIterationsTool,
	getIterationWorkItemsTool,
	getCapacityTool,
	// Phase 5: Boards & Backlogs (write)
	setBoardColumnsTool,
	setIterationTool,
	setCapacityTool,
	// Phase 3: Repos & Pull Requests (read)
	listReposTool,
	getRepoTool,
	listBranchesTool,
	listPullRequestsTool,
	getPullRequestTool,
	getPullRequestThreadsTool,
	getPullRequestCommitsTool,
	listPoliciesTool,
	getPolicyEvaluationsTool,
	// Phase 3: Repos & Pull Requests (write)
	createPullRequestTool,
	updatePullRequestTool,
	addPullRequestCommentTool,
	setPullRequestVoteTool,
	setPullRequestAutocompleteTool,
	linkPrWorkItemsTool,
	// Phase 2: Pipelines (read)
	listPipelinesTool,
	getPipelineTool,
	listRunsTool,
	getRunTool,
	getRunArtifactsTool,
	getRunLogsTool,
	getRunTimelineTool,
	// Phase 2: Pipelines (write)
	runPipelineTool,
	cancelRunTool,
	retryRunTool,
	// Phase 4: Test Plans (read)
	listTestPlansTool,
	getTestPlanTool,
	listTestSuitesTool,
	getTestSuiteTool,
	listTestCasesTool,
	listTestPointsTool,
	getTestRunTool,
	listTestRunsTool,
	// Phase 4: Test Plans (write)
	createTestRunTool,
	updateTestResultsTool,
];

// Type alias for tool execute signature parameters
type ToolExecuteParams = [
	toolCallId: string,
	params: any,
	signal: AbortSignal | undefined,
	onUpdate: any,
	ctx: { cwd: string; config?: AzureDevOpsConfig },
];

export default function (pi: ExtensionAPI) {
	// Resolve config once per session
	let config: AzureDevOpsConfig | undefined;

	// Connection status card — rendered in the transcript, never sent to the LLM.
	pi.registerEntryRenderer<ConnectionCard>(
		"azure-devops-connection",
		(entry, { expanded }, theme) => {
			const card = entry.data;
			const box = new Box(1, 1, (text) => theme.bg("customMessageBg", text));
			box.addChild(new Text(theme.fg("accent", theme.bold("Azure DevOps")), 0, 0));
			if (!card) {
				box.addChild(new Text(theme.fg("warning", "not configured"), 0, 0));
				return box;
			}
			box.addChild(new Text(theme.fg("dim", `${card.org}/${card.project}`), 0, 0));
			if (expanded) {
				box.addChild(new Text(theme.fg("muted", formatStatusText(card)), 0, 0));
			}
			return box;
		},
	);

	// `/azure-devops-status` — re-publish the connection card and update the footer.
	pi.registerCommand("azure-devops-status", {
		description: "Show the current Azure DevOps connection status",
		handler: async (_args, ctx) => {
			const card = buildConnectionCard(config);
			if (!card) {
				ctx.ui.notify(
					"Azure DevOps: no config found. See ~/.pi/agent/pi-azure-devops.json",
					"warning",
				);
				return;
			}
			pi.appendEntry<ConnectionCard>("azure-devops-connection", card);
			ctx.ui.setStatus("azure-devops", buildConnectionLabel(card));
			ctx.ui.notify(buildConnectionLabel(card), "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		// Auto-create template config if missing
		ensureConfigTemplate();

		config = tryResolveConfig(ctx.cwd);
		if (!config) {
			ctx.ui.notify(
				"@patimweb/pi-azure-devops: No config found. A template was created at ~/.pi/agent/pi-azure-devops.json — edit it with your org, project, and PAT.",
				"warning"
			);
			return;
		}

		ctx.ui.notify(`@patimweb/pi-azure-devops loaded (project: ${config.project})`, "info");

		// Register #id autocomplete if config allows
		registerAutocomplete(
			(wrapper) => ctx.ui.addAutocompleteProvider(wrapper),
			config,
		);

		// Register @sprint iteration autocomplete (requires team)
		registerIterationAutocomplete(
			(wrapper) => ctx.ui.addAutocompleteProvider(wrapper),
			config,
		);

		// Connection status — footer label + persisted connection card (survives /reload).
		const card = buildConnectionCard(config);
		if (card) {
			ctx.ui.setStatus("azure-devops", buildConnectionLabel(card));
			const existing = ctx.sessionManager.getEntries().some(
				(e) => e.type === "custom" && e.customType === "azure-devops-connection",
			);
			if (!existing) {
				pi.appendEntry<ConnectionCard>("azure-devops-connection", card);
			}
		}
	});

	// Register all tools
	for (const tool of tools) {
		pi.registerTool({
			name: tool.name,
			label: tool.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
			description: tool.description,
			parameters: tool.parameters,
			promptSnippet: ("promptSnippet" in tool) ? (tool as any).promptSnippet : undefined,
			promptGuidelines: ("promptGuidelines" in tool) ? (tool as any).promptGuidelines : undefined,
			async execute(toolCallId: string, params: any, signal: AbortSignal | undefined, onUpdate: any, ctx: any) {
				return tool.execute(toolCallId, params, signal, onUpdate, {
					cwd: ctx.cwd,
					config,
				});
			},
		});
	}

	// Safety interceptor — gate mutation tools based on safety level
	pi.on("tool_call", async (event, ctx) => {
		if (!config) return;
		if (!isMutationTool(event.toolName)) return;

		// Readonly: block all mutations
		if (config.safetyLevel === "readonly") {
			return { block: true, reason: `Tool "${event.toolName}" is blocked in readonly safety mode. Set safetyLevel to "open" or "confirm" in pi-azure-devops.json.` };
		}

		// Confirm: ask user before proceeding
		if (config.safetyLevel === "confirm") {
			const summary = formatMutationSummary(event.toolName, event.input as Record<string, unknown>);
			const approved = await ctx.ui.confirm(
				"Azure DevOps Mutation",
				`${summary}\n\nAllow this operation?`,
			);
			if (!approved) {
				return { block: true, reason: `User declined: ${summary}` };
			}
		}

		// Open: pass through
	});
}
