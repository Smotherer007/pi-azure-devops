import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Authentication method */
export type AuthMethod = "pat" | "azure-cli" | "auto";

/** Safety level for mutation operations */
export type SafetyLevel = "open" | "confirm" | "readonly";

/** A single project configuration within an org */
export interface ProjectConfig {
	/** Project name */
	name: string;
	/** Personal Access Token for this project */
	pat: string;
}

/** An Azure DevOps organization configuration */
export interface OrgConfig {
	/** Display name for the org (used for selection) */
	name: string;
	/** Organization URL, e.g. https://dev.azure.com/myorg */
	url: string;
	/** Projects within this org */
	projects: ProjectConfig[];
}

/** Root configuration shape for pi-azure-devops.json */
export interface AzureDevOpsRootConfig {
	/** All configured organizations */
	orgs: OrgConfig[];
	/** Default org name (first org used if unset) */
	defaultOrg?: string;
	/** Default project name */
	defaultProject?: string;
	/** Default team name */
	defaultTeam?: string;
	/** Authentication method */
	authMethod?: AuthMethod;
	/** Safety level */
	safetyLevel?: SafetyLevel;
	/** Default work item type */
	defaultWorkItemType?: string;
	/** Max query results */
	maxQueryResults?: number;
	/** Enable autocomplete */
	autocomplete?: boolean;
	/** Mock mode */
	mock?: boolean;
}

/** Resolved single-connection Azure DevOps configuration */
export interface AzureDevOpsConfig {
	/** Azure DevOps organization URL */
	orgUrl: string;
	/** Default project name */
	project: string;
	/** Default team name */
	team: string | undefined;
	/** Personal Access Token for this connection */
	pat: string | undefined;
	/** All available orgs (for multi-org awareness) */
	allOrgs: OrgConfig[];
	/** Authentication method */
	authMethod: AuthMethod;
	/** Safety level for mutation tools */
	safetyLevel: SafetyLevel;
	/** Default work item type when creating */
	defaultWorkItemType: string;
	/** Maximum number of query results */
	maxQueryResults: number;
	/** Enable #id autocomplete */
	autocomplete: boolean;
	/** Mock mode — use fixture data without network calls */
	mock: boolean;
}

/** Error thrown when required config is missing */
export class ConfigError extends Error {
	constructor(
		public readonly missing: string[],
		message?: string,
	) {
		super(message ?? `Missing required Azure DevOps configuration: ${missing.join(", ")}`);
		this.name = "ConfigError";
	}
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
	authMethod: "auto" as AuthMethod,
	safetyLevel: "confirm" as SafetyLevel,
	defaultWorkItemType: "User Story",
	maxQueryResults: 100,
	autocomplete: true,
	mock: false,
};

