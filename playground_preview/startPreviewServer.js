const fs = require('fs');
const path = require('path');

async function go()
{
    const { PreviewAppServer } =
          await import('zoodbtools_previewremote/startRemotePreviewApp.js');
    
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
    };

    // completely clean the dist/ dir to avoid files accumulating there
    await fs.promises.rm("dist/", { force: true, recursive: true });
    
    const appServer = new PreviewAppServer(settings);

    await appServer.compileAppAndRunServer();
}

go();
