import "./all.css";
import $iKhfe$debug from "debug";
import {useState as $iKhfe$useState, useRef as $iKhfe$useRef, useEffect as $iKhfe$useEffect} from "react";
import $iKhfe$reactselect from "react-select";
import {jsx as $iKhfe$jsx, jsxs as $iKhfe$jsxs} from "react/jsx-runtime";
import {CitationSourceBase as $iKhfe$CitationSourceBase} from "@phfaist/zoodb/citationmanager/source/base";
import {html_fragmentrenderer_get_style_information as $iKhfe$html_fragmentrenderer_get_style_information, ZooHtmlFragmentRenderer as $iKhfe$ZooHtmlFragmentRenderer, make_render_shorthands as $iKhfe$make_render_shorthands, make_and_render_document as $iKhfe$make_and_render_document} from "@phfaist/zoodb/zooflm";
import "@phfaist/zoodb/util/getfield";
import {iter_object_fields_recursive as $iKhfe$iter_object_fields_recursive} from "@phfaist/zoodb/util/objectinspector";
import {sqzhtml as $iKhfe$sqzhtml} from "@phfaist/zoodb/util/sqzhtml";






const $55cc9c1ed9922b9a$var$debug = (0, $iKhfe$debug)("zoodbtoolspreview.ZooDbPreviewComponent");
function $55cc9c1ed9922b9a$export$e01b7c63ae589d4b(props) {
    let { zoodb: zoodb, renderObject: renderObject, objectType: objectType, objectId: objectId, getMathJax: getMathJax, installFlmObjectLinkCallback: installFlmObjectLinkCallback, CommandButtonsComponent: CommandButtonsComponent } = props;
    objectType ||= "";
    objectId ||= "";
    // React states and effects --
    const [selectedObjectTypeAndId, setSelectedObjectTypeAndId] = (0, $iKhfe$useState)({
        selectedObjectType: objectType,
        selectedObjectId: objectId
    });
    const [previewingZooVersion, setPreviewingZooVersion] = (0, $iKhfe$useState)(0);
    const renderContentDomNodeRef = (0, $iKhfe$useRef)(null);
    (0, $iKhfe$useEffect)(()=>{
        const domNode = renderContentDomNodeRef.current;
        //
        // scroll to the top of the preview pane
        //
        domNode.scrollTo({
            top: 0
        });
        //
        // render math if applicable
        //
        if (!getMathJax) return;
        const MJ = getMathJax();
        if (MJ) MJ.typesetPromise([
            domNode
        ]);
        return;
    }, [
        selectedObjectTypeAndId,
        previewingZooVersion
    ]);
    // useful callbacks --
    const { selectedObjectType: selectedObjectType, selectedObjectId: selectedObjectId } = selectedObjectTypeAndId;
    const setSelectedObjectType = (newObjectType)=>setSelectedObjectTypeAndId({
            selectedObjectType: newObjectType,
            selectedObjectId: ""
        });
    const setSelectedObjectId = (newObjectId)=>setSelectedObjectTypeAndId({
            selectedObjectType: selectedObjectType,
            selectedObjectId: newObjectId
        });
    const setSelectedPairTypeId = (selectedObjectType, selectedObjectId)=>setSelectedObjectTypeAndId({
            selectedObjectType: selectedObjectType,
            selectedObjectId: selectedObjectId
        });
    if (installFlmObjectLinkCallback) {
        const [callbackHolder, callbackMethod] = installFlmObjectLinkCallback;
        callbackHolder[callbackMethod] = (objType, objId)=>{
            console.log(`Loading preview component → ${objType} ${objId}`);
            setSelectedPairTypeId(objType, objId);
        };
    }
    // render --
    let allObjectTypes = Object.keys(zoodb.objects);
    allObjectTypes.sort();
    let selectObjectTypeOptions = allObjectTypes.map((x)=>({
            value: x,
            label: x
        }));
    selectObjectTypeOptions.push({
        value: "",
        label: "(select object type)"
    });
    let selectObjectIdOptions = [];
    if (selectedObjectType && zoodb.objects[selectedObjectType]) {
        let allObjectIds = Object.keys(zoodb.objects[selectedObjectType]);
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
    $55cc9c1ed9922b9a$var$debug(`Rendering component, selected ${selectedObjectType} ‘${selectedObjectId}’`);
    let previewHtml = "";
    let object = null;
    if (selectedObjectType && selectedObjectId && zoodb.objects[selectedObjectType]) object = zoodb.objects[selectedObjectType][selectedObjectId];
    if (object) {
        previewHtml = renderObject(zoodb, selectedObjectType, selectedObjectId, object);
        $55cc9c1ed9922b9a$var$debug(`Rendered HTML -> `, previewHtml);
    }
    let commandButtonsComponentContents = [];
    if (CommandButtonsComponent != null) {
        const commandButtonsProps = {
            zoodb: zoodb,
            selectedObjectTypeAndId: selectedObjectTypeAndId,
            setSelectedObjectTypeAndId: setSelectedObjectTypeAndId,
            object: object,
            doRefreshPreview: ()=>setPreviewingZooVersion(previewingZooVersion + 1)
        };
        commandButtonsComponentContents = [
            /*#__PURE__*/ (0, $iKhfe$jsx)(CommandButtonsComponent, {
                ...commandButtonsProps
            })
        ];
    }
    return /*#__PURE__*/ (0, $iKhfe$jsxs)("div", {
        className: "ZooDbPreviewComponent",
        children: [
            /*#__PURE__*/ (0, $iKhfe$jsx)((0, $iKhfe$reactselect), {
                className: "zoodb-preview-select-objecttype",
                value: {
                    value: selectedObjectType,
                    label: selectedObjectType
                },
                onChange: (newValue)=>setSelectedObjectType(newValue.value),
                options: selectObjectTypeOptions
            }),
            /*#__PURE__*/ (0, $iKhfe$jsx)((0, $iKhfe$reactselect), {
                className: "zoodb-preview-select-objectid",
                value: {
                    value: selectedObjectId,
                    label: selectedObjectId
                },
                onChange: (newValue)=>setSelectedObjectId(newValue.value),
                options: selectObjectIdOptions
            }),
            /*#__PURE__*/ (0, $iKhfe$jsx)("div", {
                className: "zoodb-preview-content",
                ref: renderContentDomNodeRef,
                dangerouslySetInnerHTML: {
                    __html: previewHtml
                }
            }),
            commandButtonsComponentContents
        ]
    });
}



class $101c10e2432771ff$export$143e0941d05399df extends (0, $iKhfe$CitationSourceBase) {
    constructor(options){
        options ||= {};
        const override_options = {
            source_name: `${options.title} (placeholder)`,
            chunk_size: Infinity,
            chunk_retrieve_delay_ms: 0,
            cache_store_options: {
                cache_duration_ms: 0
            }
        };
        const default_options = {
            cite_prefix: options.cite_prefix
        };
        super(override_options, options, default_options);
    }
    async run_retrieve_chunk(id_list) {
        for (let cite_key of id_list){
            cite_key = cite_key.trim();
            const cite_key_encoded = encodeURIComponent(cite_key);
            let flm_text = `${this.options.title} \\verbcode{${cite_key}}`;
            let test_url = this.options.test_url(this.cite_prefix, cite_key);
            if (test_url) flm_text += ` — \\href{${test_url}}{TEST→}`;
            // clean up the data a bit, we don't need the full list of references (!)
            let csljsondata = {
                _ready_formatted: {
                    flm: flm_text
                }
            };
            this.citation_manager.store_citation(this.cite_prefix, cite_key, csljsondata, this.cache_store_options);
        }
    }
}







const $d30e7bcdac759df9$var$debug = (0, $iKhfe$debug)("zoodbpreview.renderFlm");
function $d30e7bcdac759df9$export$42d3a9814cd5af4b(documentObject) {
    documentObject ??= window.document;
    const styinfo = $iKhfe$html_fragmentrenderer_get_style_information(new $iKhfe$ZooHtmlFragmentRenderer());
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
function $d30e7bcdac759df9$export$22ae542d2b30e3c1(zoodb, object_type, object_id, object) {
    const zoo_flm_environment = zoodb.zoo_flm_environment;
    const schema = zoodb.schemas[object_type];
    $d30e7bcdac759df9$var$debug(`renderObject(): ${object_type} ${object_id}`);
    const render_doc_fn = (render_context)=>{
        const R = $iKhfe$make_render_shorthands({
            render_context: render_context
        });
        const { ne: ne, rdr: rdr, ref: ref } = R;
        let html = `<div class="object_render">`;
        html += (0, $iKhfe$sqzhtml)`
<h1>Object: ${object_type} <code>${object_id}</code></h1>
`;
        for (const { fieldname: fieldname, fieldvalue: fieldvalue, fieldschema: fieldschema } of (0, $iKhfe$iter_object_fields_recursive)(object, schema)){
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
                rendered = `<span class="error">(Render error: ${errstr})</span>`;
            }
            html += (0, $iKhfe$sqzhtml)`
<h2 class="fieldname">${fieldname}</h2>
<div class="fieldcontent">
${rendered}
</div>
`;
        }
        html += `

<RENDER_ENDNOTES/>

`;
        html += `</div>`;
        return html;
    };
    return $iKhfe$make_and_render_document({
        zoo_flm_environment: zoo_flm_environment,
        render_doc_fn: render_doc_fn,
        //doc_metadata,
        render_endnotes: true,
        flm_error_policy: "continue"
    });
}




export {$55cc9c1ed9922b9a$export$e01b7c63ae589d4b as ZooDbPreviewComponent, $101c10e2432771ff$export$143e0941d05399df as CitationSourceApiPlaceholder, $d30e7bcdac759df9$export$42d3a9814cd5af4b as installFlmContentStyles, $d30e7bcdac759df9$export$22ae542d2b30e3c1 as simpleRenderObjectWithFlm};
//# sourceMappingURL=all.js.map
