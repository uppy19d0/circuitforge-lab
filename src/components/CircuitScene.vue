<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const host = ref(null); let renderer; let frame; let observer; let scene; let camera; let controls; let bench;
const material = color => new THREE.MeshStandardMaterial({ color, roughness: .32 });
const box = (size, position, color) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color)); m.position.set(...position); bench.add(m); };
const cylinder = (radius, height, position, color) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), material(color)); m.position.set(...position); bench.add(m); };
function buildBench() { box([6, .22, 3.6], [0, -.25, 0], 0x18334e); for (let x = -2.4; x <= 2.4; x += .4) for (let z = -1.2; z <= 1.2; z += .4) cylinder(.035, .04, [x, -.1, z], 0x93aec1); box([1.7, .18, .55], [-1.3, .1, 0], 0xe1a35e); for (let x = -1.8; x < -.6; x += .28) box([.04, .22, .4], [x, .27, 0], 0x9a403a); cylinder(.22, .25, [.7, .27, 0], 0xe84f62); cylinder(.08, .12, [.7, .45, 0], 0xffb3a7); box([.65, .55, .75], [2, .18, 0], 0x263f58); box([.08, .7, .9], [1.85, .18, 0], 0xb9d9e0); box([.08, .85, .9], [2.15, .18, 0], 0xd74e4e); cylinder(.16, .38, [.1, .3, .8], 0x4d7ed8); }
function resize() { const rect = host.value.getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); }
onMounted(() => { scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a1728); camera = new THREE.PerspectiveCamera(42, 1, .1, 100); camera.position.set(5, 4, 6); renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); host.value.appendChild(renderer.domElement); controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; scene.add(new THREE.HemisphereLight(0xaad8ff, 0x162235, 2)); const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(4, 7, 3); scene.add(light); bench = new THREE.Group(); scene.add(bench); buildBench(); observer = new ResizeObserver(resize); observer.observe(host.value); const tick = () => { frame = requestAnimationFrame(tick); bench.rotation.y += .001; controls.update(); renderer.render(scene, camera); }; tick(); });
onBeforeUnmount(() => { cancelAnimationFrame(frame); observer?.disconnect(); controls?.dispose(); renderer?.dispose(); });
</script>
<template><div ref="host" class="scene-canvas"><span class="scene-label">Mesa 3D · arrastra para rotar</span><span class="scene-help">rueda: zoom</span></div></template>
