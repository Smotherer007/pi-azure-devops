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
	/** Safety level override for this project (overrides org and global) */
	safetyLevel?: SafetyLevel;
}

/** An Azure DevOps organization configuration */
export interface OrgConfig {
	/** Display name for the org (used for selection) */
	name: string;
	/** Organization URL, e.g. https://dev.azure.com/myorg */
	url: string;
	/** Projects within this org */
	projects: ProjectConfig[];
	/** Safety level override for this org (overrides global, overridden by project) */
	safetyLevel?: SafetyLevel;
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
	readonly missing: string[];
	constructor(
		missing: string[],
		message?: string,
	) {
		super(message ?? `Missing required Azure DevOps configuration: ${missing.join(", ")}`);
		this.name = "ConfigError";
		this.missing = missing;
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

/**
 * Resolve the effective safety level with cascading overrides.
 * Priority (most specific wins): project > org > global > default
 */
function resolveEffectiveSafetyLevel(
	globalLevel: SafetyLevel | undefined,
	org: OrgConfig | undefined,
	project: ProjectConfig | undefined,
): SafetyLevel {
	const projectLevel = validateSafetyLevel(project?.safetyLevel);
	if (projectLevel) return projectLevel;

	const orgLevel = validateSafetyLevel(org?.safetyLevel);
	if (orgLevel) return orgLevel;

	const global = validateSafetyLevel(globalLevel);
	if (global) return global;

	return DEFAULTS.safetyLevel;
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

	const safetyLevel = resolveEffectiveSafetyLevel(
		config.safetyLevel,
		org,
		project,
	);

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
 * Resolve a specific org+project config from the base config's allOrgs list.
 *
 * Used by tools that accept optional org/project parameters to override
 * the default session config.
 *
 * @param baseConfig - The session-level resolved config (from resolveConfig)
 * @param orgName - Optional org name to look up in allOrgs
 * @param projectName - Optional project name to look up in the org
 * @returns A new AzureDevOpsConfig pointing to the requested org/project
 * @throws ConfigError if the org or project is not found
 */
export function resolveOrgProjectConfig(
	baseConfig: AzureDevOpsConfig,
	orgName?: string,
	projectName?: string,
): AzureDevOpsConfig {
	// No overrides — return base as-is
	if (!orgName && !projectName) return baseConfig;

	// Find the target org
	const targetOrgName = orgName ??
		baseConfig.orgUrl.replace(/^https?:\/\/dev\.azure\.com\//, "");
	const targetOrg = baseConfig.allOrgs.find(
		(o) => o.name === targetOrgName,
	);

	if (!targetOrg) {
		throw new ConfigError(
			[`org "${targetOrgName}"`],
			`Organization "${targetOrgName}" not found in pi-azure-devops.json. ` +
			`Available: ${baseConfig.allOrgs.map((o) => o.name).join(", ")}`,
		);
	}

	// Find the target project within that org.
	// If projectName is explicitly given, search for it.
	// If only orgName is given (no project), try the base project name first;
	// if it doesn't exist in the target org, fall back to the org's first project.
	let targetProject = targetOrg.projects.find(
		(p) => p.name === projectName,
	);

	if (!targetProject && !projectName) {
		// No explicit project — try the base config's project, then fall back to first
		targetProject = targetOrg.projects.find(
			(p) => p.name === baseConfig.project,
		) ?? targetOrg.projects[0];
	}

	if (!targetProject) {
		const searchedName = projectName ?? baseConfig.project;
		throw new ConfigError(
			[`project "${searchedName}" in org "${targetOrgName}"`],
			`Project "${searchedName}" not found in org "${targetOrgName}". ` +
			`Available: ${targetOrg.projects.map((p) => p.name).join(", ")}`,
		);
	}

	// Resolve safety level with cascading overrides for the target org/project.
	// The base config may have been resolved with a different org/project's level;
	// we re-resolve here so the target's most specific setting takes effect.
	const raw = readConfigFile();
	const targetSafetyLevel = resolveEffectiveSafetyLevel(
		raw.safetyLevel,
		targetOrg,
		targetProject,
	);

	return {
		...baseConfig,
		orgUrl: targetOrg.url.replace(/\/+$/, ""),
		project: targetProject.name,
		pat: targetProject.pat || baseConfig.pat,
		safetyLevel: targetSafetyLevel,
	};
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
			const safetyLevel = resolveEffectiveSafetyLevel(
				raw.safetyLevel,
				org,
				proj,
			);

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
  ],
  "safetyLevel": "confirm"
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
