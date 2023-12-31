import debug_module from 'debug';
const debug = debug_module('zoodbtools_search.searchwidget');

import lunr from 'lunr';
import tippy from 'tippy.js';

// REQUIRE CUSTOM STYLING !!
// import 'tippy.js/dist/tippy.css'; // for styling
// import 'tippy.js/themes/light.css';

import { canonicalPositionPairs } from './_searchutil.js';

import './searchwidget.scss';

const default_context_length = 50; // chars

const max_num_results_for_mathjax = 100;


// const _html_escapes = {
//     '&': '&amp;',
//     '"': '&quot;',
//     "'": '&#39;';
//     '<': '&lt;',
//     '>': '&gt;',
// };
// const _html_esc_rx = /[&"'<>]/g;
//
// function escape_html(str)
// {
//     return str.replace( _html_esc_rx, (matchstr) => _html_escapes[matchstr] );
// }



function escape_html(str)
{
    let p = document.createElement("p");
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}


function default_resolve_href(object_type, object_id, doc) {
    return doc._z_href;
}


/**
 * Manage an HTML widget that can search contents in the zoo, given an index
 * object (see :class:`SearchIndex`).
 *
 * The `search_index` argument is the :class:`SearchIndex` instance.
 *
 * The `options` argument is an object which can contain the following keys:
 *
 * - ``dom_container:`` the DOM container (e.g., returned by
 *   `document.getElementById()`) where to install the search widget.  If a
 *   string is given here and it begins with '#', then it is assumed to specify
 *   the ID of a DOM container which is looked up using
 *   `document.getElementById()`.
 *
 * - ``initial_search_query:`` a search query to initialize the widget with.
 *   Set to null, false, or an empty string to start with a blank widget.
 *
 * - ``auto_fuzz_min_word_length:`` Auto-fuzz will apply a fuzziness tolerance
 *   (edit distance tolerance) to all search terms that have a minimal length.
 *   Set `auto_fuzz_min_word_length` to specify the search term length starting
 *   from which we apply an automatic edit distance tolerance.
 *
 * - ``auto_fuzz_distance:`` Auto-fuzz will apply a fuzziness tolerance (edit
 *   distance tolerance) to all search terms that have a minimal length.  Set
 *   `auto_fuzz_distance` to specify the edit distance tolerance that is
 *   automatically enabled for search terms that whose length is at least
 *   `auto_fuzz_min_word_length`.
 *
 * - ``context_length:`` The number of characters of content to include in the
 *   search results before, and after, occurrences of the search term in
 *   documents.
 *
 * - ``resolve_href:`` a callback accepting arguments `(object_type, object_id,
 *   doc)` that returns an URL where we should go to if we want to look up the
 *   given object specified by its type and id.  (The `doc` argument provides
 *   the stored field values of that object, which we used for the search.)
 *
 * - ``getMathJax:`` to support MathJax, set this property to a function that
 *   returns a MathJax instance.
 *
 */
export class SearchWidget
{
    constructor(search_index, options = {})
    {
        this.search_index = search_index;

        this.resolve_href = options.resolve_href ?? default_resolve_href;

        this.query_parser_class =
            search_index.lunr_custom_options.lunr_query_parser_class ?? lunr.QueryParser;

        this.dom_container = options.dom_container;
        if (typeof this.dom_container === 'string' && this.dom_container.startsWith('#')) {
            this.dom_container = window.document.getElementById(this.dom_container.slice(1));
        }

        this.initial_search_query = options.initial_search_query;

        // WARNING: Options auto_fuzz_min_word_length,auto_fuzz_distance are no longer handled here.
        // They are now directly handled by the custom QueryParser class defined in lunradvancedsetup.js
        // and which is set up in the SearchIndex class via (SearchIndex).install_lunr_customization().
        // This widget picks up `SearchIndex.query_parser_class` and directly uses that QueryParser class
        // to build the search query to the index.  That custom QueryParser class now takes care of
        // introducing any automatic fuzziness etc.
        if (options.auto_fuzz_distance || options.auto_fuzz_min_word_length) {
            console.warn(
                `Options auto_fuzz_distance and auto_fuzz_min_word_length are no longer `
                + `handled in the SearchWidget constructor.  Please used advanced lunr setup `
                + `of the SearchIndex instance instead.`
            );
        }

        this.context_length = options.context_length ?? default_context_length;

        this.getMathJax = options.getMathJax ?? null;

        this.tippyAppearanceTheme = options.tippyAppearanceTheme ?? null;

        this._install();
    }

