import $89tWE$debug from "debug";
import $89tWE$escapehtml from "escape-html";
import {html_fragmentrenderer_get_style_information as $89tWE$html_fragmentrenderer_get_style_information, ZooHtmlFragmentRenderer as $89tWE$ZooHtmlFragmentRenderer, make_render_shorthands as $89tWE$make_render_shorthands, make_and_render_document as $89tWE$make_and_render_document} from "@phfaist/zoodb/zooflm";
import "@phfaist/zoodb/util/getfield";
import {iter_object_fields_recursive as $89tWE$iter_object_fields_recursive} from "@phfaist/zoodb/util/objectinspector";
import {sqzhtml as $89tWE$sqzhtml} from "@phfaist/zoodb/util/sqzhtml";
import {split_prefix_label as $89tWE$split_prefix_label} from "@phfaist/zoodb/util/prefixlabel";
import $89tWE$mimetypes from "mime-types";









const $d30e7bcdac759df9$var$debug = (0, $89tWE$debug)("zoodbpreview.renderFlm");
function $d30e7bcdac759df9$export$42d3a9814cd5af4b(documentObject) {
    documentObject ??= window.document;
    const styinfo = $89tWE$html_fragmentrenderer_get_style_information(new $89tWE$ZooHtmlFragmentRenderer());
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
        let mimeType = (0, $89tWE$mimetypes).lookup(resolvedSourcePath);
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
                const [objectType, objectId] = (0, $89tWE$split_prefix_label)(objectRef);
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
        const R = $89tWE$make_render_shorthands({
            render_context: render_context
        });
        const { ne: ne, rdr: rdr, ref: ref } = R;
        render_context.registerRenderPreviewCleanupCallback = registerRenderPreviewCleanupCallback;
        let html = `<article class="object_render">`;
        html += (0, $89tWE$sqzhtml)`
<h1>Object: ${(0, $89tWE$escapehtml)(objectType)} <code>${(0, $89tWE$escapehtml)(objectId)}</code></h1>
`;
        for (const { fieldname: fieldname, fieldvalue: fieldvalue, fieldschema: fieldschema } of (0, $89tWE$iter_object_fields_recursive)(object, schema)){
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
                rendered = `<span class="error">(Render error: ${(0, $89tWE$escapehtml)(errstr)})</span>`;
            }
            html += (0, $89tWE$sqzhtml)`
<h2 class="fieldname">${(0, $89tWE$escapehtml)(fieldname)}</h2>
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
    let htmlContent = $89tWE$make_and_render_document({
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


export {$d30e7bcdac759df9$export$42d3a9814cd5af4b as installFlmContentStyles, $d30e7bcdac759df9$export$73d82f0ed63f6ba5 as installZooFlmEnvironmentLinksAndGraphicsHandlers, $d30e7bcdac759df9$export$22ae542d2b30e3c1 as simpleRenderObjectWithFlm};
//# sourceMappingURL=renderFlm.js.map
