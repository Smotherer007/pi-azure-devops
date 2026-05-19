import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { resolveConfig, tryResolveConfig, ensureConfigTemplate, type AzureDevOpsConfig } from "../config/index.js";
import { isMutationTool, formatMutationSummary } from "../safety/index.js";
import { doctorTool } from "../tools/doctor.js";
import { getWorkItemTool } from "../tools/get-work-item.js";
import { queryWorkItemsTool } from "../tools/query-work-items.js";
import { listWorkItemTypesTool } from "../tools/list-work-item-types.js";
import { getWorkItemCommentsTool } from "../tools/get-work-item-comments.js";
import { getWorkItemRevisionsTool } from "../tools/get-work-item-revisions.js";
import { createWorkItemTool } from "../tools/create-work-item.js";
import { updateWorkItemTool } from "../tools/update-work-item.js";
import { addWorkItemCommentTool } from "../tools/add-work-item-comment.js";
import { manageWorkItemLinksTool } from "../tools/manage-work-item-links.js";
import { listTeamsTool } from "../tools/list-teams.js";
import { listBoardsTool } from "../tools/list-boards.js";
import { getBoardTool } from "../tools/get-board.js";
import { listIterationsTool } from "../tools/list-iterations.js";
import { getIterationWorkItemsTool } from "../tools/get-iteration-work-items.js";
import { getCapacityTool } from "../tools/get-capacity.js";
import { setBoardColumnsTool } from "../tools/set-board-columns.js";
import { setIterationTool } from "../tools/set-iteration.js";
import { setCapacityTool } from "../tools/set-capacity.js";
import { listReposTool } from "../tools/list-repos.js";
import { getRepoTool } from "../tools/get-repo.js";
import { listBranchesTool } from "../tools/list-branches.js";
import { listPullRequestsTool } from "../tools/list-pull-requests.js";
import { getPullRequestTool } from "../tools/get-pull-request.js";
import { getPullRequestThreadsTool } from "../tools/get-pull-request-threads.js";
import { getPullRequestCommitsTool } from "../tools/get-pull-request-commits.js";
import { listPoliciesTool } from "../tools/list-policies.js";
import { getPolicyEvaluationsTool } from "../tools/get-policy-evaluations.js";
import { createPullRequestTool } from "../tools/create-pull-request.js";
import { updatePullRequestTool } from "../tools/update-pull-request.js";
import { addPullRequestCommentTool } from "../tools/add-pull-request-comment.js";
import { setPullRequestVoteTool } from "../tools/set-pull-request-vote.js";
import { listPipelinesTool } from "../tools/list-pipelines.js";
import { getPipelineTool } from "../tools/get-pipeline.js";
import { listRunsTool } from "../tools/list-runs.js";
import { getRunTool } from "../tools/get-run.js";
import { getRunArtifactsTool } from "../tools/get-run-artifacts.js";
import { getRunLogsTool } from "../tools/get-run-logs.js";
import { getRunTimelineTool } from "../tools/get-run-timeline.js";
import { runPipelineTool } from "../tools/run-pipeline.js";
import { cancelRunTool } from "../tools/cancel-run.js";
import { retryRunTool } from "../tools/retry-run.js";
import { listTestPlansTool } from "../tools/list-test-plans.js";
import { getTestPlanTool } from "../tools/get-test-plan.js";
import { listTestSuitesTool } from "../tools/list-test-suites.js";
import { getTestSuiteTool } from "../tools/get-test-suite.js";
import { listTestCasesTool } from "../tools/list-test-cases.js";
import { listTestPointsTool } from "../tools/list-test-points.js";
import { getTestRunTool } from "../tools/get-test-run.js";
import { listTestRunsTool } from "../tools/list-test-runs.js";
import { createTestRunTool } from "../tools/create-test-run.js";
import { updateTestResultsTool } from "../tools/update-test-results.js";
import { registerAutocomplete } from "../autocomplete/work-item-autocomplete.js";
import { registerIterationAutocomplete } from "../autocomplete/iteration-autocomplete.js";

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
