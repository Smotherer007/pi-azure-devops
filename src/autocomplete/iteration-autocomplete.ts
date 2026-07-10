/**
 * Iteration autocomplete provider for `@sprint` tokens.
 *
 * On session_start, preloads the configured team's iterations via the Work API
 * (or mock fixtures). Then registers an autocomplete provider that detects
 * `@sprint<partial>` at the cursor and fuzzy-filters iteration names.
 *
 * Only activates when `config.team` is set — iteration data is team-specific.
 */

import type {
	AutocompleteItem,
	AutocompleteProvider,
	AutocompleteSuggestions,
} from "@earendil-works/pi-tui";
import { fuzzyFilter } from "@earendil-works/pi-tui";
import type { AzureDevOpsConfig } from "../config/index.ts";
import { isMock } from "../tools/shared.ts";
import { getWorkApi } from "../utils/connection.ts";

// ---------------------------------------------------------------------------
// Iteration data types (exported for testing)
// ---------------------------------------------------------------------------

export type IterationSummary = {
	id: string;
	name: string;
	path: string;
	startDate?: string;
	finishDate?: string;
	timeframe?: string;
};

const MAX_SUGGESTIONS = 20;

// ---------------------------------------------------------------------------
// Token extraction (exported for testing)
// ---------------------------------------------------------------------------

const ITERATION_PREFIX = "@sprint";

/**
 * Detect `@sprint<partial>` at cursor position.
 * Returns the partial text after `@sprint` (may be empty string).
 */
export function extractIterationToken(textBeforeCursor: string): string | undefined {
	const match = textBeforeCursor.match(/(?:^|[ \t(])@sprint([^\s@]*)$/);
	return match ? match[1] : undefined;
}

// ---------------------------------------------------------------------------
// Formatting (exported for testing)
// ---------------------------------------------------------------------------

export function formatIterationItem(iteration: IterationSummary): AutocompleteItem {
	const dates = iteration.startDate && iteration.finishDate
		? `${iteration.startDate.slice(0, 10)} → ${iteration.finishDate.slice(0, 10)}`
		: "no dates";
	const badge = iteration.timeframe ? ` [${iteration.timeframe}]` : "";

	return {
		value: `@sprint${iteration.name}`,
		label: iteration.name,
		description: `${dates}${badge}`,
	};
}

// ---------------------------------------------------------------------------
// Filtering (exported for testing)
// ---------------------------------------------------------------------------

export function filterIterations(
	items: IterationSummary[],
	query: string,
): AutocompleteItem[] {
	if (!query.trim()) {
		return items.slice(0, MAX_SUGGESTIONS).map(formatIterationItem);
	}

	return fuzzyFilter(items, query, (it) => `${it.name} ${it.path}`)
		.slice(0, MAX_SUGGESTIONS)
		.map(formatIterationItem);
}

// ---------------------------------------------------------------------------
// Iteration loading from mock
// ---------------------------------------------------------------------------

export function loadIterationsFromMockData(data: { iterations: Record<string, any[]> }): IterationSummary[] {
	const iterations = data.iterations ?? {};
	// Flatten all teams' iterations, deduplicate by id
	const seen = new Set<string>();
	const result: IterationSummary[] = [];
	for (const teamIterations of Object.values(iterations) as any[]) {
		for (const it of teamIterations) {
			if (!seen.has(it.id)) {
				seen.add(it.id);
				result.push({
					id: it.id,
					name: it.name,
					path: it.path ?? "",
					startDate: it.attributes?.startDate,
					finishDate: it.attributes?.finishDate,
					timeframe: it.attributes?.timeFrame,
				});
			}
		}
	}
	return result;
}

// ---------------------------------------------------------------------------
// Iteration loading from API
// ---------------------------------------------------------------------------

async function loadIterationsFromApi(
	config: AzureDevOpsConfig,
	signal?: AbortSignal,
): Promise<IterationSummary[] | undefined> {
	if (!config.team) return undefined;

	try {
		const workApi = await getWorkApi(config, signal);
		const teamContext = { project: config.project, team: config.team };
		const iterations = await workApi.getTeamIterations(teamContext);

		if (!iterations || iterations.length === 0) return undefined;

		return iterations.map((it: any) => ({
			id: it.id ?? "",
			name: it.name ?? "",
			path: it.path ?? "",
			startDate: it.attributes?.startDate,
			finishDate: it.attributes?.finishDate,
			timeframe: it.attributes?.timeFrame,
		}));
	} catch {
		return undefined;
	}
}

// ---------------------------------------------------------------------------
// Autocomplete provider wrapper
// ---------------------------------------------------------------------------

function createIterationAutocompleteProvider(
	current: AutocompleteProvider,
	getIterations: () => Promise<IterationSummary[] | undefined>,
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
			const token = extractIterationToken(textBeforeCursor);
			if (token === undefined) {
				return current.getSuggestions(lines, cursorLine, cursorCol, options);
			}

			const items = await getIterations();
			if (options.signal.aborted || !items || items.length === 0) {
				return current.getSuggestions(lines, cursorLine, cursorCol, options);
			}

			const suggestions = filterIterations(items, token);
			if (suggestions.length === 0) {
				return current.getSuggestions(lines, cursorLine, cursorCol, options);
			}

			return {
				items: suggestions,
				prefix: `${ITERATION_PREFIX}${token}`,
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
// Exported hook — called from extension session_start
// ---------------------------------------------------------------------------

export function registerIterationAutocomplete(
	addAutocompleteProvider: (wrapper: (current: AutocompleteProvider) => AutocompleteProvider) => void,
	config: AzureDevOpsConfig,
): void {
	// Only register when team is configured — iterations are team-specific
	if (!config.autocomplete || !config.team) return;

	let iterationsPromise: Promise<IterationSummary[] | undefined> | undefined;

	const getIterations = async (): Promise<IterationSummary[] | undefined> => {
		iterationsPromise ||= (async () => {
			if (isMock(config, false)) {
				// Load fixture inline to avoid sync FS in ESM
				const [{ readFileSync }, { resolve, dirname }] = await Promise.all([
					import("fs"),
					import("path"),
				]);
				const fixturePath = resolve(
					dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")),
					"../mocks/fixtures/iterations.json",
				);
				const data = JSON.parse(readFileSync(fixturePath, "utf-8"));
				return loadIterationsFromMockData(data);
			}
			return loadIterationsFromApi(config);
		})();
		return iterationsPromise;
	};

	// Kick off preload (fire-and-forget)
	void getIterations();

	addAutocompleteProvider((current) =>
		createIterationAutocompleteProvider(current, getIterations),
	);
}
