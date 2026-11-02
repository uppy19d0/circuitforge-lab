<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildBoard, buildPart, buildWire, disposeGroup, position3D } from '../scene/buildScene';
import { footprint, nearestHole, validatePlacement, holeById } from '../domain/breadboard';
const props = defineProps({
  project: Object,
  result: Object,
  selectedUid: String,
  tool: String,
  placing: String,
  wireStart: String,
  zoom: Number,
});
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
  return { x: target.x * 100 + 460, y: target.z * 100 + 300 };
}
function down(event) {
  if (event.button !== 0) return;
  const point = coords(event);
  if (!point) return;
  if (props.tool !== 'select') {
    const hole = nearestHole(point, props.tool === 'place', 35);
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
  const anchor = footprint(part)[0];
  drag = {
    part,
    offset: { x: point.x - anchor.x, y: point.y - anchor.y },
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
  );
  emit('hover', hole?.id || null);
  if (drag) {
    event.stopImmediatePropagation();
    pending = hole ? { ...drag.part, anchor: hole.id } : null;
    if (
      pending &&
      validatePlacement(pending, props.project.components, props.project.wires).valid
    ) {
      const original = position3D(footprint(drag.part)[0]),
        next = position3D(hole);
      drag.object.position.copy(drag.original).add(next.sub(original));
    }
  }
}
function up(event) {
  if (!drag) return;
  if (pending && pending.anchor !== drag.part.anchor) {
    const check = validatePlacement(pending, props.project.components, props.project.wires);
    if (check.valid) emit('move', pending);
    else emit('notice', check.reason);
  }
  stop(event);
}
function stop() {
  if (drag && canvas.hasPointerCapture(drag.pointer)) canvas.releasePointerCapture(drag.pointer);
  drag = null;
  pending = null;
  if (controls) controls.enabled = true;
  syncParts();
}
function syncParts() {
  if (!parts) return;
  disposeGroup(parts);
  parts.clear();
  props.project.wires.forEach((wire) => parts.add(buildWire(wire)));
  props.project.components.forEach((part) =>
    parts.add(buildPart(part, props.result.parts[part.uid], part.uid === props.selectedUid)),
  );
}
watch(() => [props.project, props.result, props.selectedUid], syncParts, { deep: true });
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
    camera.position.set(0, 10, 8);
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
    controls.maxDistance = 24;
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
    scene.add(buildBoard());
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
