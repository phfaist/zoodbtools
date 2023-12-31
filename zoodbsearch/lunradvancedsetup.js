import debug_module from 'debug';
const debug = debug_module('zoodbtools_search.lunradvancedsetup');

import loMerge from 'lodash/merge.js';

import lunr from 'lunr';


export const defaultTokenSpecList = [
    {
        key: "arxivId",
        rx: /(\b((\d{4}[.]\d{4,})|([a-zA-Z._-]+\/\d{7}))(v\d+)?)/u,
    },
    {
        key: "apparentNumericalIdentifier",
        // numerical identifiers start with two digits.  The following allowed character class is the one
        // that defines \S along with adding ";", ",", ")", "}", and "]" as identifier terminators
        // (cf. MDN https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes)
        rx: /(\b\d{2,}[^\f\n\r\t\v\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff\])};,])/u
    },
    {
        key: "word",
        rx: /(\p{Alphabetic}+)/u,
    },
    {
        key: "stdFieldIdentifier",
        rx: /[A-Za-z_][A-Za-z0-9_]*/u,
    },
];
export const defaultTokenSpecDict = Object.fromEntries(
    defaultTokenSpecList.map( ({key, rx}) => [key, rx] )
);

export function getRxAnyToken(tokenSpecList)
{
    return new RegExp(
        tokenSpecList.map(
            (x) => (x.rx.source ?? x.rx)
        ).join("|"),
        "u"
    );
}

export function getRegexpTokenLunrTokenizers(options, { rxAnyToken })
{
    const includeNGramsUpTo = options.includeNGramsUpTo ?? 1;
    const computeFullNGramsIndex = options.computeFullNGramsIndex ?? false;

    const unicodeNormalizeString =
        options.unicodeNormalizeString ?? ((x) => x.normalize('NFKD'));

    const singleTokenizer = function (obj, metadata, xtraOptions) {

        //debug(`Custom tokenizer called.`, { obj, metadata, options });
        if (obj == null) {
            return [];
        }
        if (Array.isArray(obj)) {
            return obj.map( (t) => new lunr.Token(
                    lunr.utils.asString(t).toLowerCase(),
                    lunr.utils.clone(metadata)
                ) );
        }

        let rx = new RegExp( xtraOptions?.rxAnyToken ?? rxAnyToken, "ug");

        // make string unicode-canonical
        let s = unicodeNormalizeString(obj.toString()).toLowerCase();

        let tokens = [];

        // perform regexp search on string and store all matches as tokens.
        for (const match of s.matchAll(rx)) {
            const matchStr = match[0];
            const mStart = match.index;
            const mLen = matchStr.length;
            const mEnd = mStart + mLen;
            //debug(`Split token ‘${matchStr}’ start=${mStart} end=${mEnd}.  match[1]=${match[1]}`);
            const tokStr = s.slice(mStart, mEnd);
            const tokMetaData = Object.assign( // don't merge position attribute!
                {},
                metadata,
                {
                    position: [mStart, mLen],
                    index: tokens.length,
                }
            );
            tokens.push( new lunr.Token(tokStr, tokMetaData) );
        }

        return tokens;
    };

    const singleTokenizerWithWildcard = function (obj, metadata) {
        return singleTokenizer(obj, metadata, {
            rxAnyToken: new RegExp(
                '\\*?(' + rxAnyToken.source + ')\\*?',
                rxAnyToken.flags
            )
        });
    };

    const fullTokenizer = function (obj, metadata) {

        let tokens = singleTokenizer(obj, metadata);

        //debug(`called singleTokenizer(); tokens = `,  tokens);

        if (includeNGramsUpTo > 1 && computeFullNGramsIndex) {

            // WARNING: STORING THE RESULTING INDEX IS A HUGE MEMORY HOG!
            // Instead, by default, we only store just enough information
            // to know what token follows a given token occurence (cf. above),
            // so that we can look up n-gram indices on-demand.

            // copy tokens array so we can build n-grams and add them to the `tokens`
            // array on the fly.
            let single_tokens = [... tokens];
            for (let n = 2; n <= includeNGramsUpTo; ++n) {
                for (let k = 0; k + n <= single_tokens.length; ++k) {
                    const ngram_toks = single_tokens.slice(k, k+n);
                    const ngram_start = ngram_toks[0].metadata.position[0];
                    const mm = ngram_toks[n-1].metadata;
                    // ngram_end = pos+len of last token in n-gram
                    const ngram_end = mm.position[0] + mm.position[1];
                    const nGramToken = new lunr.Token(
                        ngram_toks.map( (t) => t.str ).join(' '),
                        Object.assign( // don't merge position attribute!
                            {},
                            metadata,
                            {
                                position: [ ngram_start, ngram_end-ngram_start ],
                                //nextTokens: null, // really not necessary
                                index: tokens.length,
                            }
                        )
                    );
                    //debug(`Adding n-gram token `, { n, nGramToken });
                    tokens.push( nGramToken );
                }
            }

        }

        return tokens;
    };

    return { singleTokenizer, singleTokenizerWithWildcard, fullTokenizer };
}


