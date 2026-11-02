import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  holes,
  footprint,
  holeById,
  validatePlacement,
  nearestHole,
} from '../src/domain/breadboard.js';
import { createComponent } from '../src/data/components.js';
import { createExample } from '../src/domain/projects.js';
import { simulateCircuit } from '../src/engine/simulator.js';
import { getBoard, projectBoard, boardCatalog } from '../src/domain/breadboard.js';
import { componentCatalog, ledColors } from '../src/data/components.js';
import { resistanceFor } from '../src/engine/simulator.js';

test('170, 400 and 830 boards have the correct count, bounds and isolated rails', () => {
  for (const definition of boardCatalog) {
    const board = getBoard(definition.id);
    assert.equal(board.holes.length, definition.contacts);
    assert.equal(new Set(board.holes.map((h) => h.id)).size, definition.contacts);
    assert.ok(
      board.holes.every((h) => h.x > 0 && h.x < board.width && h.y > 0 && h.y < board.height),
    );
    assert.equal(board.holeById.a1.net, board.holeById.e1.net);
    assert.notEqual(board.holeById.e1.net, board.holeById.f1.net);
  }
  assert.equal(
    getBoard('mini170').holes.some((h) => h.kind === 'rail'),
    false,
  );
  const full = getBoard('bb830');
  assert.notEqual(full.holeById.tp2.net, full.holeById.tp62.net);
  assert.equal(
    getBoard('bb830', false).holeById.tp2.net,
    getBoard('bb830', false).holeById.tp62.net,
  );
});
test('circuits keep their current on each valid board and 63-column components use real anchors', () => {
  for (const board of boardCatalog) {
    const project = { ...createExample(), boardId: board.id };
    assert.ok(Math.abs(simulateCircuit(project).current - 7 / 480.8) < 1e-6);
    project.components.forEach((c) =>
      assert.equal(
        validatePlacement(c, project.components, project.wires, projectBoard(project)).valid,
        true,
      ),
    );
  }
  const full = getBoard('bb830');
  assert.deepEqual(
    footprint(createComponent('resistor', 'c59', 'p7'), full).map((p) => p.id),
    ['c59', 'c63'],
  );
  assert.equal(footprint(createComponent('resistor', 'c59', 'p7'), getBoard('bb400')).length, 0);
});
test('all catalog entries have a physical footprint, including distinct part bodies', () => {
  assert.ok(componentCatalog.length >= 20);
  for (const definition of componentCatalog) {
    const part = createComponent(definition.id, 'f5', 'p9');
    assert.equal(footprint(part).length, 2, definition.name);
  }
});
test('LED color changes forward voltage and current; brightness tracks current', () => {
  const currents = [];
  for (const option of ledColors) {
    const project = createExample();
    Object.assign(project.components[2], {
      ledColor: option.id,
      color: option.color,
      value: option.voltage,
    });
    const result = simulateCircuit(project);
    assert.ok(Math.abs(result.current - (9 - option.voltage) / 480.8) < 1e-6);
    assert.ok(result.parts.p3.brightness > 0 && result.parts.p3.brightness < 1);
    currents.push(result.current);
  }
  assert.ok(currents[0] > currents[2]);
});
test('LDR illumination, rheostat setting and diode polarity affect actual solved current', () => {
  const makeSeries = (id) => {
    const project = createExample(),
      part = createComponent(id, 'c6', 'p2'),
      end = footprint(part)[1].col + 1;
    project.components[1] = part;
    project.components[2].anchor = 'e' + end;
    project.wires[1].to = 'a' + (end + 1);
    return project;
  };
  const ldr = makeSeries('ldr');
  ldr.components[1].light = 0;
  const dark = simulateCircuit(ldr).current;
  ldr.components[1].light = 100;
  assert.equal(resistanceFor(ldr.components[1]), 500);
  assert.ok(simulateCircuit(ldr).current > dark * 100);
  const variable = makeSeries('rheostat');
  variable.components[1].value = 100;
  const low = simulateCircuit(variable).current;
  variable.components[1].value = 10000;
  assert.ok(low > simulateCircuit(variable).current * 50);
  const diode = makeSeries('diode');
  assert.ok(simulateCircuit(diode).current > 0.001);
  diode.components[1].anchor = 'c9';
  diode.components[1].rotation = 2;
  assert.ok(simulateCircuit(diode).current < 1e-7);
});

