const fs = require('fs');
const path = require('path');
const nodeUtil = require('node:util');
const nodeChildProcess = require('node:child_process');
const { glob } = require('glob');
const { getEventListeners } = require('node:events');
const createServer = require("fs-remote/createServer");
const mime = require('mime-types');

const execFile = nodeUtil.promisify(nodeChildProcess.execFile);


async function runServer()
{

    //
    // Idea: (TODO):
    //
    // - run `parcel` to build the app in a separate folder
    //
    // - load all generated files into memory
    //
    // - chdir (and even chroot?) to the files we want to serve via fs-remote
    //
    // - start the server.  Upon a GET request, serve the relevant file in memory;
    //   otherwise use the default handlers because it's an fs-remote call.
    //
    // This way, all files are served through here.  We can set strict CORS settings
    // for better security.  [Even better, we should generate a random token and set
    // it as a custom header on all client-side requests and check its presence on
    // the server side.  But I'm not sure how to plug this header in on the client's
    // side on all requests.  Strict CORS settings should be enough.  We can also
    // pick a random port number, that should also help (but hmmm, it would mess up
    // stuff like setting localStorage for debugging messages or such...).]
    //

    console.log('Compiling application ...');
    let yarnResult = await execFile("yarn", ["dev-build-remotepreview"]);
    if (yarnResult.stdout) {
        console.log(yarnResult.stdout);
    }
    if (yarnResult.stderr) {
        console.log(yarnResult.stderr);
    }
    console.log('Compiling application done.');

    // load all dist/** files

    const distDir = path.join(process.cwd(), 'dist');
    const distFiles = await glob('**/*', { cwd: distDir } );
    const distFileContents = {};
    for (const distFile of distFiles) {
        distFileContents[distFile] = await fs.promises.readFile(path.join(distDir, distFile));
    }

    // load our main app as the default landing point (paths have leading '/'
    // stripped, so '/' -> '')
    const aliases = {};
    aliases[''] = 'testremotepreview.html';


    // move directory to where we want to serve fs files...

    process.chdir('../../zoodb-example');



    // createServer returns a net.Server
    const server = createServer({ cors: false });


    // Listen to the request event
    const listeners = getEventListeners(server, 'request');
    server.removeAllListeners('request');
    server.on('request', (request, res) => {
        // console.log('REQUEST!', {request, res});
        if (request.method !== 'GET') {
            for (const defaultHandler of listeners) {
                defaultHandler(request,res);
            }
            return;
        }
        const url = new URL(request.url, 'http://localhost/');
        let distFileName = url.pathname;
        if (distFileName && distFileName.slice(0,1) == '/') {
            distFileName = distFileName.slice(1); // strip away leading slash
        }
        while (aliases[distFileName]) {
            distFileName = aliases[distFileName];
        }
        const distFileResult = distFileContents[distFileName];
        if (distFileResult == null) {
            res.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
            res.end(`File not found: ‘${url.pathname}’ (resolved to ‘${distFileName}’)`);
            return;
        }
        const mimeType = mime.lookup(distFileName) || 'application/octet-stream';
        console.log(`Serving ‘${url.pathname}’ with mime type ‘${mimeType}’`);
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(distFileResult);
        return;
    });


    const port = 3010;

    server.listen(port, () => {
        console.log(`Server listening at:  http://localhost:${port}/`);
    });

    return server;
}


runServer();
