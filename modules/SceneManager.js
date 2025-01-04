import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Sky } from 'three/addons/objects/Sky.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000000,
    );
    this.camera.position.set(0, 1.6, 3);

    // Add camera to scene for easy access by other components
    this.scene.camera = this.camera;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    this.renderer.shadowMap.enabled = true;

    // Add renderer to document immediately
    document.body.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupSky();
    this.setupEventListeners();
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  setupSky() {
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.scene.add(this.sky);

    this.sun = new THREE.Vector3();

    const effectController = {
      turbidity: 10,
      rayleigh: 3,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.7,
      elevation: 2,
      azimuth: 180,
    };

    const uniforms = this.sky.material.uniforms;
    uniforms['turbidity'].value = effectController.turbidity;
    uniforms['rayleigh'].value = effectController.rayleigh;
    uniforms['mieCoefficient'].value = effectController.mieCoefficient;
    uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
    const theta = THREE.MathUtils.degToRad(effectController.azimuth);

    this.sun.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(this.sun);
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  initVR() {
    // Only add VR button, renderer is already in document
    document.body.appendChild(VRButton.createButton(this.renderer));
  }

  startAnimation(renderCallback) {
    this.renderer.setAnimationLoop(() => {
      if (renderCallback) renderCallback();
      this.renderer.render(this.scene, this.camera);
    });
  }

  add(...objects) {
    objects.forEach((object) => this.scene.add(object));
  }

  remove(...objects) {
    objects.forEach((object) => this.scene.remove(object));
  }

  dispose() {
    // Clean up resources
    this.renderer.dispose();
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    // Position camera behind and slightly above the rod's starting position
    this.camera.position.set(0, 2, 2); // Move back and up
    this.camera.lookAt(0, 1, -1); // Look at where the rod will be
  }
}
