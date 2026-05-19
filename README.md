# pi-azure-devops

Azure DevOps integration for the [pi coding agent](https://github.com/earendil-works/pi) — work items, boards, repos, pull requests, pipelines, and test plans.

> **Forked from** [jwayong/pi-azure-devops](https://github.com/jwayong/pi-azure-devops) and extended by [Patrick Weppelmann](https://github.com/Smotherer007) with additional prompt templates, GitHub Actions CI/CD, auto-generated config template, and enhanced documentation.

All configuration is stored in `~/.pi/agent/pi-azure-devops.json` — no environment variables needed.

## Installation

```bash
pi install npm:@patimweb/pi-azure-devops
```

Or from local path during development:

```bash
pi install /path/to/pi-azure-devops
```

## Quick Start

1. Create `~/.pi/agent/pi-azure-devops.json` with your org, project, and PAT
2. Run `azure_devops_doctor` to verify connectivity
3. Start querying work items, repos, pipelines, etc.

### Example Configuration

```json
{
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
```

### Multi-Org / Multi-Project

```json
{
  "orgs": [
    {
      "name": "my-company",
      "url": "https://dev.azure.com/my-company",
      "projects": [
        { "name": "ProjectA", "pat": "token-for-project-a" },
        { "name": "ProjectB", "pat": "token-for-project-b" }
      ]
    },
    {
      "name": "client-xyz",
      "url": "https://dev.azure.com/client-xyz",
      "projects": [
        { "name": "ClientApp", "pat": "client-specific-token" }
      ]
    }
  ]
}
```

## Tools

### Work Items

| Tool | Description |
|------|-------------|
| `azure_devops_doctor` | Verify configuration and connection health |
| `azure_devops_get_work_item` | Fetch a single work item by ID |
| `azure_devops_query_work_items` | Search work items using WIQL |
| `azure_devops_list_work_item_types` | List valid work item types |
| `azure_devops_get_work_item_comments` | Get discussion on a work item |
| `azure_devops_get_work_item_revisions` | Get revision history |
| `azure_devops_create_work_item` | Create a new work item |
| `azure_devops_update_work_item` | Update fields on a work item |
| `azure_devops_add_work_item_comment` | Add a comment |
| `azure_devops_manage_work_item_links` | Add or remove links |

### Boards & Sprints

| Tool | Description |
|------|-------------|
| `azure_devops_list_teams` | List teams in the project |
| `azure_devops_list_boards` | List boards for a team |
| `azure_devops_get_board` | Get board detail (columns, WIP limits) |
| `azure_devops_set_board_columns` | Reconfigure board columns |
| `azure_devops_list_iterations` | List sprints/iterations |
| `azure_devops_get_iteration_work_items` | Get work items in a sprint |
| `azure_devops_get_capacity` | Get sprint capacity |
| `azure_devops_set_iteration` | Add/remove sprint from team |
| `azure_devops_set_capacity` | Set team member capacity |

### Repos & Pull Requests

| Tool | Description |
|------|-------------|
| `azure_devops_list_repos` | List repositories |
| `azure_devops_get_repo` | Get repository details |
| `azure_devops_list_branches` | List branches |
| `azure_devops_list_pull_requests` | List pull requests |
| `azure_devops_get_pull_request` | Get PR details |
| `azure_devops_get_pull_request_threads` | Get PR comment threads |
| `azure_devops_get_pull_request_commits` | Get PR commits |
| `azure_devops_list_policies` | List branch/PR policies |
| `azure_devops_get_policy_evaluations` | Check PR policy status |
| `azure_devops_create_pull_request` | Create a pull request |
| `azure_devops_update_pull_request` | Update PR (title, status) |
| `azure_devops_add_pull_request_comment` | Comment on a PR |
| `azure_devops_set_pull_request_vote` | Vote on a PR |

### Pipelines

| Tool | Description |
|------|-------------|
| `azure_devops_list_pipelines` | List YAML pipelines |
| `azure_devops_get_pipeline` | Get pipeline detail |
| `azure_devops_list_runs` | List pipeline runs |
| `azure_devops_get_run` | Get run detail |
| `azure_devops_get_run_artifacts` | Get run artifacts |
| `azure_devops_get_run_logs` | Get run logs |
| `azure_devops_get_run_timeline` | Get stages/jobs/tasks timeline |
| `azure_devops_run_pipeline` | Queue a pipeline run |
| `azure_devops_cancel_run` | Cancel a run |
| `azure_devops_retry_run` | Retry a failed run |

### Test Plans

| Tool | Description |
|------|-------------|
| `azure_devops_list_test_plans` | List test plans |
| `azure_devops_get_test_plan` | Get test plan detail |
| `azure_devops_list_test_suites` | List test suites |
| `azure_devops_get_test_suite` | Get test suite detail |
| `azure_devops_list_test_cases` | List test cases |
| `azure_devops_list_test_points` | List test points |
| `azure_devops_list_test_runs` | List test runs |
| `azure_devops_get_test_run` | Get test run detail |
| `azure_devops_create_test_run` | Create a test run |
| `azure_devops_update_test_results` | Update test outcomes |

## Commands / Prompt Templates

| Command | Description |
|---------|-------------|
| `/azure-devops-doctor` | Check Azure DevOps configuration, auth, and connection health |
| `/azure-devops-triage [filter]` | Triage untriaged work items |
| `/azure-devops-status-report [group]` | Status report by state, assignee, etc. |
| `/azure-devops-create-batch <items>` | Batch-create work items |
| `/azure-devops-review-history <id>` | Review revision history |
| `/azure-devops-sprint-health [team]` | Sprint health check |
| `/azure-devops-plan-sprint <sprint\|next>` | Sprint planning |
| `/azure-devops-board-review <board> [team]` | Board configuration review |
| `/azure-devops-pipeline-status [id]` | Pipeline health check |
| `/azure-devops-deploy <id> [branch]` | Deployment with safety checks |
| `/azure-devops-pr-review <id>` | Pull request review |
| `/azure-devops-pr-creator <repo> <branch>` | Create a pull request |
| `/azure-devops-test-status [run-id]` | Test run status report |
| `/azure-devops-test-runner [plan-id]` | Create and manage a test run |

## Configuration

All settings are stored in `~/.pi/agent/pi-azure-devops.json`.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `orgs` | array | — | List of org configurations |
| `orgs[].name` | string | — | Display name for the org |
| `orgs[].url` | string | — | Org URL (e.g. https://dev.azure.com/myorg) |
| `orgs[].projects` | array | — | Projects in this org |
| `orgs[].projects[].name` | string | — | Project name |
| `orgs[].projects[].pat` | string | — | Personal Access Token |
| `defaultOrg` | string | first org | Default organization |
| `defaultProject` | string | first project | Default project |
| `defaultTeam` | string | — | Default team |
| `authMethod` | string | `"auto"` | `"pat"`, `"azure-cli"`, or `"auto"` |
| `safetyLevel` | string | `"confirm"` | `"open"`, `"confirm"`, or `"readonly"` |
| `defaultWorkItemType` | string | `"User Story"` | Default type for creation |
| `maxQueryResults` | number | 100 | Max WIQL query results |
| `autocomplete` | boolean | true | Enable `#id` work item completion |
| `mock` | boolean | false | Use fixture data offline |

### Safety Levels

| Level | Behavior |
|-------|----------|
| `open` | No confirmation on mutations |
| `confirm` | User confirms before create/update/delete |
| `readonly` | All mutation tools blocked |

## Architecture

The extension follows a modular architecture:

- **`src/config/index.ts`** — Configuration management from `pi-azure-devops.json`
- **`src/auth/`** — PAT and Azure CLI authentication
- **`src/tools/*.ts`** — 52 individual tool definitions
- **`src/extension/index.ts`** — Extension entry point, tool registration, safety interceptor
- **`src/utils/`** — Connection factory, error handling, formatting
- **`src/autocomplete/`** — `#id` and `@sprint` autocomplete providers
- **`src/safety/`** — Mutation safety gates
- **`src/mocks/`** — Offline fixture data and mock handler
- **`skills/`** — Agent skill reference documentation
- **`prompts/`** — 14 prompt templates for common workflows

## Extensions Made

This package is forked from [jwayong/pi-azure-devops](https://github.com/jwayong/pi-azure-devops) with the following additions:

- **`index.ts` entry point** — Root-level entry point re-exporting the extension for pi package loading (was missing from original)
- **`azure-devops-doctor` prompt template** — New `/azure-devops-doctor` command for connection health checks
- **GitHub Actions CI/CD** — Continuous integration (typecheck, test, coverage) and automated semantic release workflows
- **`azure_devops_doctor` tool** — Built-in but fully validated and documented

## Requirements

- Node.js 20.12+
- pi coding agent 0.70.0+
- Azure DevOps organization with PAT access

## Dependencies

- [azure-devops-node-api](https://www.npmjs.com/package/azure-devops-node-api) — Azure DevOps REST API client
- [typebox](https://www.npmjs.com/package/typebox) — Runtime type validation

## Publishing as a pi Package

To publish this extension to the [pi package catalog](https://pi.dev/packages):

1. Ensure `package.json` has `"keywords": ["pi-package"]`
2. Ensure `package.json` has a `"pi"` section declaring extensions, skills, and prompts
3. Optionally add `"image"` or `"video"` preview URLs to the `"pi"` manifest
4. Publish to npm: `npm publish`
5. Users install with: `pi install npm:@patimweb/pi-azure-devops`

The package catalog auto-discovers packages with the `pi-package` keyword from npm.

## CI/CD

### Continuous Integration (`.github/workflows/ci.yml`)

Runs on every push and PR to `main`/`master`:
- Matrix testing across Node.js 18, 20, 22
- Type checking (`npm run typecheck`)
- Unit tests (`npm test`)
- Coverage reporting to Codecov (Node 22 only)

### Automated Release (`.github/workflows/release.yml`)

Runs on pushes to `main` and `next` branches:
- Builds the package (`npm run build`)
- Runs semantic-release for automated versioning and npm publishing
- Requires `GITHUB_TOKEN` and `NPM_TOKEN` secrets

## License

MIT
