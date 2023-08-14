import "./all.css";
import {jsx as $b6z2V$jsx, jsxs as $b6z2V$jsxs, Fragment as $b6z2V$Fragment} from "react/jsx-runtime";
import $b6z2V$debug from "debug";
import {useRef as $b6z2V$useRef, useCallback as $b6z2V$useCallback, useEffect as $b6z2V$useEffect, useState as $b6z2V$useState} from "react";
import $b6z2V$reactselect from "react-select";
import {CitationSourceBase as $b6z2V$CitationSourceBase} from "@phfaist/zoodb/citationmanager/source/base";
import $b6z2V$escapehtml from "escape-html";
import {html_fragmentrenderer_get_style_information as $b6z2V$html_fragmentrenderer_get_style_information, ZooHtmlFragmentRenderer as $b6z2V$ZooHtmlFragmentRenderer, make_render_shorthands as $b6z2V$make_render_shorthands, make_and_render_document as $b6z2V$make_and_render_document} from "@phfaist/zoodb/zooflm";
import "@phfaist/zoodb/util/getfield";
import {iter_object_fields_recursive as $b6z2V$iter_object_fields_recursive} from "@phfaist/zoodb/util/objectinspector";
import {sqzhtml as $b6z2V$sqzhtml} from "@phfaist/zoodb/util/sqzhtml";
import {split_prefix_label as $b6z2V$split_prefix_label} from "@phfaist/zoodb/util/prefixlabel";
import $b6z2V$mimetypes from "mime-types";

function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}
//
// React components
//





