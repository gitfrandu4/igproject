import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water2.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { Sky } from 'three/addons/objects/Sky.js';

let camera, scene, renderer;
let water;
let physicsWorld;
let fishes = [];
let fishingRod;
let fishingLine;
let controllerR, controllerL;
let sky, sun;
let isRodGrabbed = false;
let objects = [];
let checkGrabbingR = false;
let controllerActionRadius = 0.1;
let isCasting = false;
let lineEndPoint = new THREE.Vector3();
let caughtFish = null;
let isReeling = false;
let catchAnimation = null;
let isFishNearby = false;
let fishBiteTimer = null;

// Add new state variables
let castPower = 0;
let isCharging = false;
let fishBiteChance = 0.4; // 40% chance of fish biting
let rodMovementSpeed = 0.1;
let canCast = true;
let isSqueezed = false;
let gameState = {
  squeezeStartTime: 0,
  powerMeter: null,
};

// Add new materials and constants
const GRAB_RADIUS = 0.5;
const CAST_POWER_MAX = 5;
const FISH_DETECTION_RADIUS = 1.5;

const highlightMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.3,
  emissive: 0x00ff00,
  emissiveIntensity: 0.3,
});

// Add keyboard state tracking
let keyboardState = {
  isGrabbing: false,
  isSqueezed: false,
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  moveUp: false,
  moveDown: false,
};

// Add new shader materials at the top with other constants
const grassShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      
      // Add wind movement to grass
      vec3 pos = position;
      if (pos.y > 0.0) {
        pos.x += sin(time * 2.0 + position.x * 4.0) * 0.03 * pos.y;
        pos.z += cos(time * 2.0 + position.z * 4.0) * 0.03 * pos.y;
      }
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    uniform float time;
    
    void main() {
      vec3 grassColor = mix(
        vec3(0.2, 0.5, 0.1),
        vec3(0.3, 0.6, 0.2),
        smoothstep(0.0, 1.0, vPosition.y)
      );
      
      // Add subtle variation
      float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
      grassColor = mix(grassColor, grassColor * 1.2, noise * 0.2);
      
      gl_FragColor = vec4(grassColor, 1.0);
    }
  `,
};

const terrainShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying float vElevation;
    
    uniform float time;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      float elevation = 0.0;
      float frequency = 1.0;
      float amplitude = 0.5;
      
      for(int i = 0; i < 4; i++) {
        elevation += noise(vUv * frequency) * amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      
      vElevation = elevation;
      vec3 pos = position;
      pos.y += elevation * 0.5;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying float vElevation;
    
    void main() {
      vec3 baseColor = mix(
        vec3(0.7, 0.6, 0.5),  // Sand/dirt color
        vec3(0.4, 0.7, 0.3),  // Grass color
        smoothstep(0.0, 0.5, vElevation)
      );
      
      // Add rock color for steep areas
      baseColor = mix(
        baseColor,
        vec3(0.6, 0.6, 0.6),
        smoothstep(0.6, 0.8, vElevation)
      );
      
      gl_FragColor = vec4(baseColor, 1.0);
    }
  `,
};

// Initialize Ammo.js
Ammo().then(function (AmmoLib) {
  Ammo = AmmoLib;
  init();
  animate();
});

function initSky() {
  // Add Sky
  sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);

  sun = new THREE.Vector3();

  const effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
  };

  const uniforms = sky.material.uniforms;
  uniforms['turbidity'].value = effectController.turbidity;
  uniforms['rayleigh'].value = effectController.rayleigh;
  uniforms['mieCoefficient'].value = effectController.mieCoefficient;
  uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

  const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
  const theta = THREE.MathUtils.degToRad(effectController.azimuth);

  sun.setFromSphericalCoords(1, phi, theta);
  uniforms['sunPosition'].value.copy(sun);
}

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    1000000,
  );
  camera.position.set(0, 1.6, 3);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  initSky();
  setupPhysics();
  createEnvironment();
  createWater();
  createFishingRod();
  loadFishes();
  setupVRControllers();
  createKeyboardPowerMeter();
}

