# Proyecto de Pesca en VR

Este proyecto demuestra conceptos fundamentales de Informática Gráfica, incluyendo renderizado 3D en tiempo real, programación de shaders e interacción básica en VR. Utiliza Three.js para los visuales, shaders personalizados para peces y terreno, y un renderizador compatible con VR para una experiencia inmersiva.

## Controles del Juego

### Controles Básicos

- **E**: Agarrar/soltar la caña de pescar
- **Espacio**: Lanzar el sedal cuando la caña está agarrada
- **F**: Capturar el pez cuando está enganchado

### Movimiento de la Caña

- **W**: Mover la caña hacia adelante
- **S**: Mover la caña hacia atrás
- **A**: Mover la caña hacia la izquierda
- **D**: Mover la caña hacia la derecha
- **Q**: Subir la caña
- **Z**: Bajar la caña

### Controles del Sistema

- **R**: Reiniciar el juego (elimina todos los peces y reinicia la posición de la caña)
- **D**: Activar/Desactivar el modo debug (muestra información en pantalla como FPS, estado del juego, etc.)

### Información del Modo Debug

Cuando el modo debug está activo (presiona D), podrás ver:

- FPS actual
- Estado de lanzamiento (casting)
- Estado de la caña (agarrada o no)
- Cantidad de peces en el agua
- Estado del pez capturado
- Posición del pez capturado

## Mecánicas de Juego

1. **Pesca Básica**:

   - Agarra la caña con 'E'
   - Lanza el sedal con 'Espacio'
   - Cuando un pez muerde, la línea se pondrá roja
   - Suelta la caña con 'E' para lanzar el pez fuera del agua

2. **Ciclo de Juego**:
   - Solo puedes atrapar un pez a la vez
   - Los peces atrapados son lanzados automáticamente a la orilla
   - Los peces en la orilla realizarán una animación de aleteo
   - Usa 'R' para reiniciar si necesitas empezar de nuevo

## Características Técnicas

- Entorno 3D: Gestionado por SceneManager y Environment, incluye agua y terreno personalizados
- Modelos de Peces: Cargados a través de FishManager, con efectos de shader avanzados
- Mecánicas de Pesca: Lógica completa de agarre, lanzamiento y liberación
- Shaders Personalizados: Para peces, hierba y terreno
- Iluminación y Materiales: Usa iluminación direccional, ambiental y materiales PBR
- Integración VR: Compatible con WebXR para una experiencia inmersiva

## Instalación y Ejecución

1. Coloca el código en un entorno de servidor local o remoto
2. Ejecuta un servidor HTTP (por ejemplo, usando Node.js, Python o una herramienta de desarrollo local)
3. Accede a index.html para iniciar la aplicación
4. Haz clic en "Enter VR" (si está soportado) para explorar en modo VR

## Notas Importantes

- VR requiere un navegador compatible con WebXR (por ejemplo, Chrome en Oculus)
- Las librerías de terceros (Three.js, Water2, FBXLoader) deben estar correctamente enlazadas
- El modo debug (tecla D) es útil para entender el estado del juego y solucionar problemas