function getPipelineFunctionAddNextTokens({ n })
{
    const fn = function (token, i, tokens) {
        //debug(`getPipelineFunctionAddNextTokens: `, {token, i, tokens, n});
        // add nextTokens property to token.
        let next_n_tokens = tokens.slice(i+1, i+n);
        let newTokMetadata = Object.assign(
            {},
            token.metadata,
            {
                // the n-gram token as an array of tokens.  Storing the
                // tokens in this way ensures access to the tokens' metadata
                // including their position if applicable.
                nextTokens: next_n_tokens,
            }
        );
        //debug(`Adding token ${token.str} metadata -> `, { newTokMetadata, next_n_tokens });
        return new lunr.Token(
            token.str,
            newTokMetadata,
        );
    };
    lunr.Pipeline.registerFunction(`getPipelineFunctionAddNextTokens/${n}`);
    return fn;
}


//
// Utility to save and load lunr.Builder() objects after having
// added all documents but before having built all the index information
// (so we can reuse this information to complete the index with relevant
// n-grams).
//
// NOTE: The pipeline and tokenizer are NOT saved.  It is assumed that
// they are installed as appropriate on the client side as well in case they
// have to be serialized.  (The search pipeline is saved in the index
// itself as the 'pipeline' property.)
//
// NOTE: Deep copies of the data are NOT made at this point. Make sure you make
// a deep copy when you use this data!
//
function saveLunrBuilderPreliminaryIndexInformation(builder)
{
    // These are the builder fields that we need to save in order to
    // extend the index with n-grams.
    const builderFields = [
        '_ref',
        '_fields',
        '_documents', 
        'fieldTermFrequencies',
        'fieldLengths',
        '_b',
        '_k1',
        'termIndex',
        'metadataWhitelist',
    ];
    // we do NOT need to save invertedIndex because it is saved/serialized
    // in the index itself!

    debug(`saveLunrBuilderPreliminaryIndexInformation(): builder = `, builder);

    let builderPreliminaryIndexInformation = Object.fromEntries( builderFields.map(
        (fieldName) => [fieldName, builder[fieldName]]
    ) );

    return builderPreliminaryIndexInformation;
}

function restoreLunrBuilderPreliminaryIndexInformation(
    { idx,
      builderPreliminaryIndexInformation,
      BuilderClass
    }
)
{
    BuilderClass ??= lunr.Builder;
    let builder = new lunr.Builder;

    builder.invertedIndex = idx.invertedIndex;

    for (const [key, value] of Object.entries(builderPreliminaryIndexInformation)) {
        builder[key] = JSON.parse(JSON.stringify(value)); // make deep copy
    }

    return builder;
}

