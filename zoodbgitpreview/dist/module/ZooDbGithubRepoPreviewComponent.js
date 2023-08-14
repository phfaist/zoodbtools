import "./ZooDbGithubRepoPreviewComponent.css";
import {jsx as $jzY9H$jsx, jsxs as $jzY9H$jsxs} from "react/jsx-runtime";
import $jzY9H$path from "path";
import $jzY9H$debug from "debug";
import $jzY9H$isomorphicgit from "isomorphic-git";
import $jzY9H$isomorphicgithttpwebindexjs from "isomorphic-git/http/web/index.js";
import {useState as $jzY9H$useState} from "react";
import {ZooDbPreviewComponent as $jzY9H$ZooDbPreviewComponent} from "@phfaist/zoodbtools_preview";












const $965a280639223b0e$var$debug = (0, $jzY9H$debug)("zoodbgitpreview.GithubRepoSelector");
function $965a280639223b0e$export$366f8f2ac96c0111(props) {
    const { githubUser: githubUser, githubRepo: githubRepo, mainBranchName: mainBranchName, gitBranch: gitBranch, onGitBranchSelected: onGitBranchSelected } = props;
    $965a280639223b0e$var$debug("rendering github repo selector");
    let showBranchText = "??";
    if (gitBranch.branch) showBranchText = gitBranch.branch;
    else if (gitBranch.pullRequestNumber) showBranchText = `PR #${gitBranch.pullRequestNumber}`;
    const btnClicked = (event)=>{
        const prText = document.getElementById("show-gh-select-input-pull-request").value;
        if (prText != null && prText != "") {
            // we seem to have selected a PR
            let pullRequestNumber = parseInt(prText);
            $965a280639223b0e$var$debug("pr selected!", {
                pullRequestNumber: pullRequestNumber
            });
            onGitBranchSelected({
                pullRequestNumber: pullRequestNumber
            });
        } else alert(`Please enter a pull request number to view`);
    };
    const btnMainClicked = (event)=>{
        onGitBranchSelected({
            branch: mainBranchName
        });
    };
    return /*#__PURE__*/ (0, $jzY9H$jsxs)("div", {
        className: "GithubRepoSelector",
        children: [
            /*#__PURE__*/ (0, $jzY9H$jsxs)("span", {
                className: "show-gh-repo-combo",
                children: [
                    /*#__PURE__*/ (0, $jzY9H$jsx)("span", {
                        className: "show-gh-user",
                        children: githubUser
                    }),
                    ":",
                    /*#__PURE__*/ (0, $jzY9H$jsx)("span", {
                        className: "show-gh-repo",
                        children: githubRepo
                    }),
                    " [",
                    /*#__PURE__*/ (0, $jzY9H$jsx)("span", {
                        className: "show-gh-branch",
                        children: showBranchText
                    }),
                    "]"
                ]
            }),
            /*#__PURE__*/ (0, $jzY9H$jsxs)("span", {
                className: "show-gh-pick show-gh-pick-pr",
                children: [
                    /*#__PURE__*/ (0, $jzY9H$jsx)("label", {
                        htmlFor: "show-gh-select-input-pull-request",
                        children: "View Pull Request #:"
                    }),
                    /*#__PURE__*/ (0, $jzY9H$jsx)("input", {
                        type: "text",
                        id: "show-gh-select-input-pull-request"
                    }),
                    /*#__PURE__*/ (0, $jzY9H$jsx)("button", {
                        onClick: btnClicked,
                        children: "Go to PR!"
                    })
                ]
            }),
            /*#__PURE__*/ (0, $jzY9H$jsx)("span", {
                className: "show-gh-pick show-gh-pick-main-branch",
                children: /*#__PURE__*/ (0, $jzY9H$jsx)("button", {
                    onClick: btnMainClicked,
                    children: "Go to main branch"
                })
            })
        ]
    });
}