const $e81314a651474654$var$debug = (0, $b6z2V$debug)("zoodbtoolspreview.ZooDbPreviewComponent");
// Utility; cf. https://stackoverflow.com/a/4642894/1694896
function $e81314a651474654$var$getAncestor(node, tagName) {
    tagName = tagName.toUpperCase();
    while(node){
        if (node.nodeType == 1 && node.nodeName == tagName) return node;
        node = node.parentNode;
    }
    return null;
}
function $e81314a651474654$export$3876c21e2ad479cc({ renderContent: renderContent, getMathJax: getMathJax, onLinkClick: onLinkClick, reloadPreviewDependencies: reloadPreviewDependencies, resetScrollPreviewDependencies: resetScrollPreviewDependencies }) {
    let renderContentDomNodeRef = (0, $b6z2V$useRef)(null);
    const callbackDivClick = (0, $b6z2V$useCallback)((event)=>{
        // debug(`Got click event on preview content <div>. `, event);
        const a = $e81314a651474654$var$getAncestor(event.target, "a");
        // debug(`ancestor <a> → `, a);
        if (a == null) return;
        if (onLinkClick == null) // no custom callback for links
        return;
        const targetHref = a.getAttribute("href");
        if (!targetHref) // not a link, or we don't have a href="..." attribute ??
        return;
        let targetInternalAnchor = null;
        if (targetHref.startsWith("#")) targetInternalAnchor = targetHref.slice(1);
        $e81314a651474654$var$debug(`Clicked on a link in <div> content preview →`, {
            a: a,
            targetHref: targetHref,
            targetInternalAnchor: targetInternalAnchor
        });
        return onLinkClick(event, {
            a: a,
            targetHref: targetHref,
            targetInternalAnchor: targetInternalAnchor
        });
    }, [
        onLinkClick
    ]);
    (0, $b6z2V$useEffect)(()=>{
        let cancelFlag = false;
        let offloadCallbackFnList = [];
        let callOffloadCallbackFns = ()=>{
            if (offloadCallbackFnList.length > 0) {
                let flist = [
                    ...offloadCallbackFnList
                ];
                offloadCallbackFnList = [];
                for (const f of flist)try {
                    f();
                } catch (err) {
                    console.error(`Caught error in cleanup callback: `, err);
                }
            }
        };
        let registerRenderPreviewCleanupCallback = (callback)=>{
            if (callback) offloadCallbackFnList.push(callback);
        };
        const renderAndTypesetContent = async ()=>{
            const domNode = renderContentDomNodeRef.current;
            domNode.addEventListener("click", callbackDivClick);
            offloadCallbackFnList.push(()=>domNode.removeEventListener("click", callbackDivClick));
            //
            // render the content
            //
            const { htmlContent: htmlContent } = await renderContent({
                registerRenderPreviewCleanupCallback: registerRenderPreviewCleanupCallback
            });
            if (cancelFlag) {
                callOffloadCallbackFns();
                return;
            }
            if (htmlContent != null) {
                domNode.innerHTML = htmlContent;
                let resetScroll = true;
                if (resetScrollPreviewDependencies) {
                    let nodeDeps = JSON.parse(domNode.dataset.zoodbResetScrollDeps ?? "[]");
                    resetScroll = resetScrollPreviewDependencies.reduce((accum, value, index)=>{
                        return accum || value !== nodeDeps[index];
                    }, false);
                    domNode.dataset.zoodbResetScrollDeps = JSON.stringify([
                        ...resetScrollPreviewDependencies
                    ]);
                }
                if (resetScroll) //
                // scroll to the top of the preview pane
                //
                domNode.scrollTo({
                    top: 0
                });
                //
                // render math if applicable
                //
                if (getMathJax) {
                    const MJ = getMathJax();
                    if (MJ) await MJ.typesetPromise([
                        domNode
                    ]);
                }
            }
            if (cancelFlag) {
                callOffloadCallbackFns();
                return;
            }
        };
        renderAndTypesetContent();
        return ()=>{
            cancelFlag = true;
            callOffloadCallbackFns();
        };
    }, [
        ...reloadPreviewDependencies
    ]);
    return {
        renderContentDomNodeRef: renderContentDomNodeRef
    };
}
function $e81314a651474654$export$99ec54c3fb7c642d(props) {
    const { renderContent: renderContent, getMathJax: getMathJax, onLinkClick: onLinkClick } = props;
    const { renderContentDomNodeRef: renderContentDomNodeRef } = $e81314a651474654$export$3876c21e2ad479cc({
        renderContent: renderContent,
        getMathJax: getMathJax,
        onLinkClick: onLinkClick
    });
    return /*#__PURE__*/ (0, $b6z2V$jsx)("div", {
        className: "zoodb-preview-content",
        ref: renderContentDomNodeRef
    });
}
function $e81314a651474654$export$fd3ba78121e14bde(props) {
    const { zooDbAccess: zooDbAccess, objectType: objectType, objectId: objectId, renderObject: renderObject, getMathJax: getMathJax, onLinkClick: onLinkClick } = props;
    const renderContent = async ({ registerRenderPreviewCleanupCallback: registerRenderPreviewCleanupCallback })=>{
        const zoodb = zooDbAccess.zoodb;
        if (zoodb == null) {
            // still loading (TODO; provide more information on loading state ...)
            $e81314a651474654$var$debug(`zoodb is null, the zoo is probably loading. Won't update preview for now.`);
            return {
                htmlContent: null
            };
        }
        let object = null;
        if (objectType && objectId && zoodb.objects[objectType]) object = zoodb.objects[objectType][objectId];
        if (object != null) {
            const result = await renderObject({
                zoodb: zoodb,
                objectType: objectType,
                objectId: objectId,
                object: object,
                registerRenderPreviewCleanupCallback: registerRenderPreviewCleanupCallback
            });
            $e81314a651474654$var$debug(`Rendered object preview HTML → `, result);
            return {
                htmlContent: result.htmlContent
            };
        }
        let pleaseSelectHtmlMessage = `
<article class="zoodb-preview-content-please-select-object">
<p>Please use the selection boxes above to select a zoo entry to display.</p>
</article>
`;
        $e81314a651474654$var$debug(`Selection is probably incomplete, rendered user message`);
        return {
            htmlContent: pleaseSelectHtmlMessage
        };
    };
    const { renderContentDomNodeRef: renderContentDomNodeRef } = $e81314a651474654$export$3876c21e2ad479cc({
        renderContent: renderContent,
        getMathJax: getMathJax,
        onLinkClick: onLinkClick,
        reloadPreviewDependencies: [
            objectType,
            objectId,
            zooDbAccess.loadVersion
        ],
        resetScrollPreviewDependencies: [
            objectType,
            objectId
        ]
    });
    let previewMessages = null;
    if (zooDbAccess.status === "loading") previewMessages = /*#__PURE__*/ (0, $b6z2V$jsxs)((0, $b6z2V$Fragment), {
        children: [
            /*#__PURE__*/ (0, $b6z2V$jsx)("p", {
                className: "info",
                children: "⏳ Loading, please wait ..."
            }),
            /*#__PURE__*/ (0, $b6z2V$jsxs)("div", {
                className: "info",
                children: [
                    /*#__PURE__*/ (0, $b6z2V$jsx)("p", {
                        className: "small-caption",
                        children: "Please be patient while the zoo is loading. This task could take a few minutes!"
                    }),
                    /*#__PURE__*/ (0, $b6z2V$jsx)("p", {
                        className: "small-caption",
                        children: "You can open your browser's Javascript console to monitor progress."
                    })
                ]
            })
        ]
    });
    else if (zooDbAccess.status === "reloading") previewMessages = /*#__PURE__*/ (0, $b6z2V$jsx)((0, $b6z2V$Fragment), {
        children: /*#__PURE__*/ (0, $b6z2V$jsx)("p", {
            className: "info small-caption",
            children: "⏳ Reloading, please wait ..."
        })
    });
    else if (zooDbAccess.status === "load-error") {
        let errstr;
        try {
            errstr = "" + zooDbAccess.error;
        } catch (e) {
            console.error(`Can't convert error to string: `, zooDbAccess.error);
            errstr = "(unknown error, cf. JavaScript console for details)";
        }
        previewMessages = /*#__PURE__*/ (0, $b6z2V$jsxs)("div", {
            className: "error",
            children: [
                /*#__PURE__*/ (0, $b6z2V$jsx)("p", {
                    children: "Error while loading the zoo!"
                }),
                /*#__PURE__*/ (0, $b6z2V$jsx)("pre", {
                    className: "small-caption",
                    children: errstr
                }),
                /*#__PURE__*/ (0, $b6z2V$jsx)("p", {
                    className: "small-caption",
                    children: "Consult your browser's JavaScript console for additional information that might be helpful for debugging this issue."
                })
            ]
        });
    }
    $e81314a651474654$var$debug(`ZooDbPreviewContentComponent, render`, {
        zooDbAccess: zooDbAccess
    });
    return /*#__PURE__*/ (0, $b6z2V$jsxs)((0, $b6z2V$Fragment), {
        children: [
            /*#__PURE__*/ (0, $b6z2V$jsx)("div", {
                className: "zoodb-preview-messages",
                children: previewMessages
            }),
            /*#__PURE__*/ (0, $b6z2V$jsx)("div", {
                className: "zoodb-preview-content",
                ref: renderContentDomNodeRef
            })
        ]
    });
}







