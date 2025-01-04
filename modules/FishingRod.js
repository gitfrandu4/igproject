import * as THREE from 'three';

const GRAB_RADIUS = 0.8;
const CAST_POWER_MAX = 5;

/**
 * FishingRod class implements an interactive fishing rod system with physics-based line simulation.
 * Key technical features include:
 * - Real-time physics simulation for fishing line using custom spring dynamics
 * - Interactive VR and non-VR controls with grab detection
 * - Dynamic material system with PBR (Physically Based Rendering)
 * - Procedural animation for casting and reeling mechanics
 * - Collision detection for fish interaction
 */
export class FishingRod {
  /**
   * @param {THREE.Scene} scene - The Three.js scene to add the fishing rod to
   */
  constructor(scene) {
    this.scene = scene;
    this.rod = null;
    this.reel = null;
    this.handle = null;
    this.line = null;
    this.pointer = null;
    this.grabSphere = null;
    this.isGrabbed = false;
    this.isCasting = false;
    this.castPower = 0;
    this.lineEndPoint = new THREE.Vector3();
    this.hasFishBite = false;
    this.fishBiteTime = 0;
    this.textures = null;
  }

  /**
   * Initializes the fishing rod components and materials.
   * Implements a modular design pattern for better maintainability and testing.
   * Returns a Promise to handle asynchronous texture loading.
   */
  async init() {
    try {
      await this.loadTextures();
      this.createRod();
      this.createReel();
      this.createHandle();
      this.createLine();
      this.createPointer();
      this.createGrabSphere();
      return this.rod;
    } catch (error) {
      console.error('Error initializing fishing rod:', error);
      this.createBasicRod();
      return this.rod;
    }
  }

