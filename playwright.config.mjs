// Browser E2E for the standalone 旧国名アトラス (kyukoku/).
// Local-only: the static server binds 127.0.0.1; CDN and OSM tiles are mocked in tests/e2e/network.mjs.
import {defineConfig, devices} from '@playwright/test';

const port = Number(process.env.OLDMAP_E2E_PORT || 4173);

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.mjs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    {name: 'desktop-chromium', use: {...devices['Desktop Chrome'], viewport: {width: 1280, height: 900}}},
    {name: 'mobile-chromium-390', use: {...devices['Pixel 7'], browserName: 'chromium', viewport: {width: 390, height: 844}}},
    // WebKit engine emulation of an iPhone viewport. NOT a substitute for a real iPhone Safari check.
    {name: 'webkit-iphone-375', use: {...devices['iPhone 13 mini'], browserName: 'webkit', hasTouch: false, viewport: {width: 375, height: 812}}},
  ],
  webServer: {
    command: `node tests/tools/serve.mjs ${port}`,
    url: `http://127.0.0.1:${port}/kyukoku/`,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
