/**
 * Azure CLI authentication handler.
 * Uses `az account get-access-token` to obtain an Entra ID token for Azure DevOps.
 */

import { getBearerHandler } from "azure-devops-node-api";
import type { getPersonalAccessTokenHandler } from "azure-devops-node-api";

// Use the handler type from PAT as our canonical handler type
type IRequestHandler = ReturnType<typeof getPersonalAccessTokenHandler>;

// Azure DevOps resource ID for Azure CLI token request
const AZURE_DEVOPS_RESOURCE_ID = "499b84ac-1321-427f-aa17-267ca6975798";

export interface AzureCliAuthResult {
	handler: IRequestHandler;
	method: "azure-cli";
}

interface AzAccessToken {
	token: string;
	expiresOn: string; // ISO date or timestamp
}

/** Cached Azure CLI token */
let cachedToken: { token: string; expiresAt: number } | undefined;

/**
 * Check if `az` CLI is available.
 */
export function isAzureCliAvailable(): boolean {
	// Simple check — doesn't actually run az to avoid startup delay
	const path = process.env.PATH ?? "";
	const isWin = process.platform === "win32";
	const cmd = isWin ? "az.cmd" : "az";
	// Basic PATH check; actual availability verified on first use
	return path.split(isWin ? ";" : ":").some((p) => p.includes("az") || p.includes("Azure"));
}

/**
 * Acquire a token from Azure CLI.
 * Caches the token and refreshes when near expiry.
 */
async function acquireToken(signal?: AbortSignal): Promise<string> {
	// Return cached token if still valid (with 5 min buffer)
	if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
		return cachedToken.token;
	}

	const { execFile } = await import("node:child_process");
	const token = await new Promise<string>((resolve, reject) => {
		const args = [
			"account",
			"get-access-token",
			"--resource",
			AZURE_DEVOPS_RESOURCE_ID,
			"--output",
			"json",
		];

		const child = execFile("az", args, { timeout: 15_000, signal }, (err, stdout, stderr) => {
			if (err) {
				const detail = stderr?.trim() || err.message;
				reject(new Error(`Azure CLI auth failed: ${detail}`));
				return;
			}
			try {
				const parsed = JSON.parse(stdout) as AzAccessToken;
				resolve(parsed.token);
			} catch {
				reject(new Error(`Failed to parse Azure CLI output: ${stdout.slice(0, 200)}`));
			}
		});

		// Abort support
		if (signal) {
			signal.addEventListener("abort", () => child.kill(), { once: true });
		}
	});

	// Cache for 50 minutes (tokens typically last 60 min)
	cachedToken = { token, expiresAt: Date.now() + 50 * 60 * 1000 };
	return token;
}

/**
 * Create an Azure CLI auth handler.
 * @returns auth handler, or undefined if az CLI is not available
 */
export async function createAzureCliAuth(signal?: AbortSignal): Promise<AzureCliAuthResult | undefined> {
	try {
		const token = await acquireToken(signal);
		return {
			handler: getBearerHandler(token),
			method: "azure-cli",
		};
	} catch {
		return undefined;
	}
}

/**
 * Force-refresh the Azure CLI token (e.g., after auth failure).
 */
export function clearTokenCache(): void {
	cachedToken = undefined;
}
