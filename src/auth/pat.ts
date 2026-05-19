/**
 * PAT authentication handler.
 * Uses a Personal Access Token via azure-devops-node-api's built-in handler.
 */

import { getPersonalAccessTokenHandler } from "azure-devops-node-api";

export interface PatAuthResult {
	handler: ReturnType<typeof getPersonalAccessTokenHandler>;
	method: "pat";
}

/**
 * Create a PAT auth handler.
 * @param token - Personal Access Token
 * @returns auth handler, or undefined if token is not set
 */
export function createPatAuth(token: string | undefined): PatAuthResult | undefined {
	if (!token) return undefined;
	if (!token) return undefined;
	return {
		handler: getPersonalAccessTokenHandler(token),
		method: "pat",
	};
}
