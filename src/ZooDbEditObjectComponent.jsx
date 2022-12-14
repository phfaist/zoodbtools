import debug_module from 'debug';
const debug = debug_module('zoodbeditobject.ZooDbEditObjectComponent');

import React, { useState } from 'react';

import ZooDbEditSchemaField from './ZooDbEditSchemaField.jsx';

//import './ZooDbEditObjectComponent_style.scss';



export function ZooDbEditObjectComponent(props)
{
    const {
        object_type,
        object_schema,
        object_data,
        document_object_updater_model,
        onChange,
    } = props;
    
    debug('Loading ZooDbEditObjectComponent');

    const [state_object_data, set_state_object_data] = useState(object_data);

    const set_new_object_data = (new_object_data) => {
        debug("Object data changed = ", new_object_data);
        if (onChange != null) { // null or undefined
            onChange(new_object_data);
            debug('component parent onChange called.')
        }
        set_state_object_data(new_object_data);
    }

    // const clear = () => {
    //     this.setState({
    //         object_data: {},
    //     });
    // }

    return (
        <div key={'mainpane'} className="ZooDbEditObjectComponent_root">
            <ZooDbEditSchemaField
                fieldname={''}
                schema={object_schema}
                value={state_object_data}
                onChange={set_new_object_data}
                document_object_updater_model={
                    document_object_updater_model
                }
            />
        </div>
    );
}
