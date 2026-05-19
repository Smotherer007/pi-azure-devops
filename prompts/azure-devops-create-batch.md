---
description: Create multiple Azure DevOps work items from a structured list
argument-hint: "<items as bullet list or pasted table>"
---
Use the Azure DevOps tools to batch-create work items. Steps:

1. The user will provide a list of work items to create. Parse the input from:
   $@

   Expected format — bullet list or numbered list where each item has:
   - **Title** (required)
   - **Type** (optional, defaults to User Story)
   - **Description** (optional)
   - **Priority** (optional)
   - **Tags** (optional)

   Example input:
   ```
   - Bug: Fix login crash on mobile [priority:1, tags:mobile;critical]
   - Task: Update API documentation [priority:2]
   - User Story: Add export to CSV feature
   ```

2. Before creating, run `azure_devops_list_work_item_types` to verify all types are valid for the project.

3. Present a preview table of what will be created:
   | # | Type | Title | Priority | Tags |
   |---|------|-------|----------|------|

4. Ask the user to confirm the batch. Allow them to edit, remove, or add items.

5. For each confirmed item, call `azure_devops_create_work_item` with the parsed fields.

6. After creation, present a summary:
   - ✅ Successfully created: N items (list IDs)
   - ❌ Failed: N items (list reasons)

7. Optionally offer to link related items using `azure_devops_manage_work_item_links` (e.g., all tasks under a parent story).
