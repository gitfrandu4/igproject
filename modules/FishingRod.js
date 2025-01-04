import * as THREE from 'three';

const GRAB_RADIUS = 0.8;
const CAST_POWER_MAX = 5;

export class FishingRod {
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

  createBasicRod() {
    // Simple rod without textures
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

  async loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (path) => {
      return new Promise((resolve, reject) => {
        textureLoader.load(
          path,
          (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2); // Add some repetition for better detail
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
      // First try loading wood textures
      const woodTextures = await Promise.all([
        loadTexture('./textures/wood/color.jpg'),
        loadTexture('./textures/wood/normal.jpg'),
        loadTexture('./textures/wood/roughness.jpg'),
      ]).catch((error) => {
        console.warn(
          'Failed to load wood textures, trying alternative paths...',
          error,
        );
        // Try alternative paths
        return Promise.all([
          loadTexture('textures/wood/color.jpg'),
          loadTexture('textures/wood/normal.jpg'),
          loadTexture('textures/wood/roughness.jpg'),
        ]);
      });

      // Then load metal textures
      const metalTextures = await Promise.all([
        loadTexture('./textures/metal_mesh/color.png'),
        loadTexture('./textures/metal_mesh/normal.png'),
        loadTexture('./textures/metal_mesh/roughness.png'),
      ]).catch((error) => {
        console.warn(
          'Failed to load metal textures, trying alternative paths...',
          error,
        );
        // Try alternative paths
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
      // Instead of throwing, we'll return null and use fallback materials
      this.textures = null;
    }
  }

  createMaterial(type) {
    if (!this.textures) {
      // Enhanced fallback materials
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

    // Add guides (line rings)
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

  createReel() {
    const reelGroup = new THREE.Group();

    // Reel body
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

    // Spool
    const spoolGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 16);
    const spool = new THREE.Mesh(spoolGeometry, metalMaterial.clone());
    spool.rotation.z = Math.PI / 2;
    spool.position.x = 0.07;
    reelGroup.add(spool);

    this.reel = reelGroup;
    this.reel.position.set(0, 0.4, 0.04);
    this.rod.add(this.reel);
  }

  createHandle() {
    const handleGroup = new THREE.Group();

    // Handle grip
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

  createPointer() {
    const pointerGeometry = new THREE.CylinderGeometry(0.01, 0, 0.2, 8);
    const pointerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.pointer = new THREE.Mesh(pointerGeometry, pointerMaterial);
    this.pointer.rotation.x = Math.PI / 2;
    this.pointer.position.z = -1;
    this.pointer.visible = false;
    this.rod.add(this.pointer);
  }

  createGrabSphere() {
    // Create a transparent sphere to show grab range
    const sphereGeometry = new THREE.SphereGeometry(GRAB_RADIUS, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
      wireframe: true,
    });
    this.grabSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.grabSphere.visible = false;
    // The sphere will be added to the controller in the grab method
  }

  setDebugMode(enabled) {
    if (this.grabSphere) {
      this.grabSphere.visible = enabled;
    }
  }

  grab(controller = null, controllerPosition = null) {
    if (controller && controllerPosition) {
      // Add grab sphere to controller if not already added
      if (this.grabSphere && !this.grabSphere.parent) {
        controller.add(this.grabSphere);
        this.grabSphere.position.set(0, 0, 0); // Center on controller
      }

      const rodPosition = new THREE.Vector3();
      this.rod.getWorldPosition(rodPosition);
      const distance = controllerPosition.distanceTo(rodPosition);

      if (distance <= GRAB_RADIUS) {
        this.isGrabbed = true;
        this.rod.parent = controller;
        this.rod.position.set(0, 0, -0.3);
        this.rod.rotation.set(0, 0, 0);
        console.log(
          `Rod grabbed by controller. Distance: ${distance.toFixed(2)}`,
        );
        return true;
      }
      console.log(`Rod grab attempt failed. Distance: ${distance.toFixed(2)}`);
      return false;
    } else {
      this.isGrabbed = true;
      this.rod.position.set(0, 1.5, -1);
      this.rod.rotation.set(0, 0, 0);
      console.log('Rod grabbed by keyboard');
      return true;
    }
  }

  release() {
    if (!this.isGrabbed) return;

    this.isGrabbed = false;

    // Get the current world position before detaching
    const rodPosition = new THREE.Vector3();
    this.rod.getWorldPosition(rodPosition);

    // Calculate a landing position for the fish (away from the water)
    const throwDirection = new THREE.Vector3();
    this.rod.getWorldDirection(throwDirection);
    throwDirection.y = 0; // Keep it horizontal
    throwDirection.normalize();

    // Calculate landing position (further out from rod position)
    const landingPosition = rodPosition
      .clone()
      .add(throwDirection.multiplyScalar(5 + Math.random() * 3));
    landingPosition.y = 0; // On the ground level

    if (this.rod.parent !== this.scene) {
      this.scene.attach(this.rod);
    }

    // Reset fishing line
    this.resetFishBite();

    // Return the landing position for the fish
    return landingPosition;
  }

  startCasting(power = 0) {
    if (!this.isGrabbed) {
      console.log('Cannot cast: rod not grabbed');
      return false;
    }

    this.isCasting = true;
    this.castPower = Math.min(power, CAST_POWER_MAX);
    console.log(`Starting cast with power: ${this.castPower.toFixed(2)}`);
    return true;
  }

  endCasting() {
    if (!this.isCasting) return;

    this.isCasting = false;
    console.log(`Ending cast with final power: ${this.castPower.toFixed(2)}`);
    this.castPower = 0;
  }

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

  update(time) {
    if (!this.isGrabbed) return;

    // Update line physics
    if (this.line && !this.isCasting) {
      const positions = this.line.geometry.attributes.position.array;
      const startPoint = new THREE.Vector3(0, 0, 0);
      const endPoint = new THREE.Vector3(0, -2, 0);

      // Add gentle swaying motion
      endPoint.y += Math.sin(time * 2) * 0.1;
      endPoint.x += Math.sin(time * 1.5) * 0.05;
      endPoint.z += Math.cos(time * 1.5) * 0.05;

      // Add stronger movement if there's a fish bite
      if (this.hasFishBite) {
        const biteIntensity = Math.sin(time * 10) * 0.2;
        endPoint.y += biteIntensity;
        endPoint.x += biteIntensity * 0.5;
      }

      this.line.geometry.setFromPoints([startPoint, endPoint]);
    }

    // Update pointer visibility and scale
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

  showFishBite() {
    this.hasFishBite = true;
    this.fishBiteTime = performance.now();

    // Change line color to indicate fish bite
    if (this.line) {
      this.line.material.color.setHex(0xff0000); // Red color
      this.line.material.opacity = 1.0;

      // Add line tension animation
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

      // Reset line after 2 seconds if fish not caught
      setTimeout(() => {
        if (this.hasFishBite) {
          this.resetFishBite();
        }
      }, 2000);
    }

    // Add vibration if using a controller
    if (this.rod.parent && this.rod.parent.vibrate) {
      this.rod.parent.vibrate(100);
    }
  }

  resetFishBite() {
    this.hasFishBite = false;
    if (this.line) {
      this.line.material.color.setHex(0xffffff); // Reset to white
      this.line.material.opacity = 0.6;
    }
  }
}
