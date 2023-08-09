import debug_mod from 'debug';
const debug = debug_mod('mytest');

import { createRoot } from 'react-dom/client';

import { ZooDbEditObjectComponent, ZooDbEditObjectWithPreviewComponent,
         DocumentObjectUpdaterModel } from '../zoodbeditobject/index.js';

import eczoodata from './eczoodata.json';
import eczoorefsdata from './eczoorefsdata.json';

import * as zooflm from '@phfaist/zoodb/zooflm';
import { getfield, sqzhtml } from '@phfaist/zoodb/util';

// -----------------------------------------------------------------------------

export function render_code_page(code, {zoo_flm_environment, doc_metadata})
{
    //debug(`render_code_page(): Rendering code page for ‘${code.code_id}’ ...`);
    
    const render_doc_fn = (render_context) => {

        // debug(`Rendering code information. render_context =`, render_context,
        //       `; zoo_flm_environment =`, zoo_flm_environment);

        const R = zooflm.make_render_shorthands({render_context});
        const { ne, rdr, ref } = R;

        let html = '';

        html += sqzhtml`
<div class="sectioncontent code-name">
  <span class="code-name-cell">
    <h1 class="code-name">
      ${rdr(code.name)}`;
        if (ne(code.introduced)) {
            html += sqzhtml`
      <span class="code-introduced">${rdr(code.introduced)}</span>
`;
        }
        html += sqzhtml`
    </h1>
  </span>
</div>`;

        const kingdom = code.relations?.defines_kingdom?.[0]?.kingdom ?? null;
        if (kingdom != null) {
            html += sqzhtml`
<div class="sectioncontent code-defines-kingdom-name">
    <span class="kingdom-name-label">
      This code defines the
    </span> <!-- space -->${
   ref('kingdom', kingdom.kingdom_id)
}</div>
<div class="kingdom-description">${ rdr(kingdom.description) }</div>`;
        }

        const display_field = (fieldname, title) => {
            const value = getfield(code, fieldname);
            if ( ! ne(value) ) {
                // nothing to display
                //debug(`Field ${fieldname} of ${code.code_id} is empty.`);
                return ``;
            }
            const parts = fieldname.split('.');
            let classlist = [];
            let clname = 'code';
            for (const p of parts) {
                clname += `-${p}`;
                classlist.push(clname);
            }
            const classnames = classlist.join(' '); // eg. "code-feature code-feature-rate"
            return `
<h2 id="${fieldname.replace('.', '_')}" class="${classnames}">${title}</h2>
<div class="sectioncontent ${classnames}">${rdr(value)}</div>`;
        };

        html += display_field('description', 'Description');

        html += display_field('protection', 'Protection');

        html += display_field('features.rate', 'Rate');

        html += display_field('features.magic_scaling_exponent', 'Magic');

        html += display_field('features.encoders', 'Encoding');

        html += display_field('features.transversal_gates', 'Transversal Gates');

        html += display_field('features.general_gates', 'Gates');

        html += display_field('features.decoders', 'Decoding');

        html += display_field('features.fault_tolerance', 'Fault Tolerance');

        html += display_field('features.code_capacity_threshold', 'Code Capacity Threshold');

        html += display_field('features.threshold', 'Threshold');

        html += display_field('realizations', 'Realizations');

        html += display_field('notes', 'Notes');

        // Relationships to other codes

        const display_code_relation = (relation_fieldname, relation_list, [singular, plural]) => {
            if (!relation_list || !relation_list.length) {
                return ``;
            }

            let result = `
<h2 id="relations_${relation_fieldname}" class="code-${relation_fieldname}">
  ${ (relation_list.length > 1) ? plural : singular }
</h2>
<div class="sectioncontent code-${relation_fieldname}">`;
            // if (relation_list.length == 0) {
            //     return `<span class="na">(none)</span>`;
            // }
            result += `
  <ul class="code-relations-list code-${relation_fieldname}-list">`;
            for (const rel of relation_list) {
                result += `
    <li class="paragraph-in-list">
      <span class="code-${relation_fieldname}}-1-code">${
        ref('code', rel.code_id)
      }</span>`;
                if (ne(rel.detail)) {
                    result += `
      <span class="code-${relation_fieldname}-1-detail">${''
        }<!-- whitespace, em dash, no-break space -->${''
        }&#x2014;&nbsp;${rdr(rel.detail)}</span>`;
                }
                result += `
    </li>` .trim();
            }
            result += `
  </ul>
</div>` .trim();
            return result;
        };

        const relations = code.relations ?? {};

        html += display_code_relation('parents', relations.parents ?? [],
                                      ['Parent', 'Parents']);

        html += display_code_relation('parent_of', relations.parent_of ?? [],
                                      ['Child', 'Children']);


        html += display_code_relation(
            'cousins',
            [].concat(relations.cousins ?? [], relations.cousin_of ?? []),
            ['Cousin', 'Cousins']
        );


        html += `

<RENDER_ENDNOTES/>

`;

        // const changelog = code._meta?.changelog;
        // if (changelog != null) {
        //     html += render_meta_changelog(changelog, R);
        // }

        return html;
    };

    return zooflm.make_and_render_document({
        zoo_flm_environment,
        render_doc_fn,
        doc_metadata,
        render_endnotes: {
            annotations: ['sectioncontent'],
        }
    });
};



