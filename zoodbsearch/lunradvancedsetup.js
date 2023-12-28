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
        // that defines \S along with adding ")", "}", and "]" as identifier terminators
        // (cf. MDN https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes)
        rx: /(\b\d{2,}[^\f\n\r\t\v\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff\]\)\}])/u
    },
    {
        key: "word",
        rx: /(\p{Alphabetic}+)/u,
    },
];


export function getRxAnyToken(tokenSpecList)
{
    return new RegExp(
        tokenSpecList.map(
            (x) => (x.rx.source ?? x.rx)
        ).join("|"),
        "u"
    );
}

export function getRegexpTokenLunrTokenizer(options)
{
    const rxAnyToken = options.rxAnyToken;
    //debug(`RX IS: `, rxAnyToken);

    const unicodeNormalizeString =
        options.unicodeNormalizeString ?? ((x) => x.normalize('NFKD'));

    return function (obj, metadata) {
        //debug(`Custom tokenizer called.`, { obj, metadata });
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

        return tokens;
    };
}


export function lunrAdvancedSetupRegexpTokenizerPlugin(builder, options)
{
    const { rxAnyToken } = options;
    debug(`Running custom lunr setup plugin, setting tokenizer.`, { rxAnyToken });
    builder.tokenizer = getRegexpTokenLunrTokenizer({ rxAnyToken });
}

export function getLunrOptionsAdvancedSetup(options={})
{
    const useRegxpTokenParser = options.useRegxpTokenParser ?? true;
    const tokenSpecList = options.tokenSpecList ?? defaultTokenSpecList;

    const autoFuzzMinTermLength = options.autoFuzzMinTermLength ?? 4;
    const autoFuzzDistance = options.autoFuzzDistance ?? 1; 

    // compute the rxAnyToken
    const rxAnyToken = useRegxpTokenParser ? getRxAnyToken(tokenSpecList) : null;

    // TODO: support no-stemming terms ("Hamming" as in Hamming distance etc.)

    let lunr_plugins = [];

    if (useRegxpTokenParser) {
        lunr_plugins.push( (builder, options) => {
            return lunrAdvancedSetupRegexpTokenizerPlugin(
                builder, loMerge({}, options, { rxAnyToken })
            );
        } );
    }

    // set up the QueryParser class instance
    const _RegexpTokenLunrQueryParser = class _RegexpTokenLunrQueryParser extends lunr.QueryParser
    {
        constructor(str, query)
        {
            super(str, query);
            if (useRegxpTokenParser) {
                this.lexer = new RegexpTokenLunrQueryLexer(str, { rxAnyToken });
            }
            debug(`Constructed custom RegexpTokenLunrQueryParser, lexer is =`, this.lexer);
        }

        parse()
        {
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
            debug("Done processing clauses.");
        }
    };

    return {
        lunr_plugins,
        lunr_query_parser_class: _RegexpTokenLunrQueryParser,
    };
}





// ==== CUSTOM LEXER ====

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

        if (/[a-zA-Z0-9._]/.test(char)) {
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

// ==========================
