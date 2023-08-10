import debugm from 'debug';
const debug = debugm('zoodbpreview.renderFlm');

import * as zooflm from '@phfaist/zoodb/zooflm';
import { getfield } from '@phfaist/zoodb/util/getfield';
import { iter_object_fields_recursive } from '@phfaist/zoodb/util/objectinspector';
import { sqzhtml } from '@phfaist/zoodb/util/sqzhtml';

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


export function simpleRenderObjectWithFlm(zoodb, object_type, object_id, object)
{
    const zoo_flm_environment = zoodb.zoo_flm_environment;

    const schema = zoodb.schemas[object_type];

    debug(`renderObject(): ${object_type} ${object_id}`);

    const render_doc_fn = (render_context) => {
        const R = zooflm.make_render_shorthands({render_context});
        const { ne, rdr, ref } = R;

        let html = `<div class="object_render">`;

        html += sqzhtml`
<h1>Object: ${object_type} <code>${object_id}</code></h1>
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
                rendered = `<span class="error">(Render error: ${errstr})</span>`;
            }
            html += sqzhtml`
<h2 class="fieldname">${fieldname}</h2>
<div class="fieldcontent">
${ rendered }
</div>
`;
        }

        html += `

<RENDER_ENDNOTES/>

`;
        html += `</div>`;
        return html;
    };

    return zooflm.make_and_render_document({
        zoo_flm_environment,
        render_doc_fn,
        //doc_metadata,
        render_endnotes: true,
        flm_error_policy: 'continue',
    });
}

