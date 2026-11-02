<script setup>
defineProps({ name: String, size: { type: [Number, String], default: 18 } });
const paths = {
  pan: 'M8 13V5a2 2 0 014 0v7M12 7a2 2 0 014 0v5M16 9a2 2 0 014 0v6c0 4-3 6-6 6h-2c-2 0-3-1-4-2l-5-6a2 2 0 012-3l3 3',
  circuit: 'M3 12h4l3-7 4 14 3-7h4M3 8v8M21 8v8',
  cursor: 'M5 3l14 9-7 1-3 7z',
  wire: 'M4 18v-7a4 4 0 014-4h8M14 4l3 3-3 3M4 15v5',
  rotate: 'M20 7v5h-5M20 12a8 8 0 10-2 6',
  trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
  undo: 'M9 4L4 9l5 5M4 9h10a6 6 0 016 6v3',
  redo: 'M15 4l5 5-5 5M20 9H10a6 6 0 00-6 6v3',
  search: 'M16 16l5 5M18 10a8 8 0 11-16 0 8 8 0 0116 0',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  fit: 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5',
  play: 'M7 4l14 8-14 8z',
  pause: 'M8 4v16M16 4v16',
  reset: 'M3 4v6h6M3 10a9 9 0 113 10',
  bolt: 'M13 2L4 14h7l-1 8 10-12h-7z',
  check: 'M5 12l4 4L20 5',
  book: 'M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-4-2-7-1-10 1z',
  layers: 'M12 3L2 8l10 5 10-5zM2 13l10 5 10-5M2 18l10 5 10-5',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  chart: 'M3 3v18h18M6 14l4-5 4 3 6-7',
  chevron: 'M6 9l6 6 6-6',
  close: 'M5 5l14 14M5 19L19 5',
  github:
    'M9 19c-5 1-5-2-7-2M16 22v-4a4 4 0 00-1-3c4 0 7-2 7-6 0-2-1-3-2-4 0-1 0-2-1-3-2 0-3 1-4 1a12 12 0 00-6 0C8 2 7 1 5 2 4 3 4 4 4 5 3 6 2 7 2 9c0 4 3 6 7 6-1 1-1 2-1 3v4',
};
</script>
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.circuit" />
  </svg>
</template>
