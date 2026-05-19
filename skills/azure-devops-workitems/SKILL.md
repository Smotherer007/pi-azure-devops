---
name: azure-devops-workitems
description: Azure DevOps work item, board, repo, pull request, pipeline, and test plan operations. Use when the user asks to create, read, update, query, comment on, or link work items, or when they ask about boards, sprints, iterations, team capacity, backlog management, repositories, branches, pull requests, code reviews, policies, pipelines, builds, runs, artifacts, logs, CI/CD, test plans, test suites, test cases, test points, test runs, or test results. Covers WIQL queries, work item types, revisions, boards, sprints, capacity, Git repos, PR workflows, voting, policy evaluations, YAML pipelines, build runs, artifacts, timeline, and test plan execution.
---

# Azure DevOps Work Items, Boards, Pull Requests, Pipelines, & Test Plans

## Setup

Set these environment variables before use:

```bash
export AZURE_DEVOPS_ORG_URL="https://dev.azure.com/yourorg"
export AZURE_DEVOPS_PROJECT="YourProject"
export AZURE_DEVOPS_PAT="your-personal-access-token"
export AZURE_DEVOPS_TEAM="Engineering"        # optional — needed for boards/iterations/capacity
```

Or configure in `.pi/settings.json`:

```json
{
  "azure-devops": {
    "orgUrl": "https://dev.azure.com/yourorg",
    "project": "YourProject",
    "team": "Engineering",
    "authMethod": "pat",
    "safetyLevel": "confirm"
  }
}
```

Run `azure_devops_doctor` first to verify your configuration.

## Available Tools

### Read Tools (always allowed)

| Tool | Use When |
|------|----------|
| `azure_devops_doctor` | User needs to check config, auth, or connection health |
| `azure_devops_get_work_item` | User mentions a specific work item by ID (e.g., "#101") |
| `azure_devops_query_work_items` | User wants to search, filter, or list work items by criteria |
| `azure_devops_list_work_item_types` | User needs to know valid work item types before creating one |
| `azure_devops_get_work_item_comments` | User wants to see discussion/comments on a work item |
| `azure_devops_get_work_item_revisions` | User wants to see change history for a work item |
| `azure_devops_list_teams` | User needs to discover which teams exist in the project |
| `azure_devops_list_boards` | User wants to see boards for a team (Stories, Features, Epics) |
| `azure_devops_get_board` | User wants to inspect board columns, state mappings, and WIP limits |
| `azure_devops_list_iterations` | User wants to see sprints/iterations for a team, or find the current sprint |
| `azure_devops_get_iteration_work_items` | User wants to see what work items are in a sprint |
| `azure_devops_get_capacity` | User wants to see team member capacity and activities for a sprint |
| `azure_devops_list_repos` | User wants to see repositories in the project |
| `azure_devops_get_repo` | User wants details of a specific repository |
| `azure_devops_list_branches` | User wants to see branches in a repository |
| `azure_devops_list_pull_requests` | User wants to search or list pull requests (active, completed, abandoned) |
| `azure_devops_get_pull_request` | User wants full details of a specific PR (description, reviewers, votes) |
| `azure_devops_get_pull_request_threads` | User wants to see comments/discussion on a PR |
| `azure_devops_get_pull_request_commits` | User wants to see commits in a PR |
| `azure_devops_list_policies` | User wants to see branch/PR policies configured for the project |
| `azure_devops_get_policy_evaluations` | User wants to check if PR policies are passing (approved/pending/rejected) |
| `azure_devops_list_pipelines` | User wants to discover YAML pipelines in the project |
| `azure_devops_get_pipeline` | User wants detail of a specific pipeline (YAML path, repo, folder) |
| `azure_devops_list_runs` | User wants to see pipeline runs (builds) — filter by pipeline, status, result, branch |
| `azure_devops_get_run` | User wants detail of a specific pipeline run |
| `azure_devops_get_run_artifacts` | User wants to see artifacts produced by a build |
| `azure_devops_get_run_logs` | User wants to see build log entries |
| `azure_devops_get_run_timeline` | User wants to see stages/jobs/tasks timeline for a build |
| `azure_devops_list_test_plans` | User wants to discover test plans in the project |
| `azure_devops_get_test_plan` | User wants details of a specific test plan (state, dates, root suite) |
| `azure_devops_list_test_suites` | User wants to see suites in a test plan |
| `azure_devops_get_test_suite` | User wants details of a specific test suite |
| `azure_devops_list_test_cases` | User wants to list test cases in a suite |
| `azure_devops_list_test_points` | User wants to see test point execution status |
| `azure_devops_list_test_runs` | User wants to see test runs (filter by plan, state, dates) |
| `azure_devops_get_test_run` | User wants details of a specific test run (statistics, results) |

