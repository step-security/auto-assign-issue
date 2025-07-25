# GitHub action that auto-assigns issues or PRs to users or team members

## Inputs

| Parameter                      | Type    | Required                             | Default | Description                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------ | ------- | ------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assignees`                    | String  | only if `teams` is not specified     | n/a     | Comma separated list of user names with optional [weights](#working-with-weighted-assignements). Issue will be assigned to those users.                                                                                                                                                                                                                 |
| `teams`                        | String  | only if `assignees` is not specified | n/a     | Comma separated list of team names without the org prefix with optional [weights](#working-with-weighted-assignements). Issue will be assigned to the team members.<br/><br/>**Important Requirement:** if using the `teams` input parameter, you need to use a personal access token with `read:org` scope (the default `GITHUB_TOKEN` is not enough). |
| `numOfAssignee`                | Number  | false                                | n/a     | Number of assignees that will be randomly picked from the teams or assignees. If not specified, assigns all users.                                                                                                                                                                                                                                      |
| `abortIfPreviousAssignees`     | Boolean | false                                | false   | Flag that aborts the action if there were assignees previously. This does not cause the action to fail.                                                                                                                                                                                                                                                 |
| `removePreviousAssignees`      | Boolean | false                                | false   | Flag that removes assignees before assigning them (useful the issue is reasigned).                                                                                                                                                                                                                                                                      |
| `allowNoAssignees`             | Boolean | false                                | false   | Flag that prevents the action from failing when there are no assignees.                                                                                                                                                                                                                                                                                 |
| `allowSelfAssign`              | Boolean | false                                | true    | Flag that allows self-assignment to the issue author.<br/><br/>This flag is ignored when working with PRs as self assigning a PR for review is forbidden by GitHub.                                                                                                                                                                                     |
| `issueNumber`                  | Number  | false                                | n/a     | Allows to override the issue number. This can be useful when context is missing.                                                                                                                                                                                                                                                                        |
| `teamIsPullRequestReviewer`    | Boolean | false                                | false   | Sets team as the PR reviewer instead of a member of the team.                                                                                                                                                                                                                                                                                           |
| `failsIfUsersCannotBeAssigned` | Boolean | false                                | false   | Flag that causes the action to fail if one ore more users cannot be assigned to an issue. If not set the invalid users are simply ignored.                                                                                                                                                                                                              |

## Examples

### Working with Issues

This example auto-assigns new issues to two users randomly chosen from `octocat`, `cat` and `dog`.
It won't self-assign to the issue author.

```yml
name: Issue assignment

on:
    issues:
        types: [opened]

jobs:
    auto-assign:
        runs-on: ubuntu-latest
        permissions:
            issues: write
        steps:
            - name: 'Auto-assign issue'
              uses: step-security/auto-assign-issue@v2
              with:
                  assignees: octocat,cat,dog
                  numOfAssignee: 2
                  allowSelfAssign: false
```

### Working with PRs

This example assigns PRs to a random member of the `support` team:

```yml
name: PR assignment

on:
    pull_request:
        types: [opened, edited, synchronize, reopened]

jobs:
    auto-assign:
        runs-on: ubuntu-latest
        permissions:
            pull-requests: write
        steps:
            - name: 'Auto-assign PR'
              uses: step-security/auto-assign-issue@v2
              with:
                  repo-token: ${{ secrets.MY_PERSONAL_ACCESS_TOKEN }}
                  teams: support
                  numOfAssignee: 1
```

### Working with weighted assignements

When specifying `assignees` or `teams` values, you may provide weights to balance the randomness of the selection.
The following formats are supported:

```yml
# No weights specified (same weight for all items)
assignees: a, b, c
# Weights specified
assignees: a:1, b:5, c:2
# Some weights specified (item weight defaults to 1 when not specified)
assignees: a, b:2, c
```

Let's look at a practical example:

```yml
assignees: octocat:4,cat
```

- `octocat` has a weight of `4`.
- `cat` has a weight of `1` (default value).
- `octocat` has 4 chances out of 5 to be selected.

### Working with Project Cards

> [!WARNING]
>
> `project_card` events are only supported on legacy Project (Classic) ([see docs](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#project_card)).

This example assigns a project card to the `triage` team when the card is moved.
It removes previously assigned users.

```yml
name: Project card assignment

on:
    project_card:
        types: [moved]

jobs:
    auto-assign:
        runs-on: ubuntu-latest
        permissions:
            issues: write
        steps:
            - name: 'Auto-assign card'
              uses: step-security/auto-assign-issue@v2
              with:
                  repo-token: ${{ secrets.MY_PERSONAL_ACCESS_TOKEN }}
                  teams: triage
                  removePreviousAssignees: true
```

### Specifying a dynamic user

Instead of hardcoding the user name in the workflow, you can use a repository variable:

- create a GitHub repo variable named `DEFAULT_ISSUE_ASSIGNEE` with the name of the user
- use this value `${{ vars.DEFAULT_ISSUE_ASSIGNEE }}` instead of the username in the workflow.
