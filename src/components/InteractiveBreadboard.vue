<script setup>
import { onBeforeUnmount } from 'vue';
import CircuitScene from './CircuitScene.vue';
const props = defineProps({ items: { type: Array, required: true } });
const emit = defineEmits(['move', 'remove', 'select']);
let drag = null;
function start(event, item) { event.preventDefault(); const board = event.currentTarget.parentElement.getBoundingClientRect(); drag = { uid: item.uid, board, offsetX: event.clientX - board.left - item.x, offsetY: event.clientY - board.top - item.y }; document.addEventListener('pointermove', move); document.addEventListener('pointerup', stop); emit('select', item); }
function move(event) { if (!drag) return; const x = Math.max(20, Math.min(drag.board.width - 80, event.clientX - drag.board.left - drag.offsetX)); const y = Math.max(60, Math.min(drag.board.height - 70, event.clientY - drag.board.top - drag.offsetY)); emit('move', { uid: drag.uid, x, y }); }
function stop() { drag = null; document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', stop); }
onBeforeUnmount(stop);
</script>
<template><div class="interactive-board"><CircuitScene/><div class="board-component-layer"><button v-for="item in items" :key="item.uid" class="board-part" :class="`part-${item.id}`" :style="{left:`${item.x}px`,top:`${item.y}px`,'--part-color':item.color}" @pointerdown="start($event,item)" @dblclick="emit('remove',item.uid)" :aria-label="`${item.name}. Arrastra para mover; doble clic para eliminar.`"><i></i><strong>{{item.symbol}}</strong><small>{{item.name}}</small><span class="pin pin-a"></span><span class="pin pin-b"></span></button></div><div class="board-hint">Arrastra para mover · doble clic para eliminar</div></div></template>