### Write Tools (gated by safety level)

| Tool | Use When |
|------|----------|
| `azure_devops_create_work_item` | User wants to create a new work item |
| `azure_devops_update_work_item` | User wants to change fields on an existing work item |
| `azure_devops_add_work_item_comment` | User wants to add a comment to a work item |
| `azure_devops_manage_work_item_links` | User wants to create or remove links between work items |
| `azure_devops_set_board_columns` | User wants to reconfigure board columns (rename, reorder, change WIP limits) |
| `azure_devops_set_iteration` | User wants to add or remove a sprint from a team |
| `azure_devops_set_capacity` | User wants to set team member capacity for a sprint |
| `azure_devops_create_pull_request` | User wants to create a new pull request |
| `azure_devops_update_pull_request` | User wants to change PR title, description, or status (abandon/complete) |
| `azure_devops_add_pull_request_comment` | User wants to add a comment on a PR |
| `azure_devops_set_pull_request_vote` | User wants to approve, reject, or vote on a PR |
| `azure_devops_run_pipeline` | User wants to queue/trigger a pipeline run |
| `azure_devops_cancel_run` | User wants to cancel an in-progress pipeline run |
| `azure_devops_retry_run` | User wants to retry a failed pipeline run |
| `azure_devops_create_test_run` | User wants to create a test run from a plan and suites |
| `azure_devops_update_test_results` | User wants to record pass/fail outcomes for test cases in a run |

## Team Context

Most board, iteration, and capacity tools require a **team name**. The `team` parameter is optional on all these tools — they fall back to the configured default team (`AZURE_DEVOPS_TEAM` or `azure-devops.team`).

**Workflow:**
1. If the user mentions a team by name, pass it as the `team` parameter.
2. If no team is mentioned, use the config default (no `team` param needed).
3. If no team is configured and none is specified, the tool returns an error — tell the user to set `AZURE_DEVOPS_TEAM` or specify a team.
4. Use `azure_devops_list_teams` to discover available teams when unsure.

**Multi-team scenarios:** When working across teams (e.g., comparing sprint health), call tools once per team, passing each team name as the `team` parameter.

## WIQL Query Reference

### Basic Syntax

```sql
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.State] = 'Active'
ORDER BY [System.CreatedDate] DESC
```

### Common Where Clauses

| Filter | Example |
|--------|---------|
| By state | `WHERE [System.State] = 'Active'` |
| By type | `WHERE [System.WorkItemType] = 'Bug'` |
| By assignee | `WHERE [System.AssignedTo] = @me` |
| By area | `WHERE [System.AreaPath] UNDER 'Project\Engineering'` |
| By iteration | `WHERE [System.IterationPath] UNDER 'Project\Sprint 4'` |
| By tags | `WHERE [System.Tags] CONTAINS 'security'` |
| Multiple conditions | `WHERE [System.State] = 'Active' AND [System.WorkItemType] = 'Bug'` |

### Useful Queries

Active bugs assigned to me:
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.WorkItemType] = 'Bug'
  AND [System.State] = 'Active'
  AND [System.AssignedTo] = @me
