import debug_mod from 'debug';
const debug = debug_mod('zoodbtoolspreview.ZooDbPreviewComponent');

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Select from 'react-select';

import './ZooDbPreviewContentComponent_style.scss';


// Utility; cf. https://stackoverflow.com/a/4642894/1694896
function getAncestor(node, tagName)
{
    tagName = tagName.toUpperCase();
    while (node) {
        if (node.nodeType == 1 && node.nodeName == tagName) {
            return node;
        }
        node = node.parentNode;
    }
    return null;
};




// -----------------------------------------------------------------------------



export function useLoadPreviewContentEffect({
    renderContent, getMathJax, onLinkClick,
    reloadPreviewDependencies,
    resetScrollPreviewDependencies,
})
{
    let renderContentDomNodeRef = useRef(null);

    const callbackDivClick = useCallback((event) => {
        // debug(`Got click event on preview content <div>. `, event);

        const a = getAncestor(event.target, "a");

        // debug(`ancestor <a> → `, a);

        if (a == null) {
            return;
        }

        if (onLinkClick == null) {
            // no custom callback for links
            return;
        }

        const targetHref = a.getAttribute("href");
        if (!targetHref) {
            // not a link, or we don't have a href="..." attribute ??
            return;
        }

        let targetInternalAnchor = null;
        if (targetHref.startsWith("#")) {
            targetInternalAnchor = targetHref.slice(1);
        }

        debug(`Clicked on a link in <div> content preview →`,
              { a, targetHref, targetInternalAnchor });
        
        return onLinkClick(event, { a, targetHref, targetInternalAnchor });
    }, [onLinkClick]);

    useEffect(
        () => {
            let cancelFlag = false;
            let offloadCallbackFnList = [];
            let callOffloadCallbackFns = () => {
                if (offloadCallbackFnList.length > 0) {
                    let flist = [...offloadCallbackFnList];
                    offloadCallbackFnList = [];
                    for (const f of flist) {
                        try {
                            f();
                        } catch (err) {
                            console.error(`Caught error in cleanup callback: `, err);
                        }
                    }
                }
            };
            let registerRenderPreviewCleanupCallback = (callback) => {
                if (callback) {
                    offloadCallbackFnList.push(callback);
                }
            };

            const renderAndTypesetContent = async () => {

                const domNode = renderContentDomNodeRef.current;

                domNode.addEventListener('click', callbackDivClick);
                offloadCallbackFnList.push(
                    () => domNode.removeEventListener('click', callbackDivClick)
                );

                //
                // render the content
                //
                const { htmlContent } = await renderContent({
                    registerRenderPreviewCleanupCallback,
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
                        resetScroll = resetScrollPreviewDependencies.reduce(
                            (accum, value, index) => {
                                return accum || (value !== nodeDeps[index]);
                            },
                            false
                        );
                        domNode.dataset.zoodbResetScrollDeps =
                            JSON.stringify([...resetScrollPreviewDependencies]);
                    }
                    if (resetScroll) {
                        //
                        // scroll to the top of the preview pane
                        //
                        domNode.scrollTo({top: 0});
                    }

                    //
                    // render math if applicable
                    //
                    if (getMathJax) {
                        const MJ = getMathJax();
                        if (MJ) {
                            await MJ.typesetPromise([domNode]);
                        }
                    }
                }

                if (cancelFlag) {
                    callOffloadCallbackFns();
                    return;
                }
            };

            renderAndTypesetContent();

            return () => {
                cancelFlag = true;
                callOffloadCallbackFns();
            };
        },
        [...reloadPreviewDependencies]
    );

    return { renderContentDomNodeRef };
}




// -----------------------------------------------------------------------------


export function ZooDbPreviewContentBaseComponent(props)
{
    const {
        renderContent,
        getMathJax,
        onLinkClick,
        //previewingZooVersion, // used to re-render component when zoo is updated
    } = props;

    const { renderContentDomNodeRef } = useLoadPreviewContentEffect({
        renderContent, getMathJax, onLinkClick,

    });

    return (
        <div className="zoodb-preview-content" ref={renderContentDomNodeRef} />
    );
}



// -----------------------------------------------------------------------------


export function ZooDbPreviewContentComponent(props)
{
    const {
        zooDbAccessState,
        objectType,
        objectId,
        renderObject,
        getMathJax,
        onLinkClick,
        //previewingZooVersion, // used to re-render component when zoo is updated
    } = props;

    const renderContent = async ({ registerRenderPreviewCleanupCallback }) => {

        const zoodb = zooDbAccessState.zoodb;

        if (zoodb == null) {
            // still loading (TODO; provide more information on loading state ...)
            debug(`zoodb is null, the zoo is probably loading. Won't update preview for now.`);
            return { htmlContent: null };
        }

        let object = null;
        if (objectType && objectId && zoodb.objects[objectType]) {
            object = zoodb.objects[objectType][objectId];
        }

        if (object != null) {
            const result =
                  await renderObject({zoodb, objectType, objectId, object,
                                      registerRenderPreviewCleanupCallback});

            debug(`Rendered object preview HTML → `, result);

            return { htmlContent: result.htmlContent };
        }

        let pleaseSelectHtmlMessage = `
<article class="zoodb-preview-content-please-select-object">
<p>Please use the selection boxes above to select a zoo entry to display.</p>
</article>
`;
        
        debug(`Selection is probably incomplete, rendered user message`);

        return { htmlContent: pleaseSelectHtmlMessage };
    };
    
    const { renderContentDomNodeRef } = useLoadPreviewContentEffect({
        renderContent, getMathJax, onLinkClick,
        reloadPreviewDependencies:
            [ objectType, objectId, zooDbAccessState.loadVersion ],
        resetScrollPreviewDependencies: [ objectType, objectId ],
    });

    let previewMessages = null;

    if (zooDbAccessState.status === 'loading') {
        previewMessages = (
            <>
                <p className="info">⏳ Loading, please wait ...</p>
                <div className="info">
                    <p className="small-caption">
                        Please be patient while the zoo is loading.
                        This task could take a few minutes!
                    </p>
                    <p className="small-caption">
                        You can open your browser's Javascript console to
                        monitor progress.
                    </p>
                </div>
            </>
        );
    } else if (zooDbAccessState.status === 'reloading') {
        previewMessages = (
            <>
                <p className="info small-caption">⏳ Reloading, please wait ...</p>
            </>
        );
    } else if (zooDbAccessState.status === 'load-error') {
        let errstr;
        try {
            errstr = ''+zooDbAccessState.error;
        } catch (e) {
            console.error(`Can't convert error to string: `, zooDbAccessState.error);
            errstr = '(unknown error, cf. JavaScript console for details)'
        }
        previewMessages = (
            <div className="error">
                <p>Error while loading the zoo!</p>
                <p className="small-caption">{errstr}</p>
                <p className="small-caption">
                    Consult your browser's JavaScript console for additional
                    information that might be helpful for debugging this issue.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="zoodb-preview-messages">{ previewMessages }</div>
            <div className="zoodb-preview-content" ref={renderContentDomNodeRef} />
        </>
    );
}
