import debug_module from 'debug';
const debug = debug_module('zoodbtools_search._searchutil');

export function canonicalPositionPairs(poslist)
{
    // newposlist always contains disjoint intervals sorted in increasing order.
    let newposlist = [];

    for (const p of poslist) {
        debug(`Processing interval`, p);
        if (newposlist.length == 0) {
            newposlist.push(p);
            continue;
        }
        const [start, len] = p;
        // find first item in `newposlist` that might overlap with this interval.  Search
        // in reverse as it's highly likely that poslist has items in increasing order.

        // mPreFirstMerge == -1 happens if no existing interval is completely disjoint and left of
        // [start, end].  It means that the new interval (whether [start, end] or a merged interval)
        // will have to be inserted first in newposlist.
        let mPreFirstMerge = -1; 
        let mLastMerge = null;
        for (let m = newposlist.length-1; m >= 0; --m) {
            const [mstart, mlen] = newposlist[m];
            if (mstart + mlen < start) {
                // new interval can safely ignore any intervals in newposlist[0 ... m]
                mPreFirstMerge = m;
                break;
            }
            if (mstart <= start + len && mLastMerge == null) {
                mLastMerge = m;
            }
        }
        debug(`Placed interval: `, { mPreFirstMerge, mLastMerge });
        if (mLastMerge == null) {
            // great news! the interval is disjoint from the others, it can safely
            // be inserted after mPreFirstMerge.
            newposlist.splice(mPreFirstMerge + 1, 0, p);
        } else {
            // we need to merge several intervals.  All the intervals
            // newposlist[mPreFirstMerge+1 ... mLastmerge] (included) overlap with
            // [start, len], so their union is going to be one large interval.  The
            // start and end are simply given as min start and max end.
            //
            // Note that we are guaranteed here that
            //   mPreFirstMerge < mLastMerge < newposlist.length
            //
            const aStart = newposlist[mPreFirstMerge+1][0];
            const bPos = newposlist[mLastMerge];
            const bEnd = bPos[0] + bPos[1];
            const newStart = Math.min(start, aStart);
            const newEnd = Math.max( start + len, bEnd );
            newposlist.splice(
                mPreFirstMerge + 1,
                mLastMerge - mPreFirstMerge,
                [ newStart, newEnd - newStart ]
            );
        }
        debug(`Now newposlist = `, newposlist);
    }
    return newposlist;
}