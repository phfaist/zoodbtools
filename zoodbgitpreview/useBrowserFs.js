import debugm from 'debug';
const debug = debugm('zoodbgitpreview.useBrowserfs');

import path from 'path';

import stream from 'stream';
import * as BrowserFS from 'browserfs';

import pify from 'pify';


// ----------------------------------------------------------------------------

export async function fsExists(filePath, fs)
{
    let fsp = fs.promises;
    try {
        let fileStat = await fsp.lstat(filePath);
        //console.log('path', filePath, 'exists -> ', fileStat);
        return true;
    } catch (e) {
        console.log('path', filePath, 'does not seem to exist', e);
    }
    return false;
}

// rm -rf ...  thanks https://stackoverflow.com/a/32197381/1694896
export async function deleteFolderRecursive(directoryPath, fs)
{
    //console.log('deleteFolderRecursive', { directoryPath, fs });
    let fsp = fs.promises;

    let fileExists = await fsExists(directoryPath, fs);    
    if (fileExists) {
        const dirEntries = await fsp.readdir(directoryPath);
        for (const file of dirEntries) {
            const curPath = path.join(directoryPath, file);
            const curStat = await fsp.lstat(curPath);
            //console.log(`encountered file "${directoryPath}" / "${file}" -> `, curStat);
            if (curStat.isDirectory()) {
                // recurse
                await deleteFolderRecursive(curPath, fs);
            } else {
                // delete file
                await fsp.unlink(curPath);
                //console.log(`removed file "${curPath}"; exists? = `, await fsExists(curPath, fs));
            }
        }
        //console.log(`Recursively cleaned out ${directoryPath}, entries are now: `,
        //            await fsp.readdir(directoryPath));
        await fsp.rmdir(directoryPath);
    }
};

export function createSimpleBufferReadStream(buffer)
{
    let buf = buffer;
    return new stream.Readable({
        read(/*size*/) {
            if (buf != null) {
                this.push(buf);
                buf = null;
            }
            this.push(null);
        }
    });
}




export async function fixupBrowserFsObject(fs)
{

    // add fs.promises
    fs.promises = {};
    for (const method of ['access','appendFile','chmod','chown','close',
        //'copyFile',
        'exists','fchmod','fchown','fdatasync','fstat','fsync','ftruncate','futimes','lchmod','lchown','link','lstat','mkdir',
        //'mkdtemp',
        'open','read','readFile','readdir','readlink','realpath','rename','rmdir',
        //'rm',
        'stat','symlink','truncate','unlink','utimes','write','writeFile',]) {
        debug(`Promisifying fs.${method} ...`);
        fs.promises[method] = pify(fs[method]);
    }
    debug(`Added fs.promises`);

    // patch up access()
    fs.promises.access = async (filePath) => {
        if (await fsExists(filePath, fs)) {
            return true;
        }
        throw new Error(`access() test patch: file ${filePath} does not exist`);
    };

    // patch up createReadStream()
    fs.createReadStream = async (filePath) => {
        let content = await fs.promises.readFile(filePath);
        return createSimpleBufferReadStream(content);
    };

    // patch up fs.promises.rm(..., { recursive: true|false, force: true|false})
    fs.promises.rm = async (filePath, { recursive }) => {
        // TODO, should actually raise an error if filePath doesn't exist ... oh
        // well, that's too bad.
        if (recursive) {
            return await deleteFolderRecursive(filePath, fs);
        }
        return await fs.promises.unlink(filePath);
    };

}

// -----------------------------------------------------------------------------

export async function setupBrowserFs(browserFsConfig, options={})
{
    BrowserFS.install(window);
    const fs = await new Promise( (accept, reject) => {
        BrowserFS.configure(
            browserFsConfig,
            function (e) {
                if (e) {
                    // An error happened!
                    reject(e);
                }
                // Otherwise, BrowserFS is ready-to-use!
                const fs = BrowserFS.BFSRequire('fs');
                accept(fs);
            }
        );
    } );
    debug(`Got fs object from BrowserFS`, { fs });

    if (options.setGlobalWindowProperty ?? true) {
        window.fs = fs;
    }

    await fixupBrowserFsObject(fs);

    return fs;
}
