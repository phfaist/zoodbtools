import debug_mod from 'debug';
const debug = debug_mod('zoodbtoolspreview.ZooDbPreviewComponent');

import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';

import { ZooDbSelectObjectTypeAndIdComponent } from './ZooDbSelectObjectTypeAndIdComponent.jsx';
import { ZooDbPreviewContentComponent } from './ZooDbPreviewContentComponent.jsx';
import { useZooDbAccessState } from './useZooDbAccessState.js';

import './ZooDbPreviewComponent_style.scss';




export function ZooDbPreviewComponent(props)
{
    debug(`ZooDbPreviewComponent()`, { props });

    let {
        loadZooDb,
        reloadZooDb,
        renderObject,
        initialObjectType,
        initialObjectId,
        getMathJax,
        commandButtonsUseReload,
        commandButtonsToggleDarkModeCallback,
        userLoadVersion,
    } = props;

    initialObjectType ||= "";
    initialObjectId ||= "";

    // React states and effects --

    const [ selectedObjectTypeAndId, setSelectedObjectTypeAndId ] = useState(
        {
            objectType: initialObjectType,
            objectId: initialObjectId,
        }
    );

    //const [ previewingZooVersion, setPreviewingZooVersion ] = useState(0);

    const zooDbAccess = useZooDbAccessState({
        loadZooDb, reloadZooDb,
        userLoadVersion, // used to trigger reloads externally through our props
        //triggerInitialLoad: true, // this is the default
    });

    debug(`got ZooDbAccess object: `, zooDbAccess);

    // render --

    const { objectType, objectId } = selectedObjectTypeAndId;

    const onLinkClick = (event, { a, targetHref, targetInternalAnchor }) => {
        if (targetInternalAnchor != null) {
            const element = document.getElementById(targetInternalAnchor);
            if (element != null) {
                element.scrollIntoView(true);
                element.classList.add("visual-highlight");
                setTimeout(
                    () => element.classList.remove("visual-highlight"),
                    1000 // milliseconds
                );
                event.preventDefault();
            }
            return;
        }
        const url = new URL(targetHref);
        debug(`Clicked on a link, url = `, url);
        if (url.protocol.toLowerCase() === 'jsOnLinkClick:'.toLowerCase()) {
            // meant to be captured by our callback
            const action = url.pathname;
            const q = JSON.parse(url.searchParams.get('q'));
            if (action === 'objectLink') {
                setSelectedObjectTypeAndId({objectType: q.objectType, objectId: q.objectId});
                if (q.anchor) {
                    // TODO: scroll to a certain anchor, if applicable.
                    console.log(`Not yet implemented: scroll to #${q.anchor} after load`);
                }
                event.preventDefault();
                return;
            }
            throw new Error(`Invalid internal jsOnLinkClick action: ‘${action}’`);
        }
        return;
    };

    let commandButtonsContents = [];

    if (commandButtonsUseReload) {
        const canReload = (
            zooDbAccess.status === 'loaded'
            || zooDbAccess.status === 'load-error'
            || zooDbAccess.status === 'empty'
        );
        commandButtonsContents.push(
            <button
                onClick={() => zooDbAccess.reload()}
                disabled={!canReload}
            >RELOAD ZOO</button>
        );
    }
    if (commandButtonsToggleDarkModeCallback != null
        && commandButtonsToggleDarkModeCallback !== false) {
        commandButtonsContents.push(
            <button
                onClick={(event) => commandButtonsToggleDarkModeCallback(event)}
            >🌒</button>
        );
    }

    if (commandButtonsContents.length > 0) {
        commandButtonsContents = (
            <div className="zoodb-preview-command-buttons">
                {commandButtonsContents}
            </div>
        );
    };

    debug(`ZooDbPreviewComponent, render`, { zooDbAccess, selectedObjectTypeAndId });

    return (
        <div className="ZooDbPreviewComponent">
            <ZooDbSelectObjectTypeAndIdComponent
                zoodb={zooDbAccess.zoodb}
                objectType={selectedObjectTypeAndId.objectType}
                objectId={selectedObjectTypeAndId.objectId}
                onChangeObjectTypeAndId={
                    (objectType, objectId) => setSelectedObjectTypeAndId({objectType, objectId})
                }
            />
            <ZooDbPreviewContentComponent
                zooDbAccess={zooDbAccess}
                objectType={objectType}
                objectId={objectId}
                renderObject={renderObject}
                getMathJax={getMathJax}
                onLinkClick={onLinkClick}
            />
            {commandButtonsContents}
            {props.children}
        </div>
    );
}
