import debug_mod from 'debug';
const debug = debug_mod('zoodbtoolspreview.useZooDbAccessState');

import React, { useState, useEffect } from 'react';


/**
 * loadZooDb and reloadZooDb should be async functions.  The former returns a
 * freshly loaded ZooDb instance, the latter takes the zoodb to reload as its
 * only argument and returns the reloaded ZooDb instance.
 */
export function useZooDbAccessState({ loadZooDb, reloadZooDb, userLoadVersion, triggerInitialLoad })
{
    userLoadVersion ??= 0;
    triggerInitialLoad ??= true;

    // debug(`useZooDbAccessState()`);
    const [ zooDbLoadState, setZooDbLoadState ] = useState({
        // status = 'empty', 'loading', 'loaded', 'reloading', or 'load-error'
        // (the separate 'reloading' status is used so we can tailor the message
        // to the user; since we expect reloads to be much quicker than initial
        // loads)
        status: 'empty',
        // the current ZooDb instance object, if status == 'loaded' (or also if
        // we are in the status 'load-error' after a failed reload; in which
        // case the zoodb stays in the internal state but is not made public.
        // It's to make reloads faster.)
        zoodb: null,
        // the error that occurred, if status == 'load-error'
        error: null,
        // the promise that will resolve to a ZooDb instance object, if status
        // == 'loading' or status == 'reloading'
        _promise: null,
        // a flag that we increase to ensure the state changes after the zoo is
        // reloaded.  There are two flags, one controlling any externally
        // requested reloads (userLoadVersion) and one controlling internally
        // requested reloads.
        userLoadVersion,
        internalLoadVersion: 0,
    });

    debug(`useZooDbAccessState() - `, zooDbLoadState, { userLoadVersion });

    const doSetupLoadStateFromPromise = (promise, { loadingStatus, newUserLoadVersion }) => {
        promise.then(
            //
            // On promise accepted = zoo successfully loaded
            //
            (zoodb) => {
                // once the zoodb is loaded, we set the state to 'loaded' and
                // set the instance properly.
                setZooDbLoadState(state => {
                    let newInternalLoadVersion = (
                        (newUserLoadVersion != null) ? state.internalLoadVersion : (state.internalLoadVersion + 1)
                    );
                    return {
                        status: 'loaded',
                        zoodb,
                        error: null,
                        _promise: null,
                        userLoadVersion: newUserLoadVersion ?? state.userLoadVersion,
                        internalLoadVersion: newInternalLoadVersion,
                    };
                });
            },
            //
            // On promise rejected = error loading the zoo
            //
            (error) => {
                console.error(`Error while loading the zoo: `, error);
                setZooDbLoadState(state => ({
                    status: 'load-error',
                    error,
                    zoodb: state.zoodb, // keep zoodb pointer to speed up reloads
                    _promise: null,
                    // set new userLoadVersion even if the load has an error, because
                    // otherwise we want to continuously reload because it looks like the
                    // state has changed after the load-error.
                    userLoadVersion: newUserLoadVersion ?? state.userLoadVersion,
                    internalLoadVersion: state.internalLoadVersion,
                }));
            }
        );
        // NOTE: We keep the zoodb pointer because if there is an error during a
        // reload, we still would like to keep the zoodb object reference so
        // that we can still reload() the object.  We won't make this object
        // public (in the public returned state) while we're loading.
        setZooDbLoadState(state => ({
            status: loadingStatus,
            zoodb: state.zoodb,
            error: null,
            _promise: promise,
            userLoadVersion: state.userLoadVersion,
            internalLoadVersion: state.internalLoadVersion,
        }));
    };

    const doLoad = () => {
        debug(`Called doLoad()`);
        if (zooDbLoadState.status != 'empty') {
            console.error(
                `useZooDbAccessState: Can't load() zoo, we've already loaded the zoo once.`
            );
            return;
        }
        let promise = loadZooDb();
        doSetupLoadStateFromPromise(promise, { loadingStatus: 'loading' });
    };

    const doReload = (newUserLoadVersion) => {
        debug(`Called doReload()`);
        if (zooDbLoadState.status === 'empty') {
            console.error(
                `useZooDbAccessState: Zoo must undergo initial load() before `
                + `reload() can be called`
            );
            return;
        }
        if (zooDbLoadState.status === 'loading' || zooDbLoadState.status === 'reloading') {
            console.error(
                `useZooDbAccessState: Zoo is still loading, cannot reload().`
            );
            return;
        }
        if (zooDbLoadState.status === 'load-error' && zooDbLoadState.zoodb == null) {
            // there was an error in the initial load, we should try the initial
            // load again.
            console.log("*** Error in initial load, initiating initial load again ***");
            let promise = loadZooDb();
            doSetupLoadStateFromPromise(promise, { loadingStatus: 'loading', newUserLoadVersion });
            return;
        }
        let promise = reloadZooDb(zooDbLoadState.zoodb);
        doSetupLoadStateFromPromise(promise, { loadingStatus: 'reloading', newUserLoadVersion });
    };

    useEffect( () => {
        // debug(`useEffect function called`);
        if (zooDbLoadState.status === 'empty' && triggerInitialLoad) {
            doLoad();
        } else if (zooDbLoadState.status !== 'loading' && zooDbLoadState.status !== 'reloading'
                   && userLoadVersion != null && userLoadVersion > zooDbLoadState.userLoadVersion) {
            debug(`Detected userLoadVersion increase, reloading zoo [parent component requested reload]`);
            doReload(userLoadVersion);
        }
    } );

    // debug(`useZooDbAccessState(); called useEffect(); about to return accessor object ...`);

    // Do NOT set the zoodb field in the public returned state while we are in
    // the temporary 'loading' state, because we don't want preview components
    // accessing the zoodb instance while it is being modified.
    let publicZooDb = null;
    if (zooDbLoadState.status === 'loaded') {
        publicZooDb = zooDbLoadState.zoodb;
    }

    return {
        status: zooDbLoadState.status,

        zoodb: publicZooDb,

        error: zooDbLoadState.error,

        //state: zooDbLoadState,
        loadVersion: (zooDbLoadState.userLoadVersion << 16) | zooDbLoadState.internalLoadVersion,

        // can be used as a second argument in useEffect() etc. to flag for
        // effects etc. that need to fire when the ZooDb load state and/or
        // contents change
        getStateDependencies:
            () => [ zooDbLoadState.status, zooDbLoadState.userLoadVersion, zooDbLoadState.internalLoadVersion ],

        //
        // Remember not to call load() directly in a component body, but rather
        // in an effect or an event callback!
        //
        load: doLoad,

        //
        // Remember not to call reload() directly in a component body, but
        // rather in an effect or an event callback!
        //
        reload: doReload,
        
    };
}