const VALID_AUTH_METHODS = new Set<string>(["pat", "azure-cli", "auto"]);
const VALID_SAFETY_LEVELS = new Set<string>(["open", "confirm", "readonly"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAgentDir(): string {
	return process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
}

function getConfigPath(): string {
	return join(getAgentDir(), "pi-azure-devops.json");
}

function readConfigFile(): AzureDevOpsRootConfig {
	const configPath = getConfigPath();
	if (!existsSync(configPath)) {
		// Auto-create template config
		ensureConfigTemplate();
		return { orgs: [] };
	}
	try {
		return JSON.parse(readFileSync(configPath, "utf-8")) as AzureDevOpsRootConfig;
	} catch {
		return { orgs: [] };
	}
}

function findOrg(config: AzureDevOpsRootConfig, orgName: string | undefined): OrgConfig | undefined {
	if (!orgName || config.orgs.length === 0) return undefined;
	return config.orgs.find((o) => o.name === orgName);
}

function findProject(org: OrgConfig, projectName: string | undefined): ProjectConfig | undefined {
	if (!projectName) return org.projects[0];
	return org.projects.find((p) => p.name === projectName);
}

function validateAuthMethod(value: string | undefined): AuthMethod | undefined {
	if (!value) return undefined;
	const normalized = value.toLowerCase().trim();
	return VALID_AUTH_METHODS.has(normalized) ? (normalized as AuthMethod) : undefined;
}

function validateSafetyLevel(value: string | undefined): SafetyLevel | undefined {
	if (!value) return undefined;
	const normalized = value.toLowerCase().trim();
	return VALID_SAFETY_LEVELS.has(normalized) ? (normalized as SafetyLevel) : undefined;
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Resolve Azure DevOps configuration entirely from pi-azure-devops.json.
 *
 * No environment variables are read — the JSON file is the single source of truth.
 *
 * @param _cwd - Reserved for future project-local config
 * @throws {ConfigError} when required fields are missing
 */
export function resolveConfig(_cwd: string = process.cwd()): AzureDevOpsConfig {
	const config = readConfigFile();

	const defaultOrgName = config.defaultOrg ?? config.orgs[0]?.name;
	const org = findOrg(config, defaultOrgName);

	const missing: string[] = [];

	if (!org) {
		missing.push("No orgs configured in pi-azure-devops.json");
	} else {
		if (!org.url) missing.push("org.url is required in pi-azure-devops.json");
	}

	const defaultProjectName = config.defaultProject ?? org?.projects[0]?.name;
	const project = org ? findProject(org, defaultProjectName) : undefined;

	if (!project?.name) {
		missing.push("No project configured in pi-azure-devops.json (set defaultProject or add projects)");
	}

	if (missing.length > 0) {
		throw new ConfigError(missing);
	}

	const resolvedOrgUrl = org!.url.replace(/\/+$/, "");
	const resolvedProject = project!.name;
	const team = config.defaultTeam?.trim() || undefined;
	const pat = project!.pat || undefined;

	const authMethod =
		validateAuthMethod(config.authMethod) ??
		DEFAULTS.authMethod;

	const safetyLevel =
		validateSafetyLevel(config.safetyLevel) ??
		DEFAULTS.safetyLevel;

	const defaultWorkItemType = config.defaultWorkItemType ?? DEFAULTS.defaultWorkItemType;
	const maxQueryResults = config.maxQueryResults ?? DEFAULTS.maxQueryResults;
	const autocomplete = config.autocomplete ?? DEFAULTS.autocomplete;
	const mock = config.mock ?? DEFAULTS.mock;

	return {
		orgUrl: resolvedOrgUrl,
		project: resolvedProject,
		team,
		pat,
		allOrgs: config.orgs,
		authMethod,
		safetyLevel,
		defaultWorkItemType,
		maxQueryResults,
		autocomplete,
		mock,
	};
}

export function tryResolveConfig(cwd?: string): AzureDevOpsConfig | undefined {
	try {
		return resolveConfig(cwd);
	} catch {
		return undefined;
	}
}

/**
 * Resolve ALL configured org+project combinations from pi-azure-devops.json.
 *
 * Unlike resolveConfig(), this does NOT use defaultOrg/defaultProject —
 * it returns every org×project pairing so the doctor can validate them all.
 */
export function resolveAllOrgConfigs(): {
	connections: AzureDevOpsConfig[];
	errors: string[];
} {
	const raw = readConfigFile();
	const errors: string[] = [];

	if (!raw.orgs || raw.orgs.length === 0) {
		errors.push("No orgs configured in pi-azure-devops.json");
		return { connections: [], errors };
	}

	const connections: AzureDevOpsConfig[] = [];

	for (const org of raw.orgs) {
		if (!org.url) {
			errors.push(`Org "${org.name || "(unnamed)"}": missing url`);
			continue;
		}

		const projects = org.projects ?? [];
		for (const proj of projects) {
			if (!proj.name) {
				errors.push(`Org "${org.name}": project missing name`);
				continue;
			}

			const authMethod =
				validateAuthMethod(raw.authMethod) ?? DEFAULTS.authMethod;
			const safetyLevel =
				validateSafetyLevel(raw.safetyLevel) ?? DEFAULTS.safetyLevel;

			connections.push({
				orgUrl: org.url.replace(/\/+$/, ""),
				project: proj.name,
				team: raw.defaultTeam?.trim() || undefined,
				pat: proj.pat || undefined,
				allOrgs: raw.orgs,
				authMethod,
				safetyLevel,
				defaultWorkItemType:
					raw.defaultWorkItemType ?? DEFAULTS.defaultWorkItemType,
				maxQueryResults:
					raw.maxQueryResults ?? DEFAULTS.maxQueryResults,
				autocomplete: raw.autocomplete ?? DEFAULTS.autocomplete,
				mock: raw.mock ?? DEFAULTS.mock,
			});
		}

		if (projects.length === 0) {
			errors.push(`Org "${org.name}": no projects configured`);
		}
	}

	return { connections, errors };
}

// ---------------------------------------------------------------------------
// Template config writer
// ---------------------------------------------------------------------------

/** Default template content for pi-azure-devops.json */
const TEMPLATE_JSON = `{
  "orgs": [
    {
      "name": "my-org",
      "url": "https://dev.azure.com/my-org",
      "projects": [
        {
          "name": "MyProject",
          "pat": "your-personal-access-token-here"
        }
      ]
    }
  ]
}
`;

/**
 * Auto-create a template config file at ~/.pi/agent/pi-azure-devops.json
 * if it doesn't already exist.
 */
export function ensureConfigTemplate(): boolean {
	const configPath = getConfigPath();
	if (existsSync(configPath)) {
		return false; // already exists
	}

	try {
		const dir = dirname(configPath);
		mkdirSync(dir, { recursive: true });
		writeFileSync(configPath, TEMPLATE_JSON, "utf-8");
		return true; // created
	} catch {
		return false; // couldn't create
	}
}
