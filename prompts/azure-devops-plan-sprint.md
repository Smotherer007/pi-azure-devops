---
description: Sprint planning — propose work assignment based on capacity
argument-hint: "<sprint-name|next>"
---
Use the Azure DevOps tools to plan a sprint. Steps:

1. Identify the target sprint:
   - If the user said "next", run `azure_devops_list_iterations` with `timeframe: "future"` and pick the first upcoming sprint.
   - If the user specified a sprint name, run `azure_devops_list_iterations` and find it by name.
   - Note the iteration ID and date range.

2. Get the team's capacity for that sprint:
   - Run `azure_devops_get_capacity` with the iteration ID.
   - Note each member's available hours/day and days off.
   - Calculate total available effort: (capacity/day × working days) for each member.

3. Find candidate work items to assign:
   - Run `azure_devops_query_work_items` with a WIQL query to find unassigned or "New" items in the backlog:
     ```sql
     SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State],
            [System.Priority], [System.AssignedTo]
     FROM WorkItems
     WHERE [System.State] = 'New'
       AND [System.AssignedTo] = ''
     ORDER BY [System.Priority], [System.CreatedDate] ASC
     ```
   - If the user provided specific items to plan, fetch those instead.

4. Propose an assignment plan:
   - Consider each item's priority and estimated effort (ask the user if not clear).
   - Match items to team members based on their activity types and available capacity.
   - Ensure no member is over-committed.
   - Present the plan as a table:
     | Item | Title | Assigned To | Estimated Effort | Rationale |

5. Ask the user to confirm or adjust the plan.

6. For each confirmed assignment:
   - Use `azure_devops_update_work_item` to set `System.AssignedTo` and `System.IterationPath`.
   - Optionally use `azure_devops_set_capacity` if capacity needs updating.

7. After all updates, provide a summary of the sprint plan with total items per member and remaining capacity.
