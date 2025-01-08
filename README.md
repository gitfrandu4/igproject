# VR Fishing 🎣

**URL del Proyecto**: [https://gitfrandu4.github.io/vr-fishing/](https://gitfrandu4.github.io/vr-fishing/)

## Introducción y Motivación del Proyecto

VR Fishing nace como un proyecto integrador que combina los tres bloques fundamentales del curso de Informática Gráfica:

### Fundamentos 
- Implementación de conceptos básicos de rasterización y transformaciones 3D
- Uso de primitivas geométricas para construir el entorno
- Aplicación de proyecciones y sistemas de coordenadas
- Gestión de visibilidad y recorte de objetos
- Sistema de iluminación básica

### Realismo
- Animación de peces mediante sistemas de partículas y morphing
- Implementación de shaders personalizados para el agua y efectos visuales
- Sistema avanzado de materiales PBR (Physically Based Rendering)
- Grafo de escena complejo para la gestión de objetos
- Mapeo de texturas y efectos ambientales
- Sistema de física para la simulación de la caña y el agua

### Realidad Mixta 
- Integración completa con WebXR para experiencia VR
- Controles adaptados tanto para PC como para dispositivos VR
- Sistema de interacción natural con los controladores VR
- Optimizaciones específicas para rendimiento en VR

La motivación principal ha sido crear una experiencia que demuestre la aplicación práctica de estos tres bloques en un único proyecto cohesivo, permitiendo ver cómo los conceptos fundamentales sirven de base para implementar características realistas que finalmente se integran en un entorno de realidad virtual inmersivo.

---

## Índice

- [VR Fishing 🎣](#vr-fishing-)
  - [Introducción y Motivación del Proyecto](#introducción-y-motivación-del-proyecto)
    - [Fundamentos](#fundamentos)
    - [Realismo](#realismo)
    - [Realidad Mixta](#realidad-mixta)
  - [Índice](#índice)
  - [Descripción General](#descripción-general)
  - [Aspectos Técnicos](#aspectos-técnicos)
    - [Sistema de Renderizado y Pipeline Gráfico](#sistema-de-renderizado-y-pipeline-gráfico)
    - [Sistemas de Iluminación](#sistemas-de-iluminación)
    - [Materiales y Shaders](#materiales-y-shaders)
    - [Técnicas de Optimización](#técnicas-de-optimización)
    - [Sistema de Físicas](#sistema-de-físicas)
    - [Efectos Visuales Avanzados](#efectos-visuales-avanzados)
    - [Integración VR](#integración-vr)
    - [Gestión de Recursos](#gestión-de-recursos)
    - [Implementación VR/XR](#implementación-vrxr)
      - [1. Inicialización del Sistema VR](#1-inicialización-del-sistema-vr)
      - [2. Sistema de Controladores VR](#2-sistema-de-controladores-vr)
      - [3. Sistema de Interacción con Controladores](#3-sistema-de-interacción-con-controladores)
      - [4. Sistema de Movimiento en VR](#4-sistema-de-movimiento-en-vr)
      - [5. Optimizaciones Específicas para VR](#5-optimizaciones-específicas-para-vr)
      - [6. Retroalimentación Háptica](#6-retroalimentación-háptica)
  - [Estructura de Archivos y Directorios](#estructura-de-archivos-y-directorios)
  - [Tecnologías Utilizadas](#tecnologías-utilizadas)
  - [Principales Módulos](#principales-módulos)
    - [SceneManager](#scenemanager)
    - [Environment](#environment)
    - [FishingRod](#fishingrod)
    - [FishManager](#fishmanager)
  - [Funcionamiento General](#funcionamiento-general)
  - [Controles y Uso](#controles-y-uso)
  - [Uso de Librerías Externas](#uso-de-librerías-externas)
    - [Ammo.js](#ammojs)
    - [three.js](#threejs)
    - [FBXLoader](#fbxloader)
  - [Configuración y Formato de Código](#configuración-y-formato-de-código)
  - [Pasos para Ejecutar el Proyecto](#pasos-para-ejecutar-el-proyecto)
  - [Referencias y Bibliografía](#referencias-y-bibliografía)

---

## Descripción General

VR Fishing es un simulador de pesca en Realidad Virtual (VR) desarrollado con **three.js** y **Ammo.js**. El proyecto recrea un lago virtual con peces interactivos, donde el usuario puede lanzar una caña de pescar, capturar peces y acumular puntuación. Está diseñado para funcionar tanto en modo VR como en modo escritorio.

🔗 **Accede al proyecto aquí**: [https://gitfrandu4.github.io/vr-fishing/](https://gitfrandu4.github.io/vr-fishing/)

---

## Aspectos Técnicos

### Sistema de Renderizado y Pipeline Gráfico

El proyecto utiliza Three.js como motor de renderizado WebGL, implementando un pipeline gráfico completo que incluye:

```javascript
// Ejemplo de SceneManager.js - Pipeline de renderizado
export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      70, // FOV
      window.innerWidth / window.innerHeight, // Aspect Ratio
      0.1, // Near plane
      1000000, // Far plane
    );

    // Configuración avanzada del renderizador
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    this.renderer.shadowMap.enabled = true;
  }

  startAnimation(renderCallback) {
    this.renderer.setAnimationLoop(() => {
      if (renderCallback) renderCallback();
      this.renderer.render(this.scene, this.camera);
    });
  }
}
```

### Sistemas de Iluminación

Se implementan múltiples tipos de luces para crear una iluminación realista:

```javascript
// Ejemplo de Environment.js - Sistema de iluminación
createLighting() {
  // Luz ambiental para iluminación global indirecta
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
  this.scene.add(hemiLight);

  // Luz ambiental para relleno suave
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  this.scene.add(ambientLight);

  // Luz direccional principal (sol)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  directionalLight.castShadow = true;
  this.scene.add(directionalLight);
}
```

### Materiales y Shaders

El proyecto implementa diversos tipos de materiales PBR (Physically Based Rendering):

```javascript
// Ejemplo de FishingRod.js - Materiales PBR
createMaterial(type) {
  if (!this.textures) {
    return new THREE.MeshStandardMaterial({
      color: type === 'wood' ? 0x8b4513 : 0x888888,
      roughness: type === 'wood' ? 0.9 : 0.4,
      metalness: type === 'wood' ? 0.1 : 0.8,
      name: type === 'wood' ? 'WoodMaterial' : 'MetalMaterial'
    });
  }

  const textures = type === 'wood' ? {
    map: this.textures.wood,
    normalMap: this.textures.woodNormal,
    roughnessMap: this.textures.woodRoughness,
    roughness: 0.9,
    metalness: 0.1
  } : {
    map: this.textures.metal,
    normalMap: this.textures.metalNormal,
    roughnessMap: this.textures.metalRoughness,
    roughness: 0.4,
    metalness: 0.8
  };

  return new THREE.MeshStandardMaterial(textures);
}

// Ejemplo de shaders/fishShaders.js - Shaders personalizados
export const fishShaders = {
  vertexShader: `
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float waterLevel;
    uniform vec3 color;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      float caustics = sin(vPosition.x * 3.0 + time) *
                      sin(vPosition.z * 3.0 + time) * 0.8 + 0.2;
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float rimLight = pow(1.0 - max(0.0, dot(viewDirection, vNormal)), 2.0);
      vec3 finalColor = color * (1.0 + caustics + rimLight);
      gl_FragColor = vec4(finalColor, 0.95);
    }
  `
};
```

### Técnicas de Optimización

```javascript
// Ejemplo de FishManager.js - Instanciación y optimización
setupFishInstances(fishModel, config) {
  for (let i = 0; i < config.count; i++) {
    const fish = fishModel.clone();
    // Optimización de geometría
    fish.traverse(child => {
      if (child.isMesh) {
        child.geometry = child.geometry.clone();
        child.geometry = new THREE.BufferGeometry().fromGeometry(child.geometry);
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Posicionamiento procedural optimizado
    const x = Math.random() * 8 - 4;
    const z = Math.random() * 8 - 4;
    const y = Math.random() * (config.maxDepth - config.minDepth) + config.minDepth;
    fish.position.set(x, y, z);

    this.scene.add(fish);
    this.fishes.push(fish);
  }
}
```

### Sistema de Físicas

```javascript
// Ejemplo de FishingRod.js - Simulación física de la línea
createLine() {
  const lineGeometry = new THREE.BufferGeometry();
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6
  });

  const rodTip = new THREE.Vector3(0, 1.5, 0);
  const waterPoint = new THREE.Vector3(0, -2, 0);
  lineGeometry.setFromPoints([rodTip, waterPoint]);

  this.line = new THREE.Line(lineGeometry, lineMaterial);

  // Simulación física de la línea
  this.updateLinePhysics = (time) => {
    const positions = this.line.geometry.attributes.position.array;
    const tension = this.calculateLineTension();
    const windEffect = Math.sin(time * 2) * 0.1;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += windEffect * (1 - tension);
    }
    this.line.geometry.attributes.position.needsUpdate = true;
  };
}
```

### Efectos Visuales Avanzados

```javascript
// Ejemplo de Environment.js - Sistema de agua avanzado
createWater() {
  const waterGeometry = new THREE.CircleGeometry(5, 64);
  this.water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: this.textures.waterNormal,
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    fog: this.scene.fog !== undefined
  });

  this.water.material.onBeforeCompile = (shader) => {
    shader.uniforms.time = { value: 0 };
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float time;
      varying vec3 vPosition;
      `
    );
  };
}

// Ejemplo de celestials/Sky.js - Sistema atmosférico
setupSky() {
  this.sky = new Sky();
  this.sky.scale.setScalar(450000);

  const uniforms = this.sky.material.uniforms;
  uniforms['turbidity'].value = 10;
  uniforms['rayleigh'].value = 3;
  uniforms['mieCoefficient'].value = 0.005;
  uniforms['mieDirectionalG'].value = 0.7;
}
```

### Integración VR

```javascript
// Ejemplo de game.js - Sistema de interacción VR
setupVRControllers() {
  this.controllerR = this.renderer.xr.getController(0);

  // Sistema de raycasting para interacción
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const line = new THREE.Line(geometry);
  line.name = 'line';
  line.scale.z = 5;
  this.controllerR.add(line);

  // Eventos de interacción VR
  this.controllerR.addEventListener('selectstart', () => {
    const controllerPos = new THREE.Vector3();
    this.controllerR.getWorldPosition(controllerPos);
    if (this.fishingRod.grab(this.controllerR, controllerPos)) {
      this.isRodGrabbed = true;
    }
  });
}
```

### Gestión de Recursos

```javascript
// Ejemplo de FishManager.js - Gestión de recursos y memoria
async loadFishType(config) {
  return new Promise((resolve, reject) => {
    this.loader.load(
      config.modelPath,
      (fish) => {
        fish.scale.setScalar(config.scale);
        // Optimización de memoria
        fish.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            child.material.dispose();
          }
        });
        this.setupFishInstances(fish, config);
        resolve();
      },
      (xhr) => {
        console.log(`${config.modelPath}: ${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      (error) => {
        console.error(`Error loading ${config.modelPath}:`, error);
        reject(error);
      }
    );
  });
}

dispose() {
  // Limpieza de recursos
  this.fishes.forEach(fish => {
    fish.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(fish);
  });
  this.fishes = [];
}
```

### Implementación VR/XR

La implementación de la Realidad Virtual utiliza la API WebXR, que proporciona acceso a dispositivos VR a través del navegador. El sistema se estructura en varias capas:

#### 1. Inicialización del Sistema VR

```javascript
// Ejemplo de game.js - Inicialización VR
class Game {
  constructor() {
    this.sceneManager = new SceneManager();
    this.renderer = this.sceneManager.renderer;
    this.renderer.xr.enabled = true; // Habilitamos soporte XR

    // Configuración específica para VR
    this.renderer.xr.setReferenceSpaceType('local-floor');
    this.renderer.xr.setSession(session);

    // Creamos el botón VR con opciones personalizadas
    const vrButton = VRButton.createButton(this.renderer, {
      requiredFeatures: ['local-floor', 'bounded-floor'],
      optionalFeatures: ['hand-tracking'],
    });
  }
}
```

#### 2. Sistema de Controladores VR

Los controladores VR se implementan con un sistema completo de seguimiento y eventos:

```javascript
// Ejemplo de game.js - Sistema de controladores
setupVRControllers() {
  // Configuración de fábrica de modelos de controladores
  const controllerModelFactory = new XRControllerModelFactory();

  // Controlador derecho
  this.controllerR = this.renderer.xr.getController(0);
  const controllerGripR = this.renderer.xr.getControllerGrip(0);

  // Controlador izquierdo
  this.controllerL = this.renderer.xr.getController(1);
  const controllerGripL = this.renderer.xr.getControllerGrip(1);

  // Sistema de visualización de rayos para apuntar
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5
  });

  // Añadimos líneas de ayuda visual a los controladores
  this.controllerR.add(new THREE.Line(geometry, material));
  this.controllerL.add(new THREE.Line(geometry, material));

  // Cargamos los modelos 3D de los controladores
  controllerGripR.add(controllerModelFactory.createControllerModel(controllerGripR));
  controllerGripL.add(controllerModelFactory.createControllerModel(controllerGripL));
}
```

#### 3. Sistema de Interacción con Controladores

La interacción se maneja a través de un sistema de eventos completo:

```javascript
// Ejemplo de game.js - Sistema de eventos de controladores
setupControllerEvents() {
  // Eventos del controlador derecho (caña de pescar)
  this.controllerR.addEventListener('selectstart', () => {
    // Botón trigger - Agarrar caña
    const controllerPos = new THREE.Vector3();
    this.controllerR.getWorldPosition(controllerPos);
    if (this.fishingRod.grab(this.controllerR, controllerPos)) {
      this.isRodGrabbed = true;
      // Retroalimentación háptica
      if (this.controllerR.gamepad) {
        this.controllerR.gamepad.vibrationActuator?.playEffect('dual-rumble', {
          duration: 100,
          strongMagnitude: 0.5,
          weakMagnitude: 0.5
        });
      }
    }
  });

  this.controllerR.addEventListener('squeezestart', () => {
    // Botón grip - Lanzar línea
    if (this.isRodGrabbed && !this.isCasting) {
      this.fishingRod.startCasting();
      this.isCasting = true;
    }
  });

  // Eventos del controlador izquierdo (movimiento)
  this.controllerL.addEventListener('thumbstickmove', (event) => {
    // Joystick - Movimiento del jugador
    const { x, y } = event.axes;
    if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
      this.movePlayer(x, y);
    }
  });
}
```

#### 4. Sistema de Movimiento en VR

El movimiento en VR se implementa con varias técnicas para reducir la cinetosis:

```javascript
// Ejemplo de game.js - Sistema de movimiento VR
class Game {
  movePlayer(x, y) {
    // Vector de dirección basado en la orientación de la cámara
    const camera = this.sceneManager.camera;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    // Vector derecho de la cámara para movimiento lateral
    const right = new THREE.Vector3();
    right.crossVectors(camera.up, direction).normalize();

    // Calculamos el movimiento final
    const moveSpeed = 0.1;
    const movement = new THREE.Vector3();
    movement.addScaledVector(direction, -y * moveSpeed); // Adelante/Atrás
    movement.addScaledVector(right, x * moveSpeed); // Izquierda/Derecha

    // Aplicamos el movimiento con suavizado
    this.playerPosition.add(movement);

    // Verificamos colisiones con el entorno
    this.checkEnvironmentCollisions();
  }

  checkEnvironmentCollisions() {
    // Raycast para detectar colisiones con el terreno y objetos
    const raycaster = new THREE.Raycaster(
      this.playerPosition,
      new THREE.Vector3(0, -1, 0),
    );
    const intersects = raycaster.intersectObjects(this.collisionObjects);

    if (intersects.length > 0) {
      // Ajustamos la altura del jugador al terreno
      const groundY = intersects[0].point.y;
      this.playerPosition.y = groundY + this.playerHeight;
    }
  }
}
```

#### 5. Optimizaciones Específicas para VR

```javascript
// Ejemplo de SceneManager.js - Optimizaciones VR
class SceneManager {
  setupVROptimizations() {
    // Ajuste dinámico de resolución basado en el rendimiento
    this.renderer.xr.setFramebufferScaleFactor(0.8);

    // Sistema de LOD para VR
    this.setupLODSystem();

    // Optimización de sombras para VR
    this.setupVRShadows();
  }

  setupLODSystem() {
    const lod = new THREE.LOD();

    // Nivel de detalle alto (cerca)
    const highDetailGeometry = new THREE.SphereGeometry(1, 32, 32);
    const highDetailMesh = new THREE.Mesh(highDetailGeometry, this.material);
    lod.addLevel(highDetailMesh, 0);

    // Nivel de detalle medio
    const mediumDetailGeometry = new THREE.SphereGeometry(1, 16, 16);
    const mediumDetailMesh = new THREE.Mesh(
      mediumDetailGeometry,
      this.material,
    );
    lod.addLevel(mediumDetailMesh, 5);

    // Nivel de detalle bajo (lejos)
    const lowDetailGeometry = new THREE.SphereGeometry(1, 8, 8);
    const lowDetailMesh = new THREE.Mesh(lowDetailGeometry, this.material);
    lod.addLevel(lowDetailMesh, 10);
  }

  setupVRShadows() {
    // Configuración optimizada de sombras para VR
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
  }
}
```

#### 6. Retroalimentación Háptica

```javascript
// Ejemplo de FishingRod.js - Sistema háptico
class FishingRod {
  provideFishBiteHapticFeedback() {
    if (this.controller && this.controller.gamepad) {
      // Patrón de vibración para cuando un pez muerde el anzuelo
      const hapticEffect = {
        duration: 300,
        strongMagnitude: 0.7,
        weakMagnitude: 0.3,
      };

      // Secuencia de pulsos para simular tirones del pez
      const pulseCount = 3;
      let delay = 0;

      for (let i = 0; i < pulseCount; i++) {
        setTimeout(() => {
          this.controller.gamepad.vibrationActuator?.playEffect(
            'dual-rumble',
            hapticEffect,
          );
        }, delay);
        delay += 400;
      }
    }
  }
}
```

---

## Estructura de Archivos y Directorios

```bash
.
├── index.html
├── script.js
├── game.js
├── style.css
├── lib/
│   └── ammo.js
├── modules/
│   ├── SceneManager.js
│   ├── Environment.js
│   ├── FishingRod.js
│   ├── FishManager.js
│   ├── celestials/
│   │   ├── CelestialManager.js
│   │   ├── Sky.js
│   │   ├── Sun.js
│   │   ├── Moon.js
│   │   └── Stars.js
│   └── shaders/
│       ├── skyShaders.js
│       ├── fishShaders.js
│       └── sunShaders.js
├── models/
│   ├── fish.fbx
│   └── fishred.fbx
├── textures/
│   ├── wood/
│   ├── metal_mesh/
│   ├── grass/
│   ├── rock/
│   ├── water/
│   └── solarsystem/
├── .prettierrc.json
└── package.json
```

---

## Tecnologías Utilizadas

- **[three.js](https://threejs.org/)** - Renderizado 3D en WebGL.
- **[Ammo.js](https://github.com/kripken/ammo.js/)** - Simulación física y colisiones.
- **WebXR** - APIs para Realidad Virtual y Realidad Aumentada en navegadores.
- **HTML5/CSS3** - Estructura y estilo del juego.
- **JavaScript (ES6+)** - Lógica del juego y controladores interactivos.

---

## Principales Módulos

### SceneManager

Gestiona la escena 3D principal, incluyendo la configuración de la cámara, el renderizador y el bucle de animación. Implementa el patrón Singleton para mantener una única instancia de la escena.

```javascript
export class SceneManager {
  constructor() {
    // Configuración básica de Three.js
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      70, // FOV
      window.innerWidth / window.innerHeight, // Aspect Ratio
      0.1, // Near plane
      1000000, // Far plane
    );

    // Configuración del renderizador con soporte VR
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.xr.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
  }

  startAnimation(renderCallback) {
    // Bucle de renderizado optimizado para VR
    this.renderer.setAnimationLoop(() => {
      if (renderCallback) renderCallback();
      this.renderer.render(this.scene, this.camera);
    });
  }
}
```

### Environment

Crea y gestiona el entorno virtual del lago, implementando técnicas avanzadas de shaders para el agua, terreno y efectos atmosféricos. Utiliza mapas de normales y técnicas de iluminación PBR (Physically Based Rendering).

```javascript
export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.water = null;
    this.celestials = new CelestialManager(scene);
  }

  createWater() {
    const waterGeometry = new THREE.CircleGeometry(5, 64);
    this.water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      flowDirection: new THREE.Vector2(1, 1),
      scale: 7,
      flowSpeed: 0.25,
      reflectivity: 0.35,
      opacity: 0.65,
    });
  }

  update(time) {
    // Actualización de shaders y efectos dinámicos
    if (this.water?.material?.uniforms) {
      this.water.material.uniforms.config.value.x = time * 0.5;
      this.water.material.uniforms.flowDirection.value.set(
        Math.sin(time * 0.1),
        Math.cos(time * 0.1),
      );
    }
  }
}
```

### FishingRod

Implementa la física e interacción de la caña de pescar utilizando técnicas de cinemática y simulación de cuerdas. Integra controles tanto para VR como para teclado/ratón.

```javascript
export class FishingRod {
  constructor(scene) {
    this.scene = scene;
    this.isGrabbed = false;
    this.isCasting = false;
    this.castPower = 0;
  }

  createLine() {
    // Sistema de física para la línea de pesca
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
    });

    // Simulación de física de cuerda
    this.updateLinePhysics = (time) => {
      const positions = this.line.geometry.attributes.position.array;
      const tension = this.calculateLineTension();
      const windEffect = Math.sin(time * 2) * 0.1;

      // Aplicar física a cada segmento de la línea
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += windEffect * (1 - tension);
      }
      this.line.geometry.attributes.position.needsUpdate = true;
    };
  }
}
```

### FishManager

Gestiona el movimiento y comportamiento de los peces. Utiliza shaders personalizados para efectos submarinos.

```javascript
import { fishShaders } from './shaders/fishShaders.js';

export class FishManager {
  constructor(scene) {
    this.scene = scene;
    this.fishes = [];
  }

  createFishMaterial(color) {
    // Shader personalizado para efectos submarinos
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waterLevel: { value: -0.3 },
        color: { value: new THREE.Color(color) },
      },
      vertexShader: fishShaders.vertexShader,
      fragmentShader: fishShaders.fragmentShader,
    });
  }

  update(time) {
    this.fishes.forEach((fish) => {
      if (!fish.userData.isCaught) {
        // Movimiento procedural de los peces
        fish.userData.angle += fish.userData.speed;
        const newX =
          fish.userData.centerX +
          Math.cos(fish.userData.angle) * fish.userData.radius;
        const newZ =
          fish.userData.centerZ +
          Math.sin(fish.userData.angle) * fish.userData.radius;

        // Actualizar posición y rotación
        fish.position.set(newX, fish.userData.baseY, newZ);
        fish.rotation.y =
          Math.atan2(newX - fish.position.x, newZ - fish.position.z) +
          Math.PI / 2;
      }
    });
  }
}

export const fishShaders = {
  vertexShader: `
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float waterLevel;
    uniform vec3 color;
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      // Efectos submarinos caustics
      float caustics = sin(vPosition.x * 3.0 + time) * 
                      sin(vPosition.z * 3.0 + time) * 0.8 + 0.2;
      
      // Rim lighting submarino
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float rimLight = pow(1.0 - max(0.0, dot(viewDirection, vNormal)), 2.0);
      
      vec3 finalColor = color * (1.0 + caustics + rimLight);
      gl_FragColor = vec4(finalColor, 0.95);
    }
  `,
};
```

Los shaders han sido modularizados en archivos separados dentro de la carpeta `shaders/` para mejorar la mantenibilidad y reutilización del código. El shader de los peces implementa:

1. **Vertex Shader**: Prepara las variables necesarias para los cálculos de iluminación y efectos.

   - Pasa la posición y normal del vértice al fragment shader
   - Calcula la posición final del vértice en el espacio de la pantalla

2. **Fragment Shader**: Implementa efectos visuales submarinos:
   - Caustics: Simula el efecto de la luz atravesando el agua
   - Rim lighting: Añade un efecto de borde iluminado para mejor visibilidad
   - Color dinámico: Modula el color base con los efectos para dar realismo

Cada módulo está diseñado siguiendo principios de programación orientada a objetos y patrones de diseño comunes en el desarrollo de aplicaciones 3D. La arquitectura modular permite una fácil extensibilidad y mantenimiento del código, mientras que el uso de shaders personalizados y técnicas avanzadas de renderizado asegura un rendimiento óptimo y efectos visuales de alta calidad.

---

## Funcionamiento General

1. **Inicialización** – Se carga el entorno con `SceneManager` y `Environment`.
2. **Creación de la caña** – `FishingRod` crea la caña de pescar interactiva.
3. **Simulación de peces** – `FishManager` posiciona y anima a los peces.
4. **Interacción del usuario** – Agarrar caña (`E`), lanzar (`ESPACIO`), atrapar (`F`).

---

## Controles y Uso

- **Modo Escritorio**

  - `WASD` / Flechas - Mover cámara.
  - `E` - Agarrar/Soltar caña.
  - `ESPACIO` - Lanzar línea.
  - `F` - Atrapar pez.
  - `R` - Reiniciar caña.
  - `Q` - Activar/Desactivar depuración.

- **Modo VR**
  - **Controlador derecho**:
    - `Trigger` – Agarrar y lanzar línea.
    - `Grip` – Recoger línea.

---

## Uso de Librerías Externas

### Ammo.js

Se utiliza para la **simulación física y detección de colisiones**. Lo utilizamos para:

- Calcular interacciones entre la caña, la línea y los peces (por ejemplo, si se desea una física más realista del sedal o colisiones con objetos).
- Manejar el movimiento y colisiones cuando el pez es arrojado fuera del agua.

En este proyecto, la configuración de Ammo.js se realiza cargando el script `ammo.js` (versión compilada de Bullet Physics para Web), y luego llamando a:

```js
Ammo().then(() => {
  // Inicializamos nuestra escena o lógicas físicas aquí
});
```

### three.js

**three.js** es la librería principal para renderizado 3D. En este proyecto se usa para:

- Crear la escena, cámara y renderizador.
- Incorporar la compatibilidad con **WebXR** a través de `renderer.xr.enabled = true;` y la clase `VRButton`.
- Añadir geometrías (Cañas, Peces, Entorno) y materiales basados en shaders personalizables.
- Manejar luces, sombras y otros efectos de postprocesado (por ejemplo, tono HDR con `ACESFilmicToneMapping`).

### FBXLoader

Permite **cargar modelos** en formato `.fbx` para dar vida a los peces animados:

- Se importa desde el directorio de addons de three.js, por ejemplo:

```js
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
```

- Cada modelo se clona y se posiciona en el lago, agregando rotación, escalado y diferentes parámetros de movimiento.
- Gracias a `FBXLoader`, es posible tener peces con animaciones complejas (si el `.fbx` incluye rigs y animaciones), o simplemente mallas estáticas para un movimiento procedural.

---

## Configuración y Formato de Código

**Configuración de Prettier**:

```json
{
  "singleQuote": true,
  "trailingComma": "all"
}
```

---

## Pasos para Ejecutar el Proyecto

1. **Clonar el repositorio**:

```bash
git clone https://github.com/gitfrandu4/vr-fishing.git
cd vr-fishing
```

2. **Abrir con Visual Studio Code**:

   - Abre la carpeta del proyecto en VS Code
   - Instala la extensión "Live Server" si aún no la tienes
     - Puedes encontrarla buscando "Live Server" en la pestaña de extensiones
     - O instalarla directamente desde el [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

3. **Iniciar Live Server**:

   - Haz clic derecho en el archivo `index.html`
   - Selecciona "Open with Live Server"
   - O haz clic en "Go Live" en la barra de estado inferior de VS Code

4. **Acceder al proyecto**:

   - El navegador se abrirá automáticamente en `http://127.0.0.1:5500` (o un puerto similar)
   - El proyecto se actualizará automáticamente cuando hagas cambios en el código

5. **Entrar en modo VR** (si es compatible):
   - Usa el botón "Enter VR" que aparece en la esquina inferior derecha
   - Coloca el visor VR y disfruta de la experiencia

**Nota**: Al ser un proyecto HTML/JavaScript estático, no requiere ninguna instalación adicional ni servidor específico. Live Server proporciona una forma cómoda de servir los archivos y ver los cambios en tiempo real durante el desarrollo.

---

## Referencias y Bibliografía

1. **Three.js Documentation**

   - [https://threejs.org/docs/](https://threejs.org/docs/)
   - Framework base del proyecto
   - Referencia para implementación de geometrías y materiales

2. **WebXR Device API Specification**

   - [https://www.w3.org/TR/webxr/](https://www.w3.org/TR/webxr/)
   - Estándar para implementación de VR
   - Base para el sistema de interacción VR

3. **GLSL Shader Language Specification**

   - [https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.60.pdf](https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.60.pdf)
   - Referencia para desarrollo de shaders personalizados

4. **Bullet Physics Documentation**

   - [https://pybullet.org/wordpress/](https://pybullet.org/wordpress/)
   - Base de Ammo.js para simulación física

5. **"Learn OpenGL"**

   - [https://learnopengl.com/](https://learnopengl.com/)
   - Referencia para conceptos de renderizado y shaders

6. **"The Book of Shaders"**
   - [https://thebookofshaders.com/](https://thebookofshaders.com/)
   - Guía para desarrollo de shaders GLSL

---

🎯 **¡Buena pesca!**
