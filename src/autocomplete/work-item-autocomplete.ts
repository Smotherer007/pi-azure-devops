/**
 * Work item autocomplete provider for `#<id>` tokens.
 *
 * On session_start, preloads recent/assigned work items via WIQL query
 * (or mock fixtures). Then registers an autocomplete provider that
 * detects `#<partial>` at the cursor and fuzzy-filters the preloaded items.
 */

import type {
	AutocompleteItem,
	AutocompleteProvider,
	AutocompleteSuggestions,
} from "@earendil-works/pi-tui";
import { fuzzyFilter } from "@earendil-works/pi-tui";
import type { AzureDevOpsConfig } from "../config/index.js";
import { isMock } from "../tools/shared.js";
import { getWorkItemTrackingApi } from "../utils/connection.js";
import { mockQueryWorkItems } from "../mocks/mock-handler.js";

// ---------------------------------------------------------------------------
// Work item loading (exported for testing)
// ---------------------------------------------------------------------------

export type WorkItemSummary = {
	id: number;
	title: string;
	state: string;
	type: string;
};

const MAX_ITEMS = 100;
const MAX_SUGGESTIONS = 20;

// ---------------------------------------------------------------------------
// Token extraction (exported for testing)
// ---------------------------------------------------------------------------

export function extractWorkItemToken(textBeforeCursor: string): string | undefined {
	const match = textBeforeCursor.match(/(?:^|[ \t(])#([^\s#]*)$/);
	return match?.[1];
}

// ---------------------------------------------------------------------------
// Formatting (exported for testing)
// ---------------------------------------------------------------------------

export function formatWorkItemItem(wi: WorkItemSummary): AutocompleteItem {
	return {
		value: `#${wi.id}`,
		label: `#${wi.id}`,
		description: `[${wi.state}] ${wi.title}`,
	};
}

// ---------------------------------------------------------------------------
// Filtering (exported for testing)
// ---------------------------------------------------------------------------

export function filterWorkItems(
	items: WorkItemSummary[],
	query: string,
): AutocompleteItem[] {
	if (!query.trim()) {
		return items.slice(0, MAX_SUGGESTIONS).map(formatWorkItemItem);
	}

	// Pure numeric prefix → match by ID first
	if (/^\d+$/.test(query)) {
		const numericMatches = items
			.filter((wi) => String(wi.id).startsWith(query))
			.slice(0, MAX_SUGGESTIONS)
			.map(formatWorkItemItem);
		if (numericMatches.length > 0) {
			return numericMatches;
		}
	}

	// Fallback to fuzzy match on "id title"
	return fuzzyFilter(items, query, (wi) => `${wi.id} ${wi.title}`)
		.slice(0, MAX_SUGGESTIONS)
		.map(formatWorkItemItem);
}

// ---------------------------------------------------------------------------
// Autocomplete provider wrapper
// ---------------------------------------------------------------------------

function createWorkItemAutocompleteProvider(
	current: AutocompleteProvider,
	getItems: () => Promise<WorkItemSummary[] | undefined>,
): AutocompleteProvider {
	return {
		async getSuggestions(
			lines: string[],
			cursorLine: number,
			cursorCol: number,
			options,
		): Promise<AutocompleteSuggestions | null> {
			const currentLine = lines[cursorLine] ?? "";
			const textBeforeCursor = currentLine.slice(0, cursorCol);
			const token = extractWorkItemToken(textBeforeCursor);
			if (token === undefined) {
				return current.getSuggestions(lines, cursorLine, cursorCol, options);
			}

			const items = await getItems();
			if (options.signal.aborted || !items || items.length === 0) {
				return current.getSuggestions(lines, cursorLine, cursorCol, options);
			}

			const suggestions = filterWorkItems(items, token);
			if (suggestions.length === 0) {
				return current.getSuggestions(lines, cursorLine, cursorCol, options);
			}

			return {
				items: suggestions,
				prefix: `#${token}`,
			};
		},

		applyCompletion(
			lines: string[],
			cursorLine: number,
			cursorCol: number,
			item: AutocompleteItem,
			prefix: string,
		) {
			return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
		},

		shouldTriggerFileCompletion(
			lines: string[],
			cursorLine: number,
			cursorCol: number,
		) {
			return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
		},
	};
}

// ---------------------------------------------------------------------------
// Work item loading
// ---------------------------------------------------------------------------

async function loadWorkItemsFromApi(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
): Promise<WorkItemSummary[] | undefined> {
	try {
		const witApi = await getWorkItemTrackingApi(config, signal);
		const wiql = [
			"SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType]",
			"FROM WorkItems",
			"WHERE [System.State] <> 'Closed' AND [System.State] <> 'Done'",
			"ORDER BY [System.ChangedDate] DESC",
		].join(" ");

		const result = await witApi.queryByWiql(
			{ query: wiql },
			undefined,
			undefined,
			MAX_ITEMS,
		);

		if (!result.workItems || result.workItems.length === 0) {
			return undefined;
		}

		// Fetch the actual work items to get title/state/type
		const ids = result.workItems.map((wi) => wi.id!);
		const workItems = await witApi.getWorkItems(ids, undefined, undefined, undefined, undefined, config.project);

		return (workItems ?? []).map((wi) => ({
			id: wi.id!,
			title: (wi.fields as any)?.["System.Title"] ?? "(untitled)",
			state: (wi.fields as any)?.["System.State"] ?? "Unknown",
			type: (wi.fields as any)?.["System.WorkItemType"] ?? "Unknown",
		}));
	} catch {
		return undefined;
	}
}

export function loadWorkItemsFromMock(): WorkItemSummary[] {
	const result = mockQueryWorkItems("");
	const items: WorkItemSummary[] = [];

	// Parse mock results to extract structured data
	// Format: #101 [User Story] [Active] Implement user authentication flow
	for (const line of result.content[0].text.split("\n")) {
		const match = line.match(/^#(\d+)\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+)$/);
		if (match) {
			items.push({
				id: Number(match[1]),
				type: match[2].trim(),
				state: match[3].trim(),
				title: match[4].trim(),
			});
		}
	}
	return items;
}

// ---------------------------------------------------------------------------
// Exported hook — called from extension session_start
// ---------------------------------------------------------------------------

export function registerAutocomplete(
	addAutocompleteProvider: (wrapper: (current: AutocompleteProvider) => AutocompleteProvider) => void,
	config: AzureDevOpsConfig,
): void {
	if (!config.autocomplete) return;

	let itemsPromise: Promise<WorkItemSummary[] | undefined> | undefined;

	const getItems = async (): Promise<WorkItemSummary[] | undefined> => {
		itemsPromise ||= (async () => {
			if (isMock(config, false)) {
				return loadWorkItemsFromMock();
			}
			return loadWorkItemsFromApi(config);
		})();
		return itemsPromise;
	};

	// Kick off preload (fire-and-forget)
	void getItems();

	addAutocompleteProvider((current) =>
		createWorkItemAutocompleteProvider(current, getItems),
	);
}
