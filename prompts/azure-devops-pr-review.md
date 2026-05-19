---
description: Review a pull request — check threads, policies, and summarize changes
argument-hint: "<pr-id> [repository-id]"
---
Use the Azure DevOps tools to review a pull request. Steps:

1. Get the PR details:
   - Run `azure_devops_get_pull_request` with `pullRequestId: $1`$2{ and `repositoryId: "$2"` if a repository was provided}.
   - Note the title, author, source→target branches, status, and reviewer votes.

2. Get comment threads:
   - Run `azure_devops_get_pull_request_threads` with `pullRequestId: $1`$2{ and `repositoryId: "$2"`}.
   - Note the number of threads, their statuses (active, fixed, pending), and key discussion points.

3. Get commits:
   - Run `azure_devops_get_pull_request_commits` with `pullRequestId: $1`$2{ and `repositoryId: "$2"`}.
   - Note the number of commits and summarize the change themes.

4. Check policy evaluations:
   - Run `azure_devops_get_policy_evaluations` with `pullRequestId: $1`.
   - Note which policies are approved ✅, running ⏳, or rejected ❌.

5. Produce a PR review summary with these sections:

   **PR Overview:**
   - PR number, title, author
   - Source → target branch
   - Status (active/completed/abandoned)
   - Created date

   **Changes:**
   - Commit count and summary of change themes from commit messages
   - Key files or areas likely affected (inferred from commit messages)

   **Review Status:**
   - Each reviewer with their vote (Approved, Waiting for author, etc.)
   - Active discussion threads with key feedback points
   - Unresolved threads that need attention

   **Policy Checks:**
   - Each policy evaluation with status
   - Any blocking policies that prevent merge

   **Recommendation:**
   - If all policies pass and reviewers approve: recommend merge
   - If policies are rejected or reviewers have concerns: list blocking issues
   - If threads are active: summarize what needs resolution
   - Overall assessment: ✅ Ready to merge / ⚠️ Needs changes / ❌ Should not merge

6. Format as a clean Markdown report.
