<script setup>
import { onMounted, onBeforeUnmount, computed, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildBoard, buildPart, buildWire, disposeGroup, position3D } from '../scene/buildScene';
import { footprint, nearestHole, validatePlacement, projectBoard } from '../domain/breadboard';
const props = defineProps({
  project: Object,
  result: Object,
  selectedUid: String,
  tool: String,
  placing: String,
  wireStart: String,
  zoom: Number,
});
const board = computed(() => projectBoard(props.project));
let boardMesh;
const emit = defineEmits(['select', 'move', 'hole', 'hover', 'notice']);
const host = ref(null),
  error = ref('');
let renderer,
  scene,
  camera,
  controls,
  resizeObserver,
  frame,
  parts,
  drag,
  pending,
  canvas,
  oldZoom = 1;
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function coords(event) {
  const box = canvas.getBoundingClientRect();
  raycaster.setFromCamera(
    new THREE.Vector2(
      ((event.clientX - box.left) / box.width) * 2 - 1,
      (-(event.clientY - box.top) / box.height) * 2 + 1,
    ),
    camera,
  );
  const target = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, target)) return null;
  return { x: target.x * 100 + board.value.width / 2, y: target.z * 100 + board.value.height / 2 };
}
function down(event) {
  if (event.button !== 0) return;
  if (props.tool === 'pan') return;
  const point = coords(event);
  if (!point) return;
  if (props.tool !== 'select') {
    const hole = nearestHole(point, props.tool === 'place', 35, board.value);
    if (hole) emit('hole', hole.id);
    event.stopImmediatePropagation();
    return;
  }
  const hits = raycaster.intersectObjects(parts.children, true);
  if (!hits.length) return;
  let object = hits[0].object;
  while (object && !object.userData.uid) object = object.parent;
  const part = props.project.components.find((p) => p.uid === object?.userData.uid);
  if (!object) return;
  emit('select', object.userData.uid);
  if (!part) return;
  event.stopImmediatePropagation();
  event.preventDefault();
  // Drag on a plane through the grabbed surface, avoiding parallax on long boards.
  plane.constant = -hits[0].point.y;
  const dragPoint = coords(event) || point;
  const anchor = footprint(part, board.value)[0];
  drag = {
    part,
    offset: { x: dragPoint.x - anchor.x, y: dragPoint.y - anchor.y },
    object,
    pointer: event.pointerId,
    original: object.position.clone(),
  };
  controls.enabled = false;
  canvas.setPointerCapture(event.pointerId);
}
function move(event) {
  const point = coords(event);
  if (!point) return;
  const hole = nearestHole(
    drag ? { x: point.x - drag.offset.x, y: point.y - drag.offset.y } : point,
    !!drag || props.tool === 'place',
    drag ? 85 : 30,
    board.value,
  );
  emit('hover', hole?.id || null);
  if (drag) {
    event.stopImmediatePropagation();
    pending = hole ? { ...drag.part, anchor: hole.id } : null;
    if (
      pending &&
      validatePlacement(pending, props.project.components, props.project.wires, board.value).valid
    ) {
      const original = position3D(footprint(drag.part, board.value)[0], 0.03, board.value),
        next = position3D(hole, 0.03, board.value);
      drag.object.position.copy(drag.original).add(next.sub(original));
    }
  }
}
function up(event) {
  if (!drag) return;
  if (pending && pending.anchor !== drag.part.anchor) {
    const check = validatePlacement(
      pending,
      props.project.components,
      props.project.wires,
      board.value,
    );
    if (check.valid) emit('move', pending);
    else emit('notice', check.reason);
  }
  stop(event);
}
function stop() {
  if (drag && canvas.hasPointerCapture(drag.pointer)) canvas.releasePointerCapture(drag.pointer);
  drag = null;
  pending = null;
  plane.constant = 0;
  if (controls) controls.enabled = true;
  syncParts();
}
function syncParts() {
  if (!parts) return;
  disposeGroup(parts);
  parts.clear();
  props.project.wires.forEach((wire) => parts.add(buildWire(wire, board.value)));
  props.project.components.forEach((part) =>
    parts.add(
      buildPart(part, props.result.parts[part.uid], part.uid === props.selectedUid, board.value),
    ),
  );
}
watch(() => [props.project, props.result, props.selectedUid], syncParts, { deep: true });
watch(
  () => props.tool,
  (tool) => {
    if (controls)
      controls.mouseButtons.LEFT = tool === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
  },
);
function centerView() {
  if (!camera || !controls) return;
  camera.position.set(
    0,
    10 * Math.max(1, board.value.width / 920),
    8 * Math.max(1, board.value.width / 920),
  );
  controls.target.set(0, 0, 0);
  controls.update();
  oldZoom = 1;
}
watch(board, () => {
  if (!scene) return;
  if (boardMesh) {
    scene.remove(boardMesh);
    disposeGroup(boardMesh);
  }
  boardMesh = buildBoard(board.value);
  scene.add(boardMesh);
  centerView();
  syncParts();
});
defineExpose({ centerView });
watch(
  () => props.zoom,
  (value) => {
    if (camera) {
      camera.position.multiplyScalar(oldZoom / value);
      oldZoom = value;
    }
  },
);
onMounted(() => {
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#202830');
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(
      0,
      10 * Math.max(1, board.value.width / 920),
      8 * Math.max(1, board.value.width / 920),
    );
    camera.lookAt(0, 0, 0);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    canvas = renderer.domElement;
    canvas.setAttribute('aria-label', 'Protoboard 3D interactivo');
    host.value.appendChild(canvas);
    canvas.addEventListener('pointerdown', down, true);
    canvas.addEventListener('pointermove', move, true);
    canvas.addEventListener('pointerup', up, true);
    canvas.addEventListener('pointercancel', stop);
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 5;
    controls.maxDistance = 48;
    scene.add(new THREE.HemisphereLight('#ffffff', '#8493a0', 2.5));
    const light = new THREE.DirectionalLight('#fff8ec', 3);
    light.position.set(-3, 9, 4);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -7;
    light.shadow.camera.right = 7;
    light.shadow.camera.top = 7;
    light.shadow.camera.bottom = -7;
    scene.add(light);
    const table = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: '#29333b', roughness: 1 }),
    );
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.23;
    table.receiveShadow = true;
    scene.add(table);
    boardMesh = buildBoard(board.value);
    scene.add(boardMesh);
    parts = new THREE.Group();
    scene.add(parts);
    syncParts();
    resizeObserver = new ResizeObserver(() => {
      const rect = host.value.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(host.value);
    function animate() {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  } catch {
    error.value = 'No se pudo iniciar WebGL. Puedes continuar en la vista Montaje.';
  }
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  controls?.dispose();
  if (scene) disposeGroup(scene);
  renderer?.dispose();
});
</script>
<template>
  <div ref="host" class="three-surface">
    <div v-if="error" class="webgl-error">{{ error }}</div>
    <span class="three-help">Arrastra una pieza para moverla · arrastra el fondo para orbitar</span>
  </div>
</template>
