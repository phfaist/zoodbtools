import debugm from 'debug';
const debug = debugm('zoodbpreviewremote.startRemotePreviewApp');

import fs from 'fs';
import path from 'path';
import nodeUtil from 'node:util';
import nodeChildProcess from 'node:child_process';
import { glob } from 'glob';
import { getEventListeners } from 'node:events';
import fsRemoteCreateServer from "fs-remote/createServer.js";
import mime from 'mime-types';
import userOpen from 'open';


const execFilePromise = nodeUtil.promisify(nodeChildProcess.execFile);

const _default_options = {
    //
    // Settings for compiling the preview app
    //

    appFilesDir: 'dist/',
    appFileMain: 'preview.html',
    runParcel: false,
    parcelFixIncludeUseStrict: true,
    //parcelCommandLineOptions: ['--no-cache', '--no-optimize', '--no-scope-hoist'],
    parcelCommandLineOptions: ['--no-cache',],

    //
    // Settings for the server
    //

    // The folder to serve files from once we've compiled & loaded
    // the app.  This shouldn't really be relevant because really
    // the client should be using absolute paths.
    serveFilesDir: null,
    // Port to use for the server
    servePort: 8087,

    // Once the server started
    startUserBrowser: true,

};



export class PreviewAppServer
{
    constructor(options)
    {
        this.options = Object.assign(
            {},
            _default_options,
            options ?? {}
        );

        this.distFileContents = Object.assign({}, this.options.serveFiles);
        this.distAliases = {};
    }

    async compileAppAndRunServer()
    {
        await this.compileApp();
        await this.loadAppToMemory();
        await this.startServer();
    }

    async compileApp()
    {
        const {
            runParcel, parcelCommandLineOptions, appFileMain, appFilesDir,
        } = this.options;
        if (runParcel) {
            console.log('Compiling application with ParcelJS ...');
            const args = ["build", ...parcelCommandLineOptions, appFileMain]
            debug(`parcel ${JSON.stringify(args)}`)
            let parcelResult = await execFilePromise( "parcel", args );
            if (parcelResult.stdout) {
                debug('ParcelJS output:\n' + parcelResult.stdout);
            }
            if (parcelResult.stderr) {
                console.error(parcelResult.stderr);
            }
            console.log('Compiling application done.');
        }
    }

    async loadAppToMemory()
    {
        // load all dist/** files

        const distDir = this.options.appFilesDir;
        const distFiles = await glob('**/*', { cwd: distDir } );

        for (const distFile of distFiles) {
            let fileContents =
                await fs.promises.readFile(path.join(distDir, distFile));

            if (this.options.parcelFixIncludeUseStrict && distFile.endsWith(".js")) {
                fileContents = fileContents.toString('utf8');
                if ( ! /^(\s|\n)*['"]use strict['"];?/.test(fileContents) ) {
                    fileContents = "\"use strict\";\n" + fileContents;
                }
                // debug(`Added "use strict" to ${distFile}, file contents is now →`,
                //       fileContents.length < 100
                //       ? fileContents
                //       : fileContents.slice(0, 100) + '…');
            }

            this.distFileContents[distFile] = fileContents;
        }

        // load our main app as the default landing point (paths have leading '/'
        // stripped, so '/' -> '')
        this.distAliases[''] = this.options.appFileMain;
    }


    async startServer()
    {
        if (this.options.serveFilesDir != null) {
            process.chdir(this.options.serveFilesDir);
        }

        // createServer returns a net.Server
        const server = fsRemoteCreateServer({ cors: false });

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

            // intercept GET requests so we can serve the app files (HTML, JS,
            // CSS) that we have preciously kept in memory

            const url = new URL(request.url, 'remote://');
            let distFileName = url.pathname;
            if (distFileName && distFileName.slice(0,1) == '/') {
                distFileName = distFileName.slice(1); // strip away leading slash
            }
            while (this.distAliases[distFileName] != null) {
                distFileName = this.distAliases[distFileName];
            }

            let contents = this.distFileContents[distFileName];
            
            if (contents == null) {
                res.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
                res.end(`File not found: ‘${url.pathname}’ (resolved to ‘${distFileName}’)`);
                debug(`[!] 404 ‘${url.pathname}’`);
                return;
            }

            if (typeof contents === 'object' && !(contents instanceof Buffer)) {
                // it's a JSON object that we should stringify first
                contents = JSON.stringify(contents);
            }

            const mimeType = mime.lookup(distFileName) || 'application/octet-stream';
            console.log(`Serving ‘${url.pathname}’ with mime type ‘${mimeType}’`);
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(contents);
            return;
        });

        const port = this.options.servePort;
        const appUrl = `http://localhost:${port}/`;

        server.listen(port, () => {
            console.log(`

********************************************************************************

Server started at:  ${appUrl}

********************************************************************************

`);
            if (this.options.startUserBrowser) {
                userOpen(appUrl);
            }

        });

        return server;
        
    }
    

}

