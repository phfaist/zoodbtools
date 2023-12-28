import * as assert from 'assert';

import { canonicalPositionPairs } from '../_searchutil.js';

describe('canonicalPositionPairs', function () {

    it('preserves ordered disjoint intervals', async function () {
        let poslist = [
            [0, 3],
            [5, 10],
            [16, 4],
        ];
        assert.deepStrictEqual(
            canonicalPositionPairs(poslist),
            poslist,
        );
    });

    it('reorders disjoint intervals', async function () {
        let poslist = [
            [16, 4],
            [5, 10],
            [0, 3],
        ];
        let newposlist = [
            [0, 3],
            [5, 10],
            [16, 4],
        ];
        assert.deepStrictEqual(
            canonicalPositionPairs(poslist),
            newposlist,
        );
    });

    it('Merges overlapping ordered intervals', async function () {
        let poslist = [
            [0, 3],
            [2, 10],
            [16, 4],
        ];
        let newposlist = [
            [0, 12],
            [16, 4],
        ];
        assert.deepStrictEqual(
            canonicalPositionPairs(poslist),
            newposlist,
        );
    });
    it('Merges overlapping ordered intervals (2)', async function () {
        let poslist = [
            [0, 3],
            [4, 10],
            [12, 4],
        ];
        let newposlist = [
            [0, 3],
            [4, 12],
        ];
        assert.deepStrictEqual(
            canonicalPositionPairs(poslist),
            newposlist,
        );
    });
    it('Merges multiple overlapping (ordered) intervals', async function () {
        let poslist = [
            [0, 3],
            [4, 10],
            [6, 4],
            [12, 4],
            [16, 1],
            [20, 3],
        ];
        let newposlist = [
            [0, 3],
            [4, 13],
            [20, 3],
        ];
        assert.deepStrictEqual(
            canonicalPositionPairs(poslist),
            newposlist,
        );
    });
    it('Merges multiple overlapping intervals', async function () {
        let poslist = [
            [12, 4],
            [4, 10],
            [0, 3],
            [6, 4],
            [20, 3],
            [16, 1],
        ];
        let newposlist = [
            [0, 3],
            [4, 13],
            [20, 3],
        ];
        assert.deepStrictEqual(
            canonicalPositionPairs(poslist),
            newposlist,
        );
    });
});
     