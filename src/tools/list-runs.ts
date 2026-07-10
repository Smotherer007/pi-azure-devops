/**
 * azure_devops_list_runs — List pipeline runs, optionally filtered by pipeline, status, result, or branch.
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.ts";
import { getBuildApi } from "../utils/connection.ts";
import { formatAdoError } from "../utils/errors.ts";
import { formatRunList } from "../utils/formatting.ts";
import { isMock, textResult, errorResult, type ToolResult , resolveEffectiveConfig, OrgParam, ProjectParam} from "./shared.ts";
import { mockListRuns } from "../mocks/mock-handler.ts";

const STATUS_MAP: Record<string, number> = {
	completed: 2,
	inProgress: 1,
	cancelling: 4,
	postponed: 8,
	notStarted: 32,
	all: 47,
};

const RESULT_MAP: Record<string, number> = {
	succeeded: 2,
	partiallySucceeded: 4,
	failed: 8,
	canceled: 32,
};

export const listRunsTool = {
	name: "azure_devops_list_runs",
	description:
		"List pipeline runs (builds). Optionally filter by pipeline ID, status, result, or branch. Returns run ID, pipeline name, state, result, duration, and branch.",
	parameters: Type.Object({
		org: OrgParam,
		project: ProjectParam,
		pipelineId: Type.Optional(Type.Number({ description: "Filter by pipeline ID (omit for all pipelines)" })),
		top: Type.Optional(Type.Number({ description: "Maximum number of runs to return", default: 25 })),
		status: Type.Optional(Type.String({ description: "Filter by state: completed, inProgress, cancelling, postponed, notStarted, all" })),
		result: Type.Optional(Type.String({ description: "Filter by result: succeeded, failed, canceled, partiallySucceeded" })),
		branch: Type.Optional(Type.String({ description: "Filter by branch name (e.g. main, feature/login)" })),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List pipeline runs with optional filters",
	promptGuidelines: [
		"Use azure_devops_list_runs to see recent builds for a pipeline or across all pipelines.",
		"Filter by status='inProgress' to monitor active runs.",
		"Filter by result='failed' to find recent failures.",
	],

	async execute(
		_toolCallId: string,
		params: { pipelineId?: number; top?: number; status?: string; result?: string; branch?: string; mock?: boolean ; org?: string; project?: string},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const baseConfig = ctx.config ?? resolveConfig(ctx.cwd);
		const config = resolveEffectiveConfig(baseConfig, params.org, params.project);

		if (isMock(config, params.mock)) {
			return mockListRuns({
				pipelineId: params.pipelineId,
				status: params.status,
				result: params.result,
				branch: params.branch,
			});
		}

		try {
			const buildApi = await getBuildApi(config, signal);
			const definitions = params.pipelineId ? [params.pipelineId] : undefined;
			const branchName = params.branch
				? (params.branch.startsWith("refs/") ? params.branch : `refs/heads/${params.branch}`)
				: undefined;

			const builds = await buildApi.getBuilds(
				config.project,
				definitions,
				undefined, // queues
				undefined, // buildNumber
				undefined, // minTime
				undefined, // maxTime
				undefined, // requestedFor
				undefined, // reasonFilter
				params.status ? STATUS_MAP[params.status] : undefined,
				params.result ? RESULT_MAP[params.result] : undefined,
				undefined, // tagFilters
				undefined, // properties
				params.top ?? 25,
				undefined, // continuationToken
				undefined, // maxBuildsPerDefinition
				undefined, // deletedFilter
				undefined, // queryOrder
				branchName,
			);

			if (!builds || builds.length === 0) {
				return textResult("No runs found matching the criteria.");
			}

			const formatted = builds.map((b: any) => ({
				id: b.id,
				name: b.buildNumber,
				pipeline: { id: b.definition?.id, name: b.definition?.name },
				state: b.status === 2 ? "completed" : b.status === 1 ? "inProgress" : "pending",
				result: b.result === 2 ? "succeeded" : b.result === 8 ? "failed" : b.result === 32 ? "canceled" : b.result === 4 ? "partiallySucceeded" : null,
				createdDate: b.startTime ?? b.queueTime,
				finishedDate: b.finishTime,
				resources: {
					repositories: {
						self: { refName: b.sourceBranch, version: b.sourceVersion },
					},
				},
				templateParameters: b.templateParameters,
				url: b.url,
			}));

			return textResult(formatRunList(formatted as any), { count: builds.length });
		} catch (err) {
			return errorResult(`Failed to list runs: ${formatAdoError(err)}`);
		}
	},
};
