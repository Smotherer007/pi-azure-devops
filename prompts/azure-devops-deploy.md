---
description: Run a deployment pipeline with pre-deploy safety checks
argument-hint: "<pipeline-id> [branch] [template-params]"
---
Use the Azure DevOps tools to safely trigger a deployment pipeline. Steps:

1. Find the deploy pipeline:
   - If a pipeline ID was given$1{, use `azure_devops_get_pipeline` with pipeline ID `$1`}.
   - Otherwise, run `azure_devops_list_pipelines` and ask which pipeline to deploy.
   - Note the pipeline name and ID.

2. Check for active deployments:
   - Run `azure_devops_list_runs` with the pipeline ID and `status: "inProgress"`.
   - If any runs are in progress, warn the user and ask whether to proceed.

3. Check the latest run on the target branch:
   - Run `azure_devops_list_runs` with the pipeline ID and the target branch (default: `main`).
   - Check if the latest completed run succeeded.
   - If it failed, warn the user and suggest investigating before deploying.

4. Confirm with the user before proceeding:
   - Show the pipeline name, target branch, and any template parameters.
   - Ask for explicit confirmation.

5. Trigger the deployment:
   - Run `azure_devops_run_pipeline` with the pipeline ID$2{, `branch: "$2"` if a branch was specified}$3{, and `templateParameters` if provided: `$3`}.
   - Note the new run ID.

6. Monitor the deployment:
   - Run `azure_devops_list_runs` with `status: "inProgress"` to confirm the run started.
   - Report the run ID and URL.

7. Report the result:
   - **Run ID** and URL
   - **Pipeline** name
   - **Branch** being deployed
   - **Status** (queued/in-progress)
   - Suggest using `azure_devops_get_run_timeline` to monitor progress.
