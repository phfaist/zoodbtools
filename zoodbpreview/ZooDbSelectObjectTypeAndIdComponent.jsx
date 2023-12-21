import debug_mod from 'debug';
const debug = debug_mod('zoodbtoolspreview.ZooDbSelectObjectTypeAndIdComponent');

import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';

import './ZooDbSelectObjectTypeAndIdComponent_style.scss';


  
const formatGroupLabel = (data) => (
  <div className="zoodb-preview-select-item-group-label">
    <span>{data.label}</span>
    <span className="zoodb-preview-select-item-group-label-badge">{data.options.length}</span>
  </div>
);






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
    let mainSelectOptions = [];

    if (zoodb != null) {

        isDisabled = false;

        let allObjectTypes = Object.keys(zoodb.objects);
        allObjectTypes.sort();

        for (const objectType of allObjectTypes) {
            let allObjectIds = Object.keys(zoodb.objects[objectType]);
            allObjectIds.sort();

            mainSelectOptions.push({
                label: objectType,
                options: allObjectIds.map(
                    (objectId) => ({
                        value: JSON.stringify({objectType,objectId}),
                        label: objectId,
                    })
                )
            });
        }
        mainSelectOptions.push(
            { value: "{}", label: "(select object)" }
        );

    }

    let callbackOnChange = (newValue) => {
        if ( ! newValue || ! newValue.value ) {
            onChangeObjectTypeAndId(null, null);
        }
        let { objectType, objectId } = JSON.parse(newValue.value);
        onChangeObjectTypeAndId(objectType, objectId);
    };

    return (
        <div className="zoodb-preview-select-bar">
            <Select
                className="zoodb-preview-select-objecttypeandid"
                classNamePrefix="zoodb-preview-react-select"
                isDisabled={isDisabled}
                value={
                    { value: JSON.stringify({objectType,objectId}), label: objectId }
                }
                onChange={callbackOnChange}
                options={mainSelectOptions}
                formatGroupLabel={formatGroupLabel}
            />
        </div>
    );
}


