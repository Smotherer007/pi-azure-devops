/**
 * Auth resolver — auto-detects and creates the appropriate auth handler.
 *
 * Priority:
 * 1. PAT from pi-azure-devops.json config
 * 2. Azure CLI (az login)
 */

import { createPatAuth } from "./pat.ts";
import { createAzureCliAuth, clearTokenCache } from "./azure-cli.ts";
import type { AzureDevOpsConfig, AuthMethod } from "../config/index.ts";
import type { getPersonalAccessTokenHandler } from "azure-devops-node-api";

type IRequestHandler = ReturnType<typeof getPersonalAccessTokenHandler>;

export interface AuthResult {
	/** The request handler for azure-devops-node-api */
	handler: IRequestHandler;
	/** Which auth method was actually used */
	method: "pat" | "azure-cli";
}

/**
 * Resolve authentication based on config.
 *
 * @param config - Resolved Azure DevOps config (contains PAT in config.pat)
 * @param signal - Optional abort signal for Azure CLI token acquisition
 * @returns auth result, or throws if no auth method works
 */
export async function resolveAuth(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
): Promise<AuthResult> {
	const errors: string[] = [];
	const methods = getMethodsToTry(config.authMethod, !!config.pat);

	for (const method of methods) {
		if (method === "pat") {
			const result = createPatAuth(config.pat);
			if (result) return result;
			errors.push("PAT: no token configured in pi-azure-devops.json");
		}

		if (method === "azure-cli") {
			const result = await createAzureCliAuth(signal);
			if (result) return result;
			errors.push("Azure CLI: az not authenticated or not available");
		}
	}

	throw new AuthResolutionError(
		"No Azure DevOps authentication method available. " +
			"Add a PAT to pi-azure-devops.json or authenticate with `az login`.",
		errors,
	);
}

export async function tryResolveAuth(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
): Promise<AuthResult | undefined> {
	try {
		return await resolveAuth(config, signal);
	} catch {
		return undefined;
	}
}

function getMethodsToTry(authMethod: AuthMethod, hasPat: boolean): ("pat" | "azure-cli")[] {
	switch (authMethod) {
		case "pat":
			return ["pat"];
		case "azure-cli":
			return ["azure-cli"];
		case "auto":
		default:
			return hasPat ? ["pat", "azure-cli"] : ["azure-cli", "pat"];
	}
}

export class AuthResolutionError extends Error {
	readonly attemptedMethods: string[];
	constructor(
		message: string,
		attemptedMethods: string[],
	) {
		super(message);
		this.name = "AuthResolutionError";
		this.attemptedMethods = attemptedMethods;
	}
}

export { clearTokenCache };
