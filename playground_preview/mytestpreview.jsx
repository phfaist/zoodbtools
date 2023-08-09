import debug_mod from 'debug';
const debug = debug_mod('zoodb-mytestpreview');

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ZooDbPreviewComponent } from '../zoodbpreview/index.js';

import eczooData from './eczoodata.json';

import * as zooflm from '@phfaist/zoodb/zooflm';
import { getfield, iter_object_fields_recursive, sqzhtml } from '@phfaist/zoodb/util';

import * as BrowserFS from 'browserfs';

import { use_relations_populator } from '@phfaist/zoodb/std/use_relations_populator';
import { use_flm_environment } from '@phfaist/zoodb/std/use_flm_environment';
import { use_flm_processor } from '@phfaist/zoodb/std/use_flm_processor';

import { StandardZooDb } from '@phfaist/zoodb/std';


let eczooRefsData = eczooData.refs_data;

// for debugging
window.eczooData = eczooData;
window.eczooRefsData = eczooRefsData;



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
                rendered = `<span class="error">(Render error: ${err})</span>`;
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
    });
}



// -----------------------------------------------------------------------------


window.addEventListener('load', async () => {

    debug('window load');

    const container = window.document.getElementById('AppContainer');

    // create our ZooDb instance for our previews
    
    //BrowserFS.install(window);

    const fs = await new Promise( (accept, reject) => {
        BrowserFS.configure({
            fs: "LocalStorage"
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
    debug(`Got fs object`, { fs });

    let zoodbOpts = {

        use_relations_populator,
        use_flm_environment,
        use_flm_processor,

        fs, // BrowserFS filesystem object - fs 

        // // allow unresolved refs because e.g. a code description might contain a
        // // reference to an equation/figure somewhere else on the code page
        // // itself (and hence not listed in the global refs database)
        // flm_options: {
        //     allow_unresolved_references: true,
        // },

        use_searchable_text_processor: false,

        // flm_processor_graphics_resources_fs_data_dir: data_dir,    
        // flm_processor_citations_override_arxiv_dois_file:
        //     path.join(data_dir, 'code_extra', 'override_arxiv_dois.yml'),
        // flm_processor_citations_preset_bibliography_files: [
        //     path.join(data_dir, 'code_extra', 'bib_preset.yml'),
        // ],

        continue_with_errors: true,

        flm_options: {
            skip_check_update_existing_citations: true,
            skip_check_update_existing_resources: true,
        },

        zoo_permalinks: {
            object: (object_type, object_id) => `javascript:alert("object link!")`,
            graphics_resource:
                (graphics_resource) => `javascript:alert("graphics resource!")`,
        },
    };

    let zoodb = new StandardZooDb(zoodbOpts);

    //
    // load refs & citations
    //
    zoodb.zoo_flm_environment.ref_resolver.load_database(
        eczooRefsData.refs
    );
    zoodb.zoo_flm_environment.citations_provider.load_database(
        eczooRefsData.citations
    );
    zoodb.zoo_flm_environment.graphics_collection.load_database(
        eczooRefsData.graphics_collection
    );
    zoodb.zoo_flm_environment.graphics_collection.src_url_resolver_fn =
        ({graphics_resource, /*render_context,*/ source_path}) => {
            return {
                src_url: `https://raw.githubusercontent.com/errorcorrectionzoo/eczoo_data/main/${graphics_resource?.source_info?.resolved_source}`
            };
        };

    //
    // load zoo data
    //
    await zoodb.load_data(eczooData.db);

    
    // add a "fallback" ref resolver for invalid refs.
    zoodb.zoo_flm_environment.feature_refs.add_external_ref_resolver(
        {
            get_ref(ref_type, ref_label, resource_info, render_context) {
                debug(`Default ref_resolver called for invalid reference `
                      + `‘${ref_type}:${ref_label}’`);
                return zooflm.RefInstance(
                    // ref_type, ref_label, formatted_ref_flm_text, target_href
                    ref_type, ref_label,
                    '<??>', null
                );
            }
        }
    );

    // for in-browser debugging
    window.zoodb = zoodb;

    //
    // Render the app
    //
    const react_root = createRoot(container);
    react_root.render(
        <ZooDbPreviewComponent
            zoodb={zoodb}
            objectType={'code'}
            objectId={'css'}
            renderObject={renderObject}
            getMathJax={() => window.MathJax}
        />
    );

});
