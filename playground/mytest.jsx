import debug_mod from 'debug';
const debug = debug_mod('mytest');

import { createRoot } from 'react-dom/client';

import { ZooDbEditObjectComponent, DocumentObjectUpdaterModel } from '../src/index.js';

import data from './dataecz.json';

window.addEventListener('load', () => {
    debug('window load');

    const container = window.document.getElementById('AppContainer');
    const code_schema = data.db.schemas.code;
    const code_data = data.db.objects.code.css;

    debug('ZooDbEditObjectComponent = ', ZooDbEditObjectComponent);

    const document_object_updater_model = new DocumentObjectUpdaterModel();

    //
    // Render the app
    //
    const react_root = createRoot(container);
    react_root.render(
        <ZooDbEditObjectComponent
            object_title={code_data.name}
            object_schema={code_schema}
            object_data={code_data}
            document_object_updater_model={document_object_updater_model}
        />
    );

});