    _install()
    {
        //
        // Install on web page
        //

        debug("Installing the search widget in the page.");

        // clear any existing content in the target app container
        this.dom_container.innerHTML = '';

        // set base CSS class
        this.dom_container.classList.add('zoodb-search-widget');

        // create the input text box
        const inputbox = document.createElement('input');
        inputbox.setAttribute('type', "text");
        inputbox.classList.add("search-input");
        inputbox.value = (this.initial_search_query || '');
        inputbox.placeholder = 'type & hit RETURN to search';
        this.dom_container.appendChild(inputbox);

        this.search_input = inputbox;

        // create the results pane
        const divresults = document.createElement('div');
        divresults.classList.add('search-results');
        this.dom_container.appendChild(divresults);

        this.search_results_container = divresults;

        // latch on to the input's "change" event
        this.search_input.addEventListener(
            'change',
            (event) => this._do_search_event(event)
        );
        
        // create a simple instructions widget
        let display_fields_html =
            this.search_index.info.fields.filter( (fld) => (fld.substr(0,1) != '_') )
            .map( (fld) => '<code>'+fld+'</code>' )
            .join(', ');
        let instructions_widget = document.createElement('div');
        instructions_widget.classList.add('search-instructions-tip');
        let helpHtmlItemParas = [
            `<code>+term</code> or <code>-term</code> to force the presence
                or the abscence of a term`,
            `<code>field:term</code> to restrict the search term to within
                the given <i>field</i>. Possible fields: ${display_fields_html}`,
            `<code>term~4</code> to include all terms
                with edit distance 4 from the given term (use
                <code>term~0</code> to cancel default fuzziness)`,
            `<code>term^10</code> to &quot;boost&quot; the term, i.e., to make
                it contribute more to the final match score`,
            `<code>begi*</code> or <code>*nding</code> wildcards to match beginning or
                ending of words`
        ];
        if (this.query_parser_class.add_help_html_paras != null) {
            helpHtmlItemParas.push( ... this.query_parser_class.add_help_html_paras );
        }
        let helpHtml =
            `<p>Type query term(s) and hit RETURN to search. </p>
            <p>Advanced usage:</p>`
            + helpHtmlItemParas.map( (paraHtml, index) => (
                `<p class="search-instructions-item">${paraHtml}${
                    index === helpHtmlItemParas.length-1 ? '.' : ';'
                }</p>`
            ) ).join('');
        instructions_widget.innerHTML = helpHtml;
        instructions_widget.style.overflow = 'auto';
        instructions_widget.style.maxHeight = '80vh';
        this.dom_container.appendChild(instructions_widget);

        let moreTippyOptions = {};
        if (this.tippyAppearanceTheme) {
            moreTippyOptions.theme = this.tippyAppearanceTheme;
        }

        // add a tippy widget for some simple instructions
        this.tippy_instance = tippy(
            this.search_input,
            {
                content: instructions_widget,
                allowHTML: true,
                trigger: 'click',
                interactive: true,
                interactiveBorder: 30,
                maxWidth: '450px',
                placement: 'bottom',

                ... moreTippyOptions
            }
        );

        if (this.initial_search_query) {
            this.do_search(this.initial_search_query);
        }
    }

    _do_search_event(event)
    {
        const value = event.target.value;
        this.do_search(value);
    }

    do_search(search_str)
    {
        if (this.getMathJax != null) {
            this.getMathJax()?.typesetClear(this.search_results_container);
        }
        this.search_results_container.innerHTML = '';

        this.tippy_instance.hide();

        if (!search_str || search_str.trim().length == 0) {
            this._display_search_no_query_string();
            return;
        }

        debug("Searching! search_str =", search_str);

        //let query_parser_class = this.query_parser_class;

        let results;
        try {

            results = this.search_index.query(search_str);

        } catch (e) {
            if (e instanceof lunr.QueryParseError) {
                this._display_search_error(search_str, e);
                return
            } else {
                throw e;
            }
        }

        debug('results =', results);

        this._display_search_results(search_str, results);
    }

    _display_search_no_query_string()
    {
        const p = document.createElement('p');
        p.classList.add('search-no-query-string');
        p.textContent =
            'Type one or more words above and hit “RETURN” to search.';

        this.search_results_container.appendChild(p);
    }

    _display_search_error(search_str, error)
    {
        console.error("Error in search.", error);

        const p = document.createElement('p');
        p.classList.add('search-results-error');
        
        const s1 = document.createElement('span');
        s1.textContent = 'Error in search query ‘'+search_str+'’: ';
        p.appendChild(s1);
        
        const s2 = document.createElement('span');
        s2.classList.add('search-results-error-message');
        s2.textContent = error.message;
        p.appendChild(s2);
        
        this.search_results_container.appendChild(p);
    }

