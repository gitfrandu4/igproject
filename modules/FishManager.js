import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class FishManager {
  constructor(scene) {
    this.scene = scene;
    this.fishes = [];
    this.fishShaderMaterial = this.createFishShader();
  }

  createFishShader() {
    return {
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
          float depth = abs(vPosition.y - waterLevel) * 0.1;
          float caustics = sin(vPosition.x * 3.0 + time) * sin(vPosition.z * 3.0 + time) * 0.7 + 0.3;
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float rimLight = 1.0 - max(0.0, dot(viewDirection, vNormal));
          rimLight = pow(rimLight, 1.5) * 0.8;
          vec3 brightColor = color * 2.0;
          vec3 finalColor = brightColor * (1.0 - depth) + caustics * 0.4 + rimLight;
          float glow = sin(time * 1.5) * 0.15 + 0.95;
          finalColor *= glow;
          gl_FragColor = vec4(finalColor, opacity);
        }
      `,
    };
  }

  loadFishes() {
    const fbxLoader = new FBXLoader();
    const loadPromises = [];

    // Load regular fish
    loadPromises.push(
      new Promise((resolve, reject) => {
        fbxLoader.load(
          'models/fish.fbx',
          (fish) => {
            this.createRegularFish(fish);
            resolve();
          },
          undefined,
          (error) => {
            console.error('Error loading fish.fbx:', error);
            reject(error);
          },
        );
      }),
    );

    // Load red fish
    loadPromises.push(
      new Promise((resolve, reject) => {
        fbxLoader.load(
          'models/fishred.fbx',
          (redFish) => {
            this.createRedFish(redFish);
            resolve();
          },
          undefined,
          (error) => {
            console.error('Error loading fishred.fbx:', error);
            reject(error);
          },
        );
      }),
    );

    return Promise.all(loadPromises);
  }

  createRegularFish(fish) {
    fish.scale.set(0.01, 0.01, 0.01);
    this.setupFishMesh(fish, new THREE.Color(0x66aaff), 8);
  }

  createRedFish(redFish) {
    redFish.scale.set(0.001, 0.001, 0.001);
    this.setupFishMesh(redFish, new THREE.Color(0xff5555), 4);
  }

  setupFishMesh(fishMesh, color, count) {
    fishMesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            waterLevel: { value: -0.3 },
            color: { value: color },
            opacity: { value: 0.95 },
          },
          vertexShader: this.fishShaderMaterial.vertexShader,
          fragmentShader: this.fishShaderMaterial.fragmentShader,
          transparent: true,
          side: THREE.DoubleSide,
        });
        child.material = material;
      }
    });

    for (let i = 0; i < count; i++) {
      const fishClone = fishMesh.clone();
      const x = Math.random() * 8 - 4;
      const z = Math.random() * 8 - 4;
      const y = -0.5 - Math.random() * 0.5; // Deeper placement
      fishClone.position.set(x, y, z);
      fishClone.rotation.y = Math.random() * Math.PI * 2;

      fishClone.userData.speed = 0.005 + Math.random() * 0.01;
      fishClone.userData.radius = 0.8 + Math.random() * 1.5;
      fishClone.userData.centerX = x;
      fishClone.userData.centerZ = z;
      fishClone.userData.baseY = y;
      fishClone.userData.angle = Math.random() * Math.PI * 2;
      fishClone.userData.verticalOffset = Math.random() * 0.05;

      this.scene.add(fishClone);
      this.fishes.push(fishClone);
    }
  }

  update(time) {
    this.fishes.forEach((fish) => {
      // Update shader uniforms
      fish.traverse((child) => {
        if (child.isMesh && child.material.uniforms) {
          child.material.uniforms.time.value = time;
          const distanceToCamera = this.scene.camera.position.distanceTo(
            fish.position,
          );
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
    });
  }

  getFishes() {
    return this.fishes;
  }
}