test('400 real contacts: five connected holes per group, isolated trench and continuous buses', () => {
  assert.equal(holes.length, 400);
  assert.equal(holeById.a10.net, holeById.e10.net);
  assert.notEqual(holeById.e10.net, holeById.f10.net);
  assert.notEqual(holeById.a10.net, holeById.a11.net);
  assert.equal(holeById.tp1.net, holeById.tp29.net);
});
test('nearest-hole snapping uses actual drawn coordinates across the center gap', () => {
  for (const id of ['a1', 'e14', 'f14', 'j30', 'tp2']) {
    const hole = holeById[id];
    assert.equal(nearestHole({ x: hole.x + 2, y: hole.y - 2 }).id, id);
  }
  assert.equal(nearestHole({ x: 400, y: 301 }, true, 20), null);
});
test('examples have two valid unoccupied contacts per component', () => {
  for (const name of ['led', 'divider', 'parallel', 'overload']) {
    const project = createExample(name);
    for (const part of project.components)
      assert.equal(validatePlacement(part, project.components).valid, true, part.label);
  }
});
test('collision and edge drops are rejected, and rotation targets real holes', () => {
  const part = createComponent('resistor', 'a4', 'p1');
  assert.equal(validatePlacement({ ...part, anchor: 'a29' }, []).valid, false);
  assert.equal(validatePlacement(createComponent('led', 'a4', 'p2'), [part]).valid, false);
  assert.equal(validatePlacement(part, [], [{ from: 'a4', to: 'a8' }]).valid, false);
  assert.deepEqual(
    footprint({ ...part, rotation: 1 }).map((p) => p.id),
    ['a4', 'e4'],
  );
});
test('LED current follows its placed resistance, forward drop and source internal resistance', () => {
  const project = createExample();
  let result = simulateCircuit(project);
  assert.equal(result.state, 'ok');
  assert.ok(Math.abs(result.current - 7 / 480.8) < 1e-6);
  assert.equal(result.parts.p3.on, true);
  project.components[1].value = 47;
  result = simulateCircuit(project);
  assert.equal(result.state, 'danger');
  assert.ok(result.current > 0.1);
});
test('moving, removing or reversing an LED changes the solved circuit', () => {
  const project = createExample();
  project.components[2].anchor = 'e20';
  assert.equal(simulateCircuit(project).state, 'open');
  project.components.pop();
  assert.equal(simulateCircuit(project).state, 'open');
  project.components.push({ ...createComponent('led', 'e11', 'p3'), rotation: 2 });
  assert.ok(simulateCircuit(project).current < 1e-7);
});
test('series divider obeys Kirchhoff voltage law and parallel branches split current', () => {
  const divider = simulateCircuit(createExample('divider'));
  assert.ok(
    Math.abs(divider.parts.p2.voltage + divider.parts.p3.voltage + divider.current * 0.8 - 12) <
      1e-6,
  );
  assert.ok(Math.abs(divider.parts.p3.voltage / divider.parts.p2.voltage - 2) < 1e-6);
  const parallel = simulateCircuit(createExample('parallel'));
  assert.ok(
    Math.abs(parallel.parts.p2.current + parallel.parts.p3.current - parallel.current) < 1e-6,
  );
  assert.ok(Math.abs(parallel.parts.p2.voltage - parallel.parts.p3.voltage) < 1e-6);
});
test('short detection follows actual wire connectivity and produces finite current', () => {
  const project = createExample();
  project.wires.push({ uid: 'short', from: 'd2', to: 'd5' });
  const result = simulateCircuit(project);
  assert.equal(result.label, 'Cortocircuito');
  assert.ok(Number.isFinite(result.current));
  assert.equal(result.current, 11.25);
});
test('switch state opens or closes the same circuit, empty projects have no invented readings', () => {
  const project = createExample();
  project.components[1] = { ...createComponent('switch', 'c6', 'p2'), closed: false };
  project.components[2].anchor = 'e7';
  project.wires[1].to = 'a8';
  assert.equal(simulateCircuit(project).state, 'open');
  project.components[1].closed = true;
  assert.ok(simulateCircuit(project).current > 0);
  assert.equal(simulateCircuit(createExample('empty')).state, 'idle');
});