//
// Utility to extend an index on-the-fly to include relevant n-grams
//
function extendedIndexWithOnTheFlyNGrams({idx, ngramsTerms, builderPreliminaryIndexInformation})
{
    // Use access builder's intermediate representation data (half-built index) to reset
    // the state of the lunr.Builder object to right before it aggregated all the index
    // scoring information
    let builder = restoreLunrBuilderPreliminaryIndexInformation(
        { idx, builderPreliminaryIndexInformation }
    );

    debug(`extendedIndexWithOnTheFlyNGrams():`, {idx, ngramsTerms, builderPreliminaryIndexInformation});

    const invertedIndex = idx.invertedIndex;

    for (const ngramTerms of ngramsTerms) {
        // go through the index and find n-grams through the "nextToken" metadata property.
        const firstTermKey = ngramTerms[0];
        // ngramsTerms has already been through the pipeline!
        // // we need to run the term through the pipeline to find it in the index!
        // const firstTermKey = idx.pipeline.runString(firstTerm, {
        //     // fields: [] //...?
        //   });
        const remainingTerms = ngramTerms.slice(1);
        debug(`Checking for ${firstTermKey} in invertedIndex - `, invertedIndex[firstTermKey],
              `remaining terms =`, remainingTerms);
        if (invertedIndex[firstTermKey] == null) {
            // first term of n-gram not in index --- skip
            continue;
        }
        // now go through all occurrences of this firstTerm, as given in the index, and
        // mark all those occurences that happen to be part of this particular n-gram.
        for (const [fieldName, idxFldDb] of Object.entries(invertedIndex[firstTermKey])) {
            for (const [docRef, idxFldDocDb] of Object.entries(idxFldDb)) {
                const nextTokensList = idxFldDocDb.nextTokens;
                const positionsList = idxFldDocDb.position;
                for (let j = 0; j < nextTokensList.length; ++j) {
                    const nextTokens = nextTokensList[j];
                    const position = positionsList?.[j];
                    // debug(`exploring invertedIndex[${firstTermKey}][${fieldName}][${docRef}][${j}] - `,
                    //       { nextTokens, positionsList });
                    if (remainingTerms.length <= nextTokens.length
                        && remainingTerms.every( (v, i) => nextTokens[i].str === v )) {
                        // it's a match!  The single token in the index at
                        // invertedIndex[firstTermKey][fieldName][docRef][_] is followed
                        // by tokens matching the ngram we want to build.
                        //
                        // -> add the ngram to the index.
                        const lastNgramTokMetaPos = nextTokens[remainingTerms.length-1].metadata.position;
                        let ngramPosition = null;
                        if (position != null && lastNgramTokMetaPos != null) {
                            const ngramStart = position[0];
                            const ngramEnd = lastNgramTokMetaPos[0] + lastNgramTokMetaPos[1];
                            ngramPosition = [ ngramStart , ngramEnd - ngramStart ];
                        }
                        const nGramForIndex = firstTermKey + ' ' + remainingTerms.join(' ');
                        const ngramToken = new lunr.Token(
                            nGramForIndex,
                            {
                                position: ngramPosition,
                            }
                        );
                        debug(`Adding n-gram term occurence to index: `,
                              {builder, ngramToken, docRef, fieldName});
                        addFakeTermOccurrenceToBuilder({
                            builder,
                            token: ngramToken,
                            docRef,
                            fieldName,
                        });
                    }
                }
            }
        }
    }

    //debug(`About to Build the extended index with on-the-fly computation of ngrams...`);

    const ngramsExtendedIdx = builder.build();

    debug(`Built the extended index with on-the-fly computation of ngrams. idx =`, idx);

    //debug(`invertedIndex['stabil code'] = `, idx.invertedIndex['stabil code']);

    return ngramsExtendedIdx;
}

// Update the index builder `builder`'s saved data to register an additional "fake" term
// occurrence in a given document.
//
// This function assumes the builder instance has already indexed the given document.
//
// This function assumes that any relevant pipeline has already been run on the given
// token.
//
// The term is assumed to be "fake" or "meta" in the sense that the builder's internal
// document field length will not be increased to reflect the additional term.  The
// document's length will thus appear to be unchanged.
//
function addFakeTermOccurrenceToBuilder({ builder, token, docRef, fieldName })
{
    // To add a token occurrence to the builder in the present state, we need to update:
    //
    // - builder.invertedIndex[term][fieldName][docRef] with the relevant token metadata;
    //
    // - builder.fieldLengths[fieldRef] -- number of tokens in the given document field.
    //   Won't update this, assuming that the term is meta/fake like an n-gram.
    //
    // - builder.fieldTermFrequencies[fieldRef][term] += 1
    //
    // where fieldRef := new lunr.FieldRef (docRef, fieldName)

    const term = token.str;
    const tokenMetadata = token.metadata;

    const fieldRef = new lunr.FieldRef(docRef, fieldName);

    // debug(`addFakeTermOccurrenceToBuilder(): `,
    //       { term, tokenMetadata, docRef, fieldName, fieldRef, builder });

    // update invertedIndex
    if (builder.invertedIndex[term] == null) {
        let posting = Object.create(null);
        posting["_index"] = builder.termIndex;
        builder.termIndex += 1
        for (const fieldName of Object.keys(builder._fields)) {
          posting[fieldName] = Object.create(null);
        }
        builder.invertedIndex[term] = posting;
    }
    if (builder.invertedIndex[term][fieldName][docRef] == null) {
        builder.invertedIndex[term][fieldName][docRef] = Object.create(null);
    }
    for (const metadataKey of builder.metadataWhitelist) {
        if (builder.invertedIndex[term][fieldName][docRef][metadataKey] == null) {
            builder.invertedIndex[term][fieldName][docRef][metadataKey] = [];
        }
        builder.invertedIndex[term][fieldName][docRef][metadataKey].push(tokenMetadata[metadataKey]);
    }

    // update fieldTermFrequencies
    if (builder.fieldTermFrequencies[fieldRef][term] == null) {
        builder.fieldTermFrequencies[fieldRef][term] = 0;
    }
    builder.fieldTermFrequencies[fieldRef][term] += 1;
}



