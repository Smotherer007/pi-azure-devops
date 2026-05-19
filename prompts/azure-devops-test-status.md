---
description: Test run status report — pass/fail rates, identify failures, suggest actions
argument-hint: "[run-id]"
---
Use the Azure DevOps tools to produce a test run status report. Steps:

1. Find the target test run:
   - If a run ID was given$1{, use `azure_devops_get_test_run` with run ID `$1`}.
   - Otherwise, run `azure_devops_list_test_runs` and ask which run to analyze.
   - Note the run name, state, plan ID, and statistics.

2. Get run details:
   - Run `azure_devops_get_test_run` with the run ID to get full statistics.
   - Note total tests, passed, failed, blocked, not executed counts.

3. Analyze results:
   - If the run is linked to a plan, use `azure_devops_list_test_suites` and `azure_devops_list_test_points` to get per-suite breakdown.
   - Note which suites have failing or blocked tests.
   - Identify any patterns (same test case failing, configuration-specific failures).

4. Produce a test run status report with these sections:

   **Run Overview:**
   - Run name, ID, state (NotStarted/InProgress/Completed/Aborted)
   - Plan name and ID (if linked)
   - Start/complete dates, total duration

   **Results Summary:**
   - Pass rate: passed / total (percentage)
   - 🟢 Passed: N
   - 🔴 Failed: N
   - 🚫 Blocked: N
   - ⏸️ Not Executed: N
   - Other outcomes (inconclusive, timeout, error)

   **Failure Details:**
   - List each failed test case with:
     - Test case name and ID
     - Error message or comment (if available)
     - Suite it belongs to
   - Group failures by pattern if applicable

   **Blocked Tests:**
   - List blocked tests and any recorded comments explaining why

   **Recommendations:**
   - Investigate failed tests — check error messages for root causes
   - Unblock blocked tests — verify prerequisites are met
   - Re-run not-executed tests if the run was aborted early
   - Consider creating a follow-up run for failed/blocked tests only

5. Format as a clean Markdown report.