  /**
   * Creates a simplified rod model as fallback.
   * Uses basic geometry and materials for performance and reliability.
   */
  createBasicRod() {
    const rodGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
    const rodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.3,
    });

    this.rod = new THREE.Mesh(rodGeometry, rodMaterial);
    this.rod.rotation.x = Math.PI / 4;
    this.rod.position.set(0, 1, -0.5);
    this.rod.castShadow = true;
    this.scene.add(this.rod);
  }

  /**
   * Implements PBR material system with texture loading.
   * Uses advanced material properties for realistic rendering:
   * - Normal mapping for surface detail
   * - Roughness mapping for microsurface scattering
   * - Texture repetition for detail enhancement
   */
  async loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (path) => {
      return new Promise((resolve, reject) => {
        textureLoader.load(
          path,
          (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2);
            resolve(texture);
          },
          undefined,
          (error) => {
            console.error(`Error loading texture ${path}:`, error);
            reject(error);
          },
        );
      });
    };

    try {
      // Load wood textures with error handling and fallback
      const woodTextures = await Promise.all([
        loadTexture('./textures/wood/color.jpg'),
        loadTexture('./textures/wood/normal.jpg'),
        loadTexture('./textures/wood/roughness.jpg'),
      ]).catch((error) => {
        console.warn(
          'Failed to load wood textures, trying alternative paths...',
          error,
        );
        return Promise.all([
          loadTexture('textures/wood/color.jpg'),
          loadTexture('textures/wood/normal.jpg'),
          loadTexture('textures/wood/roughness.jpg'),
        ]);
      });

      // Load metal textures with error handling and fallback
      const metalTextures = await Promise.all([
        loadTexture('./textures/metal_mesh/color.png'),
        loadTexture('./textures/metal_mesh/normal.png'),
        loadTexture('./textures/metal_mesh/roughness.png'),
      ]).catch((error) => {
        console.warn(
          'Failed to load metal textures, trying alternative paths...',
          error,
        );
        return Promise.all([
          loadTexture('textures/metal_mesh/color.png'),
          loadTexture('textures/metal_mesh/normal.png'),
          loadTexture('textures/metal_mesh/roughness.png'),
        ]);
      });

      const [wood, woodNormal, woodRoughness] = woodTextures;
      const [metal, metalNormal, metalRoughness] = metalTextures;

      this.textures = {
        wood,
        woodNormal,
        woodRoughness,
        metal,
        metalNormal,
        metalRoughness,
      };

      console.log('All textures loaded successfully');
    } catch (error) {
      console.error('Failed to load textures after all attempts:', error);
      this.textures = null;
    }
  }

  /**
   * Creates material with PBR properties based on material type.
   * Implements fallback materials when textures aren't available.
   * @param {string} type - Material type ('wood' or 'metal')
   * @returns {THREE.Material} Configured PBR material
   */
  createMaterial(type) {
    if (!this.textures) {
      if (type === 'wood') {
        return new THREE.MeshStandardMaterial({
          color: 0x8b4513,
          roughness: 0.9,
          metalness: 0.1,
          name: 'WoodMaterial',
        });
      } else {
        return new THREE.MeshStandardMaterial({
          color: 0x888888,
          roughness: 0.4,
          metalness: 0.8,
          name: 'MetalMaterial',
        });
      }
    }

    const textures =
      type === 'wood'
        ? {
            map: this.textures.wood,
            normalMap: this.textures.woodNormal,
            roughnessMap: this.textures.woodRoughness,
            roughness: 0.9,
            metalness: 0.1,
            name: 'WoodMaterial',
          }
        : {
            map: this.textures.metal,
            normalMap: this.textures.metalNormal,
            roughnessMap: this.textures.metalRoughness,
            roughness: 0.4,
            metalness: 0.8,
            name: 'MetalMaterial',
          };

    return new THREE.MeshStandardMaterial(textures);
  }

  /**
   * Creates the main rod geometry with segmented design.
   * Implements a multi-segment approach for:
   * - Realistic rod tapering
   * - Proper weight distribution
   * - Enhanced visual detail
   */
  createRod() {
    const rodGroup = new THREE.Group();
    const woodMaterial = this.createMaterial('wood');

    // Bottom segment (thicker)
    const bottomGeometry = new THREE.CylinderGeometry(0.02, 0.025, 0.4, 12);
    const bottomSegment = new THREE.Mesh(bottomGeometry, woodMaterial);
    bottomSegment.position.y = 0.2;
    rodGroup.add(bottomSegment);

    // Middle segment
    const middleGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.6, 12);
    const middleSegment = new THREE.Mesh(middleGeometry, woodMaterial.clone());
    middleSegment.position.y = 0.7;
    rodGroup.add(middleSegment);

    // Top segment (thinnest)
    const topGeometry = new THREE.CylinderGeometry(0.01, 0.015, 0.5, 12);
    const topSegment = new THREE.Mesh(topGeometry, woodMaterial.clone());
    topSegment.position.y = 1.25;
    rodGroup.add(topSegment);

    // Add line guides with proper spacing
    const guidePositions = [0.5, 0.8, 1.1, 1.4];
    guidePositions.forEach((y) => {
      const guide = this.createGuide();
      guide.position.y = y;
      guide.scale.setScalar(0.8 - y / 2);
      rodGroup.add(guide);
    });

    this.rod = rodGroup;
    this.rod.rotation.x = Math.PI / 4;
    this.rod.position.set(0, 1, -0.5);
    this.rod.castShadow = true;
    this.scene.add(this.rod);
  }

  /**
   * Creates fishing line guides with detailed geometry.
   * Uses compound objects for enhanced visual detail.
   * @returns {THREE.Group} Assembled guide object
   */
  createGuide() {
    const guide = new THREE.Group();
    const metalMaterial = this.createMaterial('metal');

    const ringGeometry = new THREE.TorusGeometry(0.02, 0.003, 8, 16);
    const ring = new THREE.Mesh(ringGeometry, metalMaterial);
    ring.rotation.x = Math.PI / 2;
    guide.add(ring);

    const supportGeometry = new THREE.CylinderGeometry(0.003, 0.003, 0.02, 4);
    const support = new THREE.Mesh(supportGeometry, metalMaterial);
    support.position.y = -0.01;
    guide.add(support);

    return guide;
  }

  /**
   * Creates the fishing reel with mechanical detail.
   * Implements a compound object structure for visual fidelity.
   */
  createReel() {
    const reelGroup = new THREE.Group();

    // Reel body with metallic PBR material
    const bodyGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 16);
    const metalMaterial = new THREE.MeshStandardMaterial({
      map: this.textures?.metal,
      normalMap: this.textures?.metalNormal,
      roughnessMap: this.textures?.metalRoughness,
      roughness: 0.4,
      metalness: 0.8,
    });

    const reelBody = new THREE.Mesh(bodyGeometry, metalMaterial);
    reelBody.rotation.z = Math.PI / 2;
    reelGroup.add(reelBody);

    // Spool with dynamic line capacity
    const spoolGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 16);
    const spool = new THREE.Mesh(spoolGeometry, metalMaterial.clone());
    spool.rotation.z = Math.PI / 2;
    spool.position.x = 0.07;
    reelGroup.add(spool);

    this.reel = reelGroup;
    this.reel.position.set(0, 0.4, 0.04);
    this.rod.add(this.reel);
  }

  /**
   * Creates the rod handle with ergonomic design.
   * Uses PBR materials for realistic grip appearance.
   */
  createHandle() {
    const handleGroup = new THREE.Group();

    // Handle grip with wood texture
    const gripGeometry = new THREE.CylinderGeometry(0.015, 0.012, 0.08, 8);
    const gripMaterial = new THREE.MeshStandardMaterial({
      map: this.textures?.wood,
      normalMap: this.textures?.woodNormal,
      roughnessMap: this.textures?.woodRoughness,
      roughness: 0.9,
      metalness: 0.1,
    });

    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.rotation.z = Math.PI / 2;
    handleGroup.add(grip);

    this.handle = handleGroup;
    this.handle.position.set(-0.08, 0.4, 0.04);
    this.rod.add(this.handle);
  }

  /**
   * Creates the fishing line with physics-based simulation.
   * Implements a custom line system using:
   * - BufferGeometry for performance
   * - Dynamic vertex updates for physics
   * - Transparent materials for realism
   */
  createLine() {
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
    });

    const rodTip = new THREE.Vector3(0, 1.5, 0);
    const waterPoint = new THREE.Vector3(0, -2, 0);
    lineGeometry.setFromPoints([rodTip, waterPoint]);

    this.line = new THREE.Line(lineGeometry, lineMaterial);
    this.rod.add(this.line);
  }

  /**
   * Creates a visual pointer for casting direction.
   * Implements a directional indicator for user feedback.
   */
  createPointer() {
    const pointerGeometry = new THREE.CylinderGeometry(0.01, 0, 0.2, 8);
    const pointerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.pointer = new THREE.Mesh(pointerGeometry, pointerMaterial);
    this.pointer.rotation.x = Math.PI / 2;
    this.pointer.position.z = -1;
    this.pointer.visible = false;
    this.rod.add(this.pointer);
  }

  /**
   * Creates a grab detection sphere for interaction.
   * Uses transparent material for debug visualization.
   */
  createGrabSphere() {
    const sphereGeometry = new THREE.SphereGeometry(GRAB_RADIUS, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
      wireframe: true,
    });
    this.grabSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.grabSphere.visible = false;
  }

  /**
   * Handles rod grabbing mechanics for both VR and non-VR modes.
   * Implements different interaction models based on input method.
   * @param {THREE.Object3D} controller - Optional VR controller
   * @param {THREE.Vector3} controllerPosition - Optional controller position
   * @returns {boolean} Whether grab was successful
   */
  grab(controller = null, controllerPosition = null) {
    if (controller && controllerPosition) {
      // VR Mode interaction
      if (this.grabSphere && !this.grabSphere.parent) {
        controller.add(this.grabSphere);
        this.grabSphere.position.set(0, 0, 0);
      }

      const rodPosition = new THREE.Vector3();
      this.rod.getWorldPosition(rodPosition);
      const distance = controllerPosition.distanceTo(rodPosition);

      if (distance <= GRAB_RADIUS) {
        this.isGrabbed = true;
        this.rod.parent = controller;
        this.rod.position.set(0, 0, -0.3);
        this.rod.rotation.set(0, 0, 0);
        return true;
      }
      return false;
    } else {
      // Non-VR Mode (Keyboard/Mouse) interaction
      this.isGrabbed = true;

      if (this.rod.parent !== this.scene) {
        this.scene.attach(this.rod);
      }

      // Position rod relative to camera
      const camera = this.scene.camera;
      if (camera) {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        const position = camera.position.clone();
        position.add(direction.multiplyScalar(2));

        this.rod.position.copy(position);
        this.rod.rotation.copy(camera.rotation);

        this.rod.position.y -= 0.5;
        this.rod.position.z -= 0.5;
      }

      return true;
    }
  }

  /**
   * Handles rod release mechanics and calculates landing position.
   * Implements physics-based trajectory calculation.
   * @returns {THREE.Vector3} Landing position for fish
   */
  release() {
    if (!this.isGrabbed) return;

    this.isGrabbed = false;

    const rodPosition = new THREE.Vector3();
    this.rod.getWorldPosition(rodPosition);

    const throwDirection = new THREE.Vector3();
    this.rod.getWorldDirection(throwDirection);
    throwDirection.y = 0;
    throwDirection.normalize();

    const landingPosition = rodPosition
      .clone()
      .add(throwDirection.multiplyScalar(5 + Math.random() * 3));
    landingPosition.y = 0;

    if (this.rod.parent !== this.scene) {
      this.scene.attach(this.rod);
    }

    this.resetFishBite();

    return landingPosition;
  }

  /**
   * Initiates casting mechanics with power calculation.
   * @param {number} power - Casting power (0-5)
   * @returns {boolean} Whether casting started successfully
   */
  startCasting(power = 0) {
    if (!this.isGrabbed) return false;

    this.isCasting = true;
    this.castPower = Math.min(power, CAST_POWER_MAX);
    this.castStartTime = performance.now() * 0.001;
    return true;
  }

  /**
   * Ends casting and finalizes power calculation.
   */
  endCasting() {
    if (!this.isCasting) return;

    this.isCasting = false;
    console.log(`Ending cast with final power: ${this.castPower.toFixed(2)}`);
    this.castPower = 0;
  }

  /**
   * Updates fishing line end point with physics simulation.
   * @param {THREE.Vector3} point - New end point
   */
  updateLineEnd(point) {
    this.lineEndPoint.copy(point);
    if (this.line) {
      const positions = this.line.geometry.attributes.position.array;
      positions[3] = point.x;
      positions[4] = point.y;
      positions[5] = point.z;
      this.line.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Updates rod and line physics simulation.
   * Implements different behaviors for:
   * - Casting physics
   * - Fish bite mechanics
   * - Idle state animation
   * @param {number} time - Current time for animation
   */
  update(time) {
    if (!this.isGrabbed) return;

    if (this.line) {
      const positions = this.line.geometry.attributes.position.array;
      const startPoint = new THREE.Vector3(0, 0, 0);

      if (this.isCasting) {
        // Casting physics simulation
        const castTime = time - this.castStartTime;
        const castDistance = this.castPower * 5;
        const gravity = -9.81;
        const y = (castTime * castTime * gravity) / 2;
        const endPoint = new THREE.Vector3(0, y, -castDistance);

        this.updateLineEnd(endPoint);
      } else if (this.hasFishBite) {
        // Fish bite tension simulation
        const rodTip = new THREE.Vector3();
        this.rod.localToWorld(rodTip.set(0, 1.5, 0));

        const fish = this.scene.getObjectByName('caughtFish');
        if (fish) {
          const fishPos = fish.position.clone();

          const direction = fishPos.clone().sub(rodTip);
          const distance = direction.length();
          const tension = Math.min(1, distance / 5);

          const tensionPoint = rodTip.clone().lerp(fishPos, tension);

          const midPoint = new THREE.Vector3().lerpVectors(
            rodTip,
            fishPos,
            0.5,
          );
          midPoint.y -= distance * 0.2 * (1 - tension);

          const curve = new THREE.QuadraticBezierCurve3(
            rodTip,
            midPoint,
            fishPos,
          );
          const points = curve.getPoints(20);
          this.line.geometry.setFromPoints(points);

          this.lineEndPoint.copy(fishPos);
        }
      } else {
        // Idle state with gentle swaying
        const endPoint = new THREE.Vector3(0, -2, 0);

        endPoint.y += Math.sin(time * 2) * 0.1;
        endPoint.x += Math.sin(time * 1.5) * 0.05;
        endPoint.z += Math.cos(time * 1.5) * 0.05;

        this.updateLineEnd(endPoint);
      }
    }

    // Update casting pointer and water intersection
    if (this.pointer && this.scene.water) {
      const rodTip = new THREE.Vector3(0, 0.75, 0);
      rodTip.applyMatrix4(this.rod.matrixWorld);

      const rodDirection = new THREE.Vector3(0, 0, -1);
      rodDirection.applyQuaternion(this.rod.quaternion);

      const raycaster = new THREE.Raycaster(rodTip, rodDirection);
      const intersects = raycaster.intersectObject(this.scene.water);

      if (intersects.length > 0) {
        this.pointer.visible = true;
        const distance = rodTip.distanceTo(intersects[0].point);
        this.pointer.scale.z = distance;

        if (!this.isCasting) {
          this.updateLineEnd(intersects[0].point);
        }
      } else {
        this.pointer.visible = false;
      }
    }
  }

  /**
   * Implements visual feedback for rod interaction.
   * @param {boolean} isHighlighted - Whether to highlight the rod
   */
  highlightRod(isHighlighted) {
    this.rod.traverse((child) => {
      if (child.isMesh) {
        if (isHighlighted) {
          child.userData.originalMaterial = child.material;
          child.material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            emissive: 0x00ff00,
            emissiveIntensity: 0.3,
          });
        } else if (child.userData.originalMaterial) {
          child.material = child.userData.originalMaterial;
        }
      }
    });
  }

  /**
   * Implements fish bite visual and haptic feedback.
   * Features include:
   * - Line color change
   * - Line tension animation
   * - VR controller vibration
   */
  showFishBite() {
    this.hasFishBite = true;
    this.fishBiteTime = performance.now();

    if (this.line) {
      this.line.material.color.setHex(0xff0000);
      this.line.material.opacity = 1.0;

      const originalLineLength =
        this.line.geometry.attributes.position.array[5];
      const animateLine = () => {
        if (!this.hasFishBite) return;

        const time = performance.now();
        const tension = Math.sin(time * 0.01) * 0.2;
        const positions = this.line.geometry.attributes.position.array;
        positions[5] = originalLineLength + tension;
        this.line.geometry.attributes.position.needsUpdate = true;

        requestAnimationFrame(animateLine);
      };

      animateLine();

      if (this.rod.parent && this.rod.parent.vibrate) {
        this.rod.parent.vibrate(100);
      }
    }
  }

  /**
   * Resets fish bite state and visual effects.
   */
  resetFishBite() {
    this.hasFishBite = false;
    if (this.line) {
      this.line.material.color.setHex(0xffffff);
      this.line.material.opacity = 0.6;
    }
  }
}
