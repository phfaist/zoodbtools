import debug_mod from 'debug';
const debug = debug_mod('mytest');

import { createRoot } from 'react-dom/client';

import { ZooDbEditObjectComponent, ZooDbEditObjectWithPreviewComponent,
         DocumentObjectUpdaterModel } from '../src/index.js';

import data from './dataecz.json';
import llmrefs_data from './eczllmrefs.json';

import { ZooLLMEnvironment } from '@phfaist/zoodb/zoollm';
//import { make_zoo_llm_environment } from 'eczoo-js/eczoojs.js';
import { render_code_page } from 'eczoo-js/rendercodepage.js';



window.addEventListener('load', () => {

    debug('window load');

    const container = window.document.getElementById('AppContainer');
    const code_schema = data.db.schemas.code;
    const code_data = data.db.objects.code.css;

    debug('ZooDbEditObjectComponent = ', ZooDbEditObjectComponent);

    const document_object_updater_model = new DocumentObjectUpdaterModel();

    const zoo_llm_environment = new ZooLLMEnvironment({
        citations_provider: {
            get_citation_full_text_llm(cite_prefix, cite_key, resource_info) {
                return `\\begin{verbatimtext}${cite_prefix}:${cite_key}\\end{verbatimtext}`;
            }
        },
    });

    // fix ref resolvers ->
    zoo_llm_environment.ref_resolver.load_ref_instance_database(llmrefs_data);
    
    // add a "fallback" ref resolver for invalid refs.
    zoo_llm_environment.feature_refs.add_external_ref_resolver(
        {
            get_ref(ref_type, ref_label, resource_info, render_context) {
                debug(`Default ref_resolver called for invalid reference `
                      + `‘${ref_type}:${ref_label}’`);
                return RefInstance(
                    // ref_type, ref_label, formatted_ref_llm_text, target_href
                    ref_type, ref_label,
                    '<??>', null
                );
            }
        }
    );

    debug(`Initialized LLM environment; external_ref_resolvers = `,
          zoo_llm_environment.feature_refs.external_ref_resolvers);
    debug(`Initialized LLM environment; ref_resolver = `,
          zoo_llm_environment.ref_resolver);

    const render_code_fn = (code_object, code_data, code_schema) => {
        debug('resolving ref to user:VictorVAlbert -> ',
              zoo_llm_environment.ref_resolver.get_ref('user', 'VictorVAlbert')
             );

        debug(`The feature object's external ref resolvers are`,
              zoo_llm_environment.feature_refs.external_ref_resolvers);

        return render_code_page(code_object, {zoo_llm_environment, doc_metadata:{}});
    };


    //
    // Render the app
    //
    const react_root = createRoot(container);
    react_root.render(
        <ZooDbEditObjectWithPreviewComponent
            object_type={'code'}
            object_title={code_data.name}
            object_schema={code_schema}
            object_data={code_data}
            render_object={render_code_fn}
            document_object_updater_model={document_object_updater_model}
            zoo_llm_environment={zoo_llm_environment}
        />
    );

});