```

All items in current sprint:
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.IterationPath] UNDER 'Project\Sprint 4'
  AND [System.State] <> 'Closed'
ORDER BY [System.Priority]
```

Unassigned active items:
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.State] = 'Active'
  AND [System.AssignedTo] = ''
```

Recently changed items:
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.ChangedDate] >= @today - 7
ORDER BY [System.ChangedDate] DESC
```

## Sprint/Iteration Reference

### Finding Sprints

Use `azure_devops_list_iterations` to discover sprints. Pass `timeframe: "current"` to get the active sprint:

```
azure_devops_list_iterations(team: "Engineering", timeframe: "current")
```

**Timeframe values:** `"current"`, `"past"`, `"future"`

### Iteration Data

Each iteration returns:
- **id** — GUID (needed for capacity and iteration work item tools)
- **name** — Sprint name (e.g., "Sprint 3")
- **path** — Full path (e.g., `Project\Sprint 3`)
- **attributes.startDate / finishDate** — Sprint date range
- **attributes.timeFrame** — `"current"`, `"past"`, or `"future"`

### Common Sprint Operations

| Task | Steps |
|------|-------|
| Show current sprint items | `azure_devops_list_iterations(timeframe: "current")` → get iteration ID → `azure_devops_get_iteration_work_items(iterationId)` |
| Check capacity | `azure_devops_get_capacity(iterationId, team)` |
| Add a sprint to team | `azure_devops_set_iteration(iterationId, operation: "add", team)` |
| Remove a sprint | `azure_devops_set_iteration(iterationId, operation: "remove", team)` |

### Typical Iteration Patterns

Iterations follow the project's area path structure:
- `Project\Sprint 1`, `Project\Sprint 2`, ...
- `Project\2026-Q1\Sprint 1`, `Project\2026-Q2\Sprint 1`, ...

## Board Reference

### Board Types

| Board ID | Backlog Level | Typical Work Item Types |
|----------|--------------|------------------------|
| `stories` | Requirements | User Story, Bug, Task |
| `features` | Features | Feature |
| `epics` | Epics | Epic |

Teams may have custom boards with different IDs. Use `azure_devops_list_boards(team)` to discover them.

### Column Configuration

Each board has columns with:
- **name** — Display name (e.g., "New", "Active", "Closed")
- **columnType** — `Incoming` (first), `InProgress` (middle), `Outgoing` (last)
- **itemLimit** — WIP limit (null = unlimited)
- **stateMappings** — Maps work item type → state for this column

Example state mappings for a "Stories" board:
```
Column "New":   { "User Story": "New", "Bug": "New", "Task": "To Do" }
Column "Active": { "User Story": "Active", "Bug": "Active", "Task": "In Progress" }
Column "Closed": { "User Story": "Closed", "Bug": "Closed", "Task": "Closed" }
```

### Modifying Board Columns

`azure_devops_set_board_columns` **replaces all columns** — always `azure_devops_get_board` first to see the current config, then modify.

**Workflow:**
1. `azure_devops_get_board(boardId, team)` — inspect current columns and state mappings
2. Modify the column definitions as needed
3. `azure_devops_set_board_columns(boardId, columns, team)` — apply the new set

## Capacity Reference

### Capacity Model

Each team member has:
- **Activities** — Work categories with hours/day (e.g., Development: 6h/day, Code Review: 1h/day)
- **Days off** — Date ranges when the member is unavailable

Team totals are computed automatically (sum of all member capacity minus days off).

### Reading Capacity

```
azure_devops_get_capacity(iterationId, team)
```

Returns per-member breakdown with activities, days off, and team totals.

### Setting Capacity

`azure_devops_set_capacity` **replaces all capacity** for the sprint — always `azure_devops_get_capacity` first to see current values.

**Workflow:**
1. `azure_devops_get_capacity(iterationId, team)` — see current values
2. Build the new capacity array (one entry per team member)
3. `azure_devops_set_capacity(iterationId, capacities, team)` — apply

