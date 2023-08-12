import {CitationSourceBase as $9Gy6l$CitationSourceBase} from "@phfaist/zoodb/citationmanager/source/base";


class $101c10e2432771ff$export$143e0941d05399df extends (0, $9Gy6l$CitationSourceBase) {
    constructor(options){
        options ||= {};
        const override_options = {
            source_name: `${options.title} (placeholder)`,
            chunk_size: Infinity,
            chunk_retrieve_delay_ms: 0,
            cache_store_options: {
                cache_duration_ms: 0
            }
        };
        const default_options = {
            cite_prefix: options.cite_prefix
        };
        super(override_options, options, default_options);
    }
    async run_retrieve_chunk(id_list) {
        for (let cite_key of id_list){
            cite_key = cite_key.trim();
            const cite_key_encoded = encodeURIComponent(cite_key);
            let flm_text = `${this.options.title} \\verbcode{${cite_key}}`;
            let test_url = this.options.test_url(this.cite_prefix, cite_key);
            if (test_url) flm_text += ` — \\href{${test_url}}{TEST→}`;
            // clean up the data a bit, we don't need the full list of references (!)
            let csljsondata = {
                _ready_formatted: {
                    flm: flm_text
                }
            };
            this.citation_manager.store_citation(this.cite_prefix, cite_key, csljsondata, this.cache_store_options);
        }
    }
}


export {$101c10e2432771ff$export$143e0941d05399df as CitationSourceApiPlaceholder};
//# sourceMappingURL=citationapiplaceholder.js.map