export function getLunrCustomOptionsAdvancedSetup(options)
{
    options = loMerge(
        {
            useRegexpTokenParser: true,
            tokenSpecList: defaultTokenSpecList,
            autoFuzzDistance: 1,
            autoFuzzMinTermLength: 4,
            includeNGramsUpTo: 1,
            computeFullNGramsIndex: false,
            nGramBoostPerN: 5,
        },
        options || {}
    );

    const {
        useRegexpTokenParser,
        tokenSpecList,
        //autoFuzzDistance,
        //autoFuzzMinTermLength,
        includeNGramsUpTo,
        computeFullNGramsIndex,
    } = options;

    debug(`Using lunr advanced setup options:`, options);

    // compute the rxAnyToken
    let rxAnyToken = null;
    let tokenizers = null;
    if (useRegexpTokenParser) {
        rxAnyToken = getRxAnyToken(tokenSpecList);
        tokenizers = getRegexpTokenLunrTokenizers(options, { rxAnyToken });
    }
    const computed = { rxAnyToken, tokenizers };

    //
    // set up the lunr plugins (tokenizer & pipeline functions)
    //

    // TODO: support no-stemming terms ("Hamming" as in Hamming distance etc.)

    let lunr_plugins = [];

    if (useRegexpTokenParser) {
        lunr_plugins.push( (builder, pluginOptions) => {
            builder.tokenizer = tokenizers.fullTokenizer;
            if (includeNGramsUpTo > 1 && ! computeFullNGramsIndex) {
                builder.metadataWhitelist.push('nextTokens');
                const fn = getPipelineFunctionAddNextTokens({ n: includeNGramsUpTo });
                builder.pipeline.add(fn);

                // We need to run a bit more than the default search pipeline when
                // performing searches on multi-token terms, because we also need
                // to filter out stop words ("or" "for" "and"...) which is done
                // by default only in the index building pipeline.
                builder.searchPipeline.before(lunr.stemmer, lunr.stopWordFilter);

                // don't add fn to builder.searchPipeline.
                pluginOptions.add_builder_finalizer_callback( (builder) => {
                    const builderPreliminaryIndexInformation =
                        saveLunrBuilderPreliminaryIndexInformation(builder);
                    pluginOptions.add_index_metadata(
                        'builderPreliminaryIndexInformation',
                        builderPreliminaryIndexInformation
                    );    
                } );
            }
        } );
    }

    //
    // set up the QueryParser class instance
    //
    const _RegexpTokenLunrQueryParser = class extends RegexpTokenLunrQueryParserWithOptions {
        constructor(str, query)
        {
            super(str, query, options, computed);
        }
    };
    _RegexpTokenLunrQueryParser.add_help_html_paras =
        RegexpTokenLunrQueryParserWithOptions.getHtmlHelpParas(options, computed);

    //
    // Set up the query index preprocessor
    //
    const query_index_preprocessor = ({idx, query, index_metadata}) => {

        debug(`custom query_index_preprocessor() running`);

        // check if we need to expand the index with on-the-fly computation of the n-grams
        // used in the query
        if ( includeNGramsUpTo > 1 && ! computeFullNGramsIndex ) {
            debug(`Extending index with relevant n-grams ...`);
            let ngramsTerms = [];
            for (const clause of query.clauses) {
                if (clause.term.includes(' ')) { // it's an n-gram
                    let terms = clause.term.split(' ');
                    // if any clauses are multi-token clauses that need to pass through the pipeline,
                    // do it properly term-by-term.
                    if (clause.usePipeline) {
                        terms = terms.map(
                            (t) => idx.pipeline.runString(t, { fields: clause.fields }).join(' ')
                        );
                        clause.term = terms.join(' ');
                        clause.usePipeline = false;
                    }
                    debug(`Including n-gram = `, clause);
                    ngramsTerms.push( terms );
                }
            }
            if (ngramsTerms.length) {
                const { builderPreliminaryIndexInformation } = index_metadata;
                let idxWithNgrams = extendedIndexWithOnTheFlyNGrams({
                    idx, ngramsTerms, builderPreliminaryIndexInformation
                });
                debug(`Got index extended with n-grams.`);
                idx = idxWithNgrams;
            }
        }

        return { idx, query };
    };


    //
    // Return the lunr customization information as required by
    // SearchIndex.install_lunr_customization()
    //
    return {
        lunr_plugins,
        lunr_query_parser_class: _RegexpTokenLunrQueryParser,
        query_index_preprocessor,
    };
}


