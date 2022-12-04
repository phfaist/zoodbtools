import React from "react";
import ReactDOM from "react-dom";

//import YAML from 'yaml'; // yaml fails to parse multi-line strings !?
//import jsyaml from 'js-yaml';

import { ZooDbEditObjectComponent } from "./ZooDbEditObjectComponent.jsx";
import { DocumentObjectUpdaterModel } from "./DocumentObjectUpdaterModel.js";

export { ZooDbEditObjectComponent, DocumentObjectUpdaterModel };



// export class ZooDbEditObjectAppInstaller
// {
//     constructor(root_element, code_id, code_yml_filename)
//     {
//         let _this = this;

//         this.root_element = root_element;
//         this.code_id = code_id || '';
//         this.code_yml_filename = code_yml_filename;

//         this.ready_to_install_promise = this.resolve_ecc_schema_promise;

//         if (code_yml_filename) {

//             //
//             // Fetch the code data that we should edit, and fetch the 
//             //
//             const fetch_codeyml_url = (
//                 'https://raw.githubusercontent.com/errorcorrectionzoo/eczoo_data/main/codes/'
//                     + code_yml_filename
//             );
//             this.fetch_code_data_promise = fetch(fetch_codeyml_url).then(
//                 async (response) => {
//                     const response_data = await response.text();
//                     try {
//                         _this.code_data = jsyaml.load( response_data );
//                     } catch (e) {
//                         console.log("Error in YAML source file.", response_data);
//                         console.log(e);
//                         alert(
//                             "Sorry! There is an error in the source YAML file.  Please "
//                            +"report this issue to us. You could file an issue on our "
//                            +"github repo at "
//                            +"https://github.com/errorcorrectionzoo/eczoo_data/issues .\n\n"
//                            +e
//                         );
//                         _this.code_yml_filename = null;
//                         _this.code_data = {};
//                     }
//                     console.log("Got code data."); // -> ", _this.code_data);
//                 }
//             );

//             this.ready_to_install_promise = Promise.all([
//                 this.resolve_ecc_schema_promise,
//                 this.fetch_code_data_promise
//             ]);

//         } else {

//             // prepare empty data structure
//             if (code_id) {
//                 this.code_data = { code_id: code_id };
//             } else {
//                 this.code_data = { };
//             }

//         }

//         this.ready_to_install_promise.then( () => { _this.install() } );
//     };

    
//     install()
//     {
//         //
//         // Render the app
//         //
//         ReactDOM.render(
//             <EczEditCodeApp
//                 code_id={this.code_id}
//                 code_yml_basename={(this.code_yml_filename||'').split('/').pop()}
//                 code_schema={this.code_schema}
//                 code_data={this.code_data} />,
//             this.root_element
//         );
//     }

// };
