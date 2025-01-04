import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { SceneManager } from './modules/SceneManager.js';
import { Environment } from './modules/Environment.js';
import { FishingRod } from './modules/FishingRod.js';
import { FishManager } from './modules/FishManager.js';

class Game {
  constructor() {
    this.sceneManager = new SceneManager();
    this.environment = null;
    this.fishingRod = null;
    this.fishManager = null;
    this.controllerR = null;
    this.controllerL = null;
    this.objects = [];

    // Game state
    this.isRodGrabbed = false;
    this.isCasting = false;
    this.debugMode = true;
    this.score = 0;
    this.consecutiveCatches = 0;
    this.lastCatchTime = 0;

    // Create debug info element
    this.debugInfo = document.createElement('div');
    this.debugInfo.style.position = 'fixed';
    this.debugInfo.style.top = '10px';
    this.debugInfo.style.left = '10px';
    this.debugInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.debugInfo.style.color = '#fff';
    this.debugInfo.style.padding = '10px';
    this.debugInfo.style.fontFamily = 'monospace';
    this.debugInfo.style.fontSize = '12px';
    this.debugInfo.style.whiteSpace = 'pre';
    this.debugInfo.style.zIndex = '100';
    this.debugInfo.style.borderRadius = '5px';
    document.body.appendChild(this.debugInfo);

    // Create score display
    this.scoreDisplay = document.createElement('div');
    this.scoreDisplay.style.position = 'fixed';
    this.scoreDisplay.style.top = '10px';
    this.scoreDisplay.style.right = '10px';
    this.scoreDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.scoreDisplay.style.color = '#fff';
    this.scoreDisplay.style.padding = '10px';
    this.scoreDisplay.style.fontFamily = 'monospace';
    this.scoreDisplay.style.fontSize = '16px';
    this.scoreDisplay.style.whiteSpace = 'pre';
    this.scoreDisplay.style.zIndex = '100';
    this.scoreDisplay.style.borderRadius = '5px';
    document.body.appendChild(this.scoreDisplay);

    // Keyboard state
    this.keyboardState = {
      isGrabbing: false,
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false,
    };

    this.init();
  }

  async init() {
    try {
      // Initialize environment
      this.environment = new Environment(this.sceneManager.scene);

      // Initialize fishing rod
      this.fishingRod = new FishingRod(this.sceneManager.scene);
      const rod = await this.fishingRod.init();
      this.objects.push(rod);

      // Initialize fish manager
      this.fishManager = new FishManager(this.sceneManager.scene);
      await this.fishManager.init();

      // Setup initial camera position for non-VR
      this.setupNonVRCamera();

      // Setup VR controllers (but don't enable VR by default)
      this.setupVRControllers();

      // Setup keyboard and mouse controls
      this.setupKeyboardControls();
      this.setupMouseControls();

      // Create VR toggle button
      this.createVRButton();

      // Start animation loop
      this.sceneManager.startAnimation(() => this.update());

      console.log('Game initialized successfully');
    } catch (error) {
      console.error('Error initializing game:', error);
    }
  }

  setupNonVRCamera() {
    // Position camera for a good view of the lake
    this.sceneManager.camera.position.set(0, 2, 8);
    this.sceneManager.camera.lookAt(0, 0, 0);
  }

