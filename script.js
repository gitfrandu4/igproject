import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water2.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let camera, scene, renderer;
let water;
let physicsWorld;
let fishes = [];
let fishingRod;
let fishingLine;
let controllerR, controllerL;

// Initialize Ammo.js
Ammo().then(function (AmmoLib) {
  Ammo = AmmoLib;
  init();
  animate();
});

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 1.6, 3);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  setupPhysics();
  createWater();
  createFishingRod();
  loadFishes();
  setupVRControllers();
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
  water = new Water(waterGeometry, {
    color: 0x001e0f,
    scale: 4,
    flowDirection: new THREE.Vector2(1, 1),
    textureWidth: 1024,
    textureHeight: 1024,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.5;
  scene.add(water);
}

function createFishingRod() {
  // Rod
  const rodGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
  const rodMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
  fishingRod = new THREE.Mesh(rodGeometry, rodMaterial);
  fishingRod.rotation.x = Math.PI / 4;
  scene.add(fishingRod);

  // Fishing Line
  const lineGeometry = new THREE.BufferGeometry();
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const linePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0)];
  lineGeometry.setFromPoints(linePoints);
  fishingLine = new THREE.Line(lineGeometry, lineMaterial);
  fishingRod.add(fishingLine);

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
  physicsWorld.addRigidBody(body);
}

function loadFishes() {
  const fbxLoader = new FBXLoader();
  fbxLoader.load('fish.fbx', (fish) => {
    fish.scale.set(0.01, 0.01, 0.01);
    for (let i = 0; i < 5; i++) {
      const fishClone = fish.clone();
      const x = Math.random() * 8 - 4;
      const z = Math.random() * 8 - 4;
      fishClone.position.set(x, -0.3, z);
      scene.add(fishClone);
      fishes.push(fishClone);
    }
  });
}

function setupVRControllers() {
  const controllerModelFactory = new XRControllerModelFactory();

  // Right Controller
  controllerR = renderer.xr.getController(0);
  controllerR.addEventListener('selectstart', onSelectStart);
  controllerR.addEventListener('selectend', onSelectEnd);
  scene.add(controllerR);

  // Left Controller
  controllerL = renderer.xr.getController(1);
  scene.add(controllerL);

  // Controller Models
  const controllerGripR = renderer.xr.getControllerGrip(0);
  controllerGripR.add(
    controllerModelFactory.createControllerModel(controllerGripR),
  );
  scene.add(controllerGripR);

  const controllerGripL = renderer.xr.getControllerGrip(1);
  controllerGripL.add(
    controllerModelFactory.createControllerModel(controllerGripL),
  );
  scene.add(controllerGripL);
}

function onSelectStart(event) {
  const controller = event.target;
  const controllerPos = new THREE.Vector3().setFromMatrixPosition(
    controller.matrixWorld,
  );

  // Check for fish catches
  fishes.forEach((fish, index) => {
    const distance = controllerPos.distanceTo(fish.position);
    if (distance < 0.5) {
      scene.remove(fish);
      fishes.splice(index, 1);
      console.log('Fish caught!');
    }
  });
}

function onSelectEnd() {
  // Reset fishing line position
  fishingLine.geometry.setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -1, 0),
  ]);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  // Update physics
  physicsWorld.stepSimulation(1 / 60, 10);

  const time = performance.now() * 0.001;

  // Update water
  water.material.uniforms['time'].value = time;

  // Animate fishes
  fishes.forEach((fish) => {
    fish.rotation.y += 0.01;
    fish.position.x += Math.sin(time) * 0.01;
    fish.position.z += Math.cos(time) * 0.01;
  });

  renderer.render(scene, camera);
}