function createEnvironment() {
  // Create terrain with shader - make it a ring around the water
  const terrainGeometry = new THREE.RingGeometry(5.5, 20, 64, 8); // Inner radius just larger than water
  const terrainMaterial = new THREE.ShaderMaterial({
    vertexShader: terrainShader.vertexShader,
    fragmentShader: terrainShader.fragmentShader,
    uniforms: {
      time: { value: 0 },
    },
  });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.3; // Align with water level
  scene.add(terrain);

  // Add grass patches - only around the water
  const grassGeometry = new THREE.PlaneGeometry(1, 1, 10, 10);
  const grassMaterial = new THREE.ShaderMaterial({
    vertexShader: grassShader.vertexShader,
    fragmentShader: grassShader.fragmentShader,
    uniforms: {
      time: { value: 0 },
    },
    side: THREE.DoubleSide,
    transparent: true,
  });

  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 13; // Between 6 and 19 units from center
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const grass = new THREE.Mesh(grassGeometry, grassMaterial.clone());
    grass.position.set(x, -0.3, z); // Align with terrain
    grass.rotation.x = -Math.PI / 2;
    grass.scale.set(0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.7, 1);
    scene.add(grass);
  }

  // Add rocks - only around the water
  const rockGeometry = new THREE.DodecahedronGeometry(0.5, 1);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.9,
    metalness: 0.1,
    normalScale: new THREE.Vector2(1, 1),
  });

  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 13; // Between 6 and 19 units from center
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, -0.3, z);
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    rock.scale.set(
      Math.random() * 0.8 + 0.2,
      Math.random() * 0.5 + 0.2,
      Math.random() * 0.8 + 0.2,
    );
    scene.add(rock);
  }
}

function setupPhysics() {
  const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  const overlappingPairCache = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();

  physicsWorld = new Ammo.btDiscreteDynamicsWorld(
    dispatcher,
    overlappingPairCache,
    solver,
    collisionConfiguration,
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, -9.8, 0));
}

function createWater() {
  const waterGeometry = new THREE.PlaneGeometry(10, 10);
  const textureLoader = new THREE.TextureLoader();

  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    color: 0x0064ff,
    flowDirection: new THREE.Vector2(1, 1),
    scale: 4,
    flowSpeed: 0.1,
    reflectivity: 0.5,
    normalMap0: textureLoader.load('textures/water/Water_1_M_Normal.jpg'),
    normalMap1: textureLoader.load('textures/water/Water_2_M_Normal.jpg'),
  });

  water.position.y = -0.3;
  water.rotation.x = -Math.PI / 2;
  scene.add(water);
}

function createFishingRod() {
  // Rod
  const rodGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
  const rodMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.7,
    metalness: 0.3,
  });
  fishingRod = new THREE.Mesh(rodGeometry, rodMaterial);
  fishingRod.rotation.x = Math.PI / 4;
  fishingRod.position.set(0, 1, -0.5);

  // Fishing Line
  const lineGeometry = new THREE.BufferGeometry();
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
  });

  // Create line from rod tip to water
  const rodTip = new THREE.Vector3(0, 1.5, 0); // Tip of the rod
  const waterPoint = new THREE.Vector3(0, -2, 0); // Point in the water
  lineGeometry.setFromPoints([rodTip, waterPoint]);

  fishingLine = new THREE.Line(lineGeometry, lineMaterial);
  fishingRod.add(fishingLine);

  scene.add(fishingRod);

  // Add physics to fishing rod
  const shape = new Ammo.btCylinderShape(new Ammo.btVector3(0.02, 0.75, 0.02));
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(
    new Ammo.btVector3(
      fishingRod.position.x,
      fishingRod.position.y,
      fishingRod.position.z,
    ),
  );

  const motionState = new Ammo.btDefaultMotionState(transform);
  const localInertia = new Ammo.btVector3(0, 0, 0);
  shape.calculateLocalInertia(1, localInertia);

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    1,
    motionState,
    shape,
    localInertia,
  );
  const body = new Ammo.btRigidBody(rbInfo);
  body.setActivationState(4);
  body.setCollisionFlags(2);
  physicsWorld.addRigidBody(body);
  fishingRod.userData.physicsBody = body;
}

