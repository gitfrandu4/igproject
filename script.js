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
}

function createEnvironment() {
  // Add ground
  const groundGeometry = new THREE.CircleGeometry(20, 32);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xccaa88,
    roughness: 0.8,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  scene.add(ground);

  // Add some rocks
  const rockGeometry = new THREE.DodecahedronGeometry(0.5, 0);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.9,
  });

  for (let i = 0; i < 10; i++) {
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(Math.random() * 16 - 8, -0.3, Math.random() * 16 - 8);
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    rock.scale.set(
      Math.random() * 0.5 + 0.1,
      Math.random() * 0.5 + 0.1,
      Math.random() * 0.5 + 0.1,
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

function loadFishes() {
  const fbxLoader = new FBXLoader();

  // Load regular fish
  fbxLoader.load('fish.fbx', (fish) => {
    fish.scale.set(0.01, 0.01, 0.01);
    fish.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Add shimmering effect for underwater appearance
        child.material = new THREE.MeshPhysicalMaterial({
          color: child.material.color,
          metalness: 0.5,
          roughness: 0.2,
          iridescence: 0.3,
          iridescenceIOR: 1.3,
          transparent: true,
          opacity: 0.9,
        });
      }
    });

    for (let i = 0; i < 3; i++) {
      const fishClone = fish.clone();
      const x = Math.random() * 8 - 4;
      const z = Math.random() * 8 - 4;
      const y = -0.4 - Math.random() * 0.3; // Position fish just below water surface
      fishClone.position.set(x, y, z);
      scene.add(fishClone);
      fishes.push(fishClone);

      // Add physics to fish
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

  // Load red fish
  fbxLoader.load('fishred.fbx', (redFish) => {
    redFish.scale.set(0.001, 0.001, 0.001);
    redFish.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Add shimmering effect for underwater appearance
        child.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0xff4444),
          metalness: 0.6,
          roughness: 0.2,
          iridescence: 0.4,
          iridescenceIOR: 1.5,
          transparent: true,
          opacity: 0.9,
        });
      }
    });

    for (let i = 0; i < 2; i++) {
      const fishClone = redFish.clone();
      const x = Math.random() * 8 - 4;
      const z = Math.random() * 8 - 4;
      const y = -0.4 - Math.random() * 0.3; // Position fish just below water surface
      fishClone.position.set(x, y, z);
      scene.add(fishClone);
      fishes.push(fishClone);

      // Add physics to red fish
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

  // Add visual indicator for grab radius
  const materialSphereHand = new THREE.MeshPhongMaterial({
    color: new THREE.Color('rgb(255,255,255)'),
    shininess: 1,
    transparent: true,
    opacity: 0.2,
  });

  controllerActionRadius = 0.3; // Increased radius
  const sphereR = new THREE.Mesh(
    new THREE.SphereGeometry(controllerActionRadius, 20, 20),
    materialSphereHand.clone(),
  );
  controllerR.add(sphereR);

  // Add controller models
  controllerGripR.add(
    controllerModelFactory.createControllerModel(controllerGripR),
  );
  controllerGripL.add(
    controllerModelFactory.createControllerModel(controllerGripL),
  );

  // Add fishing rod to objects array
  objects = [fishingRod];
}

function SelectEventGrab(event) {
  checkGrabbingR = true;
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
}

function SelectEventGrabEnd(event) {
  checkGrabbingR = false;
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
    fish.rotation.y += 0.01;

    // Update fish physics body
    if (fish.userData.physicsBody) {
      const transform = new Ammo.btTransform();
      transform.setIdentity();
      const newX = fish.position.x + Math.sin(time) * 0.01;
      const newZ = fish.position.z + Math.cos(time) * 0.01;
      transform.setOrigin(new Ammo.btVector3(newX, fish.position.y, newZ));
      fish.userData.physicsBody.setWorldTransform(transform);

      fish.position.x = newX;
      fish.position.z = newZ;
    }
  });

  // Update fishing line with physics simulation
  if (fishingLine) {
    const lineEnd = new THREE.Vector3(0, -2, 0);
    lineEnd.y += Math.sin(time * 2) * 0.1;

    // Add some wind effect
    lineEnd.x += Math.sin(time * 1.5) * 0.05;
    lineEnd.z += Math.cos(time * 1.5) * 0.05;

    fishingLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), lineEnd]);
  }

  renderer.render(scene, camera);
}
