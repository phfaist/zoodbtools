import debug_mod from 'debug';
const debug = debug_mod('zoodb-testremotepreview');

import path from 'path';

import React, { useRef } from 'react';
import { createRoot } from 'react-dom/client';

import { CitationSourceApiPlaceholder } from 'zoodbtools_preview';
import { ZooDbPreviewComponent } from 'zoodbtools_preview';

import { fsRemoteCreateClient } from 'zoodbtools_previewremote/useFsRemote.js';
import {
    installFlmContentStyles, simpleRenderObjectWithFlm,
    installZooFlmEnvironmentLinksAndGraphicsHandlers,
} from 'zoodbtools_preview';

//import * as zooflm from '@phfaist/zoodb/zooflm';
//import { getfield, iter_object_fields_recursive, sqzhtml } from '@phfaist/zoodb/util';

// import * as BrowserFS from 'browserfs';

import { use_relations_populator } from '@phfaist/zoodb/std/use_relations_populator';
import { use_flm_environment } from '@phfaist/zoodb/std/use_flm_environment';
import { use_flm_processor } from '@phfaist/zoodb/std/use_flm_processor';

import { StandardZooDb } from '@phfaist/zoodb/std';
import { StandardZooDbYamlDataLoader } from '@phfaist/zoodb/std/load_yamldb';

import loMerge from 'lodash/merge.js';




// -----------------------------------------------------------------------------



const root_data_dir = '/Users/philippe/Research/projects/zoodb/zoodb-example'




// ...............................................




export class MyZooDb extends StandardZooDb
{
    constructor(config)
    {
        config ??= {};
        const fs = config.fs;
        const fsPromises = config.fs.promises ?? config.fs;

        let searchableCompiledCache = {};
        try {
            searchableCompiledCache = JSON.parse(fs.readFileSync(
                path.join(config.fs_data_dir, '..', 'website', '_zoodb_citations_cache',
                          'cache_compiled_citations.json')
            ));
            console.log(`Loaded citation cache`, searchableCompiledCache);
        } catch (err) {
            console.warn(`Couldn't load cache, will proceed without`, err);
        }

        super(loMerge({

            // fs,
            // fs_data_dir: path.join(example_root_dir, 'data'),

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
                            title: (doi) => `[DOI \\verbcode{${doi}}; citation text will appear on production zoo website]`,
                            cite_prefix: 'doi',
                            test_url: (_, cite_key) => `https://doi.org/${cite_key}`,
                            search_in_compiled_cache: searchableCompiledCache,
                        }),
                        arxiv: new CitationSourceApiPlaceholder({
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

        }, config));
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
};



// -----------------------------------------------------------------------------


const schema_root = `file://${root_data_dir}/`;

export class MyZooDbYamlDataLoader extends StandardZooDbYamlDataLoader
{
    constructor()
    {
        super({
            throw_reload_errors: true,

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

        });
        this.schema_root = schema_root;
    }
};





// function ReloadCommandButtonsComponent(props)
// {
//     const { zoodb, doRefreshPreview } = props;

//     const btnDomRef = useRef(null);

//     const doReloadZoo = async () => {
//         btnDomRef.current.disabled = true;
//         try {
//             await zoodb.load()
//             debug(`Finished reloading the zoo.`);
//         } finally {
//             btnDomRef.current.disabled = false;
//             doRefreshPreview();
//         }
//     };

//     return (
//         <div className="CommandButtonsComponent">
//             <button onClick={doReloadZoo} ref={btnDomRef}>RELOAD ZOO</button>
//         </div>
//     );
// };




// -----------------------------------------------------------------------------


window.addEventListener('load', async () => {

    debug('window load');

    installFlmContentStyles();

    const container = window.document.getElementById('AppContainer');

    const loadZooDb = async () => {
        //
        // create our ZooDb instance for our previews
        //

        // get custom data that the preview server might want to communicate to us
        const serverData = await (await fetch("/appData.json")).json();

        debug(`Got serverData = `, serverData);
        
        //BrowserFS.install(window);

        // const fs = await new Promise( (accept, reject) => {
        //     BrowserFS.configure({
        //         fs: "LocalStorage"
        //     }, function(e) {
        //         if (e) {
        //             // An error happened!
        //             reject(e);
        //         }
        //         // Otherwise, BrowserFS is ready-to-use!
        //         const fs = BrowserFS.BFSRequire('fs');
        //         accept(fs);
        //     });
        // } );
        // debug(`Got fs object`, { fs });

        // connect to remote FS

        const fs = fsRemoteCreateClient();


        // // DEBUG fs-remote
        //
        // container.innerText = fs.readdirSync('.') .join('\n');
        // return;
        //
        // fs.readFile(
        //     'peopledbjs/american-physical-society-et-al--patched.csl', { encoding: 'utf-8' },
        //     (err, result) => { container.innerText = result }
        // );
        // let mydata = await fs.promises.readFile( 'peopledbjs/american-physical-society-et-al--patched.csl', { encoding: 'utf-8' });
        // console.log('MYDATA:', mydata);
        // return;


        let zoodbOpts = {

            fs, // filesystem object - fs - here, from fs-remote
            fs_data_dir: `${root_data_dir}/data/`,

            csl_style: await fs.promises.readFile( 'peopledbjs/american-physical-society-et-al--patched.csl', { encoding: 'utf-8', }, )
        };

        const zoodb = new MyZooDb(zoodbOpts);

        zoodb.install_zoo_loader(new MyZooDbYamlDataLoader());

        await zoodb.load();

        installZooFlmEnvironmentLinksAndGraphicsHandlers(
            zoodb.zoo_flm_environment,
            {
                getGraphicsFileContents: (fname) => {
                    return fs.readFileSync(path.join(zoodbOpts.fs_data_dir, fname));
                }
            }
        );

        // // add a "fallback" ref resolver for invalid refs.
        // zoodb.zoo_flm_environment.feature_refs.add_external_ref_resolver(
        //     {
        //         get_ref(ref_type, ref_label, resource_info, render_context) {
        //             debug(`Default ref_resolver called for invalid reference `
        //                   + `‘${ref_type}:${ref_label}’`);
        //             return zooflm.RefInstance(
        //                 // ref_type, ref_label, formatted_ref_flm_text, target_href
        //                 ref_type, ref_label,
        //                 '<??>', null
        //             );
        //         }
        //     }
        // );


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
