<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const host = ref(null); let renderer; let frame; let observer; let scene; let camera; let controls; let bench;
const material = color => new THREE.MeshStandardMaterial({ color, roughness: .32 });
const box = (size, position, color) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color)); m.position.set(...position); bench.add(m); };
const cylinder = (radius, height, position, color) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), material(color)); m.position.set(...position); bench.add(m); };
function buildBench() { 
  // Standard solderless breadboard: two five-hole terminal strips, center trench and power buses.
  box([6.5, .24, 3.25], [0, -.25, 0], 0xe7edf0);
  box([6.25, .025, .05], [0, -.1, -.98], 0xd9414e); box([6.25, .025, .05], [0, -.1, -1.13], 0x3772b8);
  box([6.25, .025, .05], [0, -.1, .98], 0xd9414e); box([6.25, .025, .05], [0, -.1, 1.13], 0x3772b8);
  box([6.15, .08, .2], [0, -.03, 0], 0xcbd4d9);
  for (let column = 0; column < 30; column += 1) { const x = -2.9 + column * .2; for (const z of [-.68, -.51, -.34, .34, .51, .68]) cylinder(.035, .045, [x, -.08, z], 0x536877); }
  for (let column = 0; column < 30; column += 1) { const x = -2.9 + column * .2; for (const z of [-1.02, 1.02]) { cylinder(.035, .045, [x, -.08, z], 0x536877); cylinder(.035, .045, [x, -.08, z + (z < 0 ? -.12 : .12)], z < 0 ? 0xd9414e : 0x3772b8); } }
  box([1.7, .18, .08], [-1.2, .12, -.51], 0xdca56b); for (let x = -1.7; x < -.5; x += .24) box([.035, .22, .04], [x, .23, -.51], 0x963d39);
  cylinder(.22, .25, [.5, .12, .34], 0xe84f62); cylinder(.08, .12, [.5, .31, .34], 0xffb3a7);
  box([.65, .55, .75], [1.8, .12, .34], 0x263f58); box([.08, .7, .9], [1.65, .12, .34], 0xb9d9e0); box([.08, .85, .9], [1.95, .12, .34], 0xd74e4e);
}
function resize() { const rect = host.value.getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); }
onMounted(() => { scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a1728); camera = new THREE.PerspectiveCamera(42, 1, .1, 100); camera.position.set(5, 4, 6); renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); host.value.appendChild(renderer.domElement); controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; scene.add(new THREE.HemisphereLight(0xaad8ff, 0x162235, 2)); const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(4, 7, 3); scene.add(light); bench = new THREE.Group(); scene.add(bench); buildBench(); observer = new ResizeObserver(resize); observer.observe(host.value); const tick = () => { frame = requestAnimationFrame(tick); bench.rotation.y += .001; controls.update(); renderer.render(scene, camera); }; tick(); });
onBeforeUnmount(() => { cancelAnimationFrame(frame); observer?.disconnect(); controls?.dispose(); renderer?.dispose(); });
</script>
<template><div ref="host" class="scene-canvas"><span class="scene-label">Mesa 3D · arrastra para rotar</span><span class="scene-help">rueda: zoom</span></div></template>
