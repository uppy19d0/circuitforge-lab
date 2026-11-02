import { test, expect } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';

test('LED color and package diameter update the actual component, current and saved project', async ({
  page,
}) => {
  await page.goto('./');
  await page.locator('[data-part="p3"]').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Color de LED: Azul', exact: true }).click();
  await expect(page.locator('.part-heading h3')).toHaveText('LED azul · 5 mm');
  await expect(page.locator('.analysis-metrics .accent')).toHaveText('12.27 mA');
  await page.getByLabel('Diámetro del LED', { exact: true }).selectOption('10');
  await expect(page.locator('.part-heading h3')).toHaveText('LED azul · 10 mm');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.three-surface canvas')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('circuitforge.project.v2'))?.components.find(
            (c) => c.uid === 'p3',
          )?.diameter,
      ),
    )
    .toBe(10);
  await page.reload();
  await page.locator('[data-part="p3"]').focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Color de LED: Azul', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Diámetro del LED', { exact: true })).toHaveValue('10');
});
test('immediate reload flushes pending board and LED edits before leaving the page', async ({
  page,
}) => {
  await page.goto('./');
  const selector = page.getByRole('combobox', { name: 'Tipo de protoboard' });
  await selector.selectOption('bb830');
  await page.locator('[data-part="p3"]').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Color de LED: Azul', exact: true }).click();
  await page.getByLabel('Diámetro del LED', { exact: true }).selectOption('10');
  await page.reload();
  await expect(selector).toHaveValue('bb830');
  await page.locator('[data-part="p3"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Diámetro del LED', { exact: true })).toHaveValue('10');
  await expect(
    page.getByRole('button', { name: 'Color de LED: Azul', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.analysis-metrics .accent')).toHaveText('12.27 mA');
});
test('switch board formats, preserve circuit and reject a shrink that would lose parts', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  const selector = page.getByRole('combobox', { name: 'Tipo de protoboard' });
  await selector.selectOption('mini170');
  await expect(page.locator('.board-chip')).toContainText('170');
  await expect(page.locator('.board-base > rect[width="8"]')).toHaveCount(170);
  await expect(page.locator('.analysis-metrics .accent')).toHaveText('14.56 mA');
  await selector.selectOption('bb830');
  await expect(page.locator('.board-base > rect[width="8"]')).toHaveCount(830);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.three-surface canvas')).toBeVisible();
  await selector.selectOption('mini170');
  await expect(page.locator('.board-chip')).toContainText('170');
  await page.getByRole('button', { name: 'Montaje', exact: true }).click();
  await selector.selectOption('bb830');
  await page.getByRole('button', { name: 'Colocar Resistencia de 1 kΩ', exact: true }).click();
  await holeClick(page, 59, 'f');
  await expect(page.locator('.terminal-list')).toContainText('F63');
  await selector.selectOption('mini170');
  await expect(page.locator('.board-chip')).toContainText('830');
  await expect(page.locator('.interaction-message')).toContainText('fuera de esta placa');
  await expect(selector).toHaveValue('bb830');
  await page.getByRole('button', { name: 'Rieles: divididos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rieles: continuos', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('long-board zoom supports panning and resets to a fitted view', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('combobox', { name: 'Tipo de protoboard' }).selectOption('bb830');
  await page.getByRole('button', { name: 'Acercar', exact: true }).click();
  await page.getByRole('button', { name: 'Acercar', exact: true }).click();
  await page.getByRole('button', { name: 'Desplazar vista (H)', exact: true }).click();
  const svg = page.locator('.breadboard-surface');
  const before = (await svg.getAttribute('viewBox')).split(' ').map(Number);
  const box = await svg.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 25, { steps: 14 });
  await page.mouse.up();
  expect(Number((await svg.getAttribute('viewBox')).split(' ')[0])).toBeLessThan(before[0]);
  await page.getByRole('button', { name: 'Centrar vista', exact: true }).click();
  expect(Number((await svg.getAttribute('viewBox')).split(' ')[0])).toBe(-95);
  await expect(page.locator('.viewport-controls > span')).toHaveText('100%');
});
test('additional physical components can be searched, placed and adjusted', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox', { name: 'Buscar componente' }).fill('LDR');
  await page.getByRole('button', { name: 'Colocar Fotoresistencia LDR', exact: true }).click();
  await holeClick(page, 20, 'f');
  await page.getByLabel('Iluminación LDR', { exact: true }).fill('90');
  await expect(page.locator('.inspector-field')).toContainText(['Iluminación · 90 %']);
  await page.getByRole('searchbox', { name: 'Buscar componente' }).fill('Pulsador');
  await page
    .getByRole('button', { name: 'Colocar Pulsador normalmente abierto', exact: true })
    .click();
  await holeClick(page, 25, 'f');
  const button = page.getByRole('button', { name: 'Mantener pulsado', exact: true });
  await button.focus();
  await page.keyboard.down('Space');
  await expect(page.getByRole('button', { name: 'Pulsador cerrado', exact: true })).toBeVisible();
  await page.keyboard.up('Space');
  await expect(button).toBeVisible();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.three-surface canvas')).toBeVisible();
});
test('3D long-board drag snaps at the distant edge without parallax', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('combobox', { name: 'Tipo de protoboard' }).selectOption('bb830');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const canvas = page.locator('.three-surface canvas');
  await expect(canvas).toBeVisible();
  const rect = await canvas.boundingBox(),
    factor = 1778 / 920;
  const camera = new PerspectiveCamera(35, rect.width / rect.height, 0.1, 100);
  camera.position.set(0, 10 * factor, 8 * factor);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const project = (x, y) => {
    const v = new Vector3((x - 889) / 100, 0.23, (y - 300) / 100).project(camera);
    return { x: rect.x + ((v.x + 1) * rect.width) / 2, y: rect.y + ((1 - v.y) * rect.height) / 2 };
  };
  const a = project(262, 210),
    b = project(1640, 210);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 28 });
  await page.mouse.up();
  await expect(page.locator('.terminal-list')).toContainText('C59');
  await expect(page.locator('.terminal-list')).toContainText('C63');
  await expect(page.locator('.canvas-status')).toHaveText('Circuito abierto');
});

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
test('invalid edge drops and interrupted drags preserve the original placement', async ({
  page,
}) => {
  await page.goto('./');
  const start = await screenPoint(page, 262, 210);
  const outside = await screenPoint(page, 858, 210);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(outside.x, outside.y, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('.terminal-list')).toContainText('C6');
  await expect(page.locator('.analysis-metrics .accent')).toHaveText('14.56 mA');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const next = await screenPoint(page, 574, 210);
  await page.mouse.move(next.x, next.y, { steps: 8 });
  await page.locator('.breadboard-surface').dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  await expect(page.locator('.terminal-list')).toContainText('C6');
  await expect(page.locator('.analysis-metrics .accent')).toHaveText('14.56 mA');
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
  await page.getByRole('button', { name: 'Acercar', exact: true }).click();
  await expect(page.locator('.viewport-controls > span')).toHaveText('115%');
  await page.getByRole('button', { name: 'Centrar vista', exact: true }).click();
  await expect(page.locator('.viewport-controls > span')).toHaveText('100%');
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
