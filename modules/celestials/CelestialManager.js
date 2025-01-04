import { Sky } from './Sky.js';
import { Sun } from './Sun.js';
import { Moon } from './Moon.js';
import { Stars } from './Stars.js';

export class CelestialManager {
  constructor(scene) {
    this.scene = scene;
    this.sky = new Sky(scene);
    this.sun = new Sun(scene);
    this.moon = new Moon(scene);
    this.stars = new Stars(scene);
  }

  update(time) {
    const angle = time * 0.02;

    // Update all celestial objects
    this.sky.update(time);
    this.sun.update(time, angle);
    this.moon.update(time, angle);
    this.stars.update(time);
  }

  dispose() {
    this.sky.dispose();
    this.sun.dispose();
    this.moon.dispose();
    this.stars.dispose();
  }
}
