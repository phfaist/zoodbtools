//import path from 'path';

import debugm from 'debug';
const debug = debugm('zoodbgitpreview.ZooDbGithubRepoPreviewComponent');

import git from 'isomorphic-git';
import gitHttp from 'isomorphic-git/http/web/index.js';

import React, { useState, useRef, useEffect } from 'react';

import { ZooDbPreviewComponent } from '@phfaist/zoodbtools_preview';


import { GithubRepoSelector } from './GithubRepoSelector.jsx';


window.git = git;
window.gitHttp = gitHttp;


export function ZooDbGithubRepoPreviewComponent(props)
{
    let {
        githubUser,
        githubRepo,
        allowChoosePullRequest,
        fs,
        loadZooDbFromFsDir,
        mainBranchName,
        fsWorkDir,
        initialObjectType,
        initialObjectId,
        commandButtonsToggleDarkModeCallback,
        renderObject,
        getMathJax,
    } = props;

    allowChoosePullRequest ??= true;
    fsWorkDir ??= "/git-work"
    mainBranchName ??= 'main'
    let fsRepoDir = `${fsWorkDir}/${githubRepo}`

    const [ gitBranch, setGitBranch ] = useState({
         branch: mainBranchName,
         loadVersion: 0,
    });

    const loadZooDb = async () => {
        
        // Clear up any existing work dir folder
        await fs.promises.rm(fsRepoDir, { recursive: true });

        debug(`About to git clone...`);

        await git.clone({
            fs,
            http: gitHttp,
            dir: fsRepoDir,
            corsProxy: 'https://cors.isomorphic-git.org',
            url: `https://github.com/${githubUser}/${githubRepo}.git`,
            ref: mainBranchName,
            singleBranch: true,
            depth: 1, // NOT 0 !!!
        });
        
        debug(`Cloned repository.  Folder ${fsRepoDir} now -> `,
              await fs.promises.readdir(`${fsRepoDir}`));

        let zoodb = await loadZooDbFromFsDir({ fsRepoDir });
    
        // for in-browser debugging
        window.zoodb = zoodb;

        return zoodb;
    };

    const reloadZooDb = async (zoodb) => {

        debug(`Called reloadZooDb()`);

        //
        // fetch and checkout the relevant git branch in
        //

        let gitRemoteRef = mainBranchName;
        let gitRef = mainBranchName;
        if (gitBranch.pullRequestNumber != null) {
            gitRemoteRef = `pull/${gitBranch.pullRequestNumber}/head`;
            gitRef = `pr-${gitBranch.pullRequestNumber}`;
        }

        debug(`Calling git.pull()`, { gitRemoteRef, gitRef, gitBranch });

        await git.pull({
            fs,
            http: gitHttp,
            dir: fsRepoDir,
            corsProxy: 'https://cors.isomorphic-git.org',
            url: `https://github.com/${githubUser}/${githubRepo}.git`,
            remoteRef: gitRemoteRef,
            ref: gitRef,
            singleBranch: true,
            depth: 1, // NOT 0 !!!

            author: { name: 'git-preview-test', email: 'noemail@example.com' },
        });

        debug(`Calling git.checkout()`, { gitRemoteRef, gitRef });

        // and switch to this branch
        await git.checkout({
            fs,
            dir: fsRepoDir,
            ref: gitRef,
        });

        // now, initiate a zoo reload.

        debug(`Reloading the zoo now`);
        
        await zoodb.load();

        return zoodb;
    };

    debug(`In ZooDbGithubRepoPreviewComponent render, gitBranch is`, gitBranch);

    //
    // Render the component
    //
    return (
        <>
            <GithubRepoSelector
                githubUser={githubUser}
                githubRepo={githubRepo}
                mainBranchName={mainBranchName}
                allowChoosePullRequest={allowChoosePullRequest}
                onGitBranchSelected={
                    (newGitBranch) => setGitBranch({...newGitBranch, loadVersion: gitBranch.loadVersion+1})
                }
            />
            <ZooDbPreviewComponent
                loadZooDb={loadZooDb}
                reloadZooDb={reloadZooDb}
                renderObject={renderObject}
                getMathJax={getMathJax}
                initialObjectType={initialObjectType}
                initialObjectId={initialObjectId}
                commandButtonsUseReload={false}
                commandButtonsToggleDarkModeCallback={commandButtonsToggleDarkModeCallback}
                loadVersion={gitBranch.loadVersion}
            />
        </>
    );


}