  setupMouseControls() {
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    const mouseSensitivity = 0.002;

    // Mouse look controls
    document.addEventListener('mousedown', (event) => {
      if (event.button === 2) {
        // Right mouse button
        isMouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
      }
    });

    document.addEventListener('mouseup', (event) => {
      if (event.button === 2) {
        // Right mouse button
        isMouseDown = false;
      }
    });

    document.addEventListener('mousemove', (event) => {
      if (!isMouseDown) return;

      const deltaX = event.clientX - lastMouseX;
      const deltaY = event.clientY - lastMouseY;

      // Rotate camera horizontally
      this.sceneManager.camera.rotation.y -= deltaX * mouseSensitivity;

      // Rotate camera vertically, with limits
      const newRotationX =
        this.sceneManager.camera.rotation.x - deltaY * mouseSensitivity;
      this.sceneManager.camera.rotation.x = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, newRotationX),
      );

      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
    });

    // Prevent context menu on right click
    document.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    // Mouse wheel for zoom
    document.addEventListener('wheel', (event) => {
      const zoomSpeed = 0.001;
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(this.sceneManager.camera.quaternion);
      forward.multiplyScalar(event.deltaY * zoomSpeed);
      this.sceneManager.camera.position.add(forward);
    });
  }

  createVRButton() {
    // Create a custom VR button
    const vrButton = document.createElement('button');
    vrButton.style.position = 'absolute';
    vrButton.style.bottom = '20px';
    vrButton.style.right = '20px';
    vrButton.style.padding = '12px 24px';
    vrButton.style.border = 'none';
    vrButton.style.borderRadius = '4px';
    vrButton.style.backgroundColor = '#2196F3';
    vrButton.style.color = 'white';
    vrButton.style.font = 'bold 16px Arial';
    vrButton.style.cursor = 'pointer';
    vrButton.style.transition = 'background-color 0.3s';
    vrButton.textContent = 'Enter VR';

    vrButton.addEventListener('mouseover', () => {
      vrButton.style.backgroundColor = '#1976D2';
    });

    vrButton.addEventListener('mouseout', () => {
      vrButton.style.backgroundColor = '#2196F3';
    });

    // Create the actual VR button but keep it hidden
    const vrSystemButton = VRButton.createButton(this.sceneManager.renderer);
    vrSystemButton.style.display = 'none';
    document.body.appendChild(vrSystemButton);

    // When our custom button is clicked, click the hidden system button
    vrButton.addEventListener('click', () => {
      vrSystemButton.click();
    });

    document.body.appendChild(vrButton);
  }

  setupVRControllers() {
    const controllerModelFactory = new XRControllerModelFactory();

    // Right Controller
    this.controllerR = this.sceneManager.renderer.xr.getController(0);
    const controllerGripR = this.sceneManager.renderer.xr.getControllerGrip(0);

    // Add ray line to controller
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(geometry);
    line.name = 'line';
    line.scale.z = 5;
    this.controllerR.add(line);

    // Controller event listeners
    this.controllerR.addEventListener('connected', (event) => {
      const hasHand = event.data.hand;
      if (line) line.visible = !hasHand;
      // Show grab sphere when controller is connected
      if (this.fishingRod && this.fishingRod.grabSphere) {
        this.fishingRod.grabSphere.visible = true;
        // Ensure grab sphere is attached to the controller
        if (!this.fishingRod.grabSphere.parent) {
          this.controllerR.add(this.fishingRod.grabSphere);
          this.fishingRod.grabSphere.position.set(0, 0, 0);
        }
      }
    });

    this.controllerR.addEventListener('disconnected', () => {
      // Hide grab sphere when controller is disconnected
      if (this.fishingRod && this.fishingRod.grabSphere) {
        this.fishingRod.grabSphere.visible = false;
      }
    });

    this.controllerR.addEventListener('selectstart', () =>
      this.onSelectStart(),
    );
    this.controllerR.addEventListener('selectend', () => this.onSelectEnd());
    this.controllerR.addEventListener('squeezestart', () =>
      this.onSqueezeStart(),
    );
    this.controllerR.addEventListener('squeezeend', () => this.onSqueezeEnd());

    this.sceneManager.add(this.controllerR);
    this.sceneManager.add(controllerGripR);

    // Left Controller
    this.controllerL = this.sceneManager.renderer.xr.getController(1);
    const controllerGripL = this.sceneManager.renderer.xr.getControllerGrip(1);
    this.sceneManager.add(this.controllerL);
    this.sceneManager.add(controllerGripL);

    // Add controller models
    controllerGripR.add(
      controllerModelFactory.createControllerModel(controllerGripR),
    );
    controllerGripL.add(
      controllerModelFactory.createControllerModel(controllerGripL),
    );
  }

  setupKeyboardControls() {
    // Add camera movement controls for non-VR mode
    const moveSpeed = 0.1;
    const rotateSpeed = 0.02;

    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyR':
          this.resetRodStatus();
          break;
        case 'KeyQ':
          this.toggleDebugMode();
          break;
        case 'Space':
          if (this.isRodGrabbed) {
            this.onSqueezeStart();
          }
          break;
        case 'KeyE':
          if (!this.isRodGrabbed) {
            this.keyboardState.isGrabbing = true;
            this.onSelectStart();
          }
          break;
        // Camera movement
        case 'ArrowUp':
        case 'KeyW':
          this.sceneManager.camera.position.z -=
            Math.cos(this.sceneManager.camera.rotation.y) * moveSpeed;
          this.sceneManager.camera.position.x -=
            Math.sin(this.sceneManager.camera.rotation.y) * moveSpeed;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.sceneManager.camera.position.z +=
            Math.cos(this.sceneManager.camera.rotation.y) * moveSpeed;
          this.sceneManager.camera.position.x +=
            Math.sin(this.sceneManager.camera.rotation.y) * moveSpeed;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.sceneManager.camera.rotation.y += rotateSpeed;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.sceneManager.camera.rotation.y -= rotateSpeed;
          break;
        case 'KeyF':
          const caughtFish = this.fishManager?.getCaughtFish();
          if (caughtFish) {
            this.addScore(caughtFish);
            this.fishManager.catchFish(caughtFish);
          }
          break;
      }
    });

    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'Space':
          this.onSqueezeEnd();
          break;
        case 'KeyE':
          this.keyboardState.isGrabbing = false;
          this.onSelectEnd();
          break;
        case 'KeyW':
          this.keyboardState.moveForward = false;
          break;
        case 'KeyS':
          this.keyboardState.moveBackward = false;
          break;
        case 'KeyA':
          this.keyboardState.moveLeft = false;
          break;
        case 'KeyD':
          this.keyboardState.moveRight = false;
          break;
      }
    });
  }

  onSelectStart() {
    if (this.sceneManager.renderer.xr.isPresenting) {
      // VR Mode
      const controllerPos = new THREE.Vector3();
      this.controllerR?.getWorldPosition(controllerPos);
      if (this.fishingRod.grab(this.controllerR, controllerPos)) {
        this.isRodGrabbed = true;
      }
    } else {
      // Non-VR Mode
      this.isRodGrabbed = true;
      this.fishingRod.grab();
    }
  }

  onSelectEnd() {
    if (this.isRodGrabbed) {
      const landingPosition = this.fishingRod.release();

      // If we have a caught fish and a valid landing position, throw it
      const caughtFish = this.fishManager?.getCaughtFish();
      if (caughtFish && landingPosition) {
        this.fishManager.throwFish(caughtFish, landingPosition);
      }

      this.isRodGrabbed = false;
    }
  }

  onSqueezeStart() {
    if (this.isRodGrabbed && !this.isCasting) {
      this.fishingRod.startCasting();
    }
  }

  onSqueezeEnd() {
    if (this.isRodGrabbed) {
      this.fishingRod.endCasting();
    }
  }

  update() {
    const time = performance.now() * 0.001;

    // Update environment
    this.environment?.update(time);

    // Update fish
    this.fishManager?.update(time, this.fishingRod?.lineEndPoint);

    // Update fishing rod
    if (this.fishingRod) {
      // In non-VR mode, if rod is grabbed, update its position to follow camera
      if (this.isRodGrabbed && !this.sceneManager.renderer.xr.isPresenting) {
        const camera = this.sceneManager.camera;
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        const position = camera.position.clone();
        position.add(direction.multiplyScalar(2));

        // Set rod position and rotation
        this.fishingRod.rod.position.copy(position);
        this.fishingRod.rod.rotation.copy(camera.rotation);

        // Adjust rod position slightly down and forward
        this.fishingRod.rod.position.y -= 0.5;
        this.fishingRod.rod.position.z -= 0.5;
      }

      this.fishingRod.update(time, this.controllerR);

      // Check for fish near the line only when casting
      if (this.fishingRod.isCasting) {
        const nearbyFish = this.fishManager.checkForNearbyFish(
          this.fishingRod.lineEndPoint,
        );
        if (nearbyFish) {
          this.fishingRod.showFishBite();
        }
      }
    }

    // Update debug info
    if (this.debugMode && this.debugInfo) {
      const caughtFish = this.fishManager?.getCaughtFish();
      const fps = Math.round(1 / (time - (this.lastTime || time)));

      this.debugInfo.innerHTML = `
🎮 INFORMACIÓN DE DEPURACIÓN ${'-'.repeat(20)}
FPS: ${fps} ${fps < 30 ? '⚠️' : '✅'}
ESTADO DE LA CAÑA:
  Agarrada: ${this.isRodGrabbed ? '✅ SÍ' : '❌ NO'}
  Lanzando: ${this.fishingRod?.isCasting ? '🎣 SÍ' : '❌ NO'}
  Pez Picando: ${this.fishingRod?.hasFishBite ? '🐟 SÍ' : '❌ NO'}

ESTADO DE LOS PECES:
  Peces Totales: ${this.fishManager?.getFishes().length || 0} 🐠
  Pez Atrapado: ${caughtFish ? '🎯 SÍ' : '❌ NO'}
${
  caughtFish
    ? `  Posición: (${caughtFish.position
        .toArray()
        .map((v) => v.toFixed(2))
        .join(', ')}) 📍`
    : ''
}

CONTROLES:
  [E] Agarrar/Soltar Caña
  [ESPACIO] Lanzar Línea
  [WASD/Flechas] Mover Cámara
  [F] Atrapar Pez
  [R] Reiniciar Juego
  [Q] Alternar Depuración
  [Click Derecho + Ratón] Mirar Alrededor
  [Rueda del Ratón] Zoom
${'-'.repeat(30)}`;

      this.lastTime = time;
    }

    // Update keyboard-based rod movement
    if (this.isRodGrabbed && this.keyboardState.isGrabbing) {
      this.updateKeyboardMovement();
    }
  }

  updateKeyboardMovement() {
    const moveSpeed = 0.05;
    const rod = this.fishingRod.rod;

    if (this.keyboardState.moveForward) rod.position.z -= moveSpeed;
    if (this.keyboardState.moveBackward) rod.position.z += moveSpeed;
    if (this.keyboardState.moveLeft) rod.position.x -= moveSpeed;
    if (this.keyboardState.moveRight) rod.position.x += moveSpeed;
    if (this.keyboardState.moveUp) rod.position.y += moveSpeed;
    if (this.keyboardState.moveDown) rod.position.y -= moveSpeed;

    // Update rod rotation based on movement
    if (
      this.keyboardState.moveForward ||
      this.keyboardState.moveBackward ||
      this.keyboardState.moveLeft ||
      this.keyboardState.moveRight
    ) {
      const direction = new THREE.Vector3();
      if (this.keyboardState.moveForward) direction.z -= 1;
      if (this.keyboardState.moveBackward) direction.z += 1;
      if (this.keyboardState.moveLeft) direction.x -= 1;
      if (this.keyboardState.moveRight) direction.x += 1;

      if (direction.length() > 0) {
        direction.normalize();
        const targetRotation = Math.atan2(direction.x, direction.z);
        rod.rotation.y = targetRotation;
      }
    }
  }

  dispose() {
    // Clean up resources
    this.sceneManager?.dispose();
    this.environment?.dispose();
    this.fishManager?.dispose();

    // Remove event listeners
    this.controllerR?.removeEventListener('selectstart', this.onSelectStart);
    this.controllerR?.removeEventListener('selectend', this.onSelectEnd);
    this.controllerR?.removeEventListener('squeezestart', this.onSqueezeStart);
    this.controllerR?.removeEventListener('squeezeend', this.onSqueezeEnd);
  }

  resetRodStatus() {
    if (this.fishingRod) {
      this.isRodGrabbed = false;
      this.isCasting = false;
      this.fishingRod.isGrabbed = false;
      this.fishingRod.isCasting = false;
      this.fishingRod.resetFishBite();

      // Reset rod position
      this.fishingRod.rod.position.set(0, 1, -0.5);
      this.fishingRod.rod.rotation.set(Math.PI / 4, 0, 0);

      // Ensure rod is attached to scene
      if (this.fishingRod.rod.parent !== this.scene) {
        this.scene.attach(this.fishingRod.rod);
      }
    }
  }

  addScore(fish) {
    const now = performance.now();
    const timeSinceLastCatch = now - this.lastCatchTime;

    // Base points based on fish type
    let points = fish.userData.isRed ? 100 : 50;

    // Bonus for consecutive catches within 5 seconds
    if (timeSinceLastCatch < 5000) {
      this.consecutiveCatches++;
      points *= 1 + this.consecutiveCatches * 0.2; // 20% bonus per consecutive catch
    } else {
      this.consecutiveCatches = 0;
    }

    // Bonus for fish depth
    const depthBonus = Math.abs(fish.position.y + 0.3) * 50; // More points for deeper fish
    points += depthBonus;

    // Round the final score
    points = Math.round(points);

    this.score += points;
    this.lastCatchTime = now;

    // Show score popup
    this.showScorePopup(points, fish.position);

    // Update score display
    this.updateScoreDisplay();
  }

  showScorePopup(points, position) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.color = '#ffff00';
    popup.style.fontSize = '24px';
    popup.style.fontFamily = 'monospace';
    popup.style.fontWeight = 'bold';
    popup.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
    popup.style.pointerEvents = 'none';

    // Convert 3D position to screen coordinates
    const vector = position.clone();
    vector.project(this.sceneManager.camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    popup.textContent = `+${points}`;

    document.body.appendChild(popup);

    // Animate popup
    let opacity = 1;
    let yOffset = 0;
    const animate = () => {
      opacity -= 0.02;
      yOffset -= 1;
      popup.style.opacity = opacity;
      popup.style.transform = `translateY(${yOffset}px)`;

      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        document.body.removeChild(popup);
      }
    };

    animate();
  }

  updateScoreDisplay() {
    this.scoreDisplay.innerHTML = `
🎯 PUNTUACIÓN ${'-'.repeat(10)}
Total: ${this.score} puntos
Racha: x${this.consecutiveCatches + 1}
${'-'.repeat(25)}`;
  }

  toggleDebugMode() {
    this.debugMode = !this.debugMode;
    console.log(`Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);

    if (this.debugMode) {
      // Create debug info display
      if (!this.debugInfo) {
        this.debugInfo = document.createElement('div');
        this.debugInfo.style.position = 'fixed';
        this.debugInfo.style.top = '20px';
        this.debugInfo.style.left = '20px';
        this.debugInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.debugInfo.style.color = '#00ff00';
        this.debugInfo.style.padding = '15px';
        this.debugInfo.style.fontFamily = 'monospace';
        this.debugInfo.style.fontSize = '16px';
        this.debugInfo.style.zIndex = '1000';
        this.debugInfo.style.borderRadius = '5px';
        this.debugInfo.style.border = '1px solid #00ff00';
        this.debugInfo.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.3)';
        this.debugInfo.style.whiteSpace = 'pre';
        document.body.appendChild(this.debugInfo);
      }
      this.debugInfo.style.display = 'block';

      // Enable debug mode in managers
      this.fishManager?.setDebugMode(true);
      this.fishingRod?.setDebugMode(true);
    } else {
      // Hide debug info
      if (this.debugInfo) {
        this.debugInfo.style.display = 'none';
      }
      this.fishManager?.setDebugMode(false);
      this.fishingRod?.setDebugMode(false);
    }
  }
}

// Initialize Ammo.js and start the game
Ammo()
  .then(() => {
    const game = new Game();
    window.game = game; // For debugging
  })
  .catch((error) => {
    console.error('Error loading Ammo.js:', error);
  });
