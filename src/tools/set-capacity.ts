/**
 * azure_devops_set_capacity — Set sprint capacity for all team members (full replacement).
 */

import { Type } from "typebox";
import { resolveConfig, type AzureDevOpsConfig } from "../config/index.js";
import { getWorkApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { isMock, TeamParam, resolveTeamContext, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockSetCapacity } from "../mocks/mock-handler.js";

/** Schema for a single activity entry */
const ActivitySchema = Type.Object({
	name: Type.String({ description: "Activity name, e.g. 'Development', 'Testing'" }),
	capacityPerDay: Type.Number({ description: "Hours per day for this activity" }),
});

/** Schema for a date range */
const DateRangeSchema = Type.Object({
	start: Type.String({ description: "Start date (ISO 8601)" }),
	end: Type.String({ description: "End date (ISO 8601)" }),
});

/** Schema for a single team member's capacity */
const MemberCapacitySchema = Type.Object({
	teamMemberId: Type.String({ description: "Team member identity ID or email" }),
	activities: Type.Array(ActivitySchema, { description: "Activities and capacity per day" }),
	daysOff: Type.Optional(Type.Array(DateRangeSchema, { description: "Days off date ranges" })),
});

export const setCapacityTool = {
	name: "azure_devops_set_capacity",
	description:
		"Set sprint capacity for all team members at once (full replacement, not patch). " +
		"Provide each member's activities with hours/day and optional days off.",
	parameters: Type.Object({
		iterationId: Type.String({ description: "Iteration/sprint GUID" }),
		capacities: Type.Array(MemberCapacitySchema, {
			description: "Capacity for each team member — replaces existing capacity",
		}),
		team: TeamParam,
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Set sprint capacity for an Azure DevOps team",
	promptGuidelines: [
		"Use azure_devops_set_capacity to set team member capacity for a sprint.",
		"This replaces all capacity data — use azure_devops_get_capacity first to see current values.",
	],

	async execute(
		_toolCallId: string,
		params: {
			iterationId: string;
			capacities: Array<{
				teamMemberId: string;
				activities: Array<{ name: string; capacityPerDay: number }>;
				daysOff?: Array<{ start: string; end: string }>;
			}>;
			team?: string;
			mock?: boolean;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

		const teamCtx = resolveTeamContext(config, params.team);
		if (!teamCtx) {
			return errorResult("No team specified. Set AZURE_DEVOPS_TEAM (env), azure-devops.team (settings), or pass the team parameter.");
		}

		if (isMock(config, params.mock)) {
			return mockSetCapacity(teamCtx.team, params.iterationId, params.capacities);
		}

		try {
			const workApi = await getWorkApi(config, signal);

			// Build capacity objects for the API
			const capacityPatch = params.capacities.map((c) => ({
				teamMember: { id: c.teamMemberId },
				activities: c.activities.map((a) => ({
					name: a.name,
					capacityPerDay: a.capacityPerDay,
				})),
				daysOff: (c.daysOff ?? []).map((d) => ({
					start: d.start,
					end: d.end,
				})),
			}));

			await workApi.replaceCapacitiesWithIdentityRef(
				capacityPatch as any,
				teamCtx,
				params.iterationId,
			);

			const summaryLines = params.capacities.map((c) => {
				const actStr = c.activities
					.map((a) => `${a.name}: ${a.capacityPerDay}h/day`)
					.join(", ");
				return `- ${c.teamMemberId}: ${actStr}`;
			});

			return textResult(
				[
					`✅ Set capacity for ${params.capacities.length} member(s) in ${teamCtx.team} / ${params.iterationId}`,
					"",
					...summaryLines,
				].join("\n"),
				{ team: teamCtx.team, iterationId: params.iterationId, memberCount: params.capacities.length },
			);
		} catch (err) {
			return errorResult(`Failed to set capacity: ${formatAdoError(err)}`);
		}
	},
};