const $042179933fe4954c$var$debug = (0, $b6z2V$debug)("zoodbtoolspreview.ZooDbSelectObjectTypeAndIdComponent");
function $042179933fe4954c$export$82b75c6b8a82ac20(props) {
    let { zoodb: zoodb, objectType: objectType, objectId: objectId, onChangeObjectTypeAndId: onChangeObjectTypeAndId } = props;
    objectType ||= "";
    objectId ||= "";
    let isDisabled = true;
    let selectObjectTypeOptions = [];
    let selectObjectIdOptions = [];
    if (zoodb != null) {
        isDisabled = false;
        let allObjectTypes = Object.keys(zoodb.objects);
        allObjectTypes.sort();
        selectObjectTypeOptions = allObjectTypes.map((x)=>({
                value: x,
                label: x
            }));
        selectObjectTypeOptions.push({
            value: "",
            label: "(select object type)"
        });
        if (objectType && zoodb.objects[objectType]) {
            let allObjectIds = Object.keys(zoodb.objects[objectType]);
            allObjectIds.sort();
            selectObjectIdOptions = allObjectIds.map((x)=>({
                    value: x,
                    label: x
                }));
        }
        selectObjectIdOptions.push({
            value: "",
            label: "(select object)"
        });
    }
    return /*#__PURE__*/ (0, $b6z2V$jsxs)("div", {
        className: "zoodb-preview-select-bar",
        children: [
            /*#__PURE__*/ (0, $b6z2V$jsx)((0, $b6z2V$reactselect), {
                className: "zoodb-preview-select-objecttype",
                classNamePrefix: "zoodb-preview-react-select",
                isDisabled: isDisabled,
                value: {
                    value: objectType,
                    label: objectType
                },
                onChange: (newValue)=>onChangeObjectTypeAndId(newValue.value, null),
                options: selectObjectTypeOptions
            }),
            /*#__PURE__*/ (0, $b6z2V$jsx)((0, $b6z2V$reactselect), {
                className: "zoodb-preview-select-objectid",
                classNamePrefix: "zoodb-preview-react-select",
                isDisabled: isDisabled,
                value: {
                    value: objectId,
                    label: objectId
                },
                onChange: (newValue)=>onChangeObjectTypeAndId(objectType, newValue.value),
                options: selectObjectIdOptions
            })
        ]
    });
}