    _display_search_results(search_str, results)
    {
        if (results.length == 0) {
            this._display_search_no_results(search_str);
        } else {
            results.forEach(
                (r) => this._add_display_result(r, this.search_results_container)
            );

            if ( (results.length < max_num_results_for_mathjax)
                 && this.getMathJax != null) {

                const MathJax = this.getMathJax();
                if (MathJax != null) {
                    // reset equation numbering & disable numbers (to avoid
                    // potentially multiply-defined labels)
                    MathJax.texReset();

                    // Setting tags to null here doesn't work, probably need to do
                    // this before loading MathJax
                    //
                    //this.getMathJax().config.tex.tags = null;

                    // typeset the math in our results
                    MathJax.typesetPromise();
                }
            }
        }
    }

    _display_search_no_results(search_str)
    {
        const p = document.createElement('p');
        p.classList.add('search-no-results');
        p.textContent = `Your search for ‘${search_str}’ did not yield any results.`;

        this.search_results_container.appendChild(p);
    }


    _add_display_result(result, container)
    {
        const doc = this.search_index.store[parseInt(result.ref)];

        const div = document.createElement('div');
        div.classList.add("search-result");

        let srt = document.createElement('div');
        srt.classList.add("search-result-title");
        div.appendChild(srt);
        let a = document.createElement('a');
        const doc_id = doc[this.search_index.info.field_name_id];
        a.setAttribute('href', this.resolve_href(doc._z_otype, doc_id, doc));
        a.classList.add("search-result-link");
        srt.appendChild(a);
        a.innerText = doc[this.search_index.info.field_name_title];

        const hipos = {}; // hipos[field] = [ (list of highlight positions) ]

        for (const [/*word*/, wordmatches] of Object.entries(result.matchData.metadata)) {
            for (const [fieldname, fieldmatches] of Object.entries(wordmatches)) {

                const poslist = fieldmatches.position;
                //console.log('word =', word, 'fieldname =', fieldname, 'poslist =', poslist);

                if ( ! Object.hasOwn(hipos, fieldname) ) {
                    hipos[fieldname] = [];
                }

                hipos[fieldname] = hipos[fieldname].concat(poslist);
            }
        }


        const context_length = this.context_length;

        // iterate over this.search_index.info.fields instead, to preserve field order
        for (const fieldname of this.search_index.info.fields) {

            if ( ! Object.hasOwn(hipos, fieldname) ) {
                // no such field in match
                continue;
            }

            const docfieldstr = doc[fieldname];

            let poslist = hipos[fieldname];

            // debug(`Raw highlight positions in ${fieldname} - `, poslist);
            // debug(`Raw string is\n`, docfieldstr);
            // for (const [pstart, plen] of poslist) {
            //     debug(` ... str[${pstart}:+${plen}] ==> ‘${docfieldstr.substring(pstart, pstart+plen)}’`);
            // }

            // make sure that poslist is canonicalized -- overlapping pairs and duplicate pairs are
            // merged into a single pair, etc.
            poslist = canonicalPositionPairs(poslist);

            let showhtml = '';
            let lastpos = 0;

            for (const pospair of poslist) {
                if ( (lastpos>0 && ((pospair[0] - lastpos) < 2*context_length))
                     || (lastpos==0 && (pospair[0] < context_length) ) ) {
                    // close to previous match (or string start), do not elide
                    showhtml += escape_html(docfieldstr.substring(lastpos, pospair[0]));
                } else {
                    if (lastpos != 0) {
                        showhtml += escape_html(
                            docfieldstr.substring(lastpos, lastpos+context_length)
                        );
                        showhtml += '…';
                    }
                    showhtml += ' …';
                    showhtml += escape_html(
                        docfieldstr.substring(pospair[0] - context_length, pospair[0])
                    );
                }
                showhtml += '<span class="sr-highlight">'
                    + escape_html( docfieldstr.substring(pospair[0], pospair[0]+pospair[1]) )
                    + '</span>';
                lastpos = pospair[0] + pospair[1];
            }
            if (docfieldstr.length > (lastpos + context_length)) {
                showhtml += escape_html(
                    docfieldstr.substring(lastpos, lastpos+context_length)
                ) + '…';
            } else {
                showhtml += escape_html(
                    docfieldstr.substring(lastpos)
                );
            }

            // field name
            showhtml += '<span class="search-result-display-field-name">'
                + escape_html(fieldname)
                + '</span>';

            const p = document.createElement('div');
            p.classList.add('search-result-field-display');
            let fieldnameclsname = fieldname.replace(/[^a-zA-Z0-9_-]/g, "");
            p.classList.add('search-result-field-display--' + fieldnameclsname);
            p.innerHTML = showhtml;

            div.appendChild(p);
        }

        container.appendChild(div);
    }

}

