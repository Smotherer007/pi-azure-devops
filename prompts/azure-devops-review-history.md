---
description: Review the revision history of an Azure DevOps work item
argument-hint: "<work item ID>"
---
Use the Azure DevOps tools to review the change history of work item $1. Steps:

1. First, fetch the current state using `azure_devops_get_work_item` for ID $1. Note the title, type, state, and key fields.

2. Fetch the full revision history using `azure_devops_get_work_item_revisions` for ID $1. Get all revisions (use a high `top` value if needed).

3. Analyze the revision timeline and present a chronological narrative:

   **Overview**: Work item $1 — [Title] ([Type])
   Created on [date] by [creator]. Currently in [State] state.
   Total revisions: N

   **Key Events** (highlight the most significant changes):
   - 📝 **Created** — [date] by [author]: Initial creation
   - 🔄 **State change** — [date] by [author]: [Old State] → [New State]
   - 👤 **Reassigned** — [date] by [author]: [Old assignee] → [New assignee]
   - 🏷️ **Field update** — [date] by [author]: [Field] changed from [old] to [new]
   - 💬 **Comment added** — (fetch with `azure_devops_get_work_item_comments` if needed)

4. Identify patterns:
   - How long did it spend in each state?
   - How many people has it been assigned to?
   - Were there any revert cycles (state went back and forth)?
   - Is the item stalled? (long time with no updates)

5. Provide a brief summary assessment: Is the item progressing normally, blocked, or stale?

If the user didn't provide an ID, ask them for the work item ID they want to review.
