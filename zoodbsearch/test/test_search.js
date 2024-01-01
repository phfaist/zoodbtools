import debugm from 'debug';
const debug = debugm('zoodbsearch.test.test_search');

import assert from 'assert';

import { SearchIndex } from '../searchindex.js';
import { getLunrCustomOptionsAdvancedSetup } from '../lunradvancedsetup.js';

import eczsrchidxData from './ecztestsrchidx.json' assert { type: 'json' };

describe('advanced search', function() {

    it('can find an old-style arXiv ID in test data', function () {

        const lunrAdvancedOptions = {
            includeNGramsUpTo: 3,
        };
    
        const indexLunrCustomOptions = getLunrCustomOptionsAdvancedSetup(lunrAdvancedOptions);
        const searchIndex = SearchIndex.load(eczsrchidxData, indexLunrCustomOptions);

        let results = searchIndex.query("quant-ph/0001234");

        debug(`results = `, results);
    
        assert.strictEqual(results.length, 1);
        assert.strictEqual(searchIndex.store[results[0].ref].id, 'css');

        const resMeta = results[0]?.matchData.metadata;
        // debug(`results[0] match metadata = `, resMeta);
        // debug(`... resMeta['quant-ph/0001234'].description.position = `,
        //       resMeta['quant-ph/0001234'].description.position);
        assert.strictEqual(
            searchIndex.store[results[0].ref]?.description.substr(
                ... resMeta['quant-ph/0001234'].description.position[0]
            ),
            "quant-ph/0001234"
        );
    });

    it('can search for full phrases in test data', function () {

        const lunrAdvancedOptions = {
            includeNGramsUpTo: 3,
        };
    
        const indexLunrCustomOptions = getLunrCustomOptionsAdvancedSetup(lunrAdvancedOptions);
        const searchIndex = SearchIndex.load(eczsrchidxData, indexLunrCustomOptions);

        let results = searchIndex.query(`"stabilizer code admitting a set of stabilizer generators"`);

        debug(`results = `, results);
        //debug(`results[0] match metadata = `, results[0]?.matchData.metadata);
    
        assert.strictEqual(results.length, 1);
        assert.strictEqual(searchIndex.store[results[0].ref].id, 'css');
    });

    it('prioritizes n-grams from search words', function () {

        const lunrAdvancedOptions = {
            includeNGramsUpTo: 3,
        };
    
        const indexLunrCustomOptions = getLunrCustomOptionsAdvancedSetup(lunrAdvancedOptions);
        const searchIndex = SearchIndex.load(eczsrchidxData, indexLunrCustomOptions);

        let results = searchIndex.query(`arxiv identifier`);
        // first result for "identifier arxiv" is typically not the same, indicating that our
        // search routine correctly prioritizes the entry for which the 2-gram "stabilizer code"
        // appears. (Plus it appears in the name, which is a field that's boosted up.)

        debug(`results = `, results);
        // //debug(`results[0] match metadata = `, results[0]?.matchData.metadata);
        // for (const result of results.slice(0, 5)) {
        //     const resultMeta = result.matchData.metadata;
        //     const doc = searchIndex.store[results[0].ref];
        //     debug(`  -> result: ${doc.id}: ... ${JSON.stringify(resultMeta)}`);
        // }
    
        assert.strictEqual(searchIndex.store[results[0].ref].id, 'css');

    });
});