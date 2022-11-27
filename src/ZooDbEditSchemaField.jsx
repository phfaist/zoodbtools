import React from 'react';

import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/stream-parser';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { EditorView } from '@codemirror/view';


import './ZooDbEditSchemaField_style.scss';



class ZooDbEditSchemaFieldObjectType extends React.Component
{
    shouldComponentUpdate(newProps, newState)
    {
        return ! Object.is(this.props.value, newProps.value);
    }

    render()
    {
        const schema = this.props.schema;
        const value = this.props.value || {};
        if (schema.additionalProperties !== false) {
            throw new Error("additionalProperties not supported!");
        }
        let props_components_list = 
            Object.keys(schema.properties)
            .filter( (prop_key) => {
                if (schema.properties[prop_key]._auto_populated
                    || schema.properties[prop_key]._hide_in_editor) {
                    return false;
                }
                return true;
            })
            .map( (prop_key) => {
                let prop_schema = schema.properties[prop_key];
                const prop_value = value[prop_key];
                if ( ! (schema.required || []).includes(prop_key) ) {
                    prop_schema = { _optional: true, ...prop_schema };
                }
                return (
                    <ZooDbEditSchemaField
                        key={prop_key}
                        fieldname={prop_key} 
                        schema={prop_schema}
                        value={prop_value}
                        onChange={ (val) => this.field_changed(prop_key, val) }  />
                );
            });
        return props_components_list;
    }

    field_changed(prop_key, val) {

        let new_value = null; // = { ...(this.props.value || {})};

        if ( (typeof val == 'undefined' || val === null
              || (Array.isArray(val) && val.length == 0) || val === '')
             && !(this.props.schema.required || []).includes(prop_key) ) {
            // empty value on non-required field -> remove from dictionary
            
            //delete new_value[prop_key];
            new_value = this.props.document_object_updater_model.object_delete_field(
                this.props.value,
                prop_key
            );

        } else {

            //new_value[prop_key] = val;
            new_value = this.props.document_object_updater_model.object_set_field(
                this.props.value,
                prop_key,
                val
            );

        }

        console.log("Property changed, new value is ", val, " --> ", new_value);

        this.props.onChange( new_value );
    }
};





class ZooDbEditSchemaFieldArrayType extends React.Component
{
    shouldComponentUpdate(newProps, newState) {
        return ! Object.is(this.props.value, newProps.value);
    }

    render()
    {
        const schema = this.props.schema;
        const value = this.props.value || [];

        let schema_items = schema.items;

        let props_components_list = (value || []).map(
            (item_value, index) => {
                return (
                    <div key={index}
                         className="array_item">
                        <button key={'-'} onClick={ ()=>this.itemRemove(index) }>-</button>
                        <button key={'^'} onClick={ ()=>this.itemMoveUp(index) }>↑</button>
                        <button key={'v'} onClick={ ()=>this.itemMoveDown(index) }>↓</button>
                        <ZooDbEditSchemaField
                            key={'fld'}
                            skip_description={true}
                            fieldname={'Item ' + (1+index)} 
                            schema={schema_items}
                            value={item_value}
                            onChange={(val) => this.itemChanged(index, val) } />
                    </div>);
            }
        );
        
        return (<div key={'arr-items-list'} className="array_items_list">
                    <ZooDbEditFieldDescription
                        key={'desc'}
                        fieldname={''}
                        schema={schema_items} />
                    {props_components_list}
                    <button key={'+'} onClick={ ()=>this.itemNew() }>+</button>
                </div>);
    }

    itemNew()
    {
        // const value = (this.props.value || []);
        // let new_array = value.slice();
        // new_array.push( null );
        let new_array = this.props.document_object_updater_model.array_new_item(
            this.props.value,
            null
        );
        if (new_array === this.props.value) {
            return;
        }
        console.log("New array is ", new_array);
        this.props.onChange( new_array );
    }

    itemRemove(idx)
    {
        const value = (this.props.value || []);

        if (idx < 0 || idx >= value.length) { return; }

        const confirm_result = window.confirm(
            "Remove item #" + (1+idx) + ": " + JSON.stringify(value[idx]) + " ?"
        );
        if (!confirm_result) {
            return;
        }

        let new_array = this.props.document_object_updater_model.array_delete_item(
            this.props.value,
            idx
        );
        if (new_array === this.props.value) {
            return new_array
        }

        this.props.onChange( new_array );
    }

    itemMoveUp(idx)
    {
        const new_array = this.props.document_object_updater_model.array_move_item(
            this.props.value,
            index,
            index - 1
        );
        if (new_array === this.props.value) { return; }

        this.props.onChange( new_array );
    }

    itemMoveDown(idx)
    {
        const new_array = this.props.document_object_updater_model.array_move_item(
            this.props.value,
            index,
            index + 1
        );
        if (new_array === this.props.value) { return; }

        this.props.onChange( new_array );
    }

    itemChanged(index, new_value)
    {
        const new_array = this.props.document_object_updater_model.array_set_item(
            this.props.value,
            index,
            new_value
        );

        this.props.onChange( new_array );
    }
};