// Update the fish shader for better visibility
const fishShaderMaterial = {
  uniforms: {
    time: { value: 0 },
    waterLevel: { value: -0.3 },
    color: { value: new THREE.Color() },
    opacity: { value: 1.0 },
  },
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
    uniform float opacity;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      // Reduce water darkening effect
      float depth = abs(vPosition.y - waterLevel) * 0.1;  // Reduced from 0.15
      
      // Stronger caustics
      float caustics = sin(vPosition.x * 3.0 + time) * sin(vPosition.z * 3.0 + time) * 0.7 + 0.3;
      
      // Enhanced rim lighting
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float rimLight = 1.0 - max(0.0, dot(viewDirection, vNormal));
      rimLight = pow(rimLight, 1.5) * 0.8;  // Increased rim light intensity
      
      // Brighter base color
      vec3 brightColor = color * 2.0;  // Increased from 1.5
      vec3 finalColor = brightColor * (1.0 - depth) + caustics * 0.4 + rimLight;
      
      // Stronger glow effect
      float glow = sin(time * 1.5) * 0.15 + 0.95;  // Increased glow intensity
      finalColor *= glow;
      
      gl_FragColor = vec4(finalColor, opacity);
    }
  `,
};

function loadFishes() {
  const fbxLoader = new FBXLoader();

  // Load regular fish
  fbxLoader.load('fish.fbx', (fish) => {
    fish.scale.set(0.01, 0.01, 0.01);
    fish.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Create custom shader material with brighter colors
        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            waterLevel: { value: -0.3 },
            color: { value: new THREE.Color(0x66aaff) }, // Brighter blue
            opacity: { value: 0.95 }, // Increased opacity
          },
          vertexShader: fishShaderMaterial.vertexShader,
          fragmentShader: fishShaderMaterial.fragmentShader,
          transparent: true,
          side: THREE.DoubleSide,
        });
        child.material = material;
      }
    });

    // Create regular fish with slower movement
    for (let i = 0; i < 8; i++) {
      const fishClone = fish.clone();
      const x = Math.random() * 8 - 4;
      const z = Math.random() * 8 - 4;
      const y = -0.5 - Math.random() * 0.5; // Reduced depth range
      fishClone.position.set(x, y, z);
      fishClone.rotation.y = Math.random() * Math.PI * 2;
      scene.add(fishClone);

      // Slower movement parameters
      fishClone.userData.speed = 0.005 + Math.random() * 0.01; // Reduced from 0.02
      fishClone.userData.radius = 0.8 + Math.random() * 1.5; // Reduced radius
      fishClone.userData.centerX = x;
      fishClone.userData.centerZ = z;
      fishClone.userData.baseY = y;
      fishClone.userData.angle = Math.random() * Math.PI * 2;
      fishClone.userData.verticalOffset = Math.random() * 0.05; // Reduced vertical movement

      fishes.push(fishClone);

      // Add physics to fish with vertical constraints
      const shape = new Ammo.btSphereShape(0.1);
      const transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin(new Ammo.btVector3(x, y, z));

      const motionState = new Ammo.btDefaultMotionState(transform);
      const localInertia = new Ammo.btVector3(0, 0, 0);
      shape.calculateLocalInertia(1, localInertia);

      const rbInfo = new Ammo.btRigidBodyConstructionInfo(
        1,
        motionState,
        shape,
        localInertia,
      );
      const body = new Ammo.btRigidBody(rbInfo);
      body.setActivationState(4);
      body.setCollisionFlags(2);
      physicsWorld.addRigidBody(body);
      fishClone.userData.physicsBody = body;
    }
  });

  // Load red fish with similar slower settings
  fbxLoader.load('fishred.fbx', (redFish) => {
    redFish.scale.set(0.001, 0.001, 0.001);
    redFish.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Create custom shader material with brighter colors for red fish
        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            waterLevel: { value: -0.3 },
            color: { value: new THREE.Color(0xff5555) }, // Brighter red
            opacity: { value: 0.95 },
          },
          vertexShader: fishShaderMaterial.vertexShader,
          fragmentShader: fishShaderMaterial.fragmentShader,
          transparent: true,
          side: THREE.DoubleSide,
        });
        child.material = material;
      }
    });

    // Create red fish with slower movement
    for (let i = 0; i < 4; i++) {
      const fishClone = redFish.clone();
      const x = Math.random() * 8 - 4;
      const z = Math.random() * 8 - 4;
      const y = -0.5 - Math.random() * 0.5;
      fishClone.position.set(x, y, z);
      fishClone.rotation.y = Math.random() * Math.PI * 2;
      scene.add(fishClone);

      // Slower movement for red fish
      fishClone.userData.speed = 0.007 + Math.random() * 0.01; // Slightly faster than regular fish
      fishClone.userData.radius = 1.0 + Math.random() * 1.5;
      fishClone.userData.centerX = x;
      fishClone.userData.centerZ = z;
      fishClone.userData.baseY = y;
      fishClone.userData.angle = Math.random() * Math.PI * 2;
      fishClone.userData.verticalOffset = Math.random() * 0.05;

      fishes.push(fishClone);

      // Add physics with same constraints
      const shape = new Ammo.btSphereShape(0.1);
      const transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin(new Ammo.btVector3(x, y, z));

      const motionState = new Ammo.btDefaultMotionState(transform);
      const localInertia = new Ammo.btVector3(0, 0, 0);
      shape.calculateLocalInertia(1, localInertia);

      const rbInfo = new Ammo.btRigidBodyConstructionInfo(
        1,
        motionState,
        shape,
        localInertia,
      );
      const body = new Ammo.btRigidBody(rbInfo);
      body.setActivationState(4);
      body.setCollisionFlags(2);
      physicsWorld.addRigidBody(body);
      fishClone.userData.physicsBody = body;
    }
  });
}

function setupVRControllers() {
  const controllerModelFactory = new XRControllerModelFactory();

  // Right Controller
  controllerR = renderer.xr.getController(0);
  const controllerGripR = renderer.xr.getControllerGrip(0);

  // Add ray line to controller
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const line = new THREE.Line(geometry);
  line.name = 'line';
  line.scale.z = 5;
  controllerR.add(line);

  controllerR.addEventListener('connected', function (event) {
    const hasHand = event.data.hand;
    if (line) {
      line.visible = !hasHand;
    }
  });

  controllerR.addEventListener('selectstart', SelectEventGrab);
  controllerR.addEventListener('selectend', SelectEventGrabEnd);

  scene.add(controllerR);
  scene.add(controllerGripR);

  // Left Controller
  controllerL = renderer.xr.getController(1);
  const controllerGripL = renderer.xr.getControllerGrip(1);
  scene.add(controllerL);
  scene.add(controllerGripL);

  // Update grab sphere with new radius and better visibility
  const grabSphere = new THREE.Mesh(
    new THREE.SphereGeometry(GRAB_RADIUS, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
      depthTest: false,
    }),
  );
  controllerR.add(grabSphere);

  // Add squeeze indicator
  const squeezeIndicator = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.06, 32),
    new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
      depthTest: false,
    }),
  );
  squeezeIndicator.position.z = -0.05;
  controllerR.add(squeezeIndicator);

  // Add controller models
  controllerGripR.add(
    controllerModelFactory.createControllerModel(controllerGripR),
  );
  controllerGripL.add(
    controllerModelFactory.createControllerModel(controllerGripL),
  );

  // Add fishing rod to objects array
  objects = [fishingRod];

  // Add squeeze event listeners for fishing action
  controllerR.addEventListener('squeezestart', onSqueezeStart);
  controllerR.addEventListener('squeezeend', onSqueezeEnd);

  // Add power meter to controller
  const powerMeterGeometry = new THREE.BoxGeometry(0.02, 0.2, 0.02);
  const powerMeterMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const powerMeter = new THREE.Mesh(powerMeterGeometry, powerMeterMaterial);
  powerMeter.position.set(0, 0.1, -0.1);
  powerMeter.scale.y = 0;
  powerMeter.name = 'powerMeter';
  controllerR.add(powerMeter);
  gameState.powerMeter = powerMeter;
}

function SelectEventGrab(event) {
  checkGrabbingR = true;
  isRodGrabbed = true;

  if (event && event.type === 'selectstart') {
    // VR controller
    const controllerPos = new THREE.Vector3();
    controllerR.getWorldPosition(controllerPos);

    objects.forEach((object) => {
      const objectPos = new THREE.Vector3();
      object.getWorldPosition(objectPos);
      const distance = controllerPos.distanceTo(objectPos);

      if (distance <= controllerActionRadius) {
        object.parent = controllerR;
        object.position.set(0, 0, -0.3);
        object.rotation.set(0, 0, 0);
      }
    });
  } else {
    // Keyboard
    if (fishingRod) {
      fishingRod.position.set(0, 1.5, -1);
      fishingRod.rotation.set(0, 0, 0);
    }
  }
}

function SelectEventGrabEnd(event) {
  checkGrabbingR = false;
  isRodGrabbed = false;

  objects.forEach((object) => {
    if (object.parent === controllerR) {
      scene.attach(object);

      // Update physics body
      if (object.userData.physicsBody) {
        const worldPos = new THREE.Vector3();
        object.getWorldPosition(worldPos);
        const worldQuat = new THREE.Quaternion();
        object.getWorldQuaternion(worldQuat);

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(
          new Ammo.btVector3(worldPos.x, worldPos.y, worldPos.z),
        );
        transform.setRotation(
          new Ammo.btQuaternion(
            worldQuat.x,
            worldQuat.y,
            worldQuat.z,
            worldQuat.w,
          ),
        );
        object.userData.physicsBody.setWorldTransform(transform);
      }
    }
  });
}

function CheckObjects() {
  const controllerPos = new THREE.Vector3();
  controllerR.getWorldPosition(controllerPos);

  objects.forEach((object) => {
    const objectPos = new THREE.Vector3();
    object.getWorldPosition(objectPos);

    const distance = controllerPos.distanceTo(objectPos);

    if (distance <= controllerActionRadius) {
      object.position.copy(controllerPos);
      object.quaternion.copy(controllerR.quaternion);

      // Update physics body
      if (object.userData.physicsBody) {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(
          new Ammo.btVector3(controllerPos.x, controllerPos.y, controllerPos.z),
        );
        const quaternion = controllerR.quaternion;
        transform.setRotation(
          new Ammo.btQuaternion(
            quaternion.x,
            quaternion.y,
            quaternion.z,
            quaternion.w,
          ),
        );
        object.userData.physicsBody.setWorldTransform(transform);
      }
    }
  });
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  // Update physics
  physicsWorld.stepSimulation(1 / 60, 10);

  const time = performance.now() * 0.001;

  // Update water shader with correct uniforms for Water2
  if (water && water.material.uniforms) {
    // Update flow direction based on time
    water.material.uniforms.config.value.x = time * 0.5;
    water.material.uniforms.config.value.y = time * 0.5;

    // Update normal maps flow
    water.material.uniforms.flowDirection.value.set(
      Math.sin(time * 0.1),
      Math.cos(time * 0.1),
    );
  }

  // Check for grabbing objects
  if (checkGrabbingR) {
    CheckObjects();
  }

  // Animate fishes with physics
  fishes.forEach((fish) => {
    if (!fish.userData.physicsBody) return;

    // Update shader uniforms with enhanced visibility
    fish.traverse((child) => {
      if (child.isMesh && child.material.uniforms) {
        child.material.uniforms.time.value = time;
        // Make fish more visible when closer to camera
        const distanceToCamera = camera.position.distanceTo(fish.position);
        const visibility = Math.max(0.6, 1.0 - distanceToCamera * 0.1);
        child.material.uniforms.opacity.value = visibility;
      }
    });

    // Update fish position with depth constraints
    fish.userData.angle += fish.userData.speed;
    const newX =
      fish.userData.centerX +
      Math.cos(fish.userData.angle) * fish.userData.radius;
    const newZ =
      fish.userData.centerZ +
      Math.sin(fish.userData.angle) * fish.userData.radius;
    const newY =
      fish.userData.baseY +
      Math.sin(fish.userData.angle * 2) * fish.userData.verticalOffset;

    // Ensure fish stays underwater
    const constrainedY = Math.min(newY, -0.4);

    fish.position.set(newX, constrainedY, newZ);
    fish.rotation.y = fish.userData.angle + Math.PI / 2;

    // Update physics body
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(newX, constrainedY, newZ));
    fish.userData.physicsBody.setWorldTransform(transform);

    // Check for fish catching when casting
    if (isCasting && !caughtFish) {
      const distanceToLine = distanceToFishingLine(fish.position);
      if (distanceToLine < 0.3) {
        caughtFish = fish;
        // Make the caught fish follow the line
        fish.userData.centerX = lineEndPoint.x;
        fish.userData.centerZ = lineEndPoint.z;
        fish.userData.radius = 0.1;
      }
    }
  });

  // Update fishing line
  if (fishingLine) {
    const startPoint = new THREE.Vector3(0, 0, 0);
    let endPoint;

    if (isCasting) {
      endPoint = fishingLine.worldToLocal(lineEndPoint.clone());
    } else {
      endPoint = new THREE.Vector3(0, -2, 0);
      endPoint.y += Math.sin(time * 2) * 0.1;
      endPoint.x += Math.sin(time * 1.5) * 0.05;
      endPoint.z += Math.cos(time * 1.5) * 0.05;
    }

    fishingLine.geometry.setFromPoints([startPoint, endPoint]);
  }

  // Update rod highlight
  if (fishingRod) {
    const controllerPos = new THREE.Vector3();
    controllerR.getWorldPosition(controllerPos);
    const rodPos = new THREE.Vector3();
    fishingRod.getWorldPosition(rodPos);

    const distance = controllerPos.distanceTo(rodPos);
    updateRodHighlight(distance <= GRAB_RADIUS);
  }

  // Update squeeze indicator
  const squeezeIndicator = controllerR.getObjectByName('squeezeIndicator');
  if (squeezeIndicator && isRodGrabbed) {
    squeezeIndicator.material.opacity = isSqueezed ? 0.8 : 0.4;
  }

  // Update casting power meter
  if (isRodGrabbed && isSqueezed) {
    updateCastingPowerMeter();
  }

  if (isRodGrabbed && controllerR) {
    // Update rod position based on controller
    const rodSpeed = rodMovementSpeed;
    fishingRod.position.lerp(controllerR.position, rodSpeed);
    fishingRod.quaternion.slerp(controllerR.quaternion, rodSpeed);

    // Update fishing line
    if (fishingLine) {
      const lineGeometry = fishingLine.geometry;
      const positions = lineGeometry.attributes.position.array;
      const rodTip = new THREE.Vector3(0, 0.75, 0);
      rodTip.applyMatrix4(fishingRod.matrixWorld);

      positions[0] = rodTip.x;
      positions[1] = rodTip.y;
      positions[2] = rodTip.z;

      if (!isCasting) {
        // When not casting, line falls straight down
        positions[3] = rodTip.x;
        positions[4] = -0.2; // Just above water
        positions[5] = rodTip.z;
      }

      lineGeometry.attributes.position.needsUpdate = true;
    }
  }

  // Update water and fish animations
  if (water) {
    // water.material.uniforms['time'].value += 1.0 / 60.0;
  }

  // Handle keyboard-based rod movement
  if (fishingRod && keyboardState.isGrabbing) {
    const moveSpeed = 0.05;
    const rotateSpeed = 0.03;

    if (keyboardState.moveForward) {
      fishingRod.position.z -= moveSpeed;
    }
    if (keyboardState.moveBackward) {
      fishingRod.position.z += moveSpeed;
    }
    if (keyboardState.moveLeft) {
      fishingRod.position.x -= moveSpeed;
    }
    if (keyboardState.moveRight) {
      fishingRod.position.x += moveSpeed;
    }
    if (keyboardState.moveUp) {
      fishingRod.position.y += moveSpeed;
    }
    if (keyboardState.moveDown) {
      fishingRod.position.y -= moveSpeed;
    }

    // Update the rod's rotation based on movement direction
    if (
      keyboardState.moveForward ||
      keyboardState.moveBackward ||
      keyboardState.moveLeft ||
      keyboardState.moveRight
    ) {
      const direction = new THREE.Vector3();
      if (keyboardState.moveForward) direction.z -= 1;
      if (keyboardState.moveBackward) direction.z += 1;
      if (keyboardState.moveLeft) direction.x -= 1;
      if (keyboardState.moveRight) direction.x += 1;

      if (direction.length() > 0) {
        direction.normalize();
        const targetRotation = Math.atan2(direction.x, direction.z);
        fishingRod.rotation.y = targetRotation;
      }
    }
  }

  // Update all grass and terrain shaders
  scene.traverse((object) => {
    if (
      object.material &&
      object.material.uniforms &&
      object.material.uniforms.time
    ) {
      object.material.uniforms.time.value = time;
    }
  });

  renderer.render(scene, camera);
}

function onSqueezeStart() {
  if (!isRodGrabbed || isCasting || isReeling) return;

  isSqueezed = true;
  isCharging = true;
  castPower = 0;
  gameState.squeezeStartTime = performance.now();

  // Start charging animation
  const chargingAnimation = () => {
    if (!isCharging) return;

    const elapsedTime = (performance.now() - gameState.squeezeStartTime) / 1000;
    castPower = Math.min(elapsedTime * 2, CAST_POWER_MAX);
    updateCastingPowerMeter();

    if (isCharging) {
      requestAnimationFrame(chargingAnimation);
    }
  };

  requestAnimationFrame(chargingAnimation);
}

function onSqueezeEnd() {
  if (!isCharging || !isRodGrabbed) return;

  isSqueezed = false;
  isCharging = false;
  isCasting = true;
  canCast = false;

  // Calculate cast distance based on power
  const castDistance = castPower * 2;
  const rodTip = new THREE.Vector3();
  fishingRod.getWorldPosition(rodTip);
  rodTip.y += 0.75; // Adjust to rod tip position

  lineEndPoint.copy(rodTip);
  lineEndPoint.z -= castDistance;
  lineEndPoint.y = -0.2; // Just above water level

  // Reset power meter
  if (gameState.powerMeter) {
    gameState.powerMeter.scale.y = 0;
  }

  // Create splash effect at landing point
  createSplashEffect(lineEndPoint);

  // Update fishing line
  const lineGeometry = fishingLine.geometry;
  const positions = lineGeometry.attributes.position.array;
  positions[3] = lineEndPoint.x;
  positions[4] = lineEndPoint.y;
  positions[5] = lineEndPoint.z;
  lineGeometry.attributes.position.needsUpdate = true;

  // Start fishing logic after cast
  setTimeout(() => {
    startFishingLogic();
  }, 1000);
}

function startFishingLogic() {
  if (fishBiteTimer) clearTimeout(fishBiteTimer);

  checkForNearbyFish();

  // Reset for next cast
  setTimeout(() => {
    canCast = true;
    isCasting = false;
  }, 2000);
}

function checkForNearbyFish() {
  isFishNearby = false;

  fishes.forEach((fish) => {
    const distance = distanceToFishingLine(fish.position);
    if (distance < FISH_DETECTION_RADIUS) {
      isFishNearby = true;

      // Visual feedback - make nearby fish glow
      if (!fish.userData.isGlowing) {
        fish.traverse((child) => {
          if (child.isMesh) {
            child.userData.originalMaterial = child.material;
            child.material = child.material.clone();
            child.material.emissive = new THREE.Color(0x666666);
            child.userData.isGlowing = true;
          }
        });
      }

      // Attract fish to the line
      fish.userData.centerX = lineEndPoint.x + (Math.random() - 0.5) * 0.5;
      fish.userData.centerZ = lineEndPoint.z + (Math.random() - 0.5) * 0.5;
      fish.userData.radius = 0.3;

      // Random chance for fish to bite
      if (Math.random() < fishBiteChance && !caughtFish && isCasting) {
        triggerFishBite(fish);
      }
    } else if (fish.userData.isGlowing) {
      // Remove glow when fish moves away
      fish.traverse((child) => {
        if (child.isMesh && child.userData.originalMaterial) {
          child.material = child.userData.originalMaterial;
          child.userData.isGlowing = false;
        }
      });
    }
  });
}

function triggerFishBite(fish) {
  if (isReeling || caughtFish) return;

  caughtFish = fish;
  createRippleEffect(fish.position);

  // Visual feedback for bite
  const biteIndicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.6,
    }),
  );
  biteIndicator.position.copy(fish.position);
  scene.add(biteIndicator);

  // Haptic feedback if using VR controller
  if (controllerR.gamepad?.hapticActuators?.[0]) {
    controllerR.gamepad.hapticActuators[0].pulse(0.8, 100);
  }

  // Remove indicator after 1 second
  setTimeout(() => {
    scene.remove(biteIndicator);
  }, 1000);

  // Start catch minigame if player reacts in time
  fishBiteTimer = setTimeout(() => {
    if (caughtFish === fish) {
      caughtFish = null; // Fish got away
      createRippleEffect(fish.position);
      fish.userData.radius = 1.5; // Fish swims away
    }
  }, 2000);
}

// Update the catch animation for more drama
function startCatchAnimation() {
  if (!caughtFish) return;

  isReeling = true;
  const startPos = caughtFish.position.clone();
  const endPos = new THREE.Vector3()
    .copy(fishingRod.position)
    .add(new THREE.Vector3(0, 1, 0));

  const startTime = performance.now();
  const duration = 1500;

  function animateCatch(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Dramatic motion with elastic easing
    const easedProgress = easeOutElastic(progress);

    caughtFish.position.lerpVectors(startPos, endPos, easedProgress);
    caughtFish.position.y += Math.sin(easedProgress * Math.PI) * 2;

    // Fish flops around while being caught
    caughtFish.rotation.z = Math.sin(elapsed * 0.01) * Math.PI * 0.25;
    caughtFish.rotation.x = Math.cos(elapsed * 0.01) * Math.PI * 0.25;

    if (progress < 1) {
      catchAnimation = requestAnimationFrame(animateCatch);
    } else {
      // Fish caught successfully!
      isReeling = false;
      createSplashEffect(caughtFish.position);
      pullFishOut();
      catchAnimation = null;
    }
  }

  catchAnimation = requestAnimationFrame(animateCatch);
}

// Add elastic easing for more bouncy effect
function easeOutElastic(t) {
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
}

function createRippleEffect(position) {
  const rippleGeometry = new THREE.CircleGeometry(0.1, 32);
  const rippleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.4,
  });

  const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
  ripple.position.copy(position);
  ripple.rotation.x = -Math.PI / 2;
  scene.add(ripple);

  const startTime = performance.now();
  const duration = 1000;

  function animateRipple(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = elapsed / duration;

    if (progress < 1) {
      ripple.scale.setScalar(1 + progress * 2);
      rippleMaterial.opacity = 0.4 * (1 - progress);
      requestAnimationFrame(animateRipple);
    } else {
      scene.remove(ripple);
      ripple.geometry.dispose();
      rippleMaterial.dispose();
    }
  }

  requestAnimationFrame(animateRipple);
}

// Easing functions for smoother animations
function easeOutQuad(t) {
  return t * (2 - t);
}

function easeInQuad(t) {
  return t * t;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function pullFishOut() {
  if (!caughtFish) return;

  // Remove physics from the fish
  if (caughtFish.userData.physicsBody) {
    physicsWorld.removeRigidBody(caughtFish.userData.physicsBody);
  }

  // Remove fish from the scene
  scene.remove(caughtFish);

  // Remove from fishes array
  const index = fishes.indexOf(caughtFish);
  if (index > -1) {
    fishes.splice(index, 1);
  }

  // Create a splash effect
  createSplashEffect(caughtFish.position);
}

function createSplashEffect(position) {
  // Create particles for splash effect
  const particleCount = 20;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    positions.push(
      position.x + (Math.random() - 0.5) * 0.2,
      position.y,
      position.z + (Math.random() - 0.5) * 0.2,
    );
    velocities.push(
      (Math.random() - 0.5) * 0.2,
      Math.random() * 0.2,
      (Math.random() - 0.5) * 0.2,
    );
  }

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );

  const material = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.05,
    transparent: true,
    opacity: 0.8,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Remove particles after animation
  setTimeout(() => scene.remove(particles), 1000);
}

function distanceToFishingLine(fishPosition) {
  const rodTip = new THREE.Vector3(0, 1.5, 0);
  fishingRod.localToWorld(rodTip);

  // Calculate the distance from fish to line segment
  return distanceToLineSegment(fishPosition, rodTip, lineEndPoint);
}

function distanceToLineSegment(point, lineStart, lineEnd) {
  const line = lineEnd.clone().sub(lineStart);
  const pointToStart = point.clone().sub(lineStart);

  const t = pointToStart.dot(line) / line.dot(line);
  const clampedT = Math.max(0, Math.min(1, t));

  const closest = lineStart.clone().add(line.multiplyScalar(clampedT));
  return point.distanceTo(closest);
}

// Update keyboard event listeners
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'Space': // Cast/Squeeze
      if (keyboardState.isGrabbing) {
        onSqueezeStart();
        keyboardState.isSqueezed = true;
      }
      break;
    case 'KeyE': // Grab rod
      if (!keyboardState.isGrabbing) {
        keyboardState.isGrabbing = true;
        SelectEventGrab();
      }
      break;
    case 'KeyW': // Move rod forward
      keyboardState.moveForward = true;
      break;
    case 'KeyS': // Move rod backward
      keyboardState.moveBackward = true;
      break;
    case 'KeyA': // Move rod left
      keyboardState.moveLeft = true;
      break;
    case 'KeyD': // Move rod right
      keyboardState.moveRight = true;
      break;
    case 'KeyQ': // Move rod up
      keyboardState.moveUp = true;
      break;
    case 'KeyZ': // Move rod down
      keyboardState.moveDown = true;
      break;
    case 'KeyF': // Catch fish when it bites
      if (caughtFish && !isReeling) {
        startCatchAnimation();
      }
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'Space': // Release cast
      onSqueezeEnd();
      keyboardState.isSqueezed = false;
      break;
    case 'KeyE': // Release rod
      keyboardState.isGrabbing = false;
      SelectEventGrabEnd();
      break;
    case 'KeyW':
      keyboardState.moveForward = false;
      break;
    case 'KeyS':
      keyboardState.moveBackward = false;
      break;
    case 'KeyA':
      keyboardState.moveLeft = false;
      break;
    case 'KeyD':
      keyboardState.moveRight = false;
      break;
    case 'KeyQ':
      keyboardState.moveUp = false;
      break;
    case 'KeyZ':
      keyboardState.moveDown = false;
      break;
  }
});

// Add new visual feedback functions
function updateRodHighlight(isHighlighted) {
  fishingRod.traverse((child) => {
    if (child.isMesh) {
      if (isHighlighted) {
        child.userData.originalMaterial = child.material;
        child.material = highlightMaterial;
      } else if (child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial;
      }
    }
  });
}

function updateCastingPowerMeter() {
  const powerRatio = castPower / CAST_POWER_MAX;

  // Update VR controller power meter
  if (gameState.powerMeter) {
    gameState.powerMeter.scale.y = powerRatio;
    const hue = (1 - powerRatio) * 0.3;
    gameState.powerMeter.material.color.setHSL(hue, 1, 0.5);
  }

  // Update keyboard power meter
  if (gameState.keyboardPowerMeter) {
    gameState.keyboardPowerMeter.scale.y = powerRatio;
    const hue = (1 - powerRatio) * 0.3;
    gameState.keyboardPowerMeter.material.color.setHSL(hue, 1, 0.5);
  }
}

// Add a power meter for keyboard controls
function createKeyboardPowerMeter() {
  if (!gameState.keyboardPowerMeter) {
    const powerMeterGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
    const powerMeterMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const powerMeter = new THREE.Mesh(powerMeterGeometry, powerMeterMaterial);
    powerMeter.position.set(2, 1, -2); // Position on the right side of the screen
    powerMeter.scale.y = 0;
    scene.add(powerMeter);
    gameState.keyboardPowerMeter = powerMeter;
  }
}