// ============================================================================
// ==== Custom Query Parser (needs to be wrapped to pass constructor options!)
// ============================================================================

class RegexpTokenLunrQueryParserWithOptions extends lunr.QueryParser
{
    constructor(str, query, options, computed)
    {
        super(str, query);

        this.options = options || {};

        if (this.options.useRegexpTokenParser) {
            this.lexer = new RegexpTokenLunrQueryLexer(str, options, computed);
        }

        this.rawParsedClauseList = [];

        debug(`Constructed custom RegexpTokenLunrQueryParser, lexer is =`, this.lexer);
    }

    static getHtmlHelpParas(
        options,
        // computed
    )
    {
        const { includeNGramsUpTo } = options;

        let add_help_html_paras = [];
        // if n-grams are supported, alert the reader to the fact that they can search
        // for full phrases with double quotes.
        if (includeNGramsUpTo > 1) {
            add_help_html_paras.push(
                `Use double-quotes (<code>"Hello world"</code>) to search for full phrases`
                + ` (experimental!)`
            );
        }

        return add_help_html_paras;
    }

    // override function that flushes a new clause into the clause list
    nextClause()
    {
        // copied from subclass source
        let completedClause = this.currentClause;
        let rawParsedClause = loMerge({}, completedClause); // keep a clone copy

        this.query.clause(completedClause);
        this.currentClause = {};

        // Also save the raw clause we parsed (with some useful flag(s)), so that we
        // can build n-grams etc.  The raw parsed clause is stripped of the default
        // attributes like boost=1, etc.
        rawParsedClause._is_simple_clause = (
            rawParsedClause.fields == null
            && rawParsedClause.boost == null
            // && rawParsedClause.wildcard == null
            // && (!rawParsedClause.term.startsWith('*'))
            // && (!rawParsedClause.term.endsWith('*'))
            && rawParsedClause.presence == null
        );
        debug(`Adding raw parsed clause: `, { rawParsedClause });
        this.rawParsedClauseList.push(rawParsedClause);
    }

