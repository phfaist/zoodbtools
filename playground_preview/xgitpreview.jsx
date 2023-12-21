import debug_mod from 'debug';
const debug = debug_mod('zoodb-xgitpreview');

import path from 'path';
//import nodeUtil from 'util';
import pify from 'pify';

import stream from 'stream';

import React, { useRef } from 'react';
import { createRoot } from 'react-dom/client';

import {
    CitationSourceApiPlaceholder
} from 'zoodbtools_preview/citationapiplaceholder';
import {
    ZooDbPreviewComponent
} from 'zoodbtools_preview';

import {
    installFlmContentStyles, simpleRenderObjectWithFlm,
    installZooFlmEnvironmentLinksAndGraphicsHandlers,
} from 'zoodbtools_preview';


import git from 'isomorphic-git';
import gitHttp from 'isomorphic-git/http/web/index.js';

import * as BrowserFS from 'browserfs';
//import LightningFS from '@isomorphic-git/lightning-fs';


import loMerge from 'lodash/merge.js';


import { ZooDb, ZooDbDataLoaderHandler } from '@phfaist/zoodb';
import * as zooflm from '@phfaist/zoodb/zooflm';
//import { getfield, iter_object_fields_recursive, sqzhtml } from '@phfaist/zoodb/util';

import { use_relations_populator } from '@phfaist/zoodb/std/use_relations_populator';
//import { use_gitlastmodified_processor } from '@phfaist/zoodb/std/use_gitlastmodified_processor';
import { use_flm_environment } from '@phfaist/zoodb/std/use_flm_environment';
import { use_flm_processor } from '@phfaist/zoodb/std/use_flm_processor';
//import { use_searchable_text_processor } from '@phfaist/zoodb/std/use_searchable_text_processor';

import { makeStandardZooDb } from '@phfaist/zoodb/std/stdzoodb';
import { makeStandardYamlDbDataLoader } from '@phfaist/zoodb/std/stdyamldbdataloader';




// ----------------------------------------------------------------------------

async function fsExists(filePath, fs)
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
async function deleteFolderRecursive(directoryPath, fs)
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

function createSimpleBufferReadStream(buffer)
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


// -----------------------------------------------------------------------------



export class MyZooDb extends ZooDb
{
    constructor(config)
    {
        super(config);
    }

    //
    // simple example of ZooDb validation -- check that spouses always report
    // the other spouse as their spouse
    //
    async validate()
    {
        for (const [person_id, person] of Object.entries(this.objects.person)) {
            if (person.relations != null && person.relations.spouse != null) {
                // remember, person.relations.spouse is the ID of the spouse
                // person, not the person object itself
                const other_person = this.objects.person[person.relations.spouse];
                if (other_person?.relations?.spouse !== person_id) {
                    throw new Error(
                        `Person ‘${person_id}’ lists ‘${person.relations.spouse}’ as their `
                        + `spouse but not the other way around`
                    );
                }
            }
        }
    }

}


export async function createMyZooDb(config)
{
    let searchableCompiledCache = {};
    // try {
    //     searchableCompiledCache = JSON.parse(fs.readFileSync(
    //         path.join(config.fs_data_dir, '..', 'website', '_zoodb_citations_cache',
    //                   'cache_compiled_citations.json')
    //     ));
    //     console.log(`Loaded citation cache`, searchableCompiledCache);
    // } catch (err) {
    //     console.warn(`Couldn't load cache, will proceed without`, err);
    // }

    const fs = config.fs;
    const fsPromises = config.fs.promises ?? config.fs;

    config = loMerge(
        {
            ZooDbClass: MyZooDb,

            // these need to be provided through the config options
            // fs,
            // fs_data_dir,

            use_relations_populator,
            use_flm_environment,
            use_flm_processor,
            use_gitlastmodified_processor: false,
            use_searchable_text_processor: false,

            continue_with_errors: true,

            flm_options: {

                refs:  {
                    person: {
                        formatted_ref_flm_text_fn: (person_id, person) => person.name,
                    },
                },

                citations: {
                    csl_style: config.csl_style,
                    override_arxiv_dois_file:
                        'citations_info/override_arxiv_dois.yml',
                    preset_bibliography_files: [
                        'citations_info/bib_preset.yml',
                    ],
                    default_user_agent: null,

                    sources: {
                        // latch custom placeholder onto arxiv & doi, since
                        // their public APIs seem to have strict CORS settings
                        // meaning we can't call them from other web apps
                        doi: new CitationSourceApiPlaceholder({
                            placeholder_name: 'DOI citation',
                            title: (doi) => `[DOI \\verbcode{${doi}}; citation text will appear on production zoo website]`,
                            cite_prefix: 'doi',
                            test_url: (_, cite_key) => `https://doi.org/${cite_key}`,
                            search_in_compiled_cache: searchableCompiledCache,
                        }),
                        arxiv: new CitationSourceApiPlaceholder({
                            placeholder_name: 'arXiv citation',
                            title: (arxivid) => `[arXiv:${arxivid}; citation text will appear on production zoo website (& via DOI if published)]`,
                            cite_prefix: 'arxiv',
                            test_url: (_, cite_key) => `https://arxiv.org/abs/${cite_key}`,
                            search_in_compiled_cache: searchableCompiledCache,
                        }),
                    },

                    cache_dir: '_zoodb_live_preview_dummy_cache_shouldnt_be_created',
                    cache_dir_create: false,

                    skip_save_cache: true,
                },
                
                allow_unresolved_references: true,
                allow_unresolved_citations: true,

                resources: {
                    // "null" means to use defaults
                    rename_figure_template: null,
                    figure_filename_extensions: null,
                    graphics_resources_fs_data_dir: null,
                    
                    // enable srcset= attributes on <img> tags.  This requires
                    // postprocessing the site files with ParcelJS, as we indeed
                    // do in this example setup.
                    graphics_use_srcset_parceljs: false
                },
            },

            zoo_permalinks: {
                object: (objectType, objectId) => (
                    `invalid:zooObjectLink/${objectType}/${objectId}`
                ),
                graphics_resource: (graphics_resource) => (
                    `invalid:graphicsResource/${graphics_resource.src_url}`
                ),
            },

        },
        config
    );

    return await makeStandardZooDb(config);
}



