import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const FISH_CONFIG = {
  REGULAR: {
    modelPath: './models/fish.fbx',
    scale: 0.01,
    count: 8,
    color: 0x66aaff,
    minDepth: -1.2,
    maxDepth: -0.5,
    speed: { min: 0.005, max: 0.015 },
  },
  RED: {
    modelPath: './models/fishred.fbx',
    scale: 0.001,
    count: 4,
    color: 0xff5555,
    minDepth: -1.0,
    maxDepth: -0.4,
    speed: { min: 0.007, max: 0.017 },
  },
};

export class FishManager {
  constructor(scene) {
    this.scene = scene;
    this.fishes = [];
    this.loader = new FBXLoader();
    this.debugMode = false;
  }

  async init() {
    try {
      await Promise.all([
        this.loadFishType(FISH_CONFIG.REGULAR),
        this.loadFishType(FISH_CONFIG.RED),
      ]);
      console.log('Fish models loaded successfully');
    } catch (error) {
      console.error('Error loading fish models:', error);
    }
  }

  loadFishType(config) {
    return new Promise((resolve, reject) => {
      console.log(`Loading fish model: ${config.modelPath}`);

      this.loader.load(
        config.modelPath,
        (fish) => {
          fish.scale.setScalar(config.scale);
          this.setupFishInstances(fish, config);
          resolve();
        },
        (xhr) => {
          console.log(
            `${config.modelPath}: ${(xhr.loaded / xhr.total) * 100}% loaded`,
          );
        },
        (error) => {
          console.error(`Error loading ${config.modelPath}:`, error);
          reject(error);
        },
      );
    });
  }

