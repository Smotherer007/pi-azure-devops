/**
 * Connection status helpers — pure, testable functions.
 *
 * Consumed by three surfaces:
 *  - the footer status line (ctx.ui.setStatus)
 *  - the persistent connection card (appendEntry + registerEntryRenderer)
 *  - the `/azure-devops-status` command
 *
 * Keeping the shape-building logic here (instead of inline in the extension)
 * makes it unit-testable without any TUI or Azure DevOps connection.
 */

import type { AzureDevOpsConfig } from "./config/index.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Immutable snapshot of the active Azure DevOps connection. */
export interface ConnectionCard {
	/** Display name of the org, e.g. "neoimpulse" (stripped from the URL). */
	org: string;
	/** Full organization URL. */
	orgUrl: string;
	/** Default project name. */
	project: string;
	/** Default team name, if configured. */
	team?: string;
	/** Authentication method in use ("pat" | "azure-cli" | "auto"). */
	authMethod: string;
	/** Effective safety level ("open" | "confirm" | "readonly"). */
	safetyLevel: string;
	/** Default work item type used when creating items. */
	defaultWorkItemType: string;
	/** Maximum number of WIQL query results. */
	maxQueryResults: number;
	/** Whether the extension runs in offline mock mode. */
	mock: boolean;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Extract a display org name from a dev.azure.com URL.
 * Handles "https://dev.azure.com/myorg", trailing slashes, and non-standard URLs.
 */
export function extractOrgName(orgUrl: string): string {
	const stripped = orgUrl.replace(/^https?:\/\//, "").replace(/^dev\.azure\.com\//, "");
	return stripped.replace(/\/+$/, "") || orgUrl;
}

/**
 * Build a ConnectionCard from the resolved config.
 * Returns undefined when no config is available (e.g. template not yet filled in).
 */
export function buildConnectionCard(
	config: AzureDevOpsConfig | undefined,
): ConnectionCard | undefined {
	if (!config) return undefined;

	return {
		org: extractOrgName(config.orgUrl),
		orgUrl: config.orgUrl,
		project: config.project,
		team: config.team,
		authMethod: config.authMethod,
		safetyLevel: config.safetyLevel,
		defaultWorkItemType: config.defaultWorkItemType,
		maxQueryResults: config.maxQueryResults,
		mock: config.mock,
	};
}

/**
 * Short footer label, e.g. "✓ Azure DevOps · neoimpulse/MyProject".
 * Positive, green-friendly health label — no safety level, no mock marker.
 * Falls back to a "not configured" hint when no card is available.
 */
export function buildConnectionLabel(card: ConnectionCard | undefined): string {
	if (!card) {
		return "Azure DevOps · not configured";
	}

	const parts: string[] = [`${card.org}/${card.project}`];
	if (card.team) parts.push(`@${card.team}`);
	return `✓ Azure DevOps · ${parts.join(" · ")}`;
}

/**
 * Rich markdown used by the `/azure-devops-status` command output.
 */
export function formatStatusText(card: ConnectionCard | undefined): string {
	if (!card) {
		return [
			"## Azure DevOps",
			"",
			"⚠️ **No configuration found.**",
			"",
			"A template was created at `~/.pi/agent/pi-azure-devops.json`. " +
				"Edit it with your org, project, and PAT, then run `/azure-devops-doctor`.",
		].join("\n");
	}

	const lines: string[] = ["## Azure DevOps Connection", ""];
	lines.push(`- **Org:** ${card.org}`);
	lines.push(`- **Project:** ${card.project}`);
	if (card.team) lines.push(`- **Team:** ${card.team}`);
	lines.push(`- **URL:** ${card.orgUrl}`);
	lines.push(`- **Auth:** ${card.authMethod}`);
	lines.push(`- **Safety:** ${card.safetyLevel}`);
	lines.push(`- **Default work item type:** ${card.defaultWorkItemType}`);
	lines.push(`- **Max query results:** ${card.maxQueryResults}`);
	lines.push(`- **Mode:** ${card.mock ? "mock (offline fixtures)" : "live API"}`);
	return lines.join("\n");
}
