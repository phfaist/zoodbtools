import debugm from 'debug';
const debug = debugm('zoodbpreview.renderFlm');

import html_escape from 'escape-html';

import * as zooflm from '@phfaist/zoodb/zooflm';
import { getfield } from '@phfaist/zoodb/util/getfield';
import { iter_object_fields_recursive } from '@phfaist/zoodb/util/objectinspector';
import { sqzhtml } from '@phfaist/zoodb/util/sqzhtml';
import { split_prefix_label } from '@phfaist/zoodb/util/prefixlabel';

import mime from 'mime-types';


// -----------------------------------------------------------------------------


export function installFlmContentStyles(documentObject)
{
    documentObject ??= window.document;

    const styinfo = zooflm.html_fragmentrenderer_get_style_information(
        new zooflm.ZooHtmlFragmentRenderer()
    );
    const styElement = documentObject.createElement('style');
    styElement.setAttribute('type', 'text/css');
    styElement.innerText = `
/* FLM - global */
${ styinfo.css_global }
/* FLM - content */
${ styinfo.css_content }
`;
    documentObject.head.appendChild(styElement);

    return styElement;
}


// -----------------------------------------------------------------------------


export function installZooFlmEnvironmentLinksAndGraphicsHandlers(
    zoo_flm_environment,
    { getGraphicsFileContents }
)
{
    zoo_flm_environment.graphics_collection.src_url_resolver_fn =
        ({graphics_resource, render_context, source_path}) => {

            const resolvedSourcePath = graphics_resource.source_info.resolved_source;

            const imageData = getGraphicsFileContents(
                resolvedSourcePath,
                { graphics_resource, render_context, source_path }
            );
            let mimeType = null;
            if (resolvedSourcePath.endsWith('.svg')) {
                // make sure this mime type is correct!
                mimeType = 'image/svg+xml';
            } else if (!mimeType) {
                mimeType = mime.lookup(resolvedSourcePath);
            } else if (!mimeType) {
                mimeType = 'image/*';
            }
            const blob = new Blob([ imageData ], { type: mimeType });

            const src_url = URL.createObjectURL(blob);

            debug(`created Blob Object Url ${src_url} for ${resolvedSourcePath} with mime type ${mimeType}`);

            if (render_context.registerRenderPreviewCleanupCallback != null) {
                render_context.registerRenderPreviewCleanupCallback(
                    () => {
                        URL.revokeObjectURL(src_url);
                        debug(`revoked Blob Object Url ${src_url}`);
                    }
                );
            } else {
                console.warn(
                    `Allocated a Blob URL with URL.createObjectURL(), but there was no `
                    + `registerRenderPreviewCleanupCallback set to register the URL `
                    + `to be revoked/freed after use`
                );
            }

            return { src_url };
        }
    ;

    //
    // Override links to other objects, so we can intercept them.
    //
    zoo_flm_environment.ref_resolver.target_href_resolver =
        (ref_instance, render_context) => {

            const { target_href, ref_type, ref_label } = ref_instance ?? {};

            if (target_href != null) {
                // maybe fix target_href?
                const url = new URL(target_href);
                if (url.protocol == 'zoodbobjectref:') {
                    // this is a reference set by zoodb/zooflm/zooprocessor.js
                    //
                    // [Note, we seem to get all the slashes as part of the
                    // pathname in "protocol:///code/ref" when running in the
                    // browser]
                    const objectRef = url.pathname.replace(/^\/+/, '');

                    const [objectType, objectId] = split_prefix_label(objectRef);
                    let qData = {
                        objectType, objectId,
                    };
                    if (url.hash && url.hash.startsWith('#')) {
                        qData.anchor = decodeURIComponent(url.hash.slice(1));
                    }
                    return (`jsOnLinkClick:objectLink`
                            + `?q=${encodeURIComponent(JSON.stringify(qData))}`);
                }
                return target_href;
            }
            
            const alertMsg = `Could not resolve link reference to ‘${ref_type}:${ref_label}’`;
            return(`javascript:alert(${JSON.stringify(alertMsg)}`);
        }
    ;

}



// -----------------------------------------------------------------------------


export function simpleRenderObjectWithFlm({
    zoodb, objectType, objectId, object,
    registerRenderPreviewCleanupCallback,
})
{
    const zoo_flm_environment = zoodb.zoo_flm_environment;

    const schema = zoodb.schemas[objectType];

    debug(`renderObject(): ${objectType} ${objectId}`);

    const render_doc_fn = (render_context) => {
        const R = zooflm.make_render_shorthands({render_context});
        const { ne, rdr, ref } = R;

        render_context.registerRenderPreviewCleanupCallback =
            registerRenderPreviewCleanupCallback;

        let html = `<article class="object_render">`;

        html += sqzhtml`
<h1>Object: ${html_escape(objectType)} <code>${html_escape(objectId)}</code></h1>
`;

        for (const {fieldname, fieldvalue, fieldschema}
             of iter_object_fields_recursive(object, schema)) {
            if (fieldvalue == null) {
                continue;
            }
            let rendered = null;
            try {
                rendered = rdr(fieldvalue);
            } catch (err) {
                let errstr = null;
                if (!err) { errstr = '??'; }
                else if (typeof err === 'object' && '__class__' in err && 'msg' in err) {
                    errstr = err.msg; //zooflm.repr(err);
                } 
                else if (typeof err === 'object' && 'toString' in err) {
                    errstr = ''+err;
                }
                else {
                    errstr = '???';
                }
                rendered = `<span class="error">(Render error: ${html_escape(errstr)})</span>`;
            }
            html += sqzhtml`
<h2 class="fieldname">${html_escape(fieldname)}</h2>
<div class="fieldcontent">
${ rendered }
</div>
`;
        }

        html += `

<RENDER_ENDNOTES/>

`;
        html += `</article>`;
        return html;
    };

    let htmlContent = zooflm.make_and_render_document({
        zoo_flm_environment,
        render_doc_fn,
        //doc_metadata,
        render_endnotes: true,
        flm_error_policy: 'continue',
    });

    return {
        htmlContent,
    };
}