const $533bbcd4d6a10b9b$var$debug = (0, $jzY9H$debug)("zoodbgitpreview.ZooDbGithubRepoPreviewComponent");
window.git = (0, $jzY9H$isomorphicgit);
window.gitHttp = (0, $jzY9H$isomorphicgithttpwebindexjs);
function $533bbcd4d6a10b9b$export$e4e9bea81721a9e8(props) {
    let { githubUser: githubUser, githubRepo: githubRepo, allowChoosePullRequest: allowChoosePullRequest, fs: fs, loadZooDbFromFsDir: loadZooDbFromFsDir, mainBranchName: mainBranchName, fsWorkDir: fsWorkDir, initialObjectType: initialObjectType, initialObjectId: initialObjectId, commandButtonsUseReload: commandButtonsUseReload, commandButtonsToggleDarkModeCallback: commandButtonsToggleDarkModeCallback, renderObject: renderObject, getMathJax: getMathJax } = props;
    allowChoosePullRequest ??= true;
    fsWorkDir ??= "/git-work";
    mainBranchName ??= "main";
    let fsRepoDir = `${fsWorkDir}/${githubUser}-${githubRepo}`;
    commandButtonsUseReload ??= false;
    const [gitBranch, setGitBranch] = (0, $jzY9H$useState)({
        branch: mainBranchName,
        userLoadVersion: 0
    });
    // to help with in-browser debugging
    window.fsRepoDir = fsRepoDir;
    window.githubUser = githubUser;
    window.githubRepo = githubRepo;
    const doGitCheckoutAppropriateVersion = async ()=>{
        //
        // fetch and checkout the relevant git branch in
        //
        let gitRemoteRef = mainBranchName;
        //let gitRef = mainBranchName;
        if (gitBranch.pullRequestNumber != null) gitRemoteRef = `pull/${gitBranch.pullRequestNumber}/head`;
        $533bbcd4d6a10b9b$var$debug(`Calling git.fetch()`, {
            gitRemoteRef: gitRemoteRef,
            gitBranch: gitBranch
        });
        let fetchResult = await (0, $jzY9H$isomorphicgit).fetch({
            fs: fs,
            http: (0, $jzY9H$isomorphicgithttpwebindexjs),
            dir: fsRepoDir,
            corsProxy: "https://cors.isomorphic-git.org",
            url: `https://github.com/${githubUser}/${githubRepo}.git`,
            remoteRef: gitRemoteRef,
            ref: gitRemoteRef,
            singleBranch: true,
            depth: 1
        });
        // and do 'git checkout' for the appropriate version
        $533bbcd4d6a10b9b$var$debug(`Calling git.checkout() to checkout ${fetchResult.fetchHead} ` + `(${fetchResult.fetchHeadDescription})`);
        await (0, $jzY9H$isomorphicgit).checkout({
            fs: fs,
            dir: fsRepoDir,
            ref: fetchResult.fetchHead
        });
    };
    const loadZooDb = async ()=>{
        // see if we have our special marker in the folder
        let needsClone = true;
        const metaInfoFileName = (0, $jzY9H$path).join(fsRepoDir, "_zoodbgitpreview_git_repo.json");
        try {
            let data = await fs.promises.readFile(metaInfoFileName);
            let d = JSON.parse(data);
            if (d.githubUser === githubUser && d.githubRepo === githubRepo) needsClone = false;
        } catch (err) {
            $533bbcd4d6a10b9b$var$debug(`Couldn't read ${metaInfoFileName}, will do a fresh repository clone`);
        }
        if (needsClone) {
            // Clear up any existing work dir folder
            await fs.promises.rm(fsRepoDir, {
                recursive: true
            });
            $533bbcd4d6a10b9b$var$debug(`About to git clone...`);
            await (0, $jzY9H$isomorphicgit).clone({
                fs: fs,
                http: (0, $jzY9H$isomorphicgithttpwebindexjs),
                dir: fsRepoDir,
                corsProxy: "https://cors.isomorphic-git.org",
                url: `https://github.com/${githubUser}/${githubRepo}.git`,
                ref: mainBranchName,
                singleBranch: true,
                depth: 1
            });
            await fs.promises.writeFile(metaInfoFileName, JSON.stringify({
                githubUser: githubUser,
                githubRepo: githubRepo
            }));
            $533bbcd4d6a10b9b$var$debug(`Cloned repository.  Folder ${fsRepoDir} now -> `, await fs.promises.readdir(`${fsRepoDir}`));
        } else await doGitCheckoutAppropriateVersion();
        let zoodb = await loadZooDbFromFsDir({
            fsRepoDir: fsRepoDir
        });
        // for in-browser debugging
        window.zoodb = zoodb;
        return zoodb;
    };
    const reloadZooDb = async (zoodb)=>{
        $533bbcd4d6a10b9b$var$debug(`Called reloadZooDb()`);
        await doGitCheckoutAppropriateVersion();
        // now, initiate a zoo reload.
        $533bbcd4d6a10b9b$var$debug(`Reloading the zoo now`);
        await zoodb.load();
        return zoodb;
    };
    $533bbcd4d6a10b9b$var$debug(`In ZooDbGithubRepoPreviewComponent render, gitBranch is`, gitBranch);
    //
    // Render the component
    //
    return /*#__PURE__*/ (0, $jzY9H$jsx)((0, $jzY9H$ZooDbPreviewComponent), {
        loadZooDb: loadZooDb,
        reloadZooDb: reloadZooDb,
        renderObject: renderObject,
        getMathJax: getMathJax,
        initialObjectType: initialObjectType,
        initialObjectId: initialObjectId,
        commandButtonsUseReload: commandButtonsUseReload,
        commandButtonsToggleDarkModeCallback: commandButtonsToggleDarkModeCallback,
        userLoadVersion: gitBranch.userLoadVersion,
        children: /*#__PURE__*/ (0, $jzY9H$jsx)((0, $965a280639223b0e$export$366f8f2ac96c0111), {
            githubUser: githubUser,
            githubRepo: githubRepo,
            gitBranch: gitBranch,
            mainBranchName: mainBranchName,
            allowChoosePullRequest: allowChoosePullRequest,
            onGitBranchSelected: (newGitBranch)=>setGitBranch({
                    ...newGitBranch,
                    userLoadVersion: gitBranch.userLoadVersion + 1
                })
        })
    });
}


export {$533bbcd4d6a10b9b$export$e4e9bea81721a9e8 as ZooDbGithubRepoPreviewComponent};
//# sourceMappingURL=ZooDbGithubRepoPreviewComponent.js.map
