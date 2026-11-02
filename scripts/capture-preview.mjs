import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const baseURL = process.env.CIRCUITFORGE_PREVIEW_URL || 'http://127.0.0.1:4178/circuitforge-lab/';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(baseURL);
await page.locator('.breadboard-surface').waitFor();
await page.screenshot({ path: 'artifacts/circuitforge-montage.png' });
await page.getByRole('button', { name: '3D', exact: true }).click();
await page.locator('.three-surface canvas').waitFor();
await page.evaluate(
  () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
);
await page.screenshot({
  path: 'artifacts/circuitforge-workbench-v2.jpg',
  type: 'jpeg',
  quality: 90,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: 'Montaje', exact: true }).click();
await page.screenshot({ path: 'artifacts/circuitforge-mobile.png' });
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));
console.log('Captured desktop, 3D and mobile previews without runtime errors.');
