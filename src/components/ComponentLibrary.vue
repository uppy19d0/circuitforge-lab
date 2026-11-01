<script setup>
import { componentCatalog } from '../data/components';
defineProps({ selectedId: { type: String, default: '' } });
const emit = defineEmits(['select', 'add']);
</script>
<template>
  <aside class="component-library">
    <div class="library-heading"><div><span class="eyebrow">Biblioteca</span><h3>Componentes</h3></div><span class="component-count">{{ componentCatalog.length }}</span></div>
    <p class="library-help">Selecciona un componente para inspeccionarlo o añádelo a la mesa.</p>
    <div class="component-list">
      <button v-for="component in componentCatalog" :key="component.id" class="component-item" :class="{ selected: selectedId === component.id }" @click="emit('select', component)">
        <span class="component-symbol" :style="{ color: component.color }">{{ component.symbol }}</span><span class="component-copy"><strong>{{ component.name }}</strong><small>{{ component.value }}</small></span><span class="component-add" @click.stop="emit('add', component)">＋</span>
      </button>
    </div>
  </aside>
</template>
