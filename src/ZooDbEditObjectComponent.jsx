import debug_module from 'debug';
const debug = debug_module('zoodbeditobject.ZooDbEditObjectApp');

import React from 'react';

import ZooDbEditSchemaField from './ZooDbEditSchemaField.jsx';

import './ZooDbEditObjectApp_style.scss';




export default class ZooDbEditObjectApp extends React.Component
{
    constructor(props)
    {
        super(props);
        this.state = {
            object_title: props.object_title,
            object_data: props.object_data,
        }
    }

    render()
    {
        return [
            <div key={'mainpane'} className="ZooDbEditObjectApp_main_pane">
                <EczEditSchemaField
                    fieldname={''}
                    schema={this.props.object_schema}
                    value={this.state.object_data}
                    onChange={(new_object_data) => this.set_new_object_data(new_object_data)}
                />
            </div>,
        ];
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