// -----------------------------------------------------------------------------



window.addEventListener('load', () => {

    debug('window load');

    const container = window.document.getElementById('AppContainer');
    const code_schema = eczoodata.db.schemas.code;
    const code_data = eczoodata.db.objects.code.stab_4_2_2; // .css; // .stabilizer;

    debug('ZooDbEditObjectComponent = ', ZooDbEditObjectComponent);

    const document_object_updater_model = new DocumentObjectUpdaterModel();

    const zoo_flm_environment = new zooflm.ZooFLMEnvironment({
        citations_provider: {
            get_citation_full_text_flm(cite_prefix, cite_key, resource_info) {
                return `\\begin{verbatimtext}${cite_prefix}:${cite_key}\\end{verbatimtext}`;
            }
        },
    });

    // fix ref resolvers ->
    zoo_flm_environment.ref_resolver.load_database(eczoorefsdata.refs);
    
    // add a "fallback" ref resolver for invalid refs.
    zoo_flm_environment.feature_refs.add_external_ref_resolver(
        {
            get_ref(ref_type, ref_label, resource_info, render_context) {
                debug(`Default ref_resolver called for invalid reference `
                      + `‘${ref_type}:${ref_label}’`);
                return RefInstance(
                    // ref_type, ref_label, formatted_ref_flm_text, target_href
                    ref_type, ref_label,
                    '<??>', null
                );
            }
        }
    );

    debug(`Initialized FLM environment; external_ref_resolvers = `,
          zoo_flm_environment.feature_refs.external_ref_resolvers);
    debug(`Initialized FLM environment; ref_resolver = `,
          zoo_flm_environment.ref_resolver);

    const render_code_fn = (code_object, code_data, code_schema) => {
        debug('resolving ref to user:VictorVAlbert -> ',
              zoo_flm_environment.ref_resolver.get_ref('user', 'VictorVAlbert')
             );

        debug(`The feature object's external ref resolvers are`,
              zoo_flm_environment.feature_refs.external_ref_resolvers);

        return render_code_page(code_object, {zoo_flm_environment, doc_metadata:{}});
    };


    //
    // Render the app
    //
    const react_root = createRoot(container);
    react_root.render(
        <ZooDbEditObjectWithPreviewComponent
            object_type={'code'}
            object_schema={code_schema}
            object_data={code_data}
            render_object={render_code_fn}
            document_object_updater_model={document_object_updater_model}
            zoo_flm_environment={zoo_flm_environment}
        />
    );

});
