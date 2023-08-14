import debugm from 'debug';
const debug = debugm('zoodbgitpreview.GithubRepoSelector');

import React from 'react';

export function GithubRepoSelector(props)
{
    const {
        githubUser,
        githubRepo,
        mainBranchName,
        onGitBranchSelected,
    } = props;

    debug('rendering github repo selector');

    const btnClicked = (event) => {
        const prText = document.getElementById('show-gh-select-input-pull-request').value;
        if (prText != null && prText != "") {
            // we seem to have selected a PR
            let pullRequestNumber = parseInt(prText);
            debug('pr selected!', { pullRequestNumber });
            onGitBranchSelected({ pullRequestNumber, });
        } else {
            alert(`Please enter a pull request number to view`);
        }
    };
    const btnMainClicked = (event) => {
        onGitBranchSelected({ branch: mainBranchName });
    };
    return (
        <div className="GithubRepoSelector">
            <span className="show-gh-user">{githubUser}</span>
            {":"}
            <span className="show-gh-repo">{githubRepo}</span>
            <label htmlFor="show-gh-select-input-pull-request">Pull Request #:</label>
            <input type="text" size="10" id="show-gh-select-input-pull-request" />
            <button onClick={btnClicked}>Go to PR!</button>
            <button onClick={btnMainClicked}>Go to main branch</button>
        </div>
    );
}