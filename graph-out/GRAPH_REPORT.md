# Mind Place Report

Generated from `/Users/patrickweppelmann/Documents/Workspaces/pi-azure-devops`

## Corpus

- **Files scanned:** 156
- **Languages:** 124 .ts, 31 .json, 1 .cjs

## Graph Statistics

| Metric | Value |
|--------|-------|
| Nodes | 318 |
| Edges | 267 |
| Communities | 98 |
| Avg. Degree | 1.7 |

## God Nodes

The most-connected entities - these are the architectural pillars:

| # | Node | Type | Connections | File |
|---|------|------|-------------|------|
| 1 | **src/tools/shared.ts** | file | 62 | `src/tools/shared.ts` |
| 2 | **src/config/index.ts** | file | 23 | `src/config/index.ts` |
| 3 | **package.json** | file | 17 | `package.json` |
| 4 | **src/utils/connection.ts** | file | 11 | `src/utils/connection.ts` |
| 5 | **src/auth/index.ts** | file | 10 | `src/auth/index.ts` |

## Communities

The graph was partitioned into these subsystems:

| Community | Size | Key Members |
|-----------|------|-------------|
| **src/tools/update-work-item.ts** | 65 | src/tools/add-pull-request-comment.ts, src/tools/add-work-item-comment.ts, src/tools/cancel-run.ts |
| **formatStatusText** | 29 | src/config/index.ts, AuthMethod, SafetyLevel |
| **createPatAuth** | 20 | src/auth/azure-cli.ts, IRequestHandler, AzureCliAuthResult |
| **pi** | 18 | package.json, name, version |
| **clearConnectionCache** | 11 | src/utils/connection.ts, getWorkItemTrackingApi, getWorkApi |
| **registerIterationAutocomplete** | 9 | src/autocomplete/iteration-autocomplete.ts, IterationSummary, extractIterationToken |
| **registerAutocomplete** | 9 | src/autocomplete/work-item-autocomplete.ts, WorkItemSummary, extractWorkItemToken |
| **formatMutationSummary** | 4 | src/safety/index.ts, shouldBlock, MutationParams |
| **isNotFoundError** | 4 | src/utils/errors.ts, formatAdoError, isAuthError |
| **test/config/config-edge-cases.test.ts** | 3 | test/config/config-edge-cases.test.ts, setup, teardown |
| **test/config/config-resolver.test.ts** | 3 | test/config/config-resolver.test.ts, setup, teardown |
| **test/config/team-config.test.ts** | 3 | test/config/team-config.test.ts, setup, teardown |
| **test/tools/doctor.test.ts** | 3 | test/tools/doctor.test.ts, makeConfig, writeConfigFile |
| **safetyLevel** | 3 | undefined/pi-azure-devops.json, orgs, safetyLevel |
| **ToolExecuteParams** | 2 | src/extension/index.ts, ToolExecuteParams |
| **boardDetails** | 2 | src/mocks/fixtures/board-detail.json, boardDetails |
| **boards** | 2 | src/mocks/fixtures/boards.json, boards |
| **branches** | 2 | src/mocks/fixtures/branches.json, branches |
| **capacities** | 2 | src/mocks/fixtures/capacity.json, capacities |
| **comments** | 2 | src/mocks/fixtures/comments.json, comments |
| **iterationWorkItems** | 2 | src/mocks/fixtures/iteration-work-items.json, iterationWorkItems |
| **iterations** | 2 | src/mocks/fixtures/iterations.json, iterations |
| **pipelines** | 2 | src/mocks/fixtures/pipelines.json, pipelines |
| **policies** | 2 | src/mocks/fixtures/policies.json, policies |
| **evaluations** | 2 | src/mocks/fixtures/policy-evaluations.json, evaluations |
| **prCommits** | 2 | src/mocks/fixtures/pr-commits.json, prCommits |
| **prThreads** | 2 | src/mocks/fixtures/pr-threads.json, prThreads |
| **pullRequests** | 2 | src/mocks/fixtures/pull-requests.json, pullRequests |
| **repositories** | 2 | src/mocks/fixtures/repos.json, repositories |
| **revisions** | 2 | src/mocks/fixtures/revisions.json, revisions |
| **artifacts** | 2 | src/mocks/fixtures/run-artifacts.json, artifacts |
| **logs** | 2 | src/mocks/fixtures/run-logs.json, logs |
| **timelines** | 2 | src/mocks/fixtures/run-timeline.json, timelines |
| **runs** | 2 | src/mocks/fixtures/runs.json, runs |
| **teams** | 2 | src/mocks/fixtures/teams.json, teams |
| **testCases** | 2 | src/mocks/fixtures/test-cases.json, testCases |
| **testPlans** | 2 | src/mocks/fixtures/test-plans.json, testPlans |
| **testPoints** | 2 | src/mocks/fixtures/test-points.json, testPoints |
| **testResults** | 2 | src/mocks/fixtures/test-results.json, testResults |
| **testRuns** | 2 | src/mocks/fixtures/test-runs.json, testRuns |
| **testSuites** | 2 | src/mocks/fixtures/test-suites.json, testSuites |
| **workItemTypes** | 2 | src/mocks/fixtures/work-item-types.json, workItemTypes |
| **workItems** | 2 | src/mocks/fixtures/work-items.json, workItems |
| **test/auth/auth-resolver.test.ts** | 2 | test/auth/auth-resolver.test.ts, makeConfig |
| **test/tools/board-read-edge-cases.test.ts** | 2 | test/tools/board-read-edge-cases.test.ts, mockConfig |
| **test/tools/board-read-tools.test.ts** | 2 | test/tools/board-read-tools.test.ts, mockConfig |
| **test/tools/board-write-edge-cases.test.ts** | 2 | test/tools/board-write-edge-cases.test.ts, mockConfig |
| **test/tools/board-write-tools.test.ts** | 2 | test/tools/board-write-tools.test.ts, mockConfig |
| **test/tools/pipeline-read-edge-cases.test.ts** | 2 | test/tools/pipeline-read-edge-cases.test.ts, makeConfig |
| **test/tools/pipeline-read-tools.test.ts** | 2 | test/tools/pipeline-read-tools.test.ts, makeConfig |
| **test/tools/pipeline-write-edge-cases.test.ts** | 2 | test/tools/pipeline-write-edge-cases.test.ts, makeConfig |
| **test/tools/pipeline-write-tools.test.ts** | 2 | test/tools/pipeline-write-tools.test.ts, makeConfig |
| **test/tools/read-tools.test.ts** | 2 | test/tools/read-tools.test.ts, makeConfig |
| **test/tools/repo-read-edge-cases.test.ts** | 2 | test/tools/repo-read-edge-cases.test.ts, makeConfig |
| **test/tools/repo-read-tools.test.ts** | 2 | test/tools/repo-read-tools.test.ts, makeConfig |
| **test/tools/repo-write-edge-cases.test.ts** | 2 | test/tools/repo-write-edge-cases.test.ts, makeConfig |
| **test/tools/repo-write-tools.test.ts** | 2 | test/tools/repo-write-tools.test.ts, makeConfig |
| **test/tools/testplan-read-edge-cases.test.ts** | 2 | test/tools/testplan-read-edge-cases.test.ts, makeConfig |
| **test/tools/testplan-read-tools.test.ts** | 2 | test/tools/testplan-read-tools.test.ts, makeConfig |
| **test/tools/testplan-write-edge-cases.test.ts** | 2 | test/tools/testplan-write-edge-cases.test.ts, makeConfig |
| **test/tools/testplan-write-tools.test.ts** | 2 | test/tools/testplan-write-tools.test.ts, makeConfig |
| **test/tools/write-tools.test.ts** | 2 | test/tools/write-tools.test.ts, makeConfig |
| **test/utils/formatting.test.ts** | 2 | test/utils/formatting.test.ts, makeWorkItem |
| **test/status/status.test.ts** | 2 | test/status/status.test.ts, makeConfig |
| **index.ts** | 1 | index.ts |
| **release.config.cjs** | 1 | release.config.cjs |
| **isMutationTool** | 1 | isMutationTool |
| **getConnection** | 1 | getConnection |
| **test/auth/pat.test.ts** | 1 | test/auth/pat.test.ts |
| **test/autocomplete/iteration-autocomplete.test.ts** | 1 | test/autocomplete/iteration-autocomplete.test.ts |
| **test/autocomplete/token-extraction.test.ts** | 1 | test/autocomplete/token-extraction.test.ts |
| **test/autocomplete/work-item-autocomplete.test.ts** | 1 | test/autocomplete/work-item-autocomplete.test.ts |
| **test/config/team-config-edge-cases.test.ts** | 1 | test/config/team-config-edge-cases.test.ts |
| **test/mocks/board-mock-edge-cases.test.ts** | 1 | test/mocks/board-mock-edge-cases.test.ts |
| **test/mocks/board-mock-handler.test.ts** | 1 | test/mocks/board-mock-handler.test.ts |
| **test/mocks/mock-handler.test.ts** | 1 | test/mocks/mock-handler.test.ts |
| **test/mocks/pipeline-mock-edge-cases.test.ts** | 1 | test/mocks/pipeline-mock-edge-cases.test.ts |
| **test/mocks/pipeline-mock-handler.test.ts** | 1 | test/mocks/pipeline-mock-handler.test.ts |
| **test/mocks/repo-mock-edge-cases.test.ts** | 1 | test/mocks/repo-mock-edge-cases.test.ts |
| **test/mocks/repo-mock-handler.test.ts** | 1 | test/mocks/repo-mock-handler.test.ts |
| **test/mocks/testplan-mock-edge-cases.test.ts** | 1 | test/mocks/testplan-mock-edge-cases.test.ts |
| **test/mocks/testplan-mock-handler.test.ts** | 1 | test/mocks/testplan-mock-handler.test.ts |
| **test/safety/board-safety.test.ts** | 1 | test/safety/board-safety.test.ts |
| **test/safety/pipeline-safety.test.ts** | 1 | test/safety/pipeline-safety.test.ts |
| **test/safety/repo-safety.test.ts** | 1 | test/safety/repo-safety.test.ts |
| **test/safety/safety-interceptor.test.ts** | 1 | test/safety/safety-interceptor.test.ts |
| **test/safety/testplan-safety.test.ts** | 1 | test/safety/testplan-safety.test.ts |
| **test/tools/team-context.test.ts** | 1 | test/tools/team-context.test.ts |
| **test/utils/board-formatting-edge-cases.test.ts** | 1 | test/utils/board-formatting-edge-cases.test.ts |
| **test/utils/board-formatting.test.ts** | 1 | test/utils/board-formatting.test.ts |
| **test/utils/connection.test.ts** | 1 | test/utils/connection.test.ts |
| **test/utils/errors.test.ts** | 1 | test/utils/errors.test.ts |
| **test/utils/pipeline-formatting-edge-cases.test.ts** | 1 | test/utils/pipeline-formatting-edge-cases.test.ts |
| **test/utils/pipeline-formatting.test.ts** | 1 | test/utils/pipeline-formatting.test.ts |
| **test/utils/repo-formatting-edge-cases.test.ts** | 1 | test/utils/repo-formatting-edge-cases.test.ts |
| **test/utils/repo-formatting.test.ts** | 1 | test/utils/repo-formatting.test.ts |
| **test/utils/testplan-formatting-edge-cases.test.ts** | 1 | test/utils/testplan-formatting-edge-cases.test.ts |
| **test/utils/testplan-formatting.test.ts** | 1 | test/utils/testplan-formatting.test.ts |

## Surprising Connections

- **src/safety/index.ts** → `contains` → **isMutationTool**: Cross-community bridge between "src/safety/index.ts" and "isMutationTool"
- **src/utils/connection.ts** → `contains` → **getConnection**: Cross-community bridge between "src/utils/connection.ts" and "getConnection"

## Suggested Questions

- How does **src/tools/shared.ts** connect to **src/config/index.ts**?
- What calls **src/tools/shared.ts** and what does it depend on?
- Trace the data flow between **src/tools/add-pull-request-comment.ts** and **src/config/index.ts**
- Which modules have the most dependencies?
- Show me the architecture of the `src/tools/shared.ts` subsystem
- What is the most heavily connected module in the codebase?

---
_Report generated by pi-mindplace · Use `mindplace_query` to explore the graph_
