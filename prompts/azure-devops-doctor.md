Check Azure DevOps configuration, authentication, and connection health. Use the azure_devops_doctor tool to:

{{#if org}}
- Connect to the **{{org}}** organization
{{else}}
- Validate all configured organizations
{{/if}}
{{#if project}}
- Verify access to the **{{project}}** project
{{/if}}
- Confirm authentication method is working
- List available work item types
- Report any configuration issues

Suggest fixes for any problems found.
