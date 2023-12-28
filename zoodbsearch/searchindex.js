import debug_module from 'debug';
const debug = debug_module('zoodbtools_search.searchindex');

import lunr from 'lunr';


/**
 * An object holding an index for the zoo database, which can be used for
 * searching with the `Lunr` library.
 *
 * The SearchIndex assumes that you have processed your database using the
 * :class:`SearchableTextProcessor` database processor.
 *
 * TODO Doc.......... explain how this works!
 */
export class SearchIndex
{
    static create(zoodb, searchable_text_fieldset, options)
    {
        debug(`setting up search index`);

        options ??= {};

        let fields_options = options.fields_options ?? {};
        fields_options.boost = Object.assign(
            {
                [searchable_text_fieldset.field_name_id]: 40, // boost matching the object ID
                [searchable_text_fieldset.field_name_title]: 40,
            },
            fields_options.boost ?? {}
        );

        const info = {
            object_types: searchable_text_fieldset.object_types,
            fields: searchable_text_fieldset.fields,
            field_name_id: searchable_text_fieldset.field_name_id,
            field_name_title: searchable_text_fieldset.field_name_title,
            fields_options,
        };

        //
        // create the store of all documents' searchable text documents
        //
        debug(`creating text data store ...`);
        let store = [];
        for (const object_type of searchable_text_fieldset.object_types) {
            const object_db = zoodb.objects[object_type];
            for (const [object_id, object] of Object.entries(object_db)) {

                if (object._zoodb == null) { // null or undefined
                    throw new Error(`${object_type} ${object_id} does not have field _zoodb!`);
                }

                const searchable_text_doc =
                      object._zoodb[ searchable_text_fieldset.searchable_text_fieldset_name ];

                if (searchable_text_doc == null) { // null or undefined
                    throw new Error(
                        `${object_type} ${object_id}'s _zoodb does not have the field `
                            + `${searchable_text_fieldset.searchable_text_fieldset_name}!`
                    );
                }

                const doc = Object.assign(
                    {
                        _z_searchboost: null, // searchabletextdoc's can set per-object boost
                    },
                    searchable_text_doc,
                    {
                        _z_stid: store.length, // lunr needs the current index here.
                    }
                );

                store.push(doc);

            }
        }
        debug(`... done.`);

        return new SearchIndex(info, store, null);
    }

    installLunrCustomization({ lunr_plugins, lunr_query_parser_class })
    {
        this.lunr_custom_options.lunr_plugins = lunr_plugins;
        this.lunr_custom_options.lunr_query_parser_class = lunr_query_parser_class;
        debug(`Set lunr customization -> `, this.lunr_custom_options);
    }

    build()
    {
        let info = this.info;
        let store = this.store;

        let lunr_custom_options = this.lunr_custom_options;

        const options = {}; // FIXME !

        //
        // build the index!
        //
        debug(`building the index ...`);
        this.idx = lunr( function () {
            //
            // Function will build the index. Lunr's API is accessed via 'this'
            // (aliased to 'builder' here).
            //
            let builder = this;

            builder.ref('_z_stid');
            builder.field('_z_otype');
            builder.field('_z_href');
            // these are included in info.fields
            // builder.field(this.field_name_id);
            // builder.field(this.field_name_title);
            for (const fldname of info.fields) {
                const { boost } = info.fields_options[fldname] ?? {};
                if (boost != null) {
                    builder.field(fldname, {boost: boost});
                } else {
                    builder.field(fldname);
                }
            }
            builder.metadataWhitelist = [ 'position' ];

            if (lunr_custom_options.lunr_plugins) {
                for (const plugin of lunr_custom_options.lunr_plugins) {
                    builder.use(plugin, options);
                }
            }
            
            for (const doc of store) {
                const doc_boost = doc._z_searchboost ?? 1;
                if (doc_boost != 1) { debug(`Adding doc =`, doc, ` with boost = `, doc_boost); }
                builder.add(doc, { boost: doc_boost });
            }

        } );
        debug(`... done.`);
    }

    static load(search_index_data, lunr_custom_options=null)
    {
        const {info, serialized_store, serialized_index} = search_index_data;

        const store = this._load_store(info, serialized_store);

        if (serialized_index != null) {
            const idx = this._load_idx_notnull(info, serialized_index);
            let si = new SearchIndex(info, store, idx);
            if (lunr_custom_options != null) {
                si.installLunrCustomization(lunr_custom_options);
            }
            return si;
        } else {
            let si = new SearchIndex(info, store, null);
            if (lunr_custom_options != null) {
                si.installLunrCustomization(lunr_custom_options);
            }
            si.build();
            return si;
        }
    }

    toJSON()
    {
        return {
            info: this.info,
            serialized_store: this._dump_store(),
            serialized_index: this._dump_idx(),
        };
    }


    // you shouldn't have to use this directly
    constructor(info, store, idx)
    {
        this.info = info;
        this.store = store;
        this.idx = idx;

        this.lunr_custom_options = {};
    }


    //
    // internal methods to load/dump index and store.
    //
    _dump_idx()
    {
        if (this.idx == null) {
            return null;
        }
        return this.idx.toJSON();
    }

    static _load_idx_notnull(info, serialized_index)
    {
        return lunr.Index.load( serialized_index );
    }

    _dump_store()
    {
        // compress the store's representation to save data
        const store_size = this.store.length;
        const storefields = [].concat(['_z_otype', '_z_searchboost', '_z_href'], this.info.fields);
        let serialized_store = Object.fromEntries(
            storefields
            .map( (fldname) => [fldname, new Array(store_size)] )
        );
        for (let j = 0; j < store_size; ++j) {
            const st_doc = this.store[j];
            if (j != st_doc._z_stid) {
                throw new Error(
                    `Internal error: inconsistency of store id: `
                    + `j=${j}, st_doc=${JSON.stringify(st_doc)}`
                );
            }
            for (const fieldname of storefields) {
                serialized_store[fieldname][j] = st_doc[fieldname];
            }
        }
        serialized_store._z_store_size = store_size;
        return serialized_store;
    }
    static _load_store(info, serialized_store)
    {
        const storefields = [].concat(['_z_otype', '_z_searchboost', '_z_href'], info.fields);
        const store_size = serialized_store._z_store_size;
        let store = new Array(store_size);
        for (let j = 0; j < store_size; ++j) {
            store[j] = Object.fromEntries(
                storefields.map(
                    (fieldname) => [fieldname, serialized_store[fieldname][j]]
                )
            );
            store[j]._z_stid = j;
        }
        return store;
    }

}
