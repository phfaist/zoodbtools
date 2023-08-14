import { CitationSourceBase } from '@phfaist/zoodb/citationmanager/source/base';


export class CitationSourceApiPlaceholder extends CitationSourceBase
{
    constructor(options)
    {
        options ||= {};

        const override_options = {
            source_name: `${options.placeholder_name} (placeholder)`,
            chunk_size: Infinity,
            chunk_retrieve_delay_ms: 0,

            cache_store_options: {
                    cache_duration_ms: 0,
            },
        };
        const default_options = {
            cite_prefix: options.cite_prefix,

            search_in_compiled_cache: {}
        };

        super(
            override_options,
            options,
            default_options,
        );

        this.search_in_compiled_cache = this.options.search_in_compiled_cache ?? {};
    }

    async run_retrieve_chunk(id_list)
    {
        for (let cite_key of id_list) {
            cite_key = cite_key.trim();
            const cite_key_encoded = encodeURIComponent(cite_key);
            
            const cached_info =
                  this.search_in_compiled_cache[`${this.cite_prefix}:${cite_key}`];
            if (cached_info != null) {
                const cached_compiled_flm_text = cached_info.value?.citation_text;
                if (cached_compiled_flm_text) {
                    this.citation_manager.store_citation(
                        this.cite_prefix, cite_key,
                        { _ready_formatted: { flm: cached_compiled_flm_text } },
                        this.cache_store_options
                    );
                    continue;
                }
            }

            let flm_text = null;
            if (typeof this.options.title === 'function') {
                flm_text = this.options.title(cite_key);
            } else {
                flm_text = `${this.options.title} \\verbcode{${cite_key}}`;
            }

            let test_url = this.options.test_url(this.cite_prefix, cite_key);
            if (test_url) {
                flm_text += ` — \\href{${test_url}}{TEST→}`;
            }

            let csljsondata = {
                _ready_formatted: {
                    flm: flm_text,
                }
            };

            this.citation_manager.store_citation(
                this.cite_prefix, cite_key, csljsondata, this.cache_store_options
            );
        }
    }
    
}
