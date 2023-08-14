import path from 'path';

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
        commandButtonsUseReload,
        commandButtonsToggleDarkModeCallback,
        renderObject,
        getMathJax,
    } = props;

    allowChoosePullRequest ??= true;
    fsWorkDir ??= "/git-work"
    mainBranchName ??= 'main'
    let fsRepoDir = `${fsWorkDir}/${githubUser}-${githubRepo}`

    commandButtonsUseReload ??= false;

    const [ gitBranch, setGitBranch ] = useState({
         branch: mainBranchName,
         userLoadVersion: 0,
    });

    // to help with in-browser debugging
    window.fsRepoDir = fsRepoDir;
    window.githubUser = githubUser;
    window.githubRepo = githubRepo;

    const doGitCheckoutAppropriateVersion = async () => {

        //
        // fetch and checkout the relevant git branch in
        //

        let gitRemoteRef = mainBranchName;
        //let gitRef = mainBranchName;
        if (gitBranch.pullRequestNumber != null) {
            gitRemoteRef = `pull/${gitBranch.pullRequestNumber}/head`;
            //gitRef = `pr-${gitBranch.pullRequestNumber}`;
        }

        debug(`Calling git.fetch()`, { gitRemoteRef, //gitRef,
                                      gitBranch });

        let fetchResult = await git.fetch({
            fs,
            http: gitHttp,
            dir: fsRepoDir,
            corsProxy: 'https://cors.isomorphic-git.org',
            url: `https://github.com/${githubUser}/${githubRepo}.git`,
            remoteRef: gitRemoteRef,
            ref: gitRemoteRef, //gitRef,
            singleBranch: true,
            depth: 1, // NOT 0 !!!

            //author: { name: 'git-preview-test', email: 'noemail@example.com' },
        });

        // and do 'git checkout' for the appropriate version

        debug(`Calling git.checkout() to checkout ${fetchResult.fetchHead} `
              + `(${fetchResult.fetchHeadDescription})`);

        await git.checkout({
            fs,
            dir: fsRepoDir,
            ref: fetchResult.fetchHead,
        });

    };


    const loadZooDb = async () => {
        
        // see if we have our special marker in the folder
        let needsClone = true;
        const metaInfoFileName = path.join(fsRepoDir, '_zoodbgitpreview_git_repo.json');
        try {
            let data = await fs.promises.readFile(metaInfoFileName);
            let d = JSON.parse(data);
            if (d.githubUser === githubUser && d.githubRepo === githubRepo) {
                needsClone = false;
            }
        } catch (err) {
            debug(`Couldn't read ${metaInfoFileName}, will do a fresh repository clone`);
        }

        if (needsClone) {

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

            await fs.promises.writeFile(metaInfoFileName, JSON.stringify(
                { githubUser, githubRepo }
            ));
            
            debug(`Cloned repository.  Folder ${fsRepoDir} now -> `,
                await fs.promises.readdir(`${fsRepoDir}`));

        } else {

            await doGitCheckoutAppropriateVersion();

        }

        let zoodb = await loadZooDbFromFsDir({ fsRepoDir });
    
        // for in-browser debugging
        window.zoodb = zoodb;

        return zoodb;
    };

    const reloadZooDb = async (zoodb) => {

        debug(`Called reloadZooDb()`);

        await doGitCheckoutAppropriateVersion();

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
        <ZooDbPreviewComponent
            loadZooDb={loadZooDb}
            reloadZooDb={reloadZooDb}
            renderObject={renderObject}
            getMathJax={getMathJax}
            initialObjectType={initialObjectType}
            initialObjectId={initialObjectId}
            commandButtonsUseReload={commandButtonsUseReload}
            commandButtonsToggleDarkModeCallback={commandButtonsToggleDarkModeCallback}
            userLoadVersion={gitBranch.userLoadVersion}
            >
            <GithubRepoSelector
                githubUser={githubUser}
                githubRepo={githubRepo}
                mainBranchName={mainBranchName}
                allowChoosePullRequest={allowChoosePullRequest}
                onGitBranchSelected={
                    (newGitBranch) => setGitBranch({...newGitBranch, userLoadVersion: gitBranch.userLoadVersion+1})
                }
            />
        </ZooDbPreviewComponent>
    );


}
