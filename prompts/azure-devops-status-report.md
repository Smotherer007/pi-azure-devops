---
description: Generate a status report from Azure DevOps work items
argument-hint: "[group-by: state|assignee|iteration|type]"
---
Use the Azure DevOps tools to produce a status report. Steps:

1. Run `azure_devops_query_work_items` with this WIQL query to get all active work:
   ```sql
   SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType],
          [System.AssignedTo], [System.IterationPath], [System.Priority]
   FROM WorkItems
   WHERE [System.State] <> 'Closed' AND [System.State] <> 'Done'
   ORDER BY [System.IterationPath], [System.Priority]
   ```

2. If the user specified a group-by option, use it. Otherwise ask which grouping they prefer:
   - **state** — Group by workflow state (New, Active, Resolved, etc.)
   - **assignee** — Group by assigned team member
   - **iteration** — Group by sprint/iteration
   - **type** — Group by work item type (Bug, User Story, Task, etc.)

3. Present the report with:
   - **Header**: Total count of work items, breakdown by state
   - **Grouped sections**: Items organized by the chosen dimension
   - **Summary stats**: Counts per group, percentage of total
   - **Highlights**: Any blocked items (state stuck in Active for long), overdue items, or unassigned items

4. Format as a clean Markdown report suitable for sharing in a team channel or email.

5. Optionally suggest actions for items that need attention (unassigned, stale, blocked).
