<script setup>
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { useWorkbench } from './composables/useWorkbench';
import AppIcon from './components/AppIcon.vue';
import ComponentLibrary from './components/ComponentLibrary.vue';
import InteractiveBreadboard from './components/InteractiveBreadboard.vue';
import ComponentInspector from './components/ComponentInspector.vue';
import SchematicView from './components/SchematicView.vue';
import AnalysisPanel from './components/AnalysisPanel.vue';
import { holes, holeById } from './domain/breadboard';
import { lessons } from './data/lessons';
const CircuitScene = defineAsyncComponent(() => import('./components/CircuitScene.vue'));
const {
  project,
  selected,
  selectedUid,
  view,
  tool,
  placing,
  wireStart,
  hoveredHole,
  zoom,
  running,
  notice,
  result,
  history,
  future,
  saving,
  message,
  undo,
  redo,
  cancelTool,
  selectTool,
  choosePart,
  placeAt,
  movePart,
  removeSelected,
  rotate,
  updatePart,
  loadExample,
} = useWorkbench();
const showLibrary = ref(false),
  showInspector = ref(false),
  viewport = ref(null),
  guide = ref(null),
  lesson = ref('ohm');
const hovered = computed(() => holeById[hoveredHole.value]);
const viewComponent = computed(() => (view.value === '3d' ? CircuitScene : InteractiveBreadboard));
const activePins = computed(() =>
  hovered.value
    ? holes
        .filter((h) => h.net === hovered.value.net)
        .map((h) => h.id.toUpperCase())
        .join(' · ')
    : '',
);
watch(selectedUid, () => {
  if (selectedUid.value && window.innerWidth < 1100) showInspector.value = true;
});
function choose(id) {
  choosePart(id);
  showLibrary.value = false;
}
function changeView(next) {
  zoom.value = 1;
  view.value = next;
  cancelTool();
}
function zoomBy(delta) {
  zoom.value = Math.min(1.8, Math.max(0.65, zoom.value + delta));
}
function select(uid) {
  selectedUid.value = uid;
}
function centerView() {
  zoom.value = 1;
  viewport.value?.centerView?.();
}
</script>
<template>
  <div
    class="workbench"
    :class="{ 'library-open': showLibrary, 'inspector-open': showInspector }"
    :data-view="view"
  >
    <a class="skip-link" href="#workbench-canvas">Ir al área de montaje</a>
    <header class="app-header">
      <a class="app-brand" href="/" aria-label="Volver al portfolio"
        ><span class="brand-logo"><AppIcon name="circuit" :size="25" /></span
        ><span>CircuitForge <b>Lab</b><small>LABORATORIO DE ELECTRÓNICA</small></span></a
      >
      <div class="header-project">
        <span class="save-dot"></span>{{ project.name }}<span class="local-label">LOCAL</span>
      </div>
      <div class="header-actions">
        <button class="quiet-button guide-button" @click="guide.showModal()">
          <AppIcon name="book" :size="16" /> Guía</button
        ><button
          class="quiet-button reset-button"
          aria-label="Reiniciar circuito"
          @click="
            loadExample('led');
            running = true;
          "
        >
          <AppIcon name="reset" :size="16" /> Reiniciar</button
        ><button class="run-button" :class="{ running }" @click="running = !running">
          <AppIcon :name="running ? 'pause' : 'play'" :size="15" />{{
            running ? 'Pausar' : 'Simular'
          }}
        </button>
      </div>
    </header>
    <div class="workspace-layout">
      <ComponentLibrary :placing="placing" @add="choose" @example="loadExample" />
      <main class="main-workspace">
        <div class="document-bar">
          <div class="document-tab">
            <AppIcon name="layers" :size="15" /><span>{{ project.name }}</span
            ><i></i>
          </div>
          <div class="save-status">
            <AppIcon name="check" :size="13" />{{
              saving ? 'Guardado en este navegador' : 'Guardado no disponible'
            }}
          </div>
        </div>
        <div class="workspace-toolbar">
          <div class="toolbar-group">
            <button
              class="mobile-library-toggle icon-button"
              aria-label="Abrir biblioteca"
              @click="showLibrary = !showLibrary"
            >
              <AppIcon name="grid" /></button
            ><button
              class="icon-button"
              :class="{ active: tool === 'select' }"
              aria-label="Seleccionar y mover (V)"
              title="Seleccionar y mover (V)"
              @click="selectTool('select')"
            >
              <AppIcon name="cursor" /></button
            ><button
              class="icon-button"
              :class="{ active: tool === 'wire' }"
              :disabled="view === 'schematic'"
              aria-label="Conectar cable (W)"
              title="Conectar cable (W)"
              @click="selectTool('wire')"
            >
              <AppIcon name="wire" /></button
            ><span class="toolbar-divider"></span
            ><button
              class="icon-button"
              :disabled="!selected?.type"
              aria-label="Rotar componente (R)"
              title="Rotar (R)"
              @click="rotate"
            >
              <AppIcon name="rotate" /></button
            ><button
              class="icon-button"
              :disabled="!selected"
              aria-label="Eliminar selección"
              title="Eliminar selección"
              @click="removeSelected"
            >
              <AppIcon name="trash" /></button
            ><span class="toolbar-divider"></span
            ><button
              class="icon-button"
              :disabled="!history.length"
              aria-label="Deshacer"
              @click="undo"
            >
              <AppIcon name="undo" /></button
            ><button
              class="icon-button"
              :disabled="!future.length"
              aria-label="Rehacer"
              @click="redo"
            >
              <AppIcon name="redo" />
            </button>
          </div>
          <div class="view-tabs" aria-label="Vista del circuito">
            <button
              :class="{ active: view === 'board' }"
              :aria-pressed="view === 'board'"
              @click="changeView('board')"
            >
              <AppIcon name="grid" :size="14" />Montaje</button
            ><button
              :class="{ active: view === '3d' }"
              :aria-pressed="view === '3d'"
              @click="changeView('3d')"
            >
              <AppIcon name="layers" :size="14" />3D</button
            ><button
              :class="{ active: view === 'schematic' }"
              :aria-pressed="view === 'schematic'"
              @click="changeView('schematic')"
            >
              <AppIcon name="circuit" :size="14" />Esquema
            </button>
          </div>
          <button
            class="mobile-inspector-toggle icon-button"
            aria-label="Abrir inspector"
            @click="showInspector = !showInspector"
          >
            <AppIcon name="layers" />
          </button>
        </div>
        <section id="workbench-canvas" class="canvas-workspace" tabindex="-1">
          <div class="canvas-context">
            <span class="board-chip"
              ><span class="small-board-icon"></span>Protoboard · 400 contactos</span
            ><span class="canvas-status" :class="'tone-' + result.state"
              ><i></i>{{ result.label }}</span
            >
          </div>
          <SchematicView
            v-if="view === 'schematic'"
            :project="project"
            :result="result"
            :selected-uid="selectedUid"
            @select="select"
          />
          <component
            :is="viewComponent"
            ref="viewport"
            v-else
            :project="project"
            :result="result"
            :selected-uid="selectedUid"
            :tool="tool"
            :placing="placing"
            :wire-start="wireStart"
            :zoom="zoom"
            @select="select"
            @move="movePart"
            @hole="placeAt"
            @hover="hoveredHole = $event"
            @notice="message"
          />
          <div v-if="tool !== 'select'" class="placement-prompt">
            <AppIcon :name="tool === 'wire' ? 'wire' : 'plus'" :size="16" /><span>{{
              tool === 'wire'
                ? wireStart
                  ? 'Selecciona el segundo contacto'
                  : 'Selecciona el primer contacto del cable'
                : 'Elige un contacto para colocar la pieza'
            }}</span
            ><button aria-label="Cancelar colocación" @click="cancelTool">
              <AppIcon name="close" :size="15" />
            </button>
          </div>
          <div class="viewport-controls">
            <button aria-label="Alejar" @click="zoomBy(-0.15)">
              <AppIcon name="minus" :size="15" /></button
            ><span>{{ Math.round(zoom * 100) }}%</span
            ><button aria-label="Acercar" @click="zoomBy(0.15)">
              <AppIcon name="plus" :size="15" /></button
            ><button aria-label="Centrar vista" @click="centerView">
              <AppIcon name="fit" :size="15" />
            </button>
          </div>
          <div class="board-caption">
            <strong>{{ hovered ? hovered.id.toUpperCase() : 'BB-400' }}</strong
            ><span>{{
              hovered
                ? 'Contactos comunes: ' + activePins
                : 'Contactos de 2,54 mm · dos bancos aislados · rieles continuos'
            }}</span>
          </div>
        </section>
        <AnalysisPanel :result="result" :running="running" />
      </main>
      <div class="inspector-container">
        <button
          class="drawer-close icon-button"
          aria-label="Cerrar inspector"
          @click="showInspector = false"
        >
          <AppIcon name="close" /></button
        ><ComponentInspector
          :selected="selected"
          :result="result"
          @update="updatePart"
          @remove="removeSelected"
          @rotate="rotate"
        />
      </div>
    </div>
    <footer class="app-statusbar">
      <span class="interaction-message" role="status" aria-live="polite"
        ><AppIcon name="cursor" :size="12" />{{ notice }}</span
      ><span>{{ project.components.length }} piezas <i>·</i> {{ project.wires.length }} cables</span
      ><a href="https://github.com/uppy19d0/circuitforge-lab" target="_blank" rel="noreferrer"
        >CircuitForge <span>v2.0</span></a
      >
    </footer>
    <dialog ref="guide" class="guide-dialog">
      <header>
        <span><AppIcon name="book" />Guía del laboratorio</span
        ><button class="icon-button" aria-label="Cerrar guía" @click="guide.close()">
          <AppIcon name="close" />
        </button>
      </header>
      <nav>
        <button
          v-for="(item, key) in lessons"
          :key="key"
          :class="{ active: lesson === key }"
          @click="lesson = key"
        >
          {{ item.title }}
        </button>
      </nav>
      <div class="guide-content">
        <h2>{{ lessons[lesson].title }}</h2>
        <p>{{ lessons[lesson].subtitle }}</p>
        <code>{{ lessons[lesson].formula }}</code>
        <article v-for="card in lessons[lesson].cards" :key="card.title">
          <h3>{{ card.title }}</h3>
          <p>{{ card.body }}</p>
          <code v-if="card.code">{{ card.code }}</code>
        </article>
        <p class="guide-shortcuts">
          V seleccionar · W cable · R rotar · flechas mover un contacto · Supr eliminar · Ctrl/⌘ Z
          deshacer
        </p>
      </div>
    </dialog>
  </div>
</template>
