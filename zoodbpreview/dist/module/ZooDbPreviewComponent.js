import "./ZooDbPreviewComponent.css";
import {jsx as $chJmK$jsx, jsxs as $chJmK$jsxs} from "react/jsx-runtime";
import $chJmK$debug from "debug";
import {useState as $chJmK$useState, useRef as $chJmK$useRef, useEffect as $chJmK$useEffect} from "react";
import $chJmK$reactselect from "react-select";










const $042179933fe4954c$var$debug = (0, $chJmK$debug)("zoodbtoolspreview.ZooDbSelectObjectTypeAndIdComponent");
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
    return /*#__PURE__*/ (0, $chJmK$jsxs)("div", {
        className: "zoodb-preview-select-bar",
        children: [
            /*#__PURE__*/ (0, $chJmK$jsx)((0, $chJmK$reactselect), {
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
            /*#__PURE__*/ (0, $chJmK$jsx)((0, $chJmK$reactselect), {
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







const $e81314a651474654$var$debug = (0, $chJmK$debug)("zoodbtoolspreview.ZooDbPreviewComponent");
function $e81314a651474654$export$fd3ba78121e14bde(props) {
    const { renderContent: renderContent, getMathJax: getMathJax, onLinkClick: onLinkClick } = props;
    let renderContentDomNodeRef = (0, $chJmK$useRef)(null);
    (0, $chJmK$useEffect)(()=>{
        let cancelFlag = false;
        const renderAndTypesetContent = async ()=>{
            const domNode = renderContentDomNodeRef.current;
            //
            // scroll to the top of the preview pane
            //
            domNode.scrollTo({
                top: 0
            });
            //
            // render the content
            //
            const previewHtml = await renderContent();
            if (cancelFlag) return;
            domNode.innerHTML = previewHtml;
            //
            // render math if applicable
            //
            if (getMathJax) {
                const MJ = getMathJax();
                if (MJ) await MJ.typesetPromise([
                    domNode
                ]);
            }
        };
        renderAndTypesetContent();
        return ()=>{
            cancelFlag = true;
        };
    });
    const callbackDivClick = (event)=>{
        const a = getAncestor(event.target, "a");
        if (a == null) return;
        if (onLinkClick == null) // no custom callback for links
        return;
        const targetHref = a.getAttribute("href");
        if (!targetHref) // not a link, or we don't have a href="..." attribute ??
        return;
        let targetInternalAnchor = null;
        if (targetHref.startsWith("#")) targetInternalAnchor = targetHref.slice(1);
        return onLinkClick(event, {
            a: a,
            targetHref: targetHref,
            targetInternalAnchor: targetInternalAnchor
        });
    };
    //       dangerouslySetInnerHTML={ {__html: previewHtml} }
    return /*#__PURE__*/ (0, $chJmK$jsx)("div", {
        className: "zoodb-preview-content",
        ref: renderContentDomNodeRef,
        onClick: callbackDivClick
    });
}



const $55cc9c1ed9922b9a$var$debug = (0, $chJmK$debug)("zoodbtoolspreview.ZooDbPreviewComponent");
function $55cc9c1ed9922b9a$export$e01b7c63ae589d4b(props) {
    $55cc9c1ed9922b9a$var$debug(`ZooDbPreviewComponent()`, {
        props: props
    });
    let { loadZooDb: loadZooDb, reloadZooDb: reloadZooDb, renderObject: renderObject, initialObjectType: initialObjectType, initialObjectId: initialObjectId, getMathJax: getMathJax, commandButtonsUseReload: // incompleteSelectionRenderHtml,
    // CommandButtonsComponent,
    commandButtonsUseReload, commandButtonsToggleDarkModeCallback: commandButtonsToggleDarkModeCallback } = props;
    initialObjectType ||= "";
    initialObjectId ||= "";
    // React states and effects --
    const [selectedObjectTypeAndId, setSelectedObjectTypeAndId] = (0, $chJmK$useState)({
        objectType: initialObjectType,
        objectId: initialObjectId
    });
    //const [ previewingZooVersion, setPreviewingZooVersion ] = useState(0);
    const zoodbAccess = useZooDbAccessState({
        loadZooDb: loadZooDb,
        reloadZooDb: reloadZooDb
    });
    $55cc9c1ed9922b9a$var$debug(`got ZooDbAccess object: `, zoodbAccess);
    // render --
    let theContentComponent = null;
    let object = null;
    const { objectType: objectType, objectId: objectId } = selectedObjectTypeAndId;
    const onLinkClick = (event, { a: a, targetHref: targetHref, targetInternalAnchor: targetInternalAnchor })=>{
        if (targetInternalAnchor != null) {
            const element = document.getElementById(targetInternalAnchor);
            if (element != null) {
                element.scrollIntoView(true);
                event.preventDefault();
            }
            return;
        }
        const url = new URL(targetHref);
        if (url.protocol == "jsOnLinkClick:") {
            // meant to be captured by our callback
            const action = url.pathname;
            const q = JSON.parse(url.searchParams.get("q"));
            if (action === "objectLink") {
                setSelectedObjectTypeAndId(q);
                event.preventDefault();
                return;
            }
            throw new Error(`Invalid internal jsOnLinkClick action: ‘${action}’`);
        }
        return;
    };
    const zoodb = zoodbAccess.zoodb;
    if (zoodb == null) // still loading (TODO; provide more information on loading state ...)
    return /*#__PURE__*/ (0, $chJmK$jsx)("div", {
        children: "Loading, please wait..."
    });
    if (objectType && objectId && zoodb.objects[objectType]) {
        object = zoodb.objects[objectType][objectId];
        const renderZooObjectContent = ()=>{
            return renderObject(zoodb, objectType, objectId, object);
        };
        theContentComponent = /*#__PURE__*/ (0, $chJmK$jsx)((0, $e81314a651474654$export$fd3ba78121e14bde), {
            renderContent: renderZooObjectContent,
            getMathJax: getMathJax,
            onLinkClick: onLinkClick
        });
    }
    if (!object) {
        let msgHtml = null;
        // if (incompleteSelectionRenderHtml != null) {
        //     msgHtml = incompleteSelectionRenderHtml(
        //         zoodb, selectedObjectType, selectedObjectId
        //     );
        // } else {
        msgHtml = `Please select an object to preview using the selection boxes above.`;
        // }
        $55cc9c1ed9922b9a$var$debug(`Rendered HTML for incomplete selection -> `, {
            msgHtml: msgHtml
        });
        theContentComponent = /*#__PURE__*/ (0, $chJmK$jsx)("div", {
            className: "zoodb-preview-content",
            dangerouslySetInnerHtml: {
                __html: msgHtml
            }
        });
    }
    let commandButtonsContents = [];
    if (commandButtonsUseReload) commandButtonsContents.push(/*#__PURE__*/ (0, $chJmK$jsx)("button", {
        onClick: ()=>zoodbAccess.reload(),
        children: "RELOAD ZOO"
    }));
    if (commandButtonsToggleDarkModeCallback != null && commandButtonsToggleDarkModeCallback !== false) commandButtonsContents.push(/*#__PURE__*/ (0, $chJmK$jsx)("button", {
        onClick: (event)=>commandButtonsToggleDarkModeCallback(event),
        children: "\uD83C\uDF12"
    }));
    if (commandButtonsContents.length > 0) commandButtonsContents = /*#__PURE__*/ (0, $chJmK$jsx)("div", {
        className: "zoodb-preview-command-buttons",
        children: commandButtonsContents
    });
    return /*#__PURE__*/ (0, $chJmK$jsxs)("div", {
        className: "ZooDbPreviewComponent",
        children: [
            /*#__PURE__*/ (0, $chJmK$jsx)((0, $042179933fe4954c$export$82b75c6b8a82ac20), {
                zoodb: zoodb,
                objectType: selectedObjectTypeAndId.objectType,
                objectId: selectedObjectTypeAndId.objectId,
                onChangeObjectTypeAndId: (objectType, objectId)=>setSelectedObjectTypeAndId({
                        objectType: objectType,
                        objectId: objectId
                    })
            }),
            commandButtonsContents,
            theContentComponent
        ]
    });
}


export {$55cc9c1ed9922b9a$export$e01b7c63ae589d4b as ZooDbPreviewComponent};
//# sourceMappingURL=ZooDbPreviewComponent.js.map