Each capacity entry:
```json
{
  "teamMemberId": "user@contoso.com",
  "activities": [
    { "name": "Development", "capacityPerDay": 6 },
    { "name": "Code Review", "capacityPerDay": 1 }
  ],
  "daysOff": [
    { "start": "2026-04-25T00:00:00Z", "end": "2026-04-25T00:00:00Z" }
  ]
}
```

### Common Activities

| Activity | Typical For |
|----------|------------|
| Development | Developers — writing code |
| Testing | QA — manual and automated testing |
| Code Review | Senior developers — reviewing PRs |
| Design | Designers — UX/UI work |
| Infrastructure | DevOps — CI/CD, cloud |
| Documentation | Technical writers — docs |

## Common Field Reference

| Field | Reference Name | Example Values |
|-------|---------------|----------------|
| Title | `System.Title` | Any text |
| State | `System.State` | New, Active, Resolved, Closed, Done |
| Type | `System.WorkItemType` | User Story, Bug, Task, Feature, Epic |
| Assigned To | `System.AssignedTo` | Email or display name, `@me` in WIQL |
| Area Path | `System.AreaPath` | `Project\Area\SubArea` |
| Iteration | `System.IterationPath` | `Project\Sprint 4` |
| Priority | `System.Priority` | 1 (highest) – 4 (lowest) |
| Reason | `System.Reason` | New, Implementation started, Completed, Fixed, Deferred |
| Tags | `System.Tags` | Semicolon-separated: `security; backend` |
| Description | `System.Description` | HTML content |
| Severity | `Microsoft.VSTS.Common.Severity` | 1 - Critical, 2 - High, 3 - Medium, 4 - Low |
| Value Area | `Microsoft.VSTS.Common.ValueArea` | Business, Architectural |
| Created Date | `System.CreatedDate` | ISO 8601 date |
| Changed Date | `System.ChangedDate` | ISO 8601 date |

## Work Item Type Conventions

| Type | Purpose | Typical States |
|------|---------|---------------|
| **Epic** | Large initiative spanning features | New → In Progress → Done |
| **Feature** | Group of user stories | New → In Progress → Done |
| **User Story** | User-valued deliverable | New → Active → Resolved → Closed |
| **Bug** | Deviation from expected behavior | New → Active → Resolved → Closed |
| **Task** | Implementation work item | To Do → In Progress → Done |
| **Issue** | Impediment or blocking problem | Active → Closed |

## Link Types

| Relation Type | Usage |
|---------------|-------|
| `System.LinkTypes.Hierarchy-Forward` | Parent → Child (Epic→Feature, Feature→Story, Story→Task) |
| `System.LinkTypes.Hierarchy-Reverse` | Child → Parent |
| `System.LinkTypes.Related` | Related work items |
| `System.LinkTypes.Duplicate` | Duplicate work items |
| `System.LinkTypes.Duplicate-Reverse` | Original of a duplicate |
| `System.LinkTypes.Dependency` | Successor depends on predecessor |
| `System.LinkTypes.Dependency-Reverse` | Predecessor of a dependency |

## Safety Model

The safety level controls how mutation tools behave:

- **`open`** — No confirmation needed. Tools execute immediately.
- **`confirm`** (default) — User sees a confirmation dialog before each mutation.
- **`readonly`** — All mutation tools are blocked. Only read operations allowed.

Set via `AZURE_DEVOPS_SAFETY_LEVEL` env var or `azure-devops.safetyLevel` in settings.

## Mock Mode

For testing without Azure DevOps credentials:

```bash
AZURE_DEVOPS_MOCK=1 pi "Show me work item #101"
```

Or pass `{ "mock": true }` to any tool's parameters.

## Best Practices

