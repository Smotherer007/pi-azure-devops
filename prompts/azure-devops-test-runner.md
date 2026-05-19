---
description: Create and manage a test run — select plan/suite, create run, record results
argument-hint: "[plan-id]"
---
Use the Azure DevOps tools to guide the user through creating and executing a test run. Steps:

1. Select a test plan:
   - If a plan ID was given$1{, use `azure_devops_get_test_plan` with plan ID `$1`}.
   - Otherwise, run `azure_devops_list_test_plans(filterActivePlans: true)` and ask which plan to use.
   - Note the plan name, ID, and state.

2. Select suites:
   - Run `azure_devops_list_test_suites` with the plan ID.
   - Present the suite list to the user.
   - Ask which suite(s) to include in the run (or offer "all suites").
   - Note the selected suite IDs.

3. Confirm scope:
   - For each selected suite, run `azure_devops_list_test_cases` to show the test cases.
   - Summarize: "This run will include N test cases from M suite(s)."
   - Optionally run `azure_devops_list_test_points` to show current execution status.
   - Ask the user to confirm before proceeding.

4. Create the test run:
   - Run `azure_devops_create_test_run` with the plan ID, selected suite IDs, and an optional run name.
   - Note the created run ID.
   - Confirm: "Test run #ID created with N test points."

5. Record results:
   - For each test case in the run, prompt the user for:
     - **Outcome:** passed, failed, blocked, notExecuted, etc.
     - **Comment:** (optional) notes about the result
   - Collect all results into a batch.

6. Update results:
   - Run `azure_devops_update_test_results` with the run ID and collected results.
   - Confirm: "Updated N result(s) in run #ID."

7. Show summary:
   - Run `azure_devops_get_test_run` to get final statistics.
   - Present:
     - Pass rate (passed / total)
     - Failed and blocked counts
     - Run duration
   - Suggest next steps if there are failures.

**Common patterns:**

- **Quick smoke test:** Select a smoke test plan, mark all tests as passed if no issues found.
- **Exploratory testing:** Create a run, record results as you discover issues.
- **Regression run:** Select the full regression suite, systematically record each outcome.
- **Re-test failures:** Create a new run with only the suites that had failures in the previous run.
