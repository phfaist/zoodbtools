import debug_mod from 'debug';
const debug = debug_mod('zoodb-testremotepreview');

import path from 'path';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { CitationSourceApiPlaceholder } from 'zoodbtools_preview/citationapiplaceholder.js';
import { ZooDbPreviewComponent } from 'zoodbtools_preview/index.js';

import { fsRemoteCreateClient } from 'zoodbtools_previewremote/useFsRemote.js';
import {
    installFlmContentStyles, simpleRenderObjectWithFlm
} from 'zoodbtools_preview/renderFlm.js';

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
                            title: "DOI citation",
                            cite_prefix: 'doi',
                            test_url: (_, cite_key) => `https://doi.org/${cite_key}`,
                        }),
                        arxiv: new CitationSourceApiPlaceholder({
                            title: "arXiv [& DOI?] citation",
                            cite_prefix: 'arxiv',
                            test_url: (_, cite_key) => `https://arxiv.org/abs/${cite_key}`,
                        }),
                    },
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
                object: (object_type, object_id) => (
                    `javascript:window.appFlmCallbackObjectLink(`
                        + `${JSON.stringify(object_type)},${JSON.stringify(object_id)}`
                    + `)`
                ),
                graphics_resource: (graphics_resource) => {
                    const imageData = fs.readFileSync(
                        path.join(config.fs_data_dir,
                                  graphics_resource.source_info.resolved_source)
                    );
                    const blob = new Blob([ imageData ]);
                    console.error(`TODO: make sure we release the object URL resource created by URL.createObjectURL!!!`);
                    return URL.createObjectURL(blob);
                },
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











// -----------------------------------------------------------------------------


window.addEventListener('load', async () => {

    debug('window load');

    installFlmContentStyles();

    const container = window.document.getElementById('AppContainer');

    // create our ZooDb instance for our previews

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

    //
    // Render the app
    //
    const reactRoot = createRoot(container);
    reactRoot.render(
        <ZooDbPreviewComponent
            zoodb={zoodb}
            renderObject={simpleRenderObjectWithFlm}
            getMathJax={() => window.MathJax}
            objectType={'person'}
            objectId={'bob'}
            installFlmObjectLinkCallback={[window,'appFlmCallbackObjectLink']}
        />
    );
            // objectType={'code'}
            // objectId={'css'}

});
