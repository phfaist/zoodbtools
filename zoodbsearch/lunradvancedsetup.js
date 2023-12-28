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

export function getRegexpTokenLunrTokenizer(options, { rxAnyToken })
{
    const includeNGramsUpTo = options.includeNGramsUpTo ?? 1;

    const unicodeNormalizeString =
        options.unicodeNormalizeString ?? ((x) => x.normalize('NFKD'));

    return function (obj, metadata) {
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

        let rx = new RegExp(rxAnyToken, "ug");

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
                    //debug(`Adding n-gram token `, { n, nGramToken });
                    tokens.push( nGramToken );
                }
            }
        }

        return tokens;
    };
}


export function lunrAdvancedSetupRegexpTokenizerPlugin(builder, options, { rxAnyToken })
{
    debug(`Running custom lunr setup plugin, setting tokenizer.`, { rxAnyToken });
    builder.tokenizer = getRegexpTokenLunrTokenizer(options, { rxAnyToken });
}

export function getLunrOptionsAdvancedSetup(options)
{
    options = loMerge(
        {
            useRegxpTokenParser: true,
            tokenSpecList: defaultTokenSpecList,
            autoFuzzDistance: 1,
            autoFuzzMinTermLength: 4,
            includeNGramsUpTo: 1,
            nGramBoostPerN: 5,
        },
        options || {}
    );

    const {
        useRegxpTokenParser,
        tokenSpecList,
        autoFuzzDistance,
        autoFuzzMinTermLength,
        includeNGramsUpTo,
    } = options;

    // compute the rxAnyToken
    const rxAnyToken = useRegxpTokenParser ? getRxAnyToken(tokenSpecList) : null;

    // TODO: support no-stemming terms ("Hamming" as in Hamming distance etc.)

    let lunr_plugins = [];

    if (useRegxpTokenParser) {
        lunr_plugins.push( (builder) => {
            return lunrAdvancedSetupRegexpTokenizerPlugin(
                builder, options, { rxAnyToken }
            );
        } );
    }

    // set up the QueryParser class instance
    const _RegexpTokenLunrQueryParser = class extends RegexpTokenLunrQueryParserWithOptions {
        constructor(str, query)
        {
            super(str, query, options, { rxAnyToken });
        }
    };

    return {
        lunr_plugins,
        lunr_query_parser_class: _RegexpTokenLunrQueryParser,
    };
}

// Custom QueryParser class (needs to be wrapped to pass constructor oprtions!)

class RegexpTokenLunrQueryParserWithOptions extends lunr.QueryParser
{
    constructor(str, query, options, { rxAnyToken })
    {
        super(str, query);

        this.options = options || {};

        if (this.options.useRegxpTokenParser) {
            this.lexer = new RegexpTokenLunrQueryLexer(str, { rxAnyToken });
        }

        this.rawParsedClauseList = [];

        debug(`Constructed custom RegexpTokenLunrQueryParser, lexer is =`, this.lexer);
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
            debug("Processing clause: ", clause,
                        " autoFuzzMinTermLength = ", autoFuzzMinTermLength,
                        " autoFuzzDistance = ", autoFuzzDistance);
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
    constructor(str, { rxAnyToken })
    {
        debug(`Constructing custom QueryLexer instance.`, {str, rxAnyToken});
        super(str);
        // RegExp must assert the full string to be tested is a valid token,
        // including possible '*' wildcards at the beginning & end of the token.
        this.rxAnyTokenFull = new RegExp(
            '^(\\*?' + rxAnyToken.source + '\\*?)$',
            rxAnyToken.flags
        );
        // These chars will always be acceptable to be parsed as part of a term.  Two reasons:
        // 1) speed up the test of whether or not a char should be kept as part of the current
        // term, and 2) automatically accept chars that can actually be part of a field name 
        // (of the syntax "fieldname:...") before we had the chance to determine whether the char
        // we are seeing is part of a field name specification or part of a search term.
        this.rxSimpleFieldChar = /[A-Za-z0-9_]/;
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
  
    lexer.ignore()
  
    if (lexer.more()) {
        return RegexpTokenLunrQueryLexer.lexText
    }
};
RegexpTokenLunrQueryLexer.lexEditDistance = function (lexer) {
    lexer.ignore()
    lexer.acceptDigitRun()
    lexer.emit(lunr.QueryLexer.EDIT_DISTANCE)
    return RegexpTokenLunrQueryLexer.lexText;
};
RegexpTokenLunrQueryLexer.lexBoost = function (lexer) {
    lexer.ignore()
    lexer.acceptDigitRun()
    lexer.emit(lunr.QueryLexer.BOOST)
    return RegexpTokenLunrQueryLexer.lexText
};
RegexpTokenLunrQueryLexer.lexEOS = function (lexer) {
    if (lexer.width() > 0) {
        lexer.emit(lunr.QueryLexer.TERM)
    }
};
RegexpTokenLunrQueryLexer.lexText = function (lexer) {
    while (true) {
        var char = lexer.next();

        //debug(`lexText() got char = `, char);
    
        if (char === lunr.QueryLexer.EOS) {
            return RegexpTokenLunrQueryLexer.lexEOS;
        }
    
        // Escape character is '\'
        if (char.charCodeAt(0) == 92) {
            lexer.escapeCharacter();
            continue;
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

        if (lexer.rxSimpleFieldChar.test(char)) {
            // always accept these chars, they could be field names.
            //debug(`automatically accepting char = `, char);
            continue;
        }
    
        let stest = lexer.strSoFar(0);
        const testResult = lexer.rxAnyTokenFull.test(stest);
        //debug(`Term so far -> `, { stest, testResult });
        if ( ! testResult ) {
            // adding the current character makes us fail the "rxAnyTokenFull" test
            // --> Term stopped one character earlier.
            return RegexpTokenLunrQueryLexer.lexTerm;
        }
    }
};

// ============================================================================
