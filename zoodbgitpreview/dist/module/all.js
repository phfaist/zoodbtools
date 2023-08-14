import "./ZooDbGithubRepoPreviewComponent.css";
import {jsx as $lVGNU$jsx, jsxs as $lVGNU$jsxs} from "react/jsx-runtime";
import $lVGNU$path from "path";
import $lVGNU$debug from "debug";
import $lVGNU$isomorphicgit from "isomorphic-git";
import $lVGNU$isomorphicgithttpwebindexjs from "isomorphic-git/http/web/index.js";
import {useState as $lVGNU$useState} from "react";
import {ZooDbPreviewComponent as $lVGNU$ZooDbPreviewComponent} from "@phfaist/zoodbtools_preview";
import $lVGNU$stream from "stream";
import {install as $lVGNU$install, configure as $lVGNU$configure, BFSRequire as $lVGNU$BFSRequire} from "browserfs";
import $lVGNU$pify from "pify";

function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}
var $533bbcd4d6a10b9b$exports = {};

$parcel$export($533bbcd4d6a10b9b$exports, "ZooDbGithubRepoPreviewComponent", () => $533bbcd4d6a10b9b$export$e4e9bea81721a9e8);











const $965a280639223b0e$var$debug = (0, $lVGNU$debug)("zoodbgitpreview.GithubRepoSelector");
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
            if (typeof pullRequestNumber === "number" && pullRequestNumber > 0) {
                $965a280639223b0e$var$debug("pr selected!", {
                    pullRequestNumber: pullRequestNumber
                });
                onGitBranchSelected({
                    pullRequestNumber: pullRequestNumber
                });
            } else alert(`Please enter a pull request number to view`);
        } else alert(`Please enter a pull request number to view`);
    };
    const btnMainClicked = (event)=>{
        onGitBranchSelected({
            branch: mainBranchName
        });
    };
    return /*#__PURE__*/ (0, $lVGNU$jsxs)("div", {
        className: "GithubRepoSelector",
        children: [
            /*#__PURE__*/ (0, $lVGNU$jsxs)("span", {
                className: "show-gh-repo-combo",
                children: [
                    /*#__PURE__*/ (0, $lVGNU$jsx)("span", {
                        className: "show-gh-user",
                        children: githubUser
                    }),
                    ":",
                    /*#__PURE__*/ (0, $lVGNU$jsx)("span", {
                        className: "show-gh-repo",
                        children: githubRepo
                    }),
                    " [",
                    /*#__PURE__*/ (0, $lVGNU$jsx)("span", {
                        className: "show-gh-branch",
                        children: showBranchText
                    }),
                    "]"
                ]
            }),
            /*#__PURE__*/ (0, $lVGNU$jsxs)("span", {
                className: "show-gh-pick show-gh-pick-pr",
                children: [
                    /*#__PURE__*/ (0, $lVGNU$jsx)("label", {
                        htmlFor: "show-gh-select-input-pull-request",
                        children: "View Pull Request #:"
                    }),
                    /*#__PURE__*/ (0, $lVGNU$jsx)("input", {
                        type: "text",
                        id: "show-gh-select-input-pull-request"
                    }),
                    /*#__PURE__*/ (0, $lVGNU$jsx)("button", {
                        onClick: btnClicked,
                        children: "Go to PR!"
                    })
                ]
            }),
            /*#__PURE__*/ (0, $lVGNU$jsx)("span", {
                className: "show-gh-pick show-gh-pick-main-branch",
                children: /*#__PURE__*/ (0, $lVGNU$jsx)("button", {
                    onClick: btnMainClicked,
                    children: "Go to main branch"
                })
            })
        ]
    });
}