1. **Always run `azure_devops_doctor` first** in a new session to verify configuration.
2. **Use `azure_devops_list_work_item_types`** before creating work items to confirm valid types.
3. **Prefer WIQL queries** over multiple individual fetches when searching for work items.
4. **Set `System.Tags`** when creating to improve discoverability.
5. **Use `azure_devops_get_work_item_revisions`** to understand the history before updating.
6. **Link parent/child items** using `azure_devops_manage_work_item_links` to maintain hierarchy.
7. **Use `azure_devops_list_iterations(timeframe: "current")`** instead of hardcoded sprint names — sprints change.
8. **Always `azure_devops_get_board` before `azure_devops_set_board_columns`** — the set operation replaces all columns.
9. **Always `azure_devops_get_capacity` before `azure_devops_set_capacity`** — the set operation replaces all capacity data.
10. **List boards before modifying** — use `azure_devops_list_boards(team)` to find the correct board ID.
11. **Use `azure_devops_list_repos` first** when working with PRs — you'll need the repository ID for most PR operations.
12. **Check `azure_devops_get_pull_request_threads` before commenting** — review existing discussion to avoid duplicates.
13. **Check `azure_devops_get_policy_evaluations` before approving** — verify all policies are passing.
14. **Use full ref names** (`refs/heads/feature/login`) when specifying source/target branches for PRs.
15. **Use `azure_devops_list_pull_requests(status: "active")`** to find open PRs — don't guess PR IDs.
16. **Use `azure_devops_list_pipelines` first** to find the pipeline ID before running or inspecting runs.
17. **Check `azure_devops_get_run_timeline` for failed runs** to identify which stage/job/task failed.
18. **Use `azure_devops_get_run_logs` to see detailed error messages** after identifying failing tasks.
19. **Use `azure_devops_list_runs(status: "inProgress")`** to monitor currently active runs.
20. **Template parameters must match YAML parameter names exactly** — check the pipeline YAML definition.
21. **Use `azure_devops_list_test_points` to see current execution status** before creating a test run.
22. **Create test runs from specific suites** to limit scope — pass only the suite IDs you need.
23. **Use `azure_devops_update_test_results` to record manual test outcomes** — set outcome per result ID.
24. **Check `azure_devops_get_test_run` statistics** to monitor progress (passed/failed/total counts).
25. **Filter active plans with `filterActivePlans: true`** — avoids listing completed or archived plans.

## Repository Reference

### Identifying Repositories

Most repo/PR tools accept `repositoryId` which can be either:
- **Repository name** — e.g., `"webapp"`, `"api-service"` (human-friendly)
- **Repository GUID** — e.g., `"repo-webapp"` (stable across renames)

**Workflow:** Use `azure_devops_list_repos` first to discover available repos, then use the name or ID for branch and PR operations.

### Branch Name Formats

The Azure DevOps API uses full ref names internally: `refs/heads/main`. Short names (`main`) are displayed in formatted output.

When passing `sourceRefName` or `targetRefName` to tools, always use the full ref format:
```
refs/heads/feature/login
refs/heads/hotfix/auth-fix
refs/heads/release/v2.0
```

### Common Branch Patterns

| Pattern | Purpose |
|---------|----------|
| `main` | Default branch (production) |
| `develop` | Integration branch |
| `feature/*` | New feature development |
| `hotfix/*` | Urgent production fixes |
| `release/*` | Release preparation |
| `bugfix/*` | Bug fixes (non-urgent) |

### Ahead/Behind Counts

Branches show `↑N ↓M` tracking info:
- `↑N` = N commits ahead of base
- `↓M` = M commits behind base
- `(base)` = this is the branch others track against

## Pull Request Reference

### PR Status Values

| Status | Description |
|--------|------------|
| `active` | Open and under review |
| `abandoned` | Closed without merging |
| `completed` | Successfully merged |

### PR Lifecycle

```
azure_devops_create_pull_request → azure_devops_get_pull_request_threads → review code →
azure_devops_add_pull_request_comment → azure_devops_set_pull_request_vote → (auto-complete or manual merge)
```

