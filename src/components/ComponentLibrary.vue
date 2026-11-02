<script setup>
import { computed, ref } from 'vue';
import AppIcon from './AppIcon.vue';
import PartGraphic from './PartGraphic.vue';
import { componentCatalog } from '../data/components';
defineProps({ placing: String });
defineEmits(['add', 'example']);
const search = ref('');
const category = ref('Todos');
const categories = ['Todos', 'Pasivos', 'Semiconductores', 'Alimentación', 'Entradas'];
const filtered = computed(() =>
  componentCatalog.filter(
    (part) =>
      (category.value === 'Todos' || part.category === category.value) &&
      (part.name + part.subtitle).toLocaleLowerCase().includes(search.value.toLocaleLowerCase()),
  ),
);
</script>
<template>
  <aside class="library-panel">
    <div class="panel-title">
      <h2>Componentes</h2>
      <span>{{ componentCatalog.length }} disponibles</span>
    </div>
    <label class="search-field"
      ><AppIcon name="search" :size="16" /><input
        v-model="search"
        type="search"
        placeholder="Buscar componente"
        aria-label="Buscar componente"
      /><kbd>⌕</kbd></label
    >
    <div class="category-list">
      <button
        v-for="item in categories"
        :key="item"
        :class="{ active: category === item }"
        :aria-pressed="category === item"
        @click="category = item"
      >
        {{ item }}
      </button>
    </div>
    <div class="library-section-label">COMPONENTES DEL LABORATORIO</div>
    <div class="parts-list">
      <button
        v-for="part in filtered"
        :key="part.id"
        class="catalog-part"
        :class="{ active: placing === part.id }"
        :aria-label="'Colocar ' + part.name"
        @click="$emit('add', part.id)"
      >
        <svg class="catalog-preview" viewBox="-58 -50 116 95" aria-hidden="true">
          <PartGraphic
            :part="part"
            :points="[
              { x: -46, y: 0 },
              { x: 46, y: 0 },
            ]"
            :preview="true"
          />
        </svg>
        <span
          ><strong>{{ part.name }}</strong
          ><small>{{ part.subtitle }}</small></span
        ><AppIcon name="plus" :size="16" />
      </button>
      <p v-if="!filtered.length" class="empty-text">No hay componentes con ese nombre.</p>
    </div>
    <div class="library-examples">
      <div class="library-section-label">PRÁCTICAS PREPARADAS</div>
      <button @click="$emit('example', 'led')">
        <span>01</span> Encender un LED <AppIcon name="chevron" :size="14" /></button
      ><button @click="$emit('example', 'divider')">
        <span>02</span> Dividir el voltaje <AppIcon name="chevron" :size="14" /></button
      ><button @click="$emit('example', 'parallel')">
        <span>03</span> Ramas en paralelo <AppIcon name="chevron" :size="14" />
      </button>
    </div>
    <div class="library-footnote">
      <AppIcon name="book" :size="16" /><span
        >Selecciona una pieza y después un contacto de la placa.</span
      >
    </div>
  </aside>
</template>
