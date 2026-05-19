---
description: Sprint health check — current sprint status, capacity, and burndown
argument-hint: "[team-name]"
---
Use the Azure DevOps tools to perform a sprint health check. Steps:

1. Get the current sprint for the team:
   - Run `azure_devops_list_iterations` with `timeframe: "current"`$1{ and `team: "$1"` if a team was specified}.
   - Note the iteration ID, name, and date range.

2. Get the work items in the sprint:
   - Run `azure_devops_get_iteration_work_items` with the iteration ID from step 1.
   - Note how many items are in the sprint.

3. Get the team's capacity:
   - Run `azure_devops_get_capacity` with the iteration ID from step 1.
   - Note total capacity per day and individual member capacity.

4. Produce a sprint health report with these sections:

   **Sprint Overview:**
   - Sprint name, dates, days remaining
   - Total work items, breakdown by type (User Story, Bug, Task)
   - Work items by state (New, Active, Resolved, Closed) — this is the burndown snapshot

   **Capacity Utilization:**
   - Team total capacity (hours/day × remaining days)
   - Per-member capacity vs. their assigned work items
   - Members over or under capacity

   **At-Risk Items:**
   - Items still in "New" state with no activity
   - Bugs with high severity still active
   - Items assigned to members with days off

   **Recommendations:**
   - Items to prioritize or deprioritize
   - Capacity adjustments needed
   - Items that may need to move to the next sprint

5. Format as a clean Markdown report.
