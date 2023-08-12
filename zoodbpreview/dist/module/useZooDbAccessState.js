import $babXZ$debug from "debug";
import {useState as $babXZ$useState, useEffect as $babXZ$useEffect} from "react";



const $cdbe94ce1f253c89$var$debug = (0, $babXZ$debug)("zoodbtoolspreview.useZooDbAccessState");
function $cdbe94ce1f253c89$export$f3662caf0be928f4({ loadZooDb: loadZooDb, reloadZooDb: reloadZooDb, triggerInitialLoad: triggerInitialLoad }) {
    triggerInitialLoad ??= true;
    // debug(`useZooDbAccessState()`);
    const [zooDbLoadState, setZooDbLoadState] = (0, $babXZ$useState)({
        // status = 'empty', 'loading', 'loaded', 'reloading', or 'load-error'
        // (the separate 'reloading' status is used so we can tailor the message
        // to the user; since we expect reloads to be much quicker than initial
        // loads)
        status: "empty",
        // the current ZooDb instance object, if status == 'loaded'
        zoodb: null,
        // the error that occurred, if status == 'load-error'
        error: null,
        // the promise that will resolve to a ZooDb instance object, if status
        // == 'loading' or status == 'reloading'
        _promise: null,
        // a flag that we increase to ensure the state changes after the zoo is
        // reloaded.
        loadVersion: 0
    });
    $cdbe94ce1f253c89$var$debug(`useZooDbAccessState() - `, zooDbLoadState);
    const doSetupLoadStateFromPromise = (promise, loadingStatus)=>{
        promise.then(//
        // On promise accepted = zoo successfully loaded
        //
        (zoodb)=>{
            // once the zoodb is loaded, we set the state to 'loaded' and
            // set the instance properly.
            setZooDbLoadState((state)=>({
                    status: "loaded",
                    zoodb: zoodb,
                    error: null,
                    _promise: null,
                    loadVersion: state.loadVersion + 1
                }));
        }, //
        // On promise rejected = error loading the zoo
        //
        (error)=>{
            console.error(`Error while loading the zoo: `, error);
            setZooDbLoadState((state)=>({
                    status: "load-error",
                    error: error,
                    zoodb: null,
                    _promise: null,
                    loadVersion: state.loadVersion
                }));
        });
        // NOTE: Do NOT set the zoodb field in the temporary 'loading' state,
        // because we don't want preview components accessing the zoodb instance
        // while it is being modified.  Therefore, we use "zoodb: null" here:
        setZooDbLoadState((state)=>({
                status: loadingStatus,
                zoodb: null,
                error: null,
                _promise: promise,
                loadVersion: state.loadVersion
            }));
    };
    const doLoad = ()=>{
        $cdbe94ce1f253c89$var$debug(`Called doLoad()`);
        if (zooDbLoadState.status != "empty") {
            console.error(`useZooDbAccessState: Can't load() zoo, we've already loaded the zoo once.`);
            return;
        }
        let promise = loadZooDb();
        doSetupLoadStateFromPromise(promise, "loading");
    };
    const doReload = ()=>{
        $cdbe94ce1f253c89$var$debug(`Called doReload()`);
        if (zooDbLoadState.status != "loaded") {
            console.error(`useZooDbAccessState: Zoo isn't fully loaded yet, cannot reload().`);
            return;
        }
        let promise = reloadZooDb(zooDbLoadState.zoodb);
        doSetupLoadStateFromPromise(promise, "reloading");
    };
    (0, $babXZ$useEffect)(()=>{
        // debug(`useEffect function called`);
        if (zooDbLoadState.status === "empty" && triggerInitialLoad) doLoad();
    });
    // debug(`useZooDbAccessState(); called useEffect(); about to return accessor object ...`);
    return {
        status: zooDbLoadState.status,
        zoodb: zooDbLoadState.zoodb,
        error: zooDbLoadState.error,
        state: zooDbLoadState,
        // can be used as a second argument in useEffect() etc. to flag for
        // effects etc. that need to fire when the ZooDb load state and/or
        // contents change
        getStateDependencies: ()=>[
                zooDbLoadState.status,
                zooDbLoadState.loadversion
            ],
        //
        // Remember not to call load() directly in a component body, but rather
        // in an effect or an event callback!
        //
        load: doLoad,
        //
        // Remember not to call reload() directly in a component body, but
        // rather in an effect or an event callback!
        //
        reload: doReload
    };
}


export {$cdbe94ce1f253c89$export$f3662caf0be928f4 as useZooDbAccessState};
//# sourceMappingURL=useZooDbAccessState.js.map
