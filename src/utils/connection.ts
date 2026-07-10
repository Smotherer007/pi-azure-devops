/**
 * WebApi connection factory.
 * Creates and caches authenticated connections to Azure DevOps.
 */

import { WebApi } from "azure-devops-node-api";
import type { AzureDevOpsConfig } from "../config/index.ts";
import { resolveAuth } from "../auth/index.ts";

// Cache per session — keyed by orgUrl
const connections = new Map<string, WebApi>();

/**
 * Get or create an authenticated WebApi connection.
 * Cached by orgUrl so we reuse connections within a session.
 */
export async function getConnection(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
): Promise<WebApi> {
	const cached = connections.get(config.orgUrl);
	if (cached) return cached;

	const authResult = await resolveAuth(config, signal);
	const connection = new WebApi(config.orgUrl, authResult.handler);

	connections.set(config.orgUrl, connection);
	return connection;
}

/**
 * Get the WorkItemTracking API client.
 */
export async function getWorkItemTrackingApi(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
) {
	const connection = await getConnection(config, signal);
	return connection.getWorkItemTrackingApi();
}

/**
 * Get the Work API client — boards, backlogs, iterations, capacity.
 */
export async function getWorkApi(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
) {
	const connection = await getConnection(config, signal);
	return connection.getWorkApi();
}

/**
 * Get the Core API client — projects, teams.
 */
export async function getCoreApi(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
) {
	const connection = await getConnection(config, signal);
	return connection.getCoreApi();
}

/**
 * Get the Git API client — repos, branches, pull requests.
 */
export async function getGitApi(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
) {
	const connection = await getConnection(config, signal);
	return connection.getGitApi();
}

/**
 * Get the Policy API client — policy configurations and evaluations.
 */
export async function getPolicyApi(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
) {
	const connection = await getConnection(config, signal);
	return connection.getPolicyApi();
}

/**
 * Get the Build API client — builds, timelines, logs, artifacts.
 */
export async function getBuildApi(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
) {
	const connection = await getConnection(config, signal);
	return connection.getBuildApi();
}

/**
 * Get the Pipelines API client — YAML pipelines, runs.
 */
export async function getPipelinesApi(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
) {
	const connection = await getConnection(config, signal);
	return connection.getPipelinesApi();
}

/**
 * Get the Test Plan API client — test plans, suites, cases, points.
 */
export async function getTestPlanApi(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
) {
	const connection = await getConnection(config, signal);
	return connection.getTestPlanApi();
}

/**
 * Get the Test Results API client — test runs and results.
 */
export async function getTestResultsApi(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
) {
	const connection = await getConnection(config, signal);
	return connection.getTestResultsApi();
}

/**
 * Clear cached connections (useful after auth failure retry).
 */
export function clearConnectionCache(): void {
	connections.clear();
}
