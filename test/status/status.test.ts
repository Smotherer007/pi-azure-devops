import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	extractOrgName,
	buildConnectionCard,
	buildConnectionLabel,
	formatStatusText,
	type ConnectionCard,
} from "../../src/status.ts";
import type { AzureDevOpsConfig } from "../../src/config/index.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<AzureDevOpsConfig> = {}): AzureDevOpsConfig {
	return {
		orgUrl: "https://dev.azure.com/neoimpulse",
		project: "PI Agent Reviewer",
		authMethod: "pat",
		safetyLevel: "confirm",
		defaultWorkItemType: "User Story",
		maxQueryResults: 100,
		autocomplete: true,
		mock: false,
		allOrgs: [],
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// extractOrgName
// ---------------------------------------------------------------------------

describe("extractOrgName", () => {
	it("strips dev.azure.com scheme and host", () => {
		assert.equal(extractOrgName("https://dev.azure.com/neoimpulse"), "neoimpulse");
	});

	it("removes trailing slashes", () => {
		assert.equal(extractOrgName("https://dev.azure.com/neoimpulse/"), "neoimpulse");
	});

	it("handles http scheme", () => {
		assert.equal(extractOrgName("http://dev.azure.com/acme"), "acme");
	});

	it("returns the URL unchanged for non-dev.azure.com hosts", () => {
		assert.equal(extractOrgName("https://myorg.visualstudio.com"), "myorg.visualstudio.com");
	});

	it("falls back to the raw URL when nothing can be stripped", () => {
		assert.equal(extractOrgName(""), "");
	});
});

// ---------------------------------------------------------------------------
// buildConnectionCard
// ---------------------------------------------------------------------------

describe("buildConnectionCard", () => {
	it("returns undefined when no config is provided", () => {
		assert.equal(buildConnectionCard(undefined), undefined);
	});

	it("maps config fields into a connection card", () => {
		const card = buildConnectionCard(makeConfig())!;
		assert.equal(card.org, "neoimpulse");
		assert.equal(card.orgUrl, "https://dev.azure.com/neoimpulse");
		assert.equal(card.project, "PI Agent Reviewer");
		assert.equal(card.authMethod, "pat");
		assert.equal(card.safetyLevel, "confirm");
		assert.equal(card.defaultWorkItemType, "User Story");
		assert.equal(card.maxQueryResults, 100);
		assert.equal(card.mock, false);
	});

	it("carries the team through when configured", () => {
		const card = buildConnectionCard(makeConfig({ team: "Platform" }))!;
		assert.equal(card.team, "Platform");
	});

	it("leaves team undefined when not configured", () => {
		const card = buildConnectionCard(makeConfig({ team: undefined }))!;
		assert.equal(card.team, undefined);
	});

	it("reflects mock mode", () => {
		const card = buildConnectionCard(makeConfig({ mock: true }))!;
		assert.equal(card.mock, true);
	});
});

// ---------------------------------------------------------------------------
// buildConnectionLabel
// ---------------------------------------------------------------------------

describe("buildConnectionLabel", () => {
	it("labels a not-configured card", () => {
		assert.equal(buildConnectionLabel(undefined), "Azure DevOps · not configured");
	});

	it("includes org/project without safety level", () => {
		const card = buildConnectionCard(makeConfig())!;
		assert.equal(buildConnectionLabel(card), "✓ Azure DevOps · neoimpulse/PI Agent Reviewer");
	});

	it("includes the team when configured", () => {
		const card = buildConnectionCard(makeConfig({ team: "Platform" }))!;
		assert.equal(buildConnectionLabel(card), "✓ Azure DevOps · neoimpulse/PI Agent Reviewer · @Platform");
	});
});

// ---------------------------------------------------------------------------
// formatStatusText
// ---------------------------------------------------------------------------

describe("formatStatusText", () => {
	it("renders a no-config hint when there is no card", () => {
		const text = formatStatusText(undefined);
		assert.ok(text.includes("No configuration found"));
		assert.ok(text.includes("pi-azure-devops.json"));
		assert.ok(text.includes("/azure-devops-doctor"));
	});

	it("renders all connection fields header", () => {
		const text = formatStatusText(buildConnectionCard(makeConfig())!);
		assert.ok(text.includes("## Azure DevOps Connection"));
		assert.ok(text.includes("- **Org:** neoimpulse"));
		assert.ok(text.includes("- **Project:** PI Agent Reviewer"));
		assert.ok(text.includes("- **Auth:** pat"));
		assert.ok(text.includes("- **Safety:** confirm"));
	});

	it("omits the team line when not configured", () => {
		const text = formatStatusText(buildConnectionCard(makeConfig({ team: undefined }))!);
		assert.ok(!text.includes("**Team:**"));
	});

	it("omits the team line when configured", () => {
		const text = formatStatusText(buildConnectionCard(makeConfig({ team: "Platform" }))!);
		assert.ok(text.includes("- **Team:** Platform"));
	});

	it("renders mock mode when enabled", () => {
		const text = formatStatusText(buildConnectionCard(makeConfig({ mock: true }))!);
		assert.ok(text.includes("mock (offline fixtures)"));
	});
});