  setupFishInstances(fishModel, config) {
    for (let i = 0; i < config.count; i++) {
      const fish = fishModel.clone();

      // Position fish at varying depths
      const x = Math.random() * 8 - 4;
      const z = Math.random() * 8 - 4;
      const y =
        Math.random() * (config.maxDepth - config.minDepth) + config.minDepth;

      fish.position.set(x, y, z);
      fish.rotation.y = Math.random() * Math.PI * 2;

      // Apply enhanced shader material
      fish.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = this.createFishMaterial(config.color);
        }
      });

      // Set movement parameters
      fish.userData = {
        speed:
          Math.random() * (config.speed.max - config.speed.min) +
          config.speed.min,
        radius: 0.8 + Math.random() * 1.5,
        centerX: x,
        centerZ: z,
        baseY: y,
        angle: Math.random() * Math.PI * 2,
        verticalOffset: Math.random() * 0.05,
        isRed: config.color === FISH_CONFIG.RED.color,
        isGlowing: false,
        originalY: y,
      };

      this.scene.add(fish);
      this.fishes.push(fish);
    }
  }

  createFishMaterial(color) {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waterLevel: { value: -0.3 },
        color: { value: new THREE.Color(color) },
        opacity: { value: 0.95 },
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
          // Enhanced visibility in water
          float depth = abs(vPosition.y - waterLevel) * 0.08;  // Reduced darkening
          float caustics = sin(vPosition.x * 3.0 + time) * sin(vPosition.z * 3.0 + time) * 0.8 + 0.2;
          
          // Enhanced rim lighting
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float rimLight = pow(1.0 - max(0.0, dot(viewDirection, vNormal)), 2.0);
          rimLight *= 1.2;  // Increased rim light intensity
          
          vec3 brightColor = color * 2.5;  // Increased base brightness
          vec3 finalColor = brightColor * (1.0 - depth * 0.5) + caustics * 0.5 + rimLight;
          
          // Pulsing glow effect
          float glow = sin(time * 2.0) * 0.2 + 1.0;
          finalColor *= glow;
          
          gl_FragColor = vec4(finalColor, opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  update(time, linePosition) {
    this.fishes.forEach((fish) => {
      if (!fish.userData) return;

      // Update shader uniforms
      fish.traverse((child) => {
        if (child.isMesh && child.material.uniforms) {
          child.material.uniforms.time.value = time;
        }
      });

      // Only update swimming fish
      if (!fish.userData.isCaught && !fish.userData.isOnGround) {
        // Update fish position with smooth movement
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

        // Ensure fish stays at proper depth
        const constrainedY = Math.max(
          fish.userData.isRed
            ? FISH_CONFIG.RED.minDepth
            : FISH_CONFIG.REGULAR.minDepth,
          Math.min(
            newY,
            fish.userData.isRed
              ? FISH_CONFIG.RED.maxDepth
              : FISH_CONFIG.REGULAR.maxDepth,
          ),
        );

        fish.position.set(newX, constrainedY, newZ);

        // Smooth rotation towards movement direction
        const targetRotation = Math.atan2(
          newX - fish.position.x,
          newZ - fish.position.z,
        );
        fish.rotation.y = targetRotation + Math.PI / 2;
      } else if (fish.userData.isBeingReeled && linePosition) {
        // Update position for fish being reeled in
        this.updateFishPosition(fish, linePosition);
      }
    });
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  getFishes() {
    return this.fishes;
  }

  checkForNearbyFish(linePosition) {
    if (!linePosition) return null;

    // If we already have a caught fish, don't catch another
    if (this.fishes.some((fish) => fish.userData.isCaught)) {
      return null;
    }

    // Get the nearest fish
    let nearestFish = null;
    let nearestDistance = Infinity;

    this.fishes.forEach((fish) => {
      if (!fish.userData.isCaught && !fish.userData.isOnGround) {
        const distance = fish.position.distanceTo(linePosition);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestFish = fish;
        }
      }
    });

    // If we found a fish, mark it as caught
    if (nearestFish) {
      nearestFish.userData.isCaught = true;
      nearestFish.userData.isBeingReeled = true;
      this.updateFishPosition(nearestFish, linePosition);
    }

    return nearestFish;
  }

  getCaughtFish() {
    return this.fishes.find((fish) => fish.userData.isCaught);
  }

  updateFishPosition(fish, targetPosition) {
    if (!fish.userData.isBeingReeled) return;

    // Smoothly move fish towards the line
    const lerpFactor = 0.1;
    fish.position.lerp(targetPosition, lerpFactor);
  }

  throwFish(fish, landingPosition) {
    if (!fish || !fish.userData.isCaught) return;

    fish.userData.isBeingReeled = false;
    fish.userData.isOnGround = true;

    // Calculate arc trajectory
    const startPos = fish.position.clone();
    const height = 5; // Maximum height of the arc
    const duration = 1000; // Duration of throw animation in milliseconds

    const startTime = performance.now();

    const animateThrow = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        // Parabolic arc
        const x = startPos.x + (landingPosition.x - startPos.x) * progress;
        const z = startPos.z + (landingPosition.z - startPos.z) * progress;
        const y =
          startPos.y +
          height * Math.sin(progress * Math.PI) +
          (landingPosition.y - startPos.y) * progress;

        fish.position.set(x, y, z);
        requestAnimationFrame(animateThrow);
      } else {
        // Fish has landed
        fish.position.copy(landingPosition);
        this.onFishLanded(fish);
      }
    };

    animateThrow();
  }

  onFishLanded(fish) {
    // Stop fish movement
    fish.userData.isOnGround = true;

    // Rotate fish to lay on its side
    fish.rotation.z = Math.PI / 2;

    // Optional: Add flopping animation
    let flopCount = 0;
    const maxFlops = 3;
    const flopInterval = setInterval(() => {
      if (flopCount >= maxFlops) {
        clearInterval(flopInterval);
        return;
      }

      // Simple flopping animation
      fish.rotation.y += Math.PI / 4;
      flopCount++;
    }, 200);
  }

  removeFish(fish) {
    const index = this.fishes.indexOf(fish);
    if (index > -1) {
      this.fishes.splice(index, 1);
      this.scene.remove(fish);
    }
  }
}
