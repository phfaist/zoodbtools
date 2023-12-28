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
            const tokMetaData = loMerge(
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

        if (includeNGramsUpTo > 1) {
            // copy tokens array so we can build n-grams and add them to the `tokens`
            // array on the fly.
            let single_tokens = [... tokens];
            for (let n = 2; n <= includeNGramsUpTo; ++n) {
                for (let k = 0; k + n <= single_tokens.length; ++k) {
                    const ngram_toks = single_tokens.slice(k, k+n);
                    const ngram_start = ngram_toks[0].metadata.position[0];
                    const mm = ngram_toks[n-1].metadata;
                    const ngram_end = mm.position[0] + mm.position[1]; // pos+len of last token in n-gram
                    const nGramToken = new lunr.Token(
                        ngram_toks.map( (t) => t.str ).join(' '),
                        loMerge(
                            {},
                            metadata,
                            {
                                position: [ ngram_start, ngram_end-ngram_start ],
                                index: tokens.length,
                            }
                        )
                    );
                    debug(`Adding n-gram token `, { n, nGramToken });
                    tokens.push( nGramToken );
                }
            }
        }

        return tokens;
    };

    return { singleTokenizer, singleTokenizerWithWildcard, fullTokenizer };
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
            nGramBoostPerN: 5,
        },
        options || {}
    );

    const {
        useRegexpTokenParser,
        tokenSpecList,
        autoFuzzDistance,
        autoFuzzMinTermLength,
        includeNGramsUpTo,
    } = options;

    // compute the rxAnyToken
    let rxAnyToken = null;
    let tokenizers = null;
    if (useRegexpTokenParser) {
        rxAnyToken = getRxAnyToken(tokenSpecList);
        tokenizers = getRegexpTokenLunrTokenizers(options, { rxAnyToken });
    }

    // TODO: support no-stemming terms ("Hamming" as in Hamming distance etc.)

    let lunr_plugins = [];

    if (useRegexpTokenParser) {
        lunr_plugins.push( (builder) => {
            builder.tokenizer = tokenizers.fullTokenizer;
        } );
    }

    let computed = { rxAnyToken, tokenizers };

    // set up the QueryParser class instance
    const _RegexpTokenLunrQueryParser = class extends RegexpTokenLunrQueryParserWithOptions {
        constructor(str, query)
        {
            super(str, query, options, computed);
        }
    };
    _RegexpTokenLunrQueryParser.add_help_html_paras =
        RegexpTokenLunrQueryParserWithOptions.getHtmlHelpParas(options, computed);

    return {
        lunr_plugins,
        lunr_query_parser_class: _RegexpTokenLunrQueryParser,
    };
}


// ============================================================================
// ==== Custom Query Parser (needs to be wrapped to pass constructor oprtions!)
// ============================================================================

class RegexpTokenLunrQueryParserWithOptions extends lunr.QueryParser
{
    constructor(str, query, options, computed)
    {
        super(str, query);

        this.options = options || {};

        if (this.options.useRegexpTokenParser) {
            this.lexer = new RegexpTokenLunrQueryLexer(str, computed);
        }

        this.rawParsedClauseList = [];

        debug(`Constructed custom RegexpTokenLunrQueryParser, lexer is =`, this.lexer);
    }

    static getHtmlHelpParas(options, { rxAnyToken })
    {
        const { includeNGramsUpTo } = options;

        let add_help_html_paras = [];
        // if n-grams are supported, alert the reader to the fact that they can search
        // for full phrases with double quotes.
        if (includeNGramsUpTo > 1) {
            add_help_html_paras.push(
                `Use double-quotes (<code>"Ising model"</code>) to search for full phrases`
                + ` (up to ${includeNGramsUpTo} terms in a phrase; very experimental)`
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
        // can build n-grams etc.
        rawParsedClause._is_simple_clause = (
            rawParsedClause.fields == null
            && rawParsedClause.boost == null
            && rawParsedClause.wildcard == null
            && (!rawParsedClause.term.startsWith('*'))
            && (!rawParsedClause.term.endsWith('*'))
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
        // FIXME: NEEDS TO BE DONE *BEFORE* STEMMING.
        if (includeNGramsUpTo > 1) {
            let add_clauses = [];
            for (let n = 2; n <= includeNGramsUpTo; ++n) {
                for (let k = 0; k + n <= this.rawParsedClauseList.length; ++k) {
                    let cl_ngram = this.rawParsedClauseList.slice(k, k+n);
                    let only_simple_terms = cl_ngram.every( (cl) => cl._is_simple_clause );
                    debug(`n-gram clause? `, { n, k, cl_ngram, only_simple_terms });
                    if (!only_simple_terms) {
                        continue; // only apply n-grams to un-decorated sequences of terms.
                    }
                    add_clauses.push({
                        term: cl_ngram.map( (cl) => cl.term ).join(' '),
                        boost: n * nGramBoostPerN,
                    });
                }
            }
            for (const cl of add_clauses) {
                qq.clause(cl);
            }
            debug(`Added clauses for n-grams: `, add_clauses);
        }

        debug("Done processing clauses.", { qq });

        return qq;
    }
};



// ============================================================================
// ==== CUSTOM LEXER
// ============================================================================

export class RegexpTokenLunrQueryLexer extends lunr.QueryLexer
{
    constructor(str, { rxAnyToken, tokenizers })
    {
        debug(`Constructing custom QueryLexer instance.`, {str, rxAnyToken});
        super(str);

        this.tokenizers = tokenizers;

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
                terms = [
                    [ tokens.map( (t) => t.str ).join(' '),
                      this.start,
                      this.pos ]
                ];
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