    parse()
    {
        const {
            autoFuzzDistance, autoFuzzMinTermLength,
            includeNGramsUpTo, nGramBoostPerN,
        } = this.options;

        let qq = super.parse();
        
        // tweak the query to add an edit distance to all terms
        for (let clause of qq.clauses) {
            debug("Processing clause: ", { clause, autoFuzzMinTermLength, autoFuzzDistance});
            let term_length = clause.term.length;
            if (clause.term.charAt(0) == '*') { --term_length; }
            if (clause.term.charAt(clause.term.length - 1) == '*') { --term_length; }
            if (typeof clause.editDistance === 'undefined'
                && term_length >= autoFuzzMinTermLength) {
                clause.editDistance = autoFuzzDistance;
            }
        }

        // maybe include n-grams.
        if (includeNGramsUpTo > 1) {
            let add_clauses = [];
            for (let k = 0; k+1 < this.rawParsedClauseList.length; ++k) {
                let clause_ngram_terms = [];
                for (let j = 1; (clause_ngram_terms.length < includeNGramsUpTo
                                 && k+j < this.rawParsedClauseList.length); ++j) {
                    const nextClause = this.rawParsedClauseList[k+j];
                    if (!nextClause._is_simple_clause) {
                        break; // done trying to add terms to form n-grams to the clause #k, try k+1
                    }
                    const newTerms = nextClause.term.split(' ')
                        .slice(0, includeNGramsUpTo - clause_ngram_terms.length); // don't exceed n terms
                        clause_ngram_terms.push( ... newTerms );
                    add_clauses.push({
                        term: clause_ngram_terms.join(' '),
                        boost: j * nGramBoostPerN,
                    });
                }
            }
            debug(`Adding clauses for n-grams: `, add_clauses);
            for (const cl of add_clauses) {
                qq.clause(cl);
            }
        }

        // split clauses that contain too many terms into sub n-grams
        debug(`Processing clauses for splitting multi-term clauses into sub n-gram clauses`);
        const add_subngram_clauses = [];
        for (let clause of qq.clauses) {
            const term = clause.term;
            if (term.includes(' ')) {
                const terms = term.split(' ');
                if (terms.length > includeNGramsUpTo) {
                    // need to split into sub- n-grams for our search.
                    clause.term = terms.slice(0, includeNGramsUpTo).join(' ');
                    for (let j = 1; j + includeNGramsUpTo <= terms.length; ++j) {
                        add_subngram_clauses.push( loMerge(
                            {},
                            clause,
                            {
                                term: terms.slice(j, j+includeNGramsUpTo).join(' ')
                            }
                        ) );
                    }
                }
            }
        }
        for (const add_clause of add_subngram_clauses) {
            // ... adding at the end ... do the related clauses need to be grouped together?
            qq.clause(add_clause);
        }

        debug("parse(): done processing clauses.", { qq });

        return qq;
    }
}



// ============================================================================
// ==== CUSTOM LEXER
// ============================================================================

export class RegexpTokenLunrQueryLexer extends lunr.QueryLexer
{
    constructor(str, options, { rxAnyToken, tokenizers })
    {
        debug(`Constructing custom QueryLexer instance.`, {str, rxAnyToken});
        super(str);

        this.tokenizers = tokenizers;
        this.options = options;

        // // RegExp must assert the full string to be tested is a valid token,
        // // including possible '*' wildcards at the beginning & end of the token.
        // this.rxAnyTokenFull = new RegExp(
        //     '^(\\*?' + rxAnyToken.source + '\\*?)$',
        //     rxAnyToken.flags
        // );
        // // These chars will always be acceptable to be parsed as part of a term.  Two reasons:
        // // 1) speed up the test of whether or not a char should be kept as part of the current
        // // term, and 2) automatically accept chars that can actually be part of a field name 
        // // (of the syntax "fieldname:...") before we had the chance to determine whether the char
        // // we are seeing is part of a field name specification or part of a search term.
        // this.rxSimpleFieldChar = /[A-Za-z0-9_]/;
    }

    emit(type)
    {
        let str = super.sliceString();

        let isDoubleQuoted = false;
        // first of all, remove any double quotes, if applicable.
        if (str.length > 0 && str[0] === '"') {
            str = str.slice(1);
            isDoubleQuoted = true;
        }
        if (str.length > 0 && str[str.length-1] === '"') {
            str = str.slice(0, str.length-1);
        }

        if (type === lunr.QueryLexer.TERM) {
            // special treatment --- ensure the string is a sequence of valid tokens.
            // Use tokenizer for this.
            let tokens = this.tokenizers.singleTokenizerWithWildcard(str, {});
            let terms = [];
            if (isDoubleQuoted) {
                const firstMetaPos = tokens[0].metadata.position;
                const lastMetaPos = tokens[tokens.length-1].metadata.position;
                terms.push([
                    tokens.map( (t) => t.str ).join(' '),
                    firstMetaPos[0],
                    lastMetaPos[0] + lastMetaPos[1]
                ]);
            } else {
                terms = tokens.map( (t) =>
                    [ t.str, t.metadata.position[0], t.metadata.position[0]+t.metadata.position[1] ]
                );
            }
            debug(`Got terms`, { str, isDoubleQuoted, tokens, terms, });
            for (const [term,start,end] of terms) {
                this.lexemes.push({
                    type: type,
                    str: term,
                    start: start,
                    end: end,
                });
            } 
        } else {
            this.lexemes.push({
                type: type,
                str: str,
                start: this.start,
                end: this.pos
            });
        }
      
        this.start = this.pos;
    }
    
