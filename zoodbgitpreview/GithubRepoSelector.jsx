import debugm from 'debug';
const debug = debugm('zoodbgitpreview.GithubRepoSelector');

import React from 'react';

import './GithubRepoSelector_style.scss';

export function GithubRepoSelector(props)
{
    const {
        githubUser,
        githubRepo,
        mainBranchName,
        gitBranch,
        onGitBranchSelected,
    } = props;

    debug('rendering github repo selector');

    let showBranchText = '??';
    if (gitBranch.branch) {
        showBranchText = gitBranch.branch;
    } else if (gitBranch.pullRequestNumber) {
        showBranchText = `PR #${gitBranch.pullRequestNumber}`;
    }

    const btnClicked = (event) => {
        const prText = document.getElementById('show-gh-select-input-pull-request').value;
        if (prText != null && prText != "") {
            // we seem to have selected a PR
            let pullRequestNumber = parseInt(prText);
            if (typeof pullRequestNumber === 'number' && pullRequestNumber > 0) {
                debug('pr selected!', { pullRequestNumber });
                onGitBranchSelected({ pullRequestNumber, });
            } else {
                alert(`Please enter a pull request number to view`);
            }
        } else {
            alert(`Please enter a pull request number to view`);
        }
    };
    const btnMainClicked = (event) => {
        onGitBranchSelected({ branch: mainBranchName });
    };
    return (
        <div className="GithubRepoSelector">
            <span className="show-gh-repo-combo">
                <span className="show-gh-user">{githubUser}</span>
                {":"}
                <span className="show-gh-repo">{githubRepo}</span>
                {" ["}
                <span className="show-gh-branch">{showBranchText}</span>
                {"]"}
            </span>
            <span className="show-gh-pick show-gh-pick-pr">
                <label htmlFor="show-gh-select-input-pull-request">View Pull Request #:</label>
                <input type="text" id="show-gh-select-input-pull-request" />
                <button onClick={btnClicked}>Go to PR!</button>
            </span>
            <span className="show-gh-pick show-gh-pick-main-branch">
                <button onClick={btnMainClicked}>Go to main branch</button>
            </span>
        </div>
    );
}