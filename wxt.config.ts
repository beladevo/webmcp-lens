import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'WebMCP Lens',
    description: 'Inspect, test, and annotate WebMCP tools.',
    version: '0.1.0',
    icons: {
      16: '/icon.svg',
      32: '/icon.svg',
      48: '/icon.svg',
      128: '/icon.svg',
    },
    action: {
      default_title: 'WebMCP Lens',
      default_icon: '/icon.svg',
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
