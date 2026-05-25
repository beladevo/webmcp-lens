import React from 'react';
import { createRoot } from 'react-dom/client';
import { InspectorApp } from '../../src/app/InspectorApp';

const tabId = chrome.devtools.inspectedWindow.tabId;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <InspectorApp target={{ kind: 'tab', tabId }} variant="devtools" />
  </React.StrictMode>,
);
