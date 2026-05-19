---
description: Create a pull request — suggest title and description from branch context
argument-hint: "<repository-id> <source-branch>"
---
Use the Azure DevOps tools to create a pull request. Steps:

1. Confirm the repository and branches:
   - Run `azure_devops_list_branches` with `repositoryId: "$1"`.
   - Verify the source branch `$2` exists.
   - Identify the target branch (typically `main` or `develop` — the repository's default branch).

2. Get context from the source branch:
   - Note the branch name and any conventions it follows (feature/*, hotfix/*, bugfix/*).
   - Infer the change type: feature (new functionality), hotfix (urgent fix), bugfix (non-urgent fix), refactor, chore.

3. Suggest PR title and description:
   - **Title:** Based on the branch name, converted to a human-readable summary.
     - `feature/login-page` → "Add login page"
     - `hotfix/auth-timeout` → "Fix auth timeout issue"
     - `bugfix/null-pointer` → "Fix null pointer exception in..."
   - **Description:** Include:
     - What changes were made (inferred from branch name and type)
     - Why the change was needed (ask the user if not clear)
     - How to test (suggest based on change type)
   - Present the suggested title and description to the user for editing.

4. After user confirms:
   - Run `azure_devops_create_pull_request` with:
     - `repositoryId: "$1"`
     - `sourceRefName: "refs/heads/$2"`
     - `targetRefName: "refs/heads/{target branch}"`
     - `title: "{confirmed title}"`
     - `description: "{confirmed description}"`

5. After creation:
   - Show the created PR ID and URL.
   - Ask if the user wants to add reviewers or link work items.
   - If linking work items, suggest running `azure_devops_query_work_items` to find relevant items.

6. Provide a summary:
   - PR number, title, URL
   - Source → target branch
   - Any linked work items or reviewers added
