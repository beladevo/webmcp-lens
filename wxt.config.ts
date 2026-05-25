import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'WebMCP Lens',
    description: 'Inspect, test, and annotate WebMCP tools.',
    version: '0.1.0',
    icons: {
      48: '/icon48.png',
      128: '/icon128.png',
    },
    action: {
      default_title: 'WebMCP Lens',
      default_icon: {
        48: '/icon48.png',
        128: '/icon128.png',
      },
    },
    permissions: ['activeTab', 'scripting', 'storage', 'tabs'],
    host_permissions: ['<all_urls>'],
    web_accessible_resources: [
      {
        resources: ['page-bridge.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
