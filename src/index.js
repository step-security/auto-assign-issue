const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const { runAction } = require('./action');
const { parseIntInput, parseAssignments } = require('./utils');
const axios = require('axios');

async function validateSubscription() {
    let repoPrivate;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (eventPath && fs.existsSync(eventPath)) {
        const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
        repoPrivate = payload?.repository?.private;
    }

    const upstream = 'pozil/auto-assign-issue';
    const action = process.env.GITHUB_ACTION_REPOSITORY;
    const docsUrl =
        'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions';

    core.info('');
    core.info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m');
    core.info(`Secure drop-in replacement for ${upstream}`);
    if (repoPrivate === false)
        core.info('\u001b[32m✓ Free for public repositories\u001b[0m');
    core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
    core.info('');

    if (repoPrivate === false) return;
    const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
    const body = { action: action || '' };

    if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;
    try {
        await axios.post(
            `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
            body,
            { timeout: 3000 }
        );
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            core.error(
                `\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`
            );
            core.error(
                `\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`
            );
            process.exit(1);
        }
        core.info('Timeout or API not reachable. Continuing to next step.');
    }
}

(async () => {
    try {
        await validateSubscription();
        const gitHubToken = core.getInput('repo-token', { required: true });
        const assignees = parseAssignments(
            core.getInput('assignees', { required: false })
        );
        const teams = parseAssignments(
            core.getInput('teams', { required: false })
        );
        let numOfAssignee;
        try {
            numOfAssignee = parseIntInput(
                core.getInput('numOfAssignee', {
                    require: false
                }),
                0
            );
        } catch (error) {
            throw new Error(
                `Failed to parse value for numOfAssignee: ${error.message}`,
                { cause: error }
            );
        }

        const abortIfPreviousAssignees = core.getBooleanInput(
            'abortIfPreviousAssignees',
            { required: false }
        );
        const removePreviousAssignees = core.getBooleanInput(
            'removePreviousAssignees',
            { required: false }
        );
        const allowNoAssignees = core.getBooleanInput('allowNoAssignees', {
            required: false
        });
        const allowSelfAssign = core.getBooleanInput('allowSelfAssign', {
            required: false
        });

        let manualIssueNumber;
        try {
            manualIssueNumber = parseIntInput(
                core.getInput('issueNumber', {
                    require: false
                }),
                0
            );
        } catch (error) {
            throw new Error(
                `Failed to parse value for issueNumber: ${error.message}`,
                { cause: error }
            );
        }

        const teamIsPullRequestReviewer = core.getBooleanInput(
            'teamIsPullRequestReviewer',
            {
                required: false
            }
        );

        const failsIfUsersCannotBeAssigned = core.getBooleanInput(
            'failsIfUsersCannotBeAssigned',
            {
                required: false
            }
        );

        // Get octokit
        const octokit = github.getOctokit(gitHubToken);

        // Get context
        const contextPayload = github.context.payload;

        // Run action
        await runAction(octokit, contextPayload, {
            assignees,
            teams,
            numOfAssignee,
            abortIfPreviousAssignees,
            removePreviousAssignees,
            allowNoAssignees,
            allowSelfAssign,
            manualIssueNumber,
            teamIsPullRequestReviewer,
            failsIfUsersCannotBeAssigned
        });
    } catch (error) {
        core.setFailed(error.message);
    }
})();
