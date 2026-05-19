/**
 * Azure DevOps API error → user-friendly message mapping.
 */

/**
 * Normalize an Azure DevOps API error into a readable message.
 */
export function formatAdoError(error: unknown): string {
	if (error instanceof Error) {
		const msg = error.message;

		// Common Azure DevOps error patterns — check specific TF/VS codes before generic HTTP status
		if (msg.includes("TF401232")) {
			return "Project not found. Verify the project name in your configuration.";
		}
		if (msg.includes("TF401233")) {
			return "Work item not found. Check the work item ID.";
		}
		if (msg.includes("VS402335")) {
			return "Invalid work item type. Use azure_devops_list_work_item_types to see valid types.";
		}
		if (msg.includes("401") || msg.includes("Unauthorized")) {
			return "Authentication failed. Check your PAT or Azure CLI login.";
		}
		if (msg.includes("403") || msg.includes("Forbidden")) {
			return "Permission denied. Your credentials lack access to this resource.";
		}
		if (msg.includes("404") || msg.includes("Not Found")) {
			return "Resource not found. Check the organization URL and project name.";
		}
		if (msg.includes("rate") || msg.includes("429")) {
			return "Rate limited by Azure DevOps. Wait a moment and try again.";
		}
		if (msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
			return "Network error: could not reach Azure DevOps. Check your connection.";
		}
		if (msg.includes("ENOTFOUND")) {
			return "DNS error: could not resolve Azure DevOps hostname. Check the org URL.";
		}

		// Strip stack trace noise
		const firstLine = msg.split("\n")[0];
		return firstLine ?? "Unknown error";
	}

	return String(error);
}

/**
 * Check if an error is an auth failure.
 */
export function isAuthError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const msg = error.message;
	return msg.includes("401") || msg.includes("Unauthorized") || msg.includes("Forbidden");
}

/**
 * Check if an error is a "not found" error.
 */
export function isNotFoundError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const msg = error.message;
	return msg.includes("404") || msg.includes("TF401233") || msg.includes("Not Found");
}
