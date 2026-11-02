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
- Cambia entre protoboards mini de 170, medianos de 400 y largos de 830 contactos.
- En el inspector del LED puedes elegir siete colores y encapsulados de 3, 5 o 10 mm.
- La iluminación de la LDR y el ajuste del reóstato modifican la resistencia y la corriente.
- El pulsador cierra el contacto mientras lo mantienes presionado.
- Cambia entre **Montaje**, **3D** y **Esquema**: las tres vistas usan el mismo circuito.
- Las prácticas LED, divisor y paralelo son circuitos editables.
- Deshacer, rehacer y guardado local conservan el trabajo.

Atajos: V seleccionar, W cable, H desplazar vista, R rotar, flechas mover un contacto, Supr eliminar,
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

Hay tres placas con geometría y topología compartida por las vistas de montaje y 3D:

| Formato | Contactos | Columnas | Dimensiones orientativas | Alimentación             |
| ------- | --------- | -------- | ------------------------ | ------------------------ |
| Mini    | 170       | 17       | 46 × 36 mm               | Sin rieles               |
| Mediana | 400       | 30       | 83 × 55 mm               | 4 rieles de 25 contactos |
| Larga   | 830       | 63       | 165 × 55 mm              | 4 rieles de 50 contactos |

Los bancos de cinco contactos están aislados por la ranura central. Los rieles
se pueden configurar continuos o seccionados al centro. La BB-830 comienza con
rieles seccionados. Si un circuito no cabe en una placa menor, el cambio se
rechaza y se conserva el trabajo; no se borran componentes ni cables.

El catálogo tiene 23 piezas: resistencias, LED, diodos de señal y rectificadores,
LDR, reóstato, interruptor, pulsador, lámpara, fuente DC y dos modelos de batería.
El solver analiza una fuente a la vez, con resistencia interna finita (0,8 Ω
en la fuente de laboratorio, 2 Ω en la batería de 9 V y 0,3 Ω en el portapilas).
Los LED tienen caída directa según el color y 10 Ω de resistencia dinámica. La
corriente cambia al mover o desconectar componentes. Las advertencias comparan
la corriente y la potencia con límites nominales; no son un modelo térmico de
rotura ni una simulación SPICE completa. No se emulan microcontroladores o
transistores todavía. La guía incluye esos conceptos como material de estudio.

El 3D usa geometrías paramétricas propias. Los LED tienen cúpula translúcida,
diámetro editable y emisión según la corriente; cambiar de color también cambia
la caída directa aproximada. La LDR usa un modelo de resistencia de 100 kΩ a
500 Ω según la iluminación. La lámpara es una carga resistiva constante de 60 Ω;
no hay modelo de calentamiento del filamento. Los dispositivos se representan
de forma compacta para el montaje, no son modelos CAD certificados de un fabricante.

## Referencias técnicas

- [SparkFun: How to Use a Breadboard](https://learn.sparkfun.com/tutorials/how-to-use-a-breadboard): grupos de cinco contactos y buses.
- [Adafruit: Breadboards for Beginners](https://learn.adafruit.com/breadboards-for-beginners): rieles continuos y seccionados.
- [MDN: setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture): arrastre estable con ratón y táctil.
- [Three.js Raycaster](https://threejs.org/docs/pages/Raycaster.html): selección de objetos y proyección sobre el plano de trabajo.
- [Playwright assertions](https://playwright.dev/docs/test-assertions): verificaciones del comportamiento observado.
- [Adafruit: Half Sized Premium Breadboard](https://www.adafruit.com/product/64): referencia de la placa de 400 contactos.
- [ServoCity: 170 Point Breadboard](https://www.servocity.com/170-point-breadboard/): formato mini.
- [Analog Devices: LED Basics and Operation](https://www.analog.com/en/resources/technical-articles/guide-to-led-circuit-designs-and-led-basics-operation.html): el voltaje directo depende del LED; los valores de este laboratorio son aproximados.

## Publicación en el portfolio

El código fuente vive en este repositorio independiente. Vite genera el artefacto
estático en `dist/` con base `/circuitforge-lab/`. El portfolio publica ese
artefacto bajo `public/circuitforge-lab/`; la galería usa una captura real del
editor y enlaza a la aplicación completa.
