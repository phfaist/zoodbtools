import debug_mod from 'debug';
const debug = debug_mod('zoodbtoolspreview.ZooDbSelectObjectTypeAndIdComponent');

import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';

import './ZooDbSelectObjectTypeAndIdComponent_style.scss';




export function ZooDbSelectObjectTypeAndIdComponent(props)
{
    let {
        zoodb,
        objectType,
        objectId,
        onChangeObjectTypeAndId,
    } = props;

    objectType ||= "";
    objectId ||= "";

    let isDisabled = true;
    let selectObjectTypeOptions = [];
    let selectObjectIdOptions = [];

    if (zoodb != null) {

        isDisabled = false;

        let allObjectTypes = Object.keys(zoodb.objects);
        allObjectTypes.sort();

        selectObjectTypeOptions = allObjectTypes.map(
            (x) => ({ value: x, label: x })
        );
        selectObjectTypeOptions.push(
            { value: "", label: "(select object type)" }
        )

        if (objectType && zoodb.objects[objectType]) {
            let allObjectIds = Object.keys(zoodb.objects[objectType]);
            allObjectIds.sort();

            selectObjectIdOptions = allObjectIds.map(
                (x) => ({ value: x, label: x })
            );
        }
        selectObjectIdOptions.push(
            { value: "", label: "(select object)" }
        );

    }

    return (
        <div className="zoodb-preview-select-bar">
            <Select
                className="zoodb-preview-select-objecttype"
                classNamePrefix="zoodb-preview-react-select"
                isDisabled={isDisabled}
                value={{value: objectType, label: objectType}}
                onChange={(newValue) => onChangeObjectTypeAndId(newValue.value, null)}
                options={selectObjectTypeOptions}
            />
            <Select
                className="zoodb-preview-select-objectid"
                classNamePrefix="zoodb-preview-react-select"
                isDisabled={isDisabled}
                value={{value: objectId, label: objectId }}
                onChange={(newValue) => onChangeObjectTypeAndId(objectType, newValue.value)}
                options={selectObjectIdOptions}
            />
        </div>
    );
}


