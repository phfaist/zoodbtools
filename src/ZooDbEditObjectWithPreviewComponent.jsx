import debug_mod from 'debug';
const debug = debug_mod('zoodbeditobject.ZooDbEditObjectWithPreviewComponent');

import React, { useState } from 'react';

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import './ZooDbEditObjectWithPreviewComponent_style.scss';

import { ZooDbEditObjectComponent } from './ZooDbEditObjectComponent.jsx';

import { LLMSimpleContentCompiler } from '@phfaist/zoodb/dbprocessor/llmsimplecontent';


export function ZooDbEditObjectWithPreviewComponent(props)
{
    const {
        render_object,
        object_type,
        object_schema,
        object_data,
        zoo_llm_environment,
        ...edit_component_props
    } = props;

    const [tabIndexState, setTabIndexState] = useState(0);
    const is_editing = (tabIndexState === 0);
    const is_previewing = (tabIndexState === 1);

    const [objectDataState, setObjectDataState] = useState(object_data);

    const on_change_fn = (new_data) => {
        debug('on_change_fn! new_data =', new_data);
        setObjectDataState(new_data);
    }

    const render_object_from_data = (object_data) => {
        if (!is_previewing) {
            // no need to update preview, it's hidden
            return '';
        }

        try {

            const object = JSON.parse(JSON.stringify(object_data));

            const llm_compiler = new LLMSimpleContentCompiler({
                llm_environment: zoo_llm_environment,
                llm_error_policy: 'continue',
            });

            llm_compiler.compile_object(
                object_type,
                null,
                object,
                object_schema
            )

            const rendered_html = render_object( object, object_data, object_schema );

            return (
                <div className="ZooDbEditObjectComponentWithPreview_preview_content"
                     dangerouslySetInnerHTML={ {__html: rendered_html} }
                />
            );
           
        } catch (err) {
            console.error('Error rendering object: ', err, ' Object was: ', object_data);
            return (
                <pre>{'Error rendering object: ' + err.toString()}</pre>
            );

        }
    };

    return (
        <Tabs
            defaultIndex={tabIndexState}
            onSelect={(index) => setTabIndexState(index)}
            className="ZooDbEditObjectComponentWithPreview_root">
            <TabList className="ZooDbEditObjectComponentWithPreview_tab_list">
                <Tab>Edit</Tab>
                <Tab>Preview</Tab>
            </TabList>

            <TabPanel className="ZooDbEditObjectComponentWithPreview_edit_panel">
                <ZooDbEditObjectComponent
                    object_type={object_type}
                    object_schema={object_schema}
                    object_data={objectDataState}
                    onChange={on_change_fn}
                    {...edit_component_props}
                />
            </TabPanel>
                
            <TabPanel className="ZooDbEditObjectComponentWithPreview_preview_panel">
                { render_object_from_data(objectDataState) }
            </TabPanel>
        </Tabs>
    );
};
