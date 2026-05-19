/**
 * azure_devops_doctor — Check config, auth readiness, and connection health
 * for ALL configured org+project combinations.
 */

import { Type } from "typebox";
import {
	resolveAllOrgConfigs,
	type AzureDevOpsConfig,
} from "../config/index.js";
import { tryResolveAuth } from "../auth/index.js";
import { getConnection } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";

/**
 * Run the doctor check. Exported for testability.
 */
export async function runDoctor(
	cwd: string,
	config: AzureDevOpsConfig | undefined,
	mock: boolean | undefined,
	signal?: AbortSignal,
): Promise<ToolResult> {
	// Always resolve ALL org+project combinations from pi-azure-devops.json.
	// The injected session config (if any) is only used for the mock flag fallback.
	const { connections, errors: configErrors } = resolveAllOrgConfigs();

	if (configErrors.length > 0 && connections.length === 0) {
		return errorResult(
			`Azure DevOps configuration issues in pi-azure-devops.json:\n${configErrors.map((e) => `  ❌ ${e}`).join("\n")}\n\n` +
				"Edit ~/.pi/agent/pi-azure-devops.json with your orgs, projects, and PATs.",
		);
	}

	// Mock mode — show all configured connections as simulated
	const mockConfig = config ?? connections[0];
	if (isMock(mockConfig, mock)) {
		return textResult(formatMockReport(connections));
	}

	// Live validation — iterate over every org+project
	const lines: string[] = [];
	lines.push("## Azure DevOps Configuration");
	lines.push(`- **Orgs configured:** ${connections.length}`);
	lines.push("");

	for (let i = 0; i < connections.length; i++) {
		const conn = connections[i];
		lines.push(`### ${conn.orgUrl.replace("https://dev.azure.com/", "")} / ${conn.project}`);
		lines.push(`- **URL:** ${conn.orgUrl}`);

		// Auth check
		const auth = await tryResolveAuth(conn, signal);
		if (auth) {
			lines.push(`- **Auth:** ✅ Authenticated via **${auth.method}**`);
		} else {
			lines.push(`- **Auth:** ❌ No authentication available`);
			continue;
		}

		// Connection check
		try {
			const connection = await getConnection(conn, signal);
			const witApi = await connection.getWorkItemTrackingApi();
			const types = await witApi.getWorkItemTypes(conn.project);
			lines.push(
				`- **Connection:** ✅ Connected — ${types?.length ?? 0} work item types available`,
			);
		} catch (err) {
			lines.push(
				`- **Connection:** ❌ Failed: ${formatAdoError(err)}`,
			);
		}

		if (i < connections.length - 1) lines.push("");
	}

	// Append any config-level errors (e.g. missing url in one org)
	if (configErrors.length > 0) {
		lines.push("");
		lines.push("## ⚠️ Config Warnings");
		for (const err of configErrors) {
			lines.push(`- ${err}`);
		}
	}

	return textResult(lines.join("\n"));
}

// ---------------------------------------------------------------------------
// Mock report
// ---------------------------------------------------------------------------

function formatMockReport(connections: AzureDevOpsConfig[]): string {
	const lines: string[] = [
		"## Azure DevOps Configuration (Mock Mode)",
		`- **Orgs configured:** ${connections.length}`,
		"",
	];

	for (const conn of connections) {
		lines.push(
			`### ${conn.orgUrl.replace("https://dev.azure.com/", "")} / ${conn.project}`,
		);
		lines.push(`- **URL:** ${conn.orgUrl}`);
		lines.push(`- **Auth:** ✅ Mock — simulated as authenticated`);
		lines.push(
			`- **Connection:** ✅ Mock — simulated as connected (6 work item types)`,
		);
		lines.push("");
	}

	lines.push("⚠️ Running in mock mode. No network calls were made.");
	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Tool definition (matches the pattern used by other tools)
// ---------------------------------------------------------------------------

export const doctorTool = {
	name: "azure_devops_doctor",
	description:
		"Check Azure DevOps configuration, authentication readiness, and connection health. " +
		"Run this first to verify your setup before using other Azure DevOps tools.",
	parameters: Type.Object({
		mock: Type.Optional(Type.Boolean({ description: "Use mock mode (report healthy without network)" })),
	}),
	promptSnippet: "Check Azure DevOps configuration and connectivity",
	promptGuidelines: [
		"Use azure_devops_doctor before other Azure DevOps tools to verify the user's setup is working.",
		"The doctor validates ALL configured orgs and projects from pi-azure-devops.json.",
	],

	async execute(
		_toolCallId: string,
		params: { mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AzureDevOpsConfig },
	): Promise<ToolResult> {
		return runDoctor(ctx.cwd, ctx.config, params.mock, signal);
	},
};
