import React from 'react';
import { createRoot } from 'react-dom/client';
import { InspectorApp } from '../../src/app/InspectorApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <InspectorApp target={{ kind: 'active-tab' }} variant="sidepanel" />
  </React.StrictMode>,
);