    run()
    {
        let state = RegexpTokenLunrQueryLexer.lexText;
                
        while (state) {
            state = state(this);
        }
    }

    strSoFar(offset=0)
    {
        return this.str.slice(this.start, this.pos + offset);
    }
}
RegexpTokenLunrQueryLexer.lexField = function (lexer) {
    lexer.backup();
    lexer.emit(lunr.QueryLexer.FIELD);
    lexer.ignore();
    return RegexpTokenLunrQueryLexer.lexText;
};
RegexpTokenLunrQueryLexer.lexTerm = function (lexer) {
    if (lexer.width() > 1) {
        lexer.backup();
        lexer.emit(lunr.QueryLexer.TERM);
    }
  
    lexer.ignore();
  
    if (lexer.more()) {
        return RegexpTokenLunrQueryLexer.lexText;
    }
};
RegexpTokenLunrQueryLexer.lexEditDistance = function (lexer) {
    lexer.ignore();
    lexer.acceptDigitRun();
    lexer.emit(lunr.QueryLexer.EDIT_DISTANCE);
    return RegexpTokenLunrQueryLexer.lexText;
};
RegexpTokenLunrQueryLexer.lexBoost = function (lexer) {
    lexer.ignore();
    lexer.acceptDigitRun();
    lexer.emit(lunr.QueryLexer.BOOST);
    return RegexpTokenLunrQueryLexer.lexText;
};
RegexpTokenLunrQueryLexer.lexEOS = function (lexer) {
    if (lexer.width() > 0) {
        lexer.emit(lunr.QueryLexer.TERM);
    }
};
RegexpTokenLunrQueryLexer.lexQuotedText = function (lexer) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const char = lexer.next();

        if (char === lunr.QueryLexer.EOS) {
            // implicitly add closing double-quote and accept the term
            return RegexpTokenLunrQueryLexer.lexEOS;
        }
        if (char === '"') {
            return RegexpTokenLunrQueryLexer.lexTerm;
        }
    }
};
RegexpTokenLunrQueryLexer.lexText = function (lexer) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const char = lexer.next();

        //debug(`lexText() got char = `, char);
    
        if (char === lunr.QueryLexer.EOS) {
            return RegexpTokenLunrQueryLexer.lexEOS;
        }
    
        // Escape character is '\'
        if (char.charCodeAt(0) == 92) {
            lexer.escapeCharacter();
            continue;
        }

        if (char === '"') {
            // quoted term.
            return RegexpTokenLunrQueryLexer.lexQuotedText;
        }
    
        if (char === ":") {
            return RegexpTokenLunrQueryLexer.lexField;
        }
    
        if (char === "~") {
            lexer.backup();
            if (lexer.width() > 0) {
                lexer.emit(lunr.QueryLexer.TERM);
            }
            return RegexpTokenLunrQueryLexer.lexEditDistance;
        }
    
        if (char === "^") {
            lexer.backup();
            if (lexer.width() > 0) {
                lexer.emit(lunr.QueryLexer.TERM);
            }
            return RegexpTokenLunrQueryLexer.lexBoost;
        }
    
        // "+" indicates term presence is required
        // checking for length to ensure that only
        // leading "+" are considered
        if (char === "+" && lexer.width() === 1) {
            lexer.emit(lunr.QueryLexer.PRESENCE);
            return RegexpTokenLunrQueryLexer.lexText;
        }
    
        // "-" indicates term presence is prohibited
        // checking for length to ensure that only
        // leading "-" are considered
        if (char === "-" && lexer.width() === 1) {
            lexer.emit(lunr.QueryLexer.PRESENCE)
            return RegexpTokenLunrQueryLexer.lexText
        }

        if (/\s/.test(char)) {
            // We can't test for valid tokens via advanced regexp here
            // because we're parsing the token character by character.
            // Instead, we split at spaces for now and then worry about
            // valid tokens in sliceString() when we emit the term.
            return RegexpTokenLunrQueryLexer.lexTerm;
        }
    }
};

// ============================================================================
