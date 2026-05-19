---
description: Pipeline health check — recent runs, failures, duration trends
argument-hint: "[pipeline-id]"
---
Use the Azure DevOps tools to check pipeline health. Steps:

1. Find the target pipeline:
   - If a pipeline ID was given$1{, use `azure_devops_get_pipeline` with pipeline ID `$1`}.
   - Otherwise, run `azure_devops_list_pipelines` and ask which pipeline to check.
   - Note the pipeline name and ID.

2. List recent runs:
   - Run `azure_devops_list_runs` with the pipeline ID.
   - Note total count, states (completed/inProgress), and results (succeeded/failed).

3. Analyze failures:
   - For any failed runs, run `azure_devops_get_run_timeline` to identify which stage/job/task failed.
   - Run `azure_devops_get_run_logs` to get detailed error messages for the failing run.
   - Note common failure patterns (same task failing repeatedly, etc.).

4. Produce a pipeline health report with these sections:

   **Pipeline Overview:**
   - Pipeline name, folder, YAML path
   - Total recent runs, time range covered

   **Run Summary:**
   - Completed runs: succeeded vs. failed counts
   - In-progress runs (if any)
   - Success rate (succeeded / total completed)

   **Failure Analysis:**
   - Which stages/tasks are failing
   - Common error patterns
   - Affected branches

   **Duration Trends:**
   - Average run duration
   - Any outliers (unusually long or short runs)

   **Recommendations:**
   - Investigate recurring failures
   - Check for flaky tests
   - Consider retrying one-off failures

5. Format as a clean Markdown report.
