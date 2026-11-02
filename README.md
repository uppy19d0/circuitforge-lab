# CircuitForge Lab

Laboratorio de electrónica en Vue 3, con montaje de precisión, escena Three.js y
esquema derivado de las conexiones del circuito.

Aplicación: [www.ltavarez.me/circuitforge-lab](https://www.ltavarez.me/circuitforge-lab/)

## Trabajar con el laboratorio

- Selecciona una pieza de la biblioteca y un contacto de la placa para colocarla.
- Arrastra su cuerpo para moverla. Los dos terminales se ajustan a agujeros reales.
- Un contacto ocupado o una posición fuera de la placa se rechaza sin perder la pieza.
- Activa **Cable**, selecciona un contacto libre y después el segundo.
- Usa el inspector para cambiar resistencia, alimentación, nombre o estado del interruptor.
- Cambia entre **Montaje**, **3D** y **Esquema**: las tres vistas usan el mismo circuito.
- Las prácticas LED, divisor y paralelo son circuitos editables.
- Deshacer, rehacer y guardado local conservan el trabajo.

Atajos: V seleccionar, W cable, R rotar, flechas mover un contacto, Supr eliminar,
Ctrl/⌘ Z deshacer y Ctrl/⌘ Shift Z rehacer.

## Desarrollo

Requiere Node 22.12 o posterior.

```sh
npm ci
npm run dev
npm test
npm run test:browser
npm run build
```

Las pruebas de navegador locales usan Google Chrome. Si se ejecutan en CI,
instala Chromium con Playwright. El servidor sirve la aplicación bajo
`/circuitforge-lab/`.

## Organización

- `src/domain/`: geometría de la placa, contactos, huellas, colisiones y ejemplos.
- `src/composables/useWorkbench.js`: estado, herramientas, historial y persistencia.
- `src/engine/simulator.js`: construcción de redes y resolución nodal DC.
- `src/scene/`: modelos 3D paramétricos y gestión de recursos de Three.js.
- `src/components/`: biblioteca, montaje, 3D, esquema, inspector y mediciones.
- `src/styles/`: estilos de la aplicación y de las superficies del editor.
- `tests/`: topología, límites eléctricos y recorridos reales de ratón y teclado.
- `scripts/capture-preview.mjs`: capturas de la aplicación para la galería.

## Modelo físico y alcance

La placa BB-400 tiene 30 columnas, dos bancos de cinco contactos y cuatro rieles
de 25 contactos: 400 puntos. Los bancos están separados por el canal central.
Los rieles de este modelo son continuos y cada lado es independiente.

El solver analiza resistencias, cables ideales, interruptores, una fuente DC con
0,8 Ω internos y LED con caída directa y 10 Ω de resistencia dinámica. La
corriente cambia al mover o desconectar componentes. Las advertencias comparan
la corriente y la potencia con límites nominales; no son un modelo térmico de
rotura ni una simulación SPICE completa. No se emulan microcontroladores o
transistores todavía. La guía incluye esos conceptos como material de estudio.

El 3D usa geometrías paramétricas propias: resistor axial con bandas según el
valor, LED de cúpula, fuente con cables, interruptor y jumpers. No se anuncian
archivos GLB externos que no existen.

## Referencias técnicas

- [SparkFun: How to Use a Breadboard](https://learn.sparkfun.com/tutorials/how-to-use-a-breadboard): grupos de cinco contactos y buses.
- [Adafruit: Breadboards for Beginners](https://learn.adafruit.com/breadboards-for-beginners): rieles continuos y seccionados.
- [MDN: setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture): arrastre estable con ratón y táctil.
- [Three.js Raycaster](https://threejs.org/docs/pages/Raycaster.html): selección de objetos y proyección sobre el plano de trabajo.
- [Playwright assertions](https://playwright.dev/docs/test-assertions): verificaciones del comportamiento observado.

## Publicación en el portfolio

El código fuente vive en este repositorio independiente. Vite genera el artefacto
estático en `dist/` con base `/circuitforge-lab/`. El portfolio publica ese
artefacto bajo `public/circuitforge-lab/`; la galería usa una captura real del
editor y enlaza a la aplicación completa.