var $cdbe94ce1f253c89$exports = {};

$parcel$export($cdbe94ce1f253c89$exports, "useZooDbAccessState", () => $cdbe94ce1f253c89$export$f3662caf0be928f4);


const $cdbe94ce1f253c89$var$debug = (0, $b6z2V$debug)("zoodbtoolspreview.useZooDbAccessState");
function $cdbe94ce1f253c89$export$f3662caf0be928f4({ loadZooDb: loadZooDb, reloadZooDb: reloadZooDb, userLoadVersion: userLoadVersion, triggerInitialLoad: triggerInitialLoad }) {
    userLoadVersion ??= 0;
    triggerInitialLoad ??= true;
    // debug(`useZooDbAccessState()`);
    const [zooDbLoadState, setZooDbLoadState] = (0, $b6z2V$useState)({
        // status = 'empty', 'loading', 'loaded', 'reloading', or 'load-error'
        // (the separate 'reloading' status is used so we can tailor the message
        // to the user; since we expect reloads to be much quicker than initial
        // loads)
        status: "empty",
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
        userLoadVersion: // a flag that we increase to ensure the state changes after the zoo is
        // reloaded.  There are two flags, one controlling any externally
        // requested reloads (userLoadVersion) and one controlling internally
        // requested reloads.
        userLoadVersion,
        internalLoadVersion: 0
    });
    $cdbe94ce1f253c89$var$debug(`useZooDbAccessState() - `, zooDbLoadState, {
        userLoadVersion: userLoadVersion
    });
    const doSetupLoadStateFromPromise = (promise, { loadingStatus: loadingStatus, newUserLoadVersion: newUserLoadVersion })=>{
        promise.then(//
        // On promise accepted = zoo successfully loaded
        //
        (zoodb)=>{
            // once the zoodb is loaded, we set the state to 'loaded' and
            // set the instance properly.
            setZooDbLoadState((state)=>{
                let newInternalLoadVersion = newUserLoadVersion != null ? state.internalLoadVersion : state.internalLoadVersion + 1;
                return {
                    status: "loaded",
                    zoodb: zoodb,
                    error: null,
                    _promise: null,
                    userLoadVersion: newUserLoadVersion ?? state.userLoadVersion,
                    internalLoadVersion: newInternalLoadVersion
                };
            });
        }, //
        // On promise rejected = error loading the zoo
        //
        (error)=>{
            console.error(`Error while loading the zoo: `, error);
            setZooDbLoadState((state)=>({
                    status: "load-error",
                    error: error,
                    zoodb: state.zoodb,
                    _promise: null,
                    userLoadVersion: state.userLoadVersion,
                    internalLoadVersion: state.internalLoadVersion
                }));
        });
        // NOTE: We keep the zoodb pointer because if there is an error during a
        // reload, we still would like to keep the zoodb object reference so
        // that we can still reload() the object.  We won't make this object
        // public (in the public returned state) while we're loading.
        setZooDbLoadState((state)=>({
                status: loadingStatus,
                zoodb: state.zoodb,
                error: null,
                _promise: promise,
                userLoadVersion: state.userLoadVersion,
                internalLoadVersion: state.internalLoadVersion
            }));
    };
    const doLoad = ()=>{
        $cdbe94ce1f253c89$var$debug(`Called doLoad()`);
        if (zooDbLoadState.status != "empty") {
            console.error(`useZooDbAccessState: Can't load() zoo, we've already loaded the zoo once.`);
            return;
        }
        let promise = loadZooDb();
        doSetupLoadStateFromPromise(promise, {
            loadingStatus: "loading"
        });
    };
    const doReload = (newUserLoadVersion)=>{
        $cdbe94ce1f253c89$var$debug(`Called doReload()`);
        if (zooDbLoadState.status === "empty") {
            console.error(`useZooDbAccessState: Zoo must undergo initial load() before ` + `reload() can be called`);
            return;
        }
        if (zooDbLoadState.status === "loading" || zooDbLoadState.status === "reloading") {
            console.error(`useZooDbAccessState: Zoo is still loading, cannot reload().`);
            return;
        }
        if (zooDbLoadState.status === "load-error" && zooDbLoadState.zoodb == null) {
            // there was an error in the initial load, we should try the initial
            // load again.
            console.log("*** Error in initial load, initiating initial load again ***");
            let promise = loadZooDb();
            doSetupLoadStateFromPromise(promise, {
                loadingStatus: "loading",
                newUserLoadVersion: newUserLoadVersion
            });
            return;
        }
        let promise = reloadZooDb(zooDbLoadState.zoodb);
        doSetupLoadStateFromPromise(promise, {
            loadingStatus: "reloading",
            newUserLoadVersion: newUserLoadVersion
        });
    };
    (0, $b6z2V$useEffect)(()=>{
        // debug(`useEffect function called`);
        if (zooDbLoadState.status === "empty" && triggerInitialLoad) doLoad();
        else if (zooDbLoadState.status !== "loading" && zooDbLoadState.status !== "reloading" && userLoadVersion != null && userLoadVersion > zooDbLoadState.userLoadVersion) {
            $cdbe94ce1f253c89$var$debug(`Detected userLoadVersion increase, reloading zoo [parent component requested reload]`);
            doReload(userLoadVersion);
        }
    });
    // debug(`useZooDbAccessState(); called useEffect(); about to return accessor object ...`);
    // Do NOT set the zoodb field in the public returned state while we are in
    // the temporary 'loading' state, because we don't want preview components
    // accessing the zoodb instance while it is being modified.
    let publicZooDb = null;
    if (zooDbLoadState.status === "loaded") publicZooDb = zooDbLoadState.zoodb;
    return {
        status: zooDbLoadState.status,
        zoodb: publicZooDb,
        error: zooDbLoadState.error,
        //state: zooDbLoadState,
        loadVersion: zooDbLoadState.userLoadVersion << 16 | zooDbLoadState.internalLoadVersion,
        // can be used as a second argument in useEffect() etc. to flag for
        // effects etc. that need to fire when the ZooDb load state and/or
        // contents change
        getStateDependencies: ()=>[
                zooDbLoadState.status,
                zooDbLoadState.userLoadVersion,
                zooDbLoadState.internalLoadVersion
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



const $55cc9c1ed9922b9a$var$debug = (0, $b6z2V$debug)("zoodbtoolspreview.ZooDbPreviewComponent");
function $55cc9c1ed9922b9a$export$e01b7c63ae589d4b(props) {
    $55cc9c1ed9922b9a$var$debug(`ZooDbPreviewComponent()`, {
        props: props
    });
    let { loadZooDb: loadZooDb, reloadZooDb: reloadZooDb, renderObject: renderObject, initialObjectType: initialObjectType, initialObjectId: initialObjectId, getMathJax: getMathJax, commandButtonsUseReload: // incompleteSelectionRenderHtml,
    // CommandButtonsComponent,
    commandButtonsUseReload, commandButtonsToggleDarkModeCallback: commandButtonsToggleDarkModeCallback, userLoadVersion: userLoadVersion } = props;
    initialObjectType ||= "";
    initialObjectId ||= "";
    // React states and effects --
    const [selectedObjectTypeAndId, setSelectedObjectTypeAndId] = (0, $b6z2V$useState)({
        objectType: initialObjectType,
        objectId: initialObjectId
    });
    //const [ previewingZooVersion, setPreviewingZooVersion ] = useState(0);
    const zooDbAccess = (0, $cdbe94ce1f253c89$export$f3662caf0be928f4)({
        loadZooDb: loadZooDb,
        reloadZooDb: reloadZooDb,
        userLoadVersion: userLoadVersion
    });
    $55cc9c1ed9922b9a$var$debug(`got ZooDbAccess object: `, zooDbAccess);
    // render --
    const { objectType: objectType, objectId: objectId } = selectedObjectTypeAndId;
    const onLinkClick = (event, { a: a, targetHref: targetHref, targetInternalAnchor: targetInternalAnchor })=>{
        if (targetInternalAnchor != null) {
            const element = document.getElementById(targetInternalAnchor);
            if (element != null) {
                element.scrollIntoView(true);
                element.classList.add("visual-highlight");
                setTimeout(()=>element.classList.remove("visual-highlight"), 1000 // milliseconds
                );
                event.preventDefault();
            }
            return;
        }
        const url = new URL(targetHref);
        $55cc9c1ed9922b9a$var$debug(`Clicked on a link, url = `, url);
        if (url.protocol.toLowerCase() === "jsOnLinkClick:".toLowerCase()) {
            // meant to be captured by our callback
            const action = url.pathname;
            const q = JSON.parse(url.searchParams.get("q"));
            if (action === "objectLink") {
                setSelectedObjectTypeAndId({
                    objectType: q.objectType,
                    objectId: q.objectId
                });
                if (q.anchor) // TODO: scroll to a certain anchor, if applicable.
                console.log(`Not yet implemented: scroll to #${q.anchor} after load`);
                event.preventDefault();
                return;
            }
            throw new Error(`Invalid internal jsOnLinkClick action: ‘${action}’`);
        }
        return;
    };
    let commandButtonsContents = [];
    if (commandButtonsUseReload) {
        const canReload = zooDbAccess.status === "loaded" || zooDbAccess.status === "load-error" || zooDbAccess.status === "empty";
        commandButtonsContents.push(/*#__PURE__*/ (0, $b6z2V$jsx)("button", {
            onClick: ()=>zooDbAccess.reload(),
            disabled: !canReload,
            children: "RELOAD ZOO"
        }));
    }
    if (commandButtonsToggleDarkModeCallback != null && commandButtonsToggleDarkModeCallback !== false) commandButtonsContents.push(/*#__PURE__*/ (0, $b6z2V$jsx)("button", {
        onClick: (event)=>commandButtonsToggleDarkModeCallback(event),
        children: "\uD83C\uDF12"
    }));
    if (commandButtonsContents.length > 0) commandButtonsContents = /*#__PURE__*/ (0, $b6z2V$jsx)("div", {
        className: "zoodb-preview-command-buttons",
        children: commandButtonsContents
    });
    $55cc9c1ed9922b9a$var$debug(`ZooDbPreviewComponent, render`, {
        zooDbAccess: zooDbAccess,
        selectedObjectTypeAndId: selectedObjectTypeAndId
    });
    return /*#__PURE__*/ (0, $b6z2V$jsxs)("div", {
        className: "ZooDbPreviewComponent",
        children: [
            /*#__PURE__*/ (0, $b6z2V$jsx)((0, $042179933fe4954c$export$82b75c6b8a82ac20), {
                zoodb: zooDbAccess.zoodb,
                objectType: selectedObjectTypeAndId.objectType,
                objectId: selectedObjectTypeAndId.objectId,
                onChangeObjectTypeAndId: (objectType, objectId)=>setSelectedObjectTypeAndId({
                        objectType: objectType,
                        objectId: objectId
                    })
            }),
            /*#__PURE__*/ (0, $b6z2V$jsx)((0, $e81314a651474654$export$fd3ba78121e14bde), {
                zooDbAccess: zooDbAccess,
                objectType: objectType,
                objectId: objectId,
                renderObject: renderObject,
                getMathJax: getMathJax,
                onLinkClick: onLinkClick
            }),
            commandButtonsContents,
            props.children
        ]
    });
}



var $101c10e2432771ff$exports = {};

$parcel$export($101c10e2432771ff$exports, "CitationSourceApiPlaceholder", () => $101c10e2432771ff$export$143e0941d05399df);

class $101c10e2432771ff$export$143e0941d05399df extends (0, $b6z2V$CitationSourceBase) {
    constructor(options){
        options ||= {};
        options.placeholder_name ??= "[custom citation source api placeholder]";
        const override_options = {
            source_name: `${options.placeholder_name} (placeholder)`,
            chunk_size: Infinity,
            chunk_retrieve_delay_ms: 0,
            cache_store_options: {
                cache_duration_ms: 0
            }
        };
        const default_options = {
            cite_prefix: options.cite_prefix,
            search_in_compiled_cache: {}
        };
        super(override_options, options, default_options);
        this.search_in_compiled_cache = this.options.search_in_compiled_cache ?? {};
    }
    async run_retrieve_chunk(id_list) {
        for (let cite_key of id_list){
            cite_key = cite_key.trim();
            const cite_key_encoded = encodeURIComponent(cite_key);
            let cached_compiled_flm_text = this.search_in_compiled_cache?.[`${this.cite_prefix}:${cite_key}`]?.value?.citation_text;
            if (!cached_compiled_flm_text) // other form of cache, e.g., JSON exported references
            cached_compiled_flm_text = this.search_in_compiled_cache?.[this.cite_prefix]?.[cite_key];
            if (cached_compiled_flm_text) {
                this.citation_manager.store_citation(this.cite_prefix, cite_key, {
                    _ready_formatted: {
                        flm: cached_compiled_flm_text
                    }
                }, this.cache_store_options);
                continue;
            }
            let flm_text = null;
            if (typeof this.options.title === "function") flm_text = this.options.title(cite_key);
            else flm_text = `${this.options.title} \\verbcode{${cite_key}}`;
            let test_url = this.options.test_url(this.cite_prefix, cite_key);
            if (test_url) flm_text += ` — \\href{${test_url}}{TEST→}`;
            let csljsondata = {
                _ready_formatted: {
                    flm: flm_text
                }
            };
            this.citation_manager.store_citation(this.cite_prefix, cite_key, csljsondata, this.cache_store_options);
        }
    }
}


var $d30e7bcdac759df9$exports = {};

$parcel$export($d30e7bcdac759df9$exports, "installFlmContentStyles", () => $d30e7bcdac759df9$export$42d3a9814cd5af4b);
$parcel$export($d30e7bcdac759df9$exports, "installZooFlmEnvironmentLinksAndGraphicsHandlers", () => $d30e7bcdac759df9$export$73d82f0ed63f6ba5);
$parcel$export($d30e7bcdac759df9$exports, "simpleRenderObjectWithFlm", () => $d30e7bcdac759df9$export$22ae542d2b30e3c1);








const $d30e7bcdac759df9$var$debug = (0, $b6z2V$debug)("zoodbpreview.renderFlm");
function $d30e7bcdac759df9$export$42d3a9814cd5af4b(documentObject) {
    documentObject ??= window.document;
    const styinfo = $b6z2V$html_fragmentrenderer_get_style_information(new $b6z2V$ZooHtmlFragmentRenderer());
    const styElement = documentObject.createElement("style");
    styElement.setAttribute("type", "text/css");
    styElement.innerText = `
/* FLM - global */
${styinfo.css_global}
/* FLM - content */
${styinfo.css_content}
`;
    documentObject.head.appendChild(styElement);
    return styElement;
}
function $d30e7bcdac759df9$export$73d82f0ed63f6ba5(zoo_flm_environment, { getGraphicsFileContents: getGraphicsFileContents }) {
    zoo_flm_environment.graphics_collection.src_url_resolver_fn = ({ graphics_resource: graphics_resource, render_context: render_context, source_path: source_path })=>{
        const resolvedSourcePath = graphics_resource.source_info.resolved_source;
        const imageData = getGraphicsFileContents(resolvedSourcePath, {
            graphics_resource: graphics_resource,
            render_context: render_context,
            source_path: source_path
        });
        let mimeType = null;
        if (resolvedSourcePath.endsWith(".svg")) // make sure this mime type is correct!
        mimeType = "image/svg+xml";
        if (!mimeType) mimeType = (0, $b6z2V$mimetypes).lookup(resolvedSourcePath);
        if (!mimeType) mimeType = "image/*";
        const blob = new Blob([
            imageData
        ], {
            type: mimeType
        });
        const src_url = URL.createObjectURL(blob);
        $d30e7bcdac759df9$var$debug(`created Blob Object Url ${src_url} for ${resolvedSourcePath} with mime type ${mimeType}`);
        if (render_context.registerRenderPreviewCleanupCallback != null) render_context.registerRenderPreviewCleanupCallback(()=>{
            URL.revokeObjectURL(src_url);
            $d30e7bcdac759df9$var$debug(`revoked Blob Object Url ${src_url}`);
        });
        else console.warn(`Allocated a Blob URL with URL.createObjectURL(), but there was no ` + `registerRenderPreviewCleanupCallback set to register the URL ` + `to be revoked/freed after use`);
        return {
            src_url: src_url
        };
    };
    //
    // Override links to other objects, so we can intercept them.
    //
    zoo_flm_environment.ref_resolver.target_href_resolver = (ref_instance, render_context)=>{
        const { target_href: target_href, ref_type: ref_type, ref_label: ref_label } = ref_instance ?? {};
        if (target_href != null) {
            // maybe fix target_href?
            const url = new URL(target_href);
            if (url.protocol == "zoodbobjectref:") {
                // this is a reference set by zoodb/zooflm/zooprocessor.js
                //
                // [Note, we seem to get all the slashes as part of the
                // pathname in "protocol:///code/ref" when running in the
                // browser]
                const objectRef = url.pathname.replace(/^\/+/, "");
                const [objectType, objectId] = (0, $b6z2V$split_prefix_label)(objectRef);
                let qData = {
                    objectType: objectType,
                    objectId: objectId
                };
                if (url.hash && url.hash.startsWith("#")) qData.anchor = decodeURIComponent(url.hash.slice(1));
                return `jsOnLinkClick:objectLink` + `?q=${encodeURIComponent(JSON.stringify(qData))}`;
            }
            return target_href;
        }
        const alertMsg = `Could not resolve link reference to ‘${ref_type}:${ref_label}’`;
        return `javascript:alert(${JSON.stringify(alertMsg)}`;
    };
}
function $d30e7bcdac759df9$export$22ae542d2b30e3c1({ zoodb: zoodb, objectType: objectType, objectId: objectId, object: object, registerRenderPreviewCleanupCallback: registerRenderPreviewCleanupCallback }) {
    const zoo_flm_environment = zoodb.zoo_flm_environment;
    const schema = zoodb.schemas[objectType];
    $d30e7bcdac759df9$var$debug(`renderObject(): ${objectType} ${objectId}`);
    const render_doc_fn = (render_context)=>{
        const R = $b6z2V$make_render_shorthands({
            render_context: render_context
        });
        const { ne: ne, rdr: rdr, ref: ref } = R;
        render_context.registerRenderPreviewCleanupCallback = registerRenderPreviewCleanupCallback;
        let html = `<article class="object_render">`;
        html += (0, $b6z2V$sqzhtml)`
<h1>Object: ${(0, $b6z2V$escapehtml)(objectType)} <code>${(0, $b6z2V$escapehtml)(objectId)}</code></h1>
`;
        for (const { fieldname: fieldname, fieldvalue: fieldvalue, fieldschema: fieldschema } of (0, $b6z2V$iter_object_fields_recursive)(object, schema)){
            if (fieldvalue == null) continue;
            let rendered = null;
            try {
                rendered = rdr(fieldvalue);
            } catch (err) {
                let errstr = null;
                if (!err) errstr = "??";
                else if (typeof err === "object" && "__class__" in err && "msg" in err) errstr = err.msg; //zooflm.repr(err);
                else if (typeof err === "object" && "toString" in err) errstr = "" + err;
                else errstr = "???";
                rendered = `<span class="error">(Render error: ${(0, $b6z2V$escapehtml)(errstr)})</span>`;
            }
            html += (0, $b6z2V$sqzhtml)`
<h2 class="fieldname">${(0, $b6z2V$escapehtml)(fieldname)}</h2>
<div class="fieldcontent">
${rendered}
</div>
`;
        }
        html += `

<RENDER_ENDNOTES/>

`;
        html += `</article>`;
        return html;
    };
    let htmlContent = $b6z2V$make_and_render_document({
        zoo_flm_environment: zoo_flm_environment,
        render_doc_fn: render_doc_fn,
        //doc_metadata,
        render_endnotes: true,
        flm_error_policy: "continue"
    });
    return {
        htmlContent: htmlContent
    };
}




export {$e81314a651474654$export$3876c21e2ad479cc as useLoadPreviewContentEffect, $e81314a651474654$export$99ec54c3fb7c642d as ZooDbPreviewContentBaseComponent, $e81314a651474654$export$fd3ba78121e14bde as ZooDbPreviewContentComponent, $042179933fe4954c$export$82b75c6b8a82ac20 as ZooDbSelectObjectTypeAndIdComponent, $55cc9c1ed9922b9a$export$e01b7c63ae589d4b as ZooDbPreviewComponent, $cdbe94ce1f253c89$export$f3662caf0be928f4 as useZooDbAccessState, $101c10e2432771ff$export$143e0941d05399df as CitationSourceApiPlaceholder, $d30e7bcdac759df9$export$42d3a9814cd5af4b as installFlmContentStyles, $d30e7bcdac759df9$export$22ae542d2b30e3c1 as simpleRenderObjectWithFlm, $d30e7bcdac759df9$export$73d82f0ed63f6ba5 as installZooFlmEnvironmentLinksAndGraphicsHandlers};
//# sourceMappingURL=all.js.map
