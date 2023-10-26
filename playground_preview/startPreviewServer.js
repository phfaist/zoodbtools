const fs = require('fs');
const path = require('path');

const debug = require('debug')('zoodbtools_playground_preview.startPreviewServer');


async function go()
{
    const { PreviewAppServer } =
          await import('@phfaist/zoodbtools_previewremote/startRemotePreviewApp.js');
    
    const settings = {
        appFilesDir: "dist/", // where parcel will create the app distribution files
        appFileMain: "testremotepreview.html",
        parcelCommandLineOptions: ['--no-cache', '--no-optimize',],
        runParcel: true,

        serveFilesDir: '../../zoodb-example/',

        serveFiles: {
            'appData.json': {
                'hello': 'world',
            },
        },

        startUserBrowser: (process.env.START_USER_BROWSER !== '0')
    };

    // completely clean the dist/ dir to avoid files accumulating there
    await fs.promises.rm("dist/", { force: true, recursive: true });
    
    debug('Starting our preview app server ...');

    const appServer = new PreviewAppServer(settings);

    await appServer.compileAppAndRunServer();
}

go();
