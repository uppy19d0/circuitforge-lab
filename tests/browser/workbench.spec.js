import { test, expect } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';

async function screenPoint(page, x, y) {
  return page.locator('.breadboard-surface').evaluate(
    (svg, p) => {
      const point = new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM());
      return { x: point.x, y: point.y };
    },
    { x, y },
  );
}
async function holeClick(page, column, row) {
  const y = { a: 158, b: 184, c: 210, d: 236, e: 262, f: 340, g: 366, h: 392, i: 418, j: 444 }[row];
  const p = await screenPoint(page, 80 + (column - 1) * 26, y);
  await page.mouse.click(p.x, p.y);
}
test('drag snaps both leads to real holes, changes the circuit and supports undo', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('.analysis-metrics .accent')).toHaveText('14.56 mA');
  const a = await screenPoint(page, 262, 210),
    b = await screenPoint(page, 574, 210);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 16 });
  await page.mouse.up();
  await expect(page.locator('.terminal-list')).toContainText('C18');
  await expect(page.locator('.terminal-list')).toContainText('C22');
  await expect(page.locator('.canvas-status')).toHaveText('Circuito abierto');
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('.analysis-metrics .accent')).toHaveText('14.56 mA');
  expect(errors).toEqual([]);
});
test('add, keyboard-move, rotate, remove and restore a component', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Colocar Resistencia de 1 kΩ', exact: true }).click();
  await holeClick(page, 19, 'f');
  await expect(page.locator('.terminal-list')).toContainText('F19');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.terminal-list')).toContainText('F20');
  await page.keyboard.press('r');
  await expect(page.locator('.terminal-list')).toContainText('J20');
  await expect(page.locator('[data-part]')).toHaveCount(4);
  await page.getByRole('button', { name: 'Eliminar selección', exact: true }).click();
  await expect(page.locator('[data-part]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('[data-part]')).toHaveCount(4);
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('circuitforge.project.v2'))?.components.length,
      ),
    )
    .toBe(4);
  await page.reload();
  await expect(page.locator('[data-part]')).toHaveCount(4);
});
test('wiring actual supply nets detects a finite short; deleting the wire restores the circuit', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Conectar cable (W)', exact: true }).click();
  await holeClick(page, 2, 'e');
  await holeClick(page, 5, 'e');
  await expect(page.locator('.canvas-status')).toHaveText('Cortocircuito');
  await expect(page.locator('.analysis-metrics .accent')).toHaveText('11.25 A');
  await page.getByRole('button', { name: 'Seleccionar y mover (V)', exact: true }).click();
  await page.locator('.board-wire').last().focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Eliminar selección', exact: true }).click();
  await expect(page.locator('.canvas-status')).toHaveText('Funcionamiento normal');
});
test('editable electrical values, pause and schematic use the same state', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('spinbutton', { name: 'Valor del componente' }).fill('1000');
  await page.getByRole('spinbutton', { name: 'Valor del componente' }).press('Tab');
  await expect(page.locator('.analysis-metrics .accent')).toHaveText('6.93 mA');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.locator('.canvas-status')).toHaveText('Simulación pausada');
  await page.getByRole('button', { name: 'Simular', exact: true }).click();
  await expect(page.locator('.analysis-metrics .accent')).toHaveText('6.93 mA');
  await page.getByRole('button', { name: 'Esquema', exact: true }).click();
  await expect(page.locator('.schematic-surface')).toBeVisible();
  await expect(page.locator('.schematic-label')).toContainText([
    'V1 · 9 V',
    'R2 · 1000 Ω',
    'D3 · 2 V',
  ]);
});
test('3D renders the same circuit and raycast dragging moves its physical component', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const canvas = page.locator('.three-surface canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.webgl-error')).toHaveCount(0);
  // Project the resistor body and a new position through the scene camera.
  const rect = await canvas.boundingBox();
  const camera = new PerspectiveCamera(35, rect.width / rect.height, 0.1, 100);
  camera.position.set(0, 10, 8);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const project = (x, y) => {
    const v = new Vector3((x - 460) / 100, 0.23, (y - 300) / 100).project(camera);
    return { x: rect.x + ((v.x + 1) * rect.width) / 2, y: rect.y + ((1 - v.y) * rect.height) / 2 };
  };
  const a = project(262, 210),
    b = project(574, 210);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 18 });
  await page.mouse.up();
  await expect(page.locator('.canvas-status')).toHaveText('Circuito abierto');
  await page.getByRole('button', { name: 'Montaje', exact: true }).click();
  await expect(page.locator('.terminal-list')).toContainText('C18');
  expect(errors).toEqual([]);
});
test('mobile library, placement and inspector remain accessible without overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Abrir biblioteca', exact: true }).click();
  await page.getByRole('button', { name: 'Colocar LED verde · 5 mm', exact: true }).click();
  await holeClick(page, 20, 'f');
  await expect(page.locator('.inspector-panel h3')).toHaveText('LED verde · 5 mm');
  await page.getByRole('button', { name: 'Cerrar inspector', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