const $533bbcd4d6a10b9b$var$debug = (0, $lVGNU$debug)("zoodbgitpreview.ZooDbGithubRepoPreviewComponent");
window.git = (0, $lVGNU$isomorphicgit);
window.gitHttp = (0, $lVGNU$isomorphicgithttpwebindexjs);
function $533bbcd4d6a10b9b$export$e4e9bea81721a9e8(props) {
    let { githubUser: githubUser, githubRepo: githubRepo, allowChoosePullRequest: allowChoosePullRequest, fs: fs, loadZooDbFromFsDir: loadZooDbFromFsDir, mainBranchName: mainBranchName, fsWorkDir: fsWorkDir, initialObjectType: initialObjectType, initialObjectId: initialObjectId, commandButtonsUseReload: commandButtonsUseReload, commandButtonsToggleDarkModeCallback: commandButtonsToggleDarkModeCallback, renderObject: renderObject, getMathJax: getMathJax } = props;
    allowChoosePullRequest ??= true;
    fsWorkDir ??= "/git-work";
    mainBranchName ??= "main";
    let fsRepoDir = `${fsWorkDir}/${githubUser}-${githubRepo}`;
    commandButtonsUseReload ??= false;
    const [gitBranch, setGitBranch] = (0, $lVGNU$useState)({
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
        let fetchResult = await (0, $lVGNU$isomorphicgit).fetch({
            fs: fs,
            http: (0, $lVGNU$isomorphicgithttpwebindexjs),
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
        await (0, $lVGNU$isomorphicgit).checkout({
            fs: fs,
            dir: fsRepoDir,
            ref: fetchResult.fetchHead
        });
    };
    const loadZooDb = async ()=>{
        // see if we have our special marker in the folder
        let needsClone = true;
        const metaInfoFileName = (0, $lVGNU$path).join(fsRepoDir, "_zoodbgitpreview_git_repo.json");
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
            await (0, $lVGNU$isomorphicgit).clone({
                fs: fs,
                http: (0, $lVGNU$isomorphicgithttpwebindexjs),
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
    return /*#__PURE__*/ (0, $lVGNU$jsx)((0, $lVGNU$ZooDbPreviewComponent), {
        loadZooDb: loadZooDb,
        reloadZooDb: reloadZooDb,
        renderObject: renderObject,
        getMathJax: getMathJax,
        initialObjectType: initialObjectType,
        initialObjectId: initialObjectId,
        commandButtonsUseReload: commandButtonsUseReload,
        commandButtonsToggleDarkModeCallback: commandButtonsToggleDarkModeCallback,
        userLoadVersion: gitBranch.userLoadVersion,
        children: /*#__PURE__*/ (0, $lVGNU$jsx)((0, $965a280639223b0e$export$366f8f2ac96c0111), {
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


var $498c5d79b37324bf$exports = {};

$parcel$export($498c5d79b37324bf$exports, "fsExists", () => $498c5d79b37324bf$export$7be64dcd0cb16883);
$parcel$export($498c5d79b37324bf$exports, "deleteFolderRecursive", () => $498c5d79b37324bf$export$13ca244421327d82);
$parcel$export($498c5d79b37324bf$exports, "createSimpleBufferReadStream", () => $498c5d79b37324bf$export$1f7249bbedc9b823);
$parcel$export($498c5d79b37324bf$exports, "fixupBrowserFsObject", () => $498c5d79b37324bf$export$5b76a7a96b7d9361);
$parcel$export($498c5d79b37324bf$exports, "setupBrowserFs", () => $498c5d79b37324bf$export$10967d9b6cf1facf);





const $498c5d79b37324bf$var$debug = (0, $lVGNU$debug)("zoodbgitpreview.useBrowserfs");
async function $498c5d79b37324bf$export$7be64dcd0cb16883(filePath, fs) {
    let fsp = fs.promises;
    try {
        let fileStat = await fsp.lstat(filePath);
        //console.log('path', filePath, 'exists -> ', fileStat);
        return true;
    } catch (e) {
        console.log("path", filePath, "does not seem to exist", e);
    }
    return false;
}
async function $498c5d79b37324bf$export$13ca244421327d82(directoryPath, fs) {
    //console.log('deleteFolderRecursive', { directoryPath, fs });
    let fsp = fs.promises;
    let fileExists = await $498c5d79b37324bf$export$7be64dcd0cb16883(directoryPath, fs);
    if (fileExists) {
        const dirEntries = await fsp.readdir(directoryPath);
        for (const file of dirEntries){
            const curPath = (0, $lVGNU$path).join(directoryPath, file);
            const curStat = await fsp.lstat(curPath);
            //console.log(`encountered file "${directoryPath}" / "${file}" -> `, curStat);
            if (curStat.isDirectory()) // recurse
            await $498c5d79b37324bf$export$13ca244421327d82(curPath, fs);
            else // delete file
            await fsp.unlink(curPath);
        }
        //console.log(`Recursively cleaned out ${directoryPath}, entries are now: `,
        //            await fsp.readdir(directoryPath));
        await fsp.rmdir(directoryPath);
    }
}
function $498c5d79b37324bf$export$1f7249bbedc9b823(buffer) {
    let buf = buffer;
    return new (0, $lVGNU$stream).Readable({
        read () {
            if (buf != null) {
                this.push(buf);
                buf = null;
            }
            this.push(null);
        }
    });
}
async function $498c5d79b37324bf$export$5b76a7a96b7d9361(fs) {
    // add fs.promises
    fs.promises = {};
    for (const method of [
        "access",
        "appendFile",
        "chmod",
        "chown",
        "close",
        //'copyFile',
        "exists",
        "fchmod",
        "fchown",
        "fdatasync",
        "fstat",
        "fsync",
        "ftruncate",
        "futimes",
        "lchmod",
        "lchown",
        "link",
        "lstat",
        "mkdir",
        //'mkdtemp',
        "open",
        "read",
        "readFile",
        "readdir",
        "readlink",
        "realpath",
        "rename",
        "rmdir",
        //'rm',
        "stat",
        "symlink",
        "truncate",
        "unlink",
        "utimes",
        "write",
        "writeFile"
    ]){
        $498c5d79b37324bf$var$debug(`Promisifying fs.${method} ...`);
        fs.promises[method] = (0, $lVGNU$pify)(fs[method]);
    }
    $498c5d79b37324bf$var$debug(`Added fs.promises`);
    // patch up access()
    fs.promises.access = async (filePath)=>{
        if (await $498c5d79b37324bf$export$7be64dcd0cb16883(filePath, fs)) return true;
        throw new Error(`access() test patch: file ${filePath} does not exist`);
    };
    // patch up createReadStream()
    fs.createReadStream = async (filePath)=>{
        let content = await fs.promises.readFile(filePath);
        return $498c5d79b37324bf$export$1f7249bbedc9b823(content);
    };
    // patch up fs.promises.rm(..., { recursive: true|false, force: true|false})
    fs.promises.rm = async (filePath, { recursive: recursive })=>{
        // TODO, should actually raise an error if filePath doesn't exist ... oh
        // well, that's too bad.
        if (recursive) return await $498c5d79b37324bf$export$13ca244421327d82(filePath, fs);
        return await fs.promises.unlink(filePath);
    };
}
async function $498c5d79b37324bf$export$10967d9b6cf1facf(browserFsConfig, options = {}) {
    $lVGNU$install(window);
    const fs = await new Promise((accept, reject)=>{
        $lVGNU$configure(browserFsConfig, function(e) {
            if (e) // An error happened!
            reject(e);
            // Otherwise, BrowserFS is ready-to-use!
            const fs = $lVGNU$BFSRequire("fs");
            accept(fs);
        });
    });
    $498c5d79b37324bf$var$debug(`Got fs object from BrowserFS`, {
        fs: fs
    });
    if (options.setGlobalWindowProperty ?? true) window.fs = fs;
    await $498c5d79b37324bf$export$5b76a7a96b7d9361(fs);
    return fs;
}




export {$533bbcd4d6a10b9b$export$e4e9bea81721a9e8 as ZooDbGithubRepoPreviewComponent, $498c5d79b37324bf$export$7be64dcd0cb16883 as fsExists, $498c5d79b37324bf$export$13ca244421327d82 as deleteFolderRecursive, $498c5d79b37324bf$export$1f7249bbedc9b823 as createSimpleBufferReadStream, $498c5d79b37324bf$export$5b76a7a96b7d9361 as fixupBrowserFsObject, $498c5d79b37324bf$export$10967d9b6cf1facf as setupBrowserFs};
//# sourceMappingURL=all.js.map
