import debug_mod from 'debug';
const debug = debug_mod('zoodbtoolspreview.ZooDbPreviewComponent');

import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';

import './ZooDbPreviewComponent_style.scss';





// -----------------------------------------------------------------------------



export function ZooDbPreviewComponent(props)
{
    let {
        zoodb,
        renderObject,
        objectType,
        objectId,
        getMathJax,
        installFlmObjectLinkCallback,
        incompleteSelectionRenderHtml,
        CommandButtonsComponent,
    } = props;

    objectType ||= "";
    objectId ||= "";

    // React states and effects --

    const [ selectedObjectTypeAndId, setSelectedObjectTypeAndId ] = useState(
        {
            selectedObjectType: objectType,
            selectedObjectId: objectId,
        }
    );

    const [ previewingZooVersion, setPreviewingZooVersion ] = useState(0);

    const renderContentDomNodeRef = useRef(null);

    useEffect(
        () => {
            const domNode = renderContentDomNodeRef.current;

            //
            // scroll to the top of the preview pane
            //
            domNode.scrollTo({top: 0});

            //
            // render math if applicable
            //
            if (!getMathJax) {
                return;
            }
            const MJ = getMathJax();
            if (MJ) {
                MJ.typesetPromise([domNode]);
            }

            return;
        },
        [ selectedObjectTypeAndId, previewingZooVersion ]
    );

    // useful callbacks --
    
    const { selectedObjectType, selectedObjectId } = selectedObjectTypeAndId;
    const setSelectedObjectType = (newObjectType) => setSelectedObjectTypeAndId({
        selectedObjectType: newObjectType,
        selectedObjectId: ""
    });
    const setSelectedObjectId = (newObjectId) => setSelectedObjectTypeAndId({
        selectedObjectType,
        selectedObjectId: newObjectId,
    });
    const setSelectedPairTypeId = (selectedObjectType, selectedObjectId) =>
          setSelectedObjectTypeAndId({selectedObjectType, selectedObjectId}) ;

    if (installFlmObjectLinkCallback) {
        const [ callbackHolder, callbackMethod ] = installFlmObjectLinkCallback;
        callbackHolder[callbackMethod] = (objType, objId) => {
            console.log(`Loading preview component → ${objType} ${objId}`);
            setSelectedPairTypeId(objType, objId);
        };
    }

    // render --

    let allObjectTypes = Object.keys(zoodb.objects);
    allObjectTypes.sort();

    let selectObjectTypeOptions = allObjectTypes.map(
        (x) => ({ value: x, label: x })
    );
    selectObjectTypeOptions.push(
        { value: "", label: "(select object type)" }
    )

    let selectObjectIdOptions = [];
    if (selectedObjectType && zoodb.objects[selectedObjectType]) {
        let allObjectIds = Object.keys(zoodb.objects[selectedObjectType]);
        allObjectIds.sort();

        selectObjectIdOptions = allObjectIds.map(
            (x) => ({ value: x, label: x })
        );
    }
    selectObjectIdOptions.push(
        { value: "", label: "(select object)" }
    );

    debug(`Rendering component, selected ${selectedObjectType} ‘${selectedObjectId}’`);

    let previewHtml = '';

    let object = null;
    if (selectedObjectType && selectedObjectId && zoodb.objects[selectedObjectType]) {
        object = zoodb.objects[selectedObjectType][selectedObjectId];
    }
    if (object) {
        previewHtml = renderObject(zoodb, selectedObjectType, selectedObjectId, object);
        debug(`Rendered HTML -> `, { previewHtml });
    } else if (incompleteSelectionRenderHtml != null) {
        previewHtml = incompleteSelectionRenderHtml(
            zoodb, selectedObjectType, selectedObjectId
        );
        debug(`Rendered HTML for incomplete selection -> `, { previewHtml });
    } else {
        previewHtml = `Please select an object to preview using the selection boxes above.`
    }

    let commandButtonsComponentContents = []
    if (CommandButtonsComponent != null) {
        const commandButtonsProps = {
            zoodb, selectedObjectTypeAndId, setSelectedObjectTypeAndId, object,
            doRefreshPreview: () => setPreviewingZooVersion(previewingZooVersion + 1)
        };
        commandButtonsComponentContents = [(
            <CommandButtonsComponent {...commandButtonsProps} />
        )];
    }

    return (
        <div className="ZooDbPreviewComponent">
            <Select
                className="zoodb-preview-select-objecttype"
                classNamePrefix="zoodb-preview-react-select"
                value={{value: selectedObjectType, label: selectedObjectType}}
                onChange={(newValue) => setSelectedObjectType(newValue.value)}
                options={selectObjectTypeOptions}
            />
            <Select
                className="zoodb-preview-select-objectid"
                classNamePrefix="zoodb-preview-react-select"
                value={{value: selectedObjectId, label: selectedObjectId }}
                onChange={(newValue) => setSelectedObjectId(newValue.value)}
                options={selectObjectIdOptions}
            />
            <div className="zoodb-preview-content"
                 ref={renderContentDomNodeRef}
                 dangerouslySetInnerHTML={ {__html: previewHtml} }
            >
            </div>
            {commandButtonsComponentContents}
        </div>
    );
}