class ZooDbEditSChemaFieldScalarNonstringType extends React.Component
{
    render()
    {
        const has_value = (typeof(this.props.value) != 'undefined');

        const hasvalueclassname = 'hasvalue-' + (has_value?'y':'n');

        const schema = this.props.schema;

        let input_elem = null;

        if (schema.type == 'integer') {
            const numvalue = this.props.value || 0;
            input_elem = (
                <input type="number"
                       value={numvalue}
                       className={hasvalueclassname}
                       onChange={(event) => this.props.onChange(event.target.value)} />
            );
        } else if (schema.type == 'boolean') {
            const boolvalue = this.props.value || false;
            input_elem = (
                <label className={"checkbox-input "+hasvalueclassname}>
                    Enable&nbsp;→
                    <input type="checkbox"
                           checked={boolvalue}
                           onChange={(event) => this.props.onChange(event.target.checked)} />
                </label>
            );
        } else {
            throw new Error("Can't handle input type: ‘" + schema.type + "’");
        }

        if (has_value) {
            return (
                <div className="input">
                    {input_elem}
                    <button className="clear-to-undefined"
                            onClick={(event) => this.props.onChange(undefined)}>clear</button>
                </div>
            );
        }
        return (
            <div className="input">
                {input_elem}
            </div>
        );
    }
};


class ZooDbEditSchemaFieldScalarType extends React.Component
{
    shouldComponentUpdate(newProps, newState) {
        return this.props.value != newProps.value;
    }

    render()
    {
        const schema = this.props.schema;

        if (schema.type == 'integer' || schema.type == 'boolean') {
            return (
                <ZooDbEditSChemaFieldScalarNonstringType
                    value={this.props.value}
                    schema={schema}
                    onChange={(newvalue) => this.props.onChange(newvalue)} />
            )
        }

        if (schema.type != 'string') {
            throw new Error("Can't handle scalar type ‘"+schema.type+"’ yet.");
        }

        const value = this.props.value || '';

        if (schema['enum']) {
            const enums = schema['enum'];
            let options_components = enums.map( (s) => 
                (<option key={s} value={s}>{s}</option>)
            );
            return (
                <select value={value}
                        onChange={(event) => this.props.onChange(event.target.value) }> 
                  {options_components}
                </select>
            );
        }

        if ( ! schema._llm ) {
            if (schema._single_line_string) {
                return (
                    <input type="string"
                           value={value}
                           onChange={(event) => this.props.onChange(event.target.value)} />
                );
            } else {
                return (
                    <textarea
                        onChange={(event) => this.props.onChange(event.target.value)}
                        >{value}</textarea>
                );
            }
        }

        // LLM features enabled -> use CodeMirror editor

        const height = (schema._single_line_string ? '2em': '18em');

        return (
            <CodeMirror
                placeholder="<<< Type text here. >>>"
                value={value}
                min-height={height}
                extensions={[StreamLanguage.define(stex), EditorView.lineWrapping]}
                onChange={(value, viewUpdate) => {
                    this.props.onChange(value);
                }}
            />
        );
    }
}



class ZooDbEditFieldDescription extends React.Component
{
    shouldComponentUpdate(newProps, newState)
    {
        return false; // schema never changes
    }

    render()
    {
        const fieldname = this.props.fieldname;
        const schema = this.props.schema;

        let expected_items = [];
        if (schema._optional) {
            expected_items.push('this is an optional field');
        }
        if (schema._single_line_string) {
            expected_items.push('single line text')
        }
        if (schema._llm) {
            if (schema._llm == 'full') {
                expected_items.push(
                    'you can use LaTeX-like commands including citations and cross-references'
                );
            } else if (schema._llm == 'standalone') {
                expected_items.push(
                    'you can use some LaTeX-like commands, but not citations and '
                    + 'cross-references (standalone mode)'
                );
            }
        }

        let expected = expected_items.join('; ');
        if (expected) {
            expected = '[' + expected + '.]';
        }
        
        return [
            <div key={'fldname'}
                 className="ZooDbEditSchemaField_field_name">{fieldname}</div>,
            <div key={'description'}
                 className="ZooDbEditSchemaField_field_description">{schema._description}</div>,
            <div key={'expected'}
                 className="ZooDbEditSchemaField_field_expected">{expected}</div>
        ];
    }
};



export default class ZooDbEditSchemaFieldextends React.Component
{
    shouldComponentUpdate(newProps, newState)
    {
        return true;
    }

    render()
    {
        const fieldname = this.props.fieldname;
        const schema = this.props.schema;
        const value = this.props.value;

        const document_object_updater_model = this.props.document_object_updater_model;

        console.log("render()! fieldname = ", fieldname);

        let edit_component = null;

        if (schema.type == 'object') {
            edit_component = (
                <ZooDbEditSchemaFieldObjectType
                    key={'object'}
                    schema={schema}
                    value={value}
                    document_object_updater_model={document_object_updater_model}
                    onChange={this.props.onChange} />
            );
        } else if (schema.type == 'array') {
            edit_component = (
                <ZooDbEditSchemaFieldArrayType
                    key={'array'}
                    schema={schema}
                    value={value}
                    document_object_updater_model={document_object_updater_model}
                    onChange={this.props.onChange} />
            );
        } else {
            edit_component = (
                <ZooDbEditSchemaFieldScalarType
                    key={'scalar'}
                    schema={schema}
                    value={value}
                    onChange={this.props.onChange} />
            );
        }

        let description_component = null;
        if ( ! this.props.skip_description ) {
            description_component = (
                <ZooDbEditFieldDescription
                    key={'desc'}
                    fieldname={fieldname}
                    schema={schema} />
            );
        }

        return (
            <div className="ZooDbEditSchemaField">
                {description_component}
                {edit_component}
            </div>
        );
    }
};