// -----------------------------------------------------------------------------



export async function createMyYamlDbDataLoader(zoodb, { schema_root })
{
    let config = {
        //
        // specify objects & where to find them
        //
        objects: {
            person: {
                schema_name: 'person',
                data_src_path: 'people/',
            },
        },
        
        //
        // specify where to find schemas
        //
        schemas: {
            schema_root: schema_root,
            schema_rel_path: 'schemas/',
            schema_add_extension: '.yml',
        },

    }

    return await makeStandardYamlDbDataLoader(zoodb, config);
}




// -----------------------------------------------------------------------------


window.addEventListener('load', async () => {

    debug('window load');

    installFlmContentStyles();

    const container = window.document.getElementById('AppContainer');

    // // test usage of Buffer
    // const buf = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);
    // debug(`Created a test Buffer! Its length is`, buf.length);

    //
    // Set up our persistent in-browser FS
    //

    BrowserFS.install(window);
    const fs = await new Promise( (accept, reject) => {
        BrowserFS.configure({
            fs: "IndexedDB", //"LocalStorage",
            options: {}
        }, function(e) {
            if (e) {
                // An error happened!
                reject(e);
            }
            // Otherwise, BrowserFS is ready-to-use!
            const fs = BrowserFS.BFSRequire('fs');
            accept(fs);
        });
    } );
    debug(`Got fs object from BrowserFS`, { fs });
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

    // const fs = new LightningFS("my-git-lightning-fs");

    window.fs = fs;


    const exampleRootDir = '/work-dir/zoodb-example';
    const schemaRootUrl = `file://${exampleRootDir}/`;
    
    
    // Clear up any existing work dir folder
    await deleteFolderRecursive(exampleRootDir, fs);

    debug(`About to git clone...`);

    await git.clone({
        fs,
        http: gitHttp,
        dir: exampleRootDir,
        corsProxy: 'https://cors.isomorphic-git.org',
        url: 'https://github.com/phfaist/zoodb-example.git',
        ref: 'main',
        singleBranch: true,
        depth: 1, // NOT 0 !!!
        });
    
    debug(`Cloned repository.  Folder ${exampleRootDir} now -> `,
            await fs.promises.readdir(`${exampleRootDir}`));

    
    const loadZooDb = async () => {
        //
        // create our ZooDb instance for our previews
        //

        debug(`Initiating zoo load...`);

        let zoodbOpts = {

            fs, // filesystem object -  here, from BrowserFS

            fs_data_dir: path.join(exampleRootDir, 'data'),

            csl_style: await fs.promises.readFile(
                path.join(exampleRootDir, 'peopledbjs', 'american-physical-society-et-al--patched.csl'),
                { encoding: 'utf-8', },
            )

        };

        const zoodb = await createMyZooDb(zoodbOpts);
        const loader = await createMyYamlDbDataLoader(zoodb, { schema_root: schemaRootUrl });
    
        const loader_handler = new ZooDbDataLoaderHandler(
            loader,
            {
                throw_reload_errors: true, // for when in devel mode with eleventy
            }
        );
        await zoodb.install_zoo_loader_handler(loader_handler);
    
        await zoodb.load();

        installZooFlmEnvironmentLinksAndGraphicsHandlers(
            zoodb.zoo_flm_environment,
            {
                getGraphicsFileContents: (fname, { graphics_resource, }) => {
                    return graphics_resource.source_info.file_content;
                }
            }
        );

        // for in-browser debugging
        window.zoodb = zoodb;

        return zoodb;
    };

    const reloadZooDb = async (zoodb) => {

        await zoodb.load();

        // test internal error during reload
        //throw new Error(`Failed to reload zoo! test error handling!`);

        return zoodb;
    };

    const renderObject = async ({zoodb, objectType, objectId, object,
                                 registerRenderPreviewCleanupCallback }) => {
        let { htmlContent } = await simpleRenderObjectWithFlm({
            zoodb, objectType, objectId, object,
            registerRenderPreviewCleanupCallback
        });
        return { htmlContent };
    };

    //
    // Render the app
    //
    const reactRoot = createRoot(container);
    reactRoot.render(
        <ZooDbPreviewComponent
            loadZooDb={loadZooDb}
            reloadZooDb={reloadZooDb}
            renderObject={renderObject}
            getMathJax={() => window.MathJax}
            initialObjectType={'person'}
            initialObjectId={'bob'}
            commandButtonsUseReload={true}
            commandButtonsToggleDarkModeCallback={
                () => { document.documentElement.classList.toggle('dark'); }
            }
        />
    );
            // installFlmObjectLinkCallback={[window,'appFlmCallbackObjectLink']}
            // CommandButtonsComponent={ReloadCommandButtonsComponent}

            // objectType={'code'}
            // objectId={'css'}

});
