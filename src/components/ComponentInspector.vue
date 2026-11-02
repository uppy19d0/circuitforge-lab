<script setup>
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import PartGraphic from './PartGraphic.vue';
import { footprint, getBoard } from '../domain/breadboard';
import { ledColors, ledPreset } from '../data/components';
import { formatCurrent, formatVoltage, resistanceFor } from '../engine/simulator';
const props = defineProps({ selected: Object, result: Object, board: Object });
defineEmits(['update', 'remove', 'rotate']);
const board = computed(() => props.board || getBoard());
const pins = computed(() =>
  props.selected?.type
    ? footprint(props.selected, board.value)
    : props.selected
      ? [board.value.holeById[props.selected.from], board.value.holeById[props.selected.to]]
      : [],
);
const reading = computed(() => props.result.parts[props.selected?.uid]);
const pinNames = computed(() =>
  ['led', 'diode'].includes(props.selected?.type)
    ? ['Ánodo (+)', 'Cátodo (−)']
    : props.selected?.type === 'source'
      ? ['Positivo (+)', 'Retorno (−)']
      : ['Terminal 1', 'Terminal 2'],
);
</script>
<template>
  <aside class="inspector-panel">
    <div class="panel-title">
      <h2>Inspector</h2>
      <AppIcon name="layers" :size="16" />
    </div>
    <div v-if="selected" class="inspector-content">
      <div class="selected-preview">
        <svg v-if="selected.type" viewBox="-62 -55 124 105">
          <PartGraphic
            :part="selected"
            :reading="reading"
            :points="[
              { x: -47, y: 0 },
              { x: 47, y: 0 },
            ]"
            :preview="true"
          /></svg
        ><AppIcon v-else name="wire" :size="38" />
      </div>
      <div class="part-heading">
        <span>{{ selected.label || 'Jumper' }}</span>
        <h3>{{ selected.name || 'Cable de conexión' }}</h3>
        <p>{{ selected.subtitle || 'Conductor ideal entre dos contactos' }}</p>
      </div>
      <label v-if="selected.type" class="inspector-field"
        >Identificador<input
          :value="selected.label"
          maxlength="18"
          @change="$emit('update', { label: $event.target.value.trim() || selected.label })"
      /></label>
      <label
        v-if="['resistor', 'source', 'rheostat', 'lamp'].includes(selected.type)"
        class="inspector-field"
        >{{ selected.type === 'source' ? 'Tensión de la fuente' : 'Resistencia'
        }}<span class="unit-input"
          ><input
            aria-label="Valor del componente"
            type="number"
            :value="selected.value"
            :min="selected.type === 'source' ? 0.1 : 1"
            :max="selected.type === 'source' ? 24 : selected.maxResistance || 10000000"
            :step="selected.type === 'source' ? 0.1 : 1"
            @change="$emit('update', { value: Number($event.target.value) })"
          /><span>{{ selected.unit }}</span></span
        ></label
      >
      <div v-if="['resistor', 'rheostat', 'ldr'].includes(selected.type)" class="spec-row">
        <span>Potencia nominal</span
        ><strong>{{ selected.rating }} W{{ selected.type === 'resistor' ? ' · ±5 %' : '' }}</strong>
      </div>
      <div v-if="selected.type === 'led'" class="led-settings">
        <div class="inspector-subtitle">COLOR DE EMISIÓN</div>
        <div class="led-palette">
          <button
            v-for="option in ledColors"
            :key="option.id"
            :style="{ '--swatch': option.color }"
            :class="{ active: ledPreset(selected).id === option.id }"
            :aria-label="'Color de LED: ' + option.name"
            :aria-pressed="ledPreset(selected).id === option.id"
            @click="$emit('update', { ledColor: option.id })"
          >
            <span></span>
          </button>
        </div>
        <div class="spec-row">
          <span>{{ ledPreset(selected).name }} · Vf aproximado</span
          ><strong>{{ selected.value.toFixed(1) }} V</strong>
        </div>
        <label class="inspector-field"
          >Diámetro del encapsulado<select
            aria-label="Diámetro del LED"
            :value="selected.diameter || 5"
            @change="$emit('update', { diameter: Number($event.target.value) })"
          >
            <option :value="3">3 mm</option>
            <option :value="5">5 mm</option>
            <option :value="10">10 mm</option>
          </select></label
        >
      </div>
      <div v-if="selected.type === 'led'" class="spec-row">
        <span>Corriente nominal</span><strong>20 mA</strong>
      </div>
      <button
        v-if="selected.type === 'switch' && !selected.momentary"
        class="switch-control"
        :aria-pressed="selected.closed"
        @click="$emit('update', { closed: !selected.closed })"
      >
        <span :class="{ closed: selected.closed }"></span
        >{{ selected.closed ? 'Contacto cerrado' : 'Contacto abierto' }}
      </button>
      <label v-if="selected.type === 'ldr'" class="inspector-field"
        >Iluminación · {{ selected.light ?? 50 }} %<input
          aria-label="Iluminación LDR"
          type="range"
          min="0"
          max="100"
          :value="selected.light ?? 50"
          @input="$emit('update', { light: Number($event.target.value) })"
        /><span>{{ resistanceFor(selected).toFixed(0) }} Ω · modelo aproximado</span></label
      >
      <label v-if="selected.type === 'rheostat'" class="inspector-field"
        >Ajuste del reóstato<input
          aria-label="Ajuste del reóstato"
          type="range"
          min="1"
          :max="selected.maxResistance || 10000"
          :value="selected.value"
          @input="$emit('update', { value: Number($event.target.value) })"
      /></label>
      <button
        v-if="selected.momentary"
        class="momentary-control"
        @pointerdown.prevent="$emit('update', { closed: true })"
        @pointerup="$emit('update', { closed: false })"
        @pointerleave="selected.closed && $emit('update', { closed: false })"
        @pointercancel="$emit('update', { closed: false })"
        @keydown.space.prevent="$emit('update', { closed: true })"
        @keyup.space.prevent="$emit('update', { closed: false })"
        @keydown.enter.prevent="$emit('update', { closed: true })"
        @keyup.enter.prevent="$emit('update', { closed: false })"
        @blur="selected.closed && $emit('update', { closed: false })"
      >
        {{ selected.closed ? 'Pulsador cerrado' : 'Mantener pulsado' }}
      </button>
      <div class="inspector-subtitle">TERMINALES</div>
      <div class="terminal-list">
        <div v-for="(pin, index) in pins" :key="pin.id">
          <span class="terminal-marker"></span><span>{{ pinNames[index] }}</span
          ><code>{{ pin.id.toUpperCase() }}</code>
        </div>
      </div>
      <div class="inspector-subtitle">PUNTO DE OPERACIÓN DC</div>
      <dl class="reading-list">
        <div>
          <dt>Voltaje</dt>
          <dd>{{ formatVoltage(reading?.voltage) }}</dd>
        </div>
        <div>
          <dt>Corriente</dt>
          <dd>{{ formatCurrent(reading?.current) }}</dd>
        </div>
        <div>
          <dt>Potencia</dt>
          <dd>{{ reading ? (reading.power * 1000).toFixed(2) + ' mW' : '—' }}</dd>
        </div>
      </dl>
      <div class="inspector-actions">
        <button v-if="selected.type" @click="$emit('rotate')">
          <AppIcon name="rotate" :size="16" /> Rotar <kbd>R</kbd></button
        ><button class="delete-action" @click="$emit('remove')">
          <AppIcon name="trash" :size="16" /> Eliminar
        </button>
      </div>
    </div>
    <div v-else class="inspector-empty">
      <AppIcon name="cursor" :size="28" />
      <h3>Todo empieza en un contacto.</h3>
      <p>Selecciona una pieza o un cable para ver sus conexiones y editar sus propiedades.</p>
    </div>
    <div class="diagnostic-box" :class="'tone-' + result.state">
      <span class="status-dot"></span><strong>{{ result.label }}</strong>
      <p>{{ result.explanation }}</p>
    </div>
    <details class="model-notes">
      <summary>Acerca de este análisis</summary>
      <p>
        Análisis DC educativo: resistencias, LDR, reóstatos, lámparas resistivas, interruptores,
        diodos y LED. Cada fuente usa su resistencia interna; los colores de LED tienen caídas
        directas aproximadas diferentes. Las lecturas no modelan el calentamiento de una pieza
        física.
      </p>
      <a
        href="https://learn.sparkfun.com/tutorials/how-to-use-a-breadboard"
        target="_blank"
        rel="noreferrer"
        >Cómo se conecta un protoboard ↗</a
      >
    </details>
  </aside>
</template>
