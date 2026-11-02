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
