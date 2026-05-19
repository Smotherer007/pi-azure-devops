/**
 * azure_devops_doctor — Check config, auth readiness, and connection health.
 */

import { Type } from "typebox";
import { resolveConfigForDoctor, type AzureDevOpsConfig } from "../config/index.js";
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
	// Resolve config if not provided
	if (!config) {
		const report = resolveConfigForDoctor(cwd);
		if (!report.config) {
			return errorResult(
				`Azure DevOps configuration issues:\n${report.errors.map((e) => `  ❌ ${e}`).join("\n")}\n\n` +
					"Set AZURE_DEVOPS_ORG_URL and AZURE_DEVOPS_PROJECT (env vars or settings.json).",
			);
		}
		config = report.config;
	}

	// Mock mode
	if (isMock(config, mock)) {
		return textResult(formatMockReport(config));
	}

	const lines: string[] = [];
	lines.push("## Azure DevOps Configuration");
	lines.push(`- **Org:** ${config.orgUrl}`);
	lines.push(`- **Project:** ${config.project}`);
	lines.push(`- **Auth Method:** ${config.authMethod}`);
	lines.push(`- **Safety Level:** ${config.safetyLevel}`);
	lines.push(`- **Mock Mode:** off`);

	// Auth check
	lines.push("");
	lines.push("## Authentication");
	const auth = await tryResolveAuth(config, signal);
	if (auth) {
		lines.push(`✅ Authenticated via **${auth.method}**`);
	} else {
		lines.push("❌ No authentication available");
		return errorResult(lines.join("\n"));
	}

	// Connection check
	lines.push("");
	lines.push("## Connection");
	try {
		const connection = await getConnection(config, signal);
		const witApi = await connection.getWorkItemTrackingApi();
		const types = await witApi.getWorkItemTypes(config.project);
		lines.push(`✅ Connected — ${types?.length ?? 0} work item types available`);
	} catch (err) {
		lines.push(`❌ Connection failed: ${formatAdoError(err)}`);
		return errorResult(lines.join("\n"));
	}

	return textResult(lines.join("\n"));
}

// ---------------------------------------------------------------------------
// Mock report
// ---------------------------------------------------------------------------

function formatMockReport(config: AzureDevOpsConfig): string {
	return [
		"## Azure DevOps Configuration (Mock Mode)",
		`- **Org:** ${config.orgUrl}`,
		`- **Project:** ${config.project}`,
		`- **Auth Method:** ${config.authMethod}`,
		`- **Safety Level:** ${config.safetyLevel}`,
		`- **Mock Mode:** on`,
		"",
		"## Authentication",
		"✅ Mock — simulated as authenticated",
		"",
		"## Connection",
		"✅ Mock — simulated as connected (6 work item types)",
		"",
		"⚠️ Running in mock mode. No network calls were made.",
	].join("\n");
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
