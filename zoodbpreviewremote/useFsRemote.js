import nodeUtil from 'node:util';

import fsRemote_createClient from 'fs-remote/createClient';


// const promisify = (fn) => {
//     return function() {
//         var args = arguments;
//         return new Promise( (resolve, reject) => {
//             fn(...args,
//                (err, ...results) => {
//                    if (err != null) {
//                        reject(err)
//                    } else {
//                        resolve(...results);
//                    }
//                });
//         } );
//     };
// };



export function fsRemoteCreateClient(remoteUrl)
{
    if (remoteUrl == null) {
        // by default use same server as the one that served this HTML page
        remoteUrl = window.location.href;
    }

    const fs = fsRemote_createClient(remoteUrl);
    
    // add fs.promises

    fs.promises = {};
    for (const method of ['access','appendFile','chmod','chown','close', 'copyFile','exists','fchmod','fchown','fdatasync','fstat','fsync','ftruncate','futimes','lchmod','lchown','link','lstat','mkdir','mkdtemp','open','read','readFile','readdir','readlink','realpath','rename','rmdir','stat','symlink','truncate','unlink','utimes','write','writeFile',]) {
        fs.promises[method] = nodeUtil.promisify(fs[method]);
    }

    return fs;
}
