---
description: Board review — analyze board setup and suggest improvements
argument-hint: "<board-name> [team-name]"
---
Use the Azure DevOps tools to review a board configuration and suggest improvements. Steps:

1. List available boards:
   - Run `azure_devops_list_boards`$2{ with `team: "$2"` if a team was specified}.
   - Find the target board by name (e.g., "Stories", "Features").

2. Get the board detail:
   - Run `azure_devops_get_board` with the board ID and team.
   - Note the current columns, state mappings, WIP limits, and rows.

3. Get current sprint work items for context:
   - Run `azure_devops_list_iterations` with `timeframe: "current"` to find the active sprint.
   - Run `azure_devops_get_iteration_work_items` to see what's in the sprint.
   - Tally work items by their current state/column.

4. Analyze the board and report:

   **Board Configuration:**
   - List columns with their names, types (Incoming/InProgress/Outgoing), and WIP limits
   - Show state mappings per work item type — highlight any gaps or inconsistencies

   **Column Distribution:**
   - How many items are in each column
   - Which columns are at or over WIP limits
   - Which columns are empty (may indicate workflow bottlenecks)

   **State Mapping Health:**
   - Are all work item type states covered by a column?
   - Are there unmapped states that could cause items to disappear from the board?
   - Do the state transitions make sense (e.g., can items flow naturally left-to-right)?

   **Suggestions:**
   - Add or remove columns if the workflow is too granular or too coarse
   - Adjust WIP limits based on team size and current distribution
   - Fix missing state mappings
   - Add swim lanes (rows) if the team uses them

5. If the user approves changes, use `azure_devops_set_board_columns` to apply them.
   - **Important:** `azure_devops_set_board_columns` replaces all columns. Include ALL columns in the update, not just the changed ones.
