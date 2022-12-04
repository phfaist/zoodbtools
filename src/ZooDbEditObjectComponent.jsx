import debug_module from 'debug';
const debug = debug_module('zoodbeditobject.ZooDbEditObjectComponent');

import React from 'react';

import ZooDbEditSchemaField from './ZooDbEditSchemaField.jsx';

//import './ZooDbEditObjectComponent_style.scss';




export class ZooDbEditObjectComponent extends React.Component
{
    constructor(props)
    {
        const {
            object_title,
            object_schema,
            object_data,
            document_object_updater_model
        } = props;
        debug('Loading ZooDbEditObjectComponent for', object_title);
        super(props);
        this.state = {
            object_title,
            object_data,
        };
    }

    render()
    {
        return (
            <div key={'mainpane'} className="ZooDbEditObjectComponent_root">
                <ZooDbEditSchemaField
                    fieldname={''}
                    schema={this.props.object_schema}
                    value={this.state.object_data}
                    onChange={(new_object_data) => this.set_new_object_data(new_object_data)}
                    document_object_updater_model={
                        this.props.document_object_updater_model
                    }
                />
            </div>
        );
    }

    set_new_object_data(new_object_data)
    {
        debug("Object data changed = ", new_object_data);
        this.setState({ object_data: new_object_data });
    }

    clear() {
        this.setState({
            object_title: '',
            object_data: {},
        });
    }

};
