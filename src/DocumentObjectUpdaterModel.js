
export class DocumentObjectUpdaterModel
{
    object_set_field(object, field, new_value)
    {
        let new_object = {... (object ?? {})};
        new_object[field] = new_value;
        return new_object;
    }

    object_delete_field(object, field)
    {
        let new_object = Object.fromEntries(
            Object.entries(object ?? {}).filter( ([key,value]) => (key != field) )
        );
        return new_object;
    }

    array_new_item(array, new_item, idx=null)
    {
        let new_array = (array ?? []).slice();
        new_array.splice((idx ?? new_array.length), 0,  null);
        return new_array;
    }

    array_delete_item(array, index)
    {
        if (array == null // null or undefined
            || index < 0 || index >= array.length) {
            return array;
        }
        let new_array = array.slice();
        new_array.splice(index, 1);
        return new_array;
    }

    array_move_item(array, index, index_destination)
    {
        let array_ok = array ?? [];
        if (index < 0 || index >= array_ok.length
            || index_destination < 0 || index_destination >= array_ok.length) {
            return array;
        }
        let new_array = array_ok.slice();
        let temp = new_array.splice(index, 1);
        new_array.splice(index_destination, 0, ...temp);
        return new_array;
    }

    array_set_item(array, index, new_value)
    {
        let new_array = (array ?? []).slice();
        new_array[index] = new_value;
        return new_array;
    }

};