**Typical workflow:**
1. `azure_devops_list_branches(repoId)` — see available branches
2. `azure_devops_create_pull_request(repoId, source, target, title)` — create PR
3. `azure_devops_get_pull_request_threads(repoId, prId)` — check existing discussion
4. `azure_devops_add_pull_request_comment(repoId, prId, content)` — add feedback
5. `azure_devops_set_pull_request_vote(repoId, prId, vote)` — approve or reject
6. `azure_devops_get_policy_evaluations(prId)` — check if all policies pass

### Vote Values

| Vote String | Numeric | Meaning |
|-------------|---------|----------|
| `approve` | 10 | PR looks good, ready to merge |
| `approve-with-suggestions` | 5 | Approve, but consider minor changes |
| `waiting-for-author` | -5 | Changes needed before approval |
| `reject` | -10 | Should not merge |
| `reset` | 0 | Remove previous vote |

### PR Comment Threads

PR comments are organized into **threads**, each with a status:

| Status | Meaning |
|--------|----------|
| `active` (1) | Open for discussion |
| `fixed` (2) | Issue resolved |
| `wontfix` (3) | Won't be fixed |
| `closed` (4) | Thread closed |
| `pending` (6) | Awaiting response |

When adding a comment, you can set `threadStatus` to control the thread state.

### Draft PRs

Create a draft PR with `isDraft: true` to signal work-in-progress. Draft PRs cannot be merged until marked ready.

### Common PR Search Patterns

```
// All active PRs in the project
azure_devops_list_pull_requests(status: "active")

// PRs created by a specific person
azure_devops_list_pull_requests(creator: "alice@contoso.com", status: "active")

// PRs in a specific repo
azure_devops_list_pull_requests(repositoryId: "webapp", status: "active")

// PRs targeting main
azure_devops_list_pull_requests(targetRefName: "refs/heads/main", status: "active")

// Recently completed PRs
azure_devops_list_pull_requests(status: "completed", top: 10)
```

## Policy Reference

### Common Policy Types

| Policy | Purpose |
|--------|----------|
| Minimum reviewers | Requires N approvals before merge |
| Build validation | CI pipeline must pass |
| Required reviewer | Specific team/person must review |
| Work item linking | PR must have linked work items |
| Comment requirements | All comments must be resolved |

### Policy Evaluation Status

| Status | Meaning |
|--------|----------|
| ✅ Approved | Policy satisfied |
| ⏳ Running | Evaluation in progress |
| ❌ Rejected | Policy not satisfied (blocking merge) |
| ➖ Not applicable | Policy doesn't apply to this PR |

**Workflow:** Check `azure_devops_get_policy_evaluations(prId)` before approving/voting to see if any policies are blocking.

## Pipeline Reference

### Pipeline Identification

Pipelines are identified by numeric ID. Use `azure_devops_list_pipelines` to discover pipelines and their IDs. Each pipeline has:
- **id** — Numeric pipeline ID (used by all pipeline tools)
- **name** — Display name (e.g., "CI Pipeline")
- **folder** — Folder path (e.g., `\deploy`)
- **configuration.path** — YAML file path (e.g., `azure-pipelines.yml`)
- **configuration.repository** — Source repository

### Run States

| State | Description |
|-------|------------|
| `completed` | Run finished (check result for success/failure) |
| `inProgress` | Run is currently executing |
| `cancelling` | Run is being cancelled |

### Run Results

| Result | Description |
|--------|------------|
| `succeeded` | All stages passed |
| `failed` | One or more stages failed |
| `canceled` | Run was cancelled before completion |
| `partiallySucceeded` | Some stages passed, some failed |

### Template Parameters

YAML pipelines can accept template parameters as key-value pairs:
```
azure_devops_run_pipeline(pipelineId: 1, templateParameters: { "environment": "production", "region": "us-east" })
```

Parameter names must match the `parameters:` block in the YAML pipeline definition exactly.

### Timeline Hierarchy

