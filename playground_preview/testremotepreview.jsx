import debug_mod from 'debug';
const debug = debug_mod('zoodb-testremotepreview');

import path from 'path';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ZooDbPreviewComponent } from '../zoodbpreview/index.js';

import fsRemoteCreateClient from 'fs-remote/createClient';

import * as zooflm from '@phfaist/zoodb/zooflm';
import { getfield, iter_object_fields_recursive, sqzhtml } from '@phfaist/zoodb/util';

// import * as BrowserFS from 'browserfs';

import { use_relations_populator } from '@phfaist/zoodb/std/use_relations_populator';
import { use_flm_environment } from '@phfaist/zoodb/std/use_flm_environment';
import { use_flm_processor } from '@phfaist/zoodb/std/use_flm_processor';

import { StandardZooDb } from '@phfaist/zoodb/std';
import { StandardZooDbYamlDataLoader } from '@phfaist/zoodb/std/load_yamldb';

import loMerge from 'lodash/merge.js';




// -----------------------------------------------------------------------------



const root_data_dir = '/Users/philippe/Research/projects/zoodb/zoodb-example'



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
                        // deactive arxiv & doi, since their public APIs seem to
                        // have strict CORS settings meaning we can't call them
                        // from other web apps
                        doi: false,
                        arxiv: false,
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



export function installFlmContentStyles()
{
    const styinfo = zooflm.html_fragmentrenderer_get_style_information(
        new zooflm.ZooHtmlFragmentRenderer()
    );
    const styElement = document.createElement('style');
    styElement.setAttribute('type', 'text/css');
    styElement.innerText = styinfo.css_content;
    document.head.appendChild(styElement);
}





// -----------------------------------------------------------------------------



function renderObject(zoodb, object_type, object_id, object)
{
    const zoo_flm_environment = zoodb.zoo_flm_environment;

    const schema = zoodb.schemas[object_type];

    debug(`renderObject(): ${object_type} ${object_id}`);

    const render_doc_fn = (render_context) => {
        const R = zooflm.make_render_shorthands({render_context});
        const { ne, rdr, ref } = R;

        let html = `<div class="object_render">`;

        html += sqzhtml`
<h1>Object: ${object_type} <code>${object_id}</code></h1>
`;

        for (const {fieldname, fieldvalue, fieldschema}
             of iter_object_fields_recursive(object, schema)) {
            if (fieldvalue == null) {
                continue;
            }
            let rendered = null;
            try {
                rendered = rdr(fieldvalue);
            } catch (err) {
                let errstr = null;
                if (!err) { errstr = '??'; }
                else if (typeof err === 'object' && '__class__' in err && 'msg' in err) {
                    errstr = err.msg; //zooflm.repr(err);
                } 
                else if (typeof err === 'object' && 'toString' in err) {
                    errstr = ''+err;
                }
                else {
                    errstr = '???';
                }
                rendered = `<span class="error">(Render error: ${errstr})</span>`;
            }
            html += sqzhtml`
<h2 class="fieldname">${fieldname}</h2>
<div class="fieldcontent">
${ rendered }
</div>
`;
        }

        html += `

<RENDER_ENDNOTES/>

`;
        html += `</div>`;
        return html;
    };

    return zooflm.make_and_render_document({
        zoo_flm_environment,
        render_doc_fn,
        //doc_metadata,
        render_endnotes: true,
        flm_error_policy: 'continue',
    });
}



// -----------------------------------------------------------------------------


const promisify = (fn) => {
    return function() {
        var args = arguments;
        return new Promise( (resolve, reject) => {
            fn(...args,
               (err, ...results) => {
                   if (err != null) {
                       reject(err)
                   } else {
                       resolve(...results);
                   }
               });
        } );
    };
};


window.addEventListener('load', async () => {

    debug('window load');

    installFlmContentStyles();

    const container = window.document.getElementById('AppContainer');

    // create our ZooDb instance for our previews
    
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

    const fs = fsRemoteCreateClient("http://localhost:3010");
    
    fs.promises = {};
    for (const method of ['access','appendFile','chmod','chown','close', 'copyFile','exists','fchmod','fchown','fdatasync','fstat','fsync','ftruncate','futimes','lchmod','lchown','link','lstat','mkdir','mkdtemp','open','read','readFile','readdir','readlink','realpath','rename','rmdir','stat','symlink','truncate','unlink','utimes','write','writeFile',]) {
        fs.promises[method] = promisify(fs[method]);
    }


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
    const react_root = createRoot(container);
    react_root.render(
        <ZooDbPreviewComponent
            zoodb={zoodb}
            renderObject={renderObject}
            getMathJax={() => window.MathJax}
            objectType={'person'}
            objectId={'bob'}
            installFlmObjectLinkCallback={[window,'appFlmCallbackObjectLink']}
        />
    );
            // objectType={'code'}
            // objectId={'css'}

});
