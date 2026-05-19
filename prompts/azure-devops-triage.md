---
description: Triage a batch of untriaged Azure DevOps work items
argument-hint: "[WIQL WHERE clause or filter]"
---
Use the Azure DevOps tools to triage work items. Steps:

1. Run `azure_devops_query_work_items` with the following WIQL query to find items needing triage:
   ```sql
   SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType]
   FROM WorkItems
   WHERE [System.State] = 'New'
   $@
   ORDER BY [System.CreatedDate] ASC
   ```
   If the user provided additional filters, append them to the WHERE clause. Otherwise use the query as-is.

2. For each work item returned, review its title and description (fetch with `azure_devops_get_work_item` if needed).

3. Suggest the following for each item:
   - **Priority** (1–4) based on urgency and impact
   - **Area Path** based on the component/feature area
   - **Iteration** based on current sprint planning
   - **Assigned To** based on team expertise (ask the user if unsure)
   - **Work Item Type** if it seems miscategorized (e.g., a Task that should be a Bug)

4. Present the suggestions as a table. Ask the user which suggestions to apply.

5. For each approved suggestion, use `azure_devops_update_work_item` to apply the field changes.

After all updates, provide a summary of triaged items with their new field values.