Run timelines follow a Stage → Job → Task hierarchy:
- **Stage** — Top-level grouping (e.g., Build, Test, Deploy)
- **Job** — Execution unit within a stage (runs on an agent)
- **Task** — Individual step within a job (e.g., npm install, npm test)

Use `azure_devops_get_run_timeline` to inspect which stage/job/task failed.

## Test Plan Reference

### Test Plan Structure

Test plans follow a **Plan → Suite → Case** hierarchy:
- **Plan** — Top-level container for a testing effort (e.g., "Sprint 42 Tests")
- **Suite** — Organizational grouping within a plan
- **Case** — Individual test scenario with steps and expected results
- **Point** — A specific test case + configuration assignment (tracks execution status)
- **Run** — An execution session containing test results

### Suite Types

| Type | Description |
|------|------------|
| Static | Manually curated test case collection |
| Dynamic (query-based) | Auto-populated from a WIQL query |
| Requirement-based | Linked to a requirement work item |

A **root suite** is auto-created with each plan and serves as the top-level container.

### Test Outcome Reference

| Outcome | Description |
|---------|------------|
| `passed` | Test executed successfully |
| `failed` | Test had issues (exceptions, failed assertions) |
| `blocked` | Test could not be executed |
| `notExecuted` | Test was not run (user stopped) |
| `inconclusive` | Test completed but pass/fail unclear |
| `timeout` | Test exceeded time limit |
| `aborted` | Test aborted by framework |
| `notApplicable` | Test not applicable for this configuration |
| `warning` | Test completed with warnings |
| `error` | Test encountered a system error |
| `inProgress` | Test is currently running |
| `notImpacted` | Test not impacted by changes |

### Test Run States

| State | Description |
|-------|------------|
| `NotStarted` | Run created, no tests started |
| `InProgress` | Tests are running |
| `Completed` | All tests finished |
| `Aborted` | Run stopped, remaining tests aborted |
| `Waiting` | Run initializing (legacy) |

### Typical Test Plan Workflow

1. `azure_devops_list_test_plans(filterActivePlans: true)` — find active test plans
2. `azure_devops_list_test_suites(planId)` — discover suites in the plan
3. `azure_devops_list_test_cases(planId, suiteId)` — see test cases
4. `azure_devops_list_test_points(planId, suiteId)` — check execution status
5. `azure_devops_create_test_run(planId, suiteIds)` — create a run
6. `azure_devops_update_test_results(runId, results)` — record outcomes
7. `azure_devops_get_test_run(runId)` — check run statistics

## Error Handling

| Situation | Action |
|-----------|--------|
| "Authentication failed" | Check `AZURE_DEVOPS_PAT` or run `az login`. Use `azure_devops_doctor` to diagnose. |
| "Project not found" | Verify `AZURE_DEVOPS_PROJECT` matches exactly (case-sensitive). |
| "Invalid work item type" | Use `azure_devops_list_work_item_types` to see valid types. |
| "Work item not found" | Check the ID. Use `azure_devops_query_work_items` to search. |
| "No team specified" | Set `AZURE_DEVOPS_TEAM` env var, `azure-devops.team` in settings, or pass `team` parameter. |
| "Repository not found" | Use `azure_devops_list_repos` to find the correct repository ID or name. |
| "PR not found" | Use `azure_devops_list_pull_requests` to find the correct PR ID. |
| "Rate limited" | Wait a moment and retry. Reduce query result counts. |
| "Pipeline not found" | Use `azure_devops_list_pipelines` to find the correct pipeline ID. |
| "Run not found" | Use `azure_devops_list_runs` to find the correct run ID for the pipeline. |
| "Run is not in progress" | Can only cancel runs with state `inProgress`. Check the run state first. |
| "Test plan not found" | Use `azure_devops_list_test_plans` to find the correct plan ID. |
| "Test suite not found" | Verify suite ID belongs to the specified plan. Use `azure_devops_list_test_suites`. |
| "Invalid test outcome" | Use values from the Test Outcome Reference table below. |
