import * as THREE from 'three';

export const skyShader = {
  uniforms: {
    topColor: { value: new THREE.Color(0x0077ff) },
    bottomColor: { value: new THREE.Color(0x89b2eb) },
    offset: { value: 20 },
    exponent: { value: 0.6 },
    time: { value: 0 },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    uniform float time;
    varying vec3 vWorldPosition;
    
    void main() {
      float h = normalize(vWorldPosition + offset).y;
      float dayFactor = (sin(time * 0.02) + 1.0) * 0.5;
      vec3 sky = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
      
      // Darken the sky during night
      sky = mix(sky * 0.1, sky, dayFactor);
      
      gl_FragColor = vec4(sky, 1.0);
    }
  `,
};

export const sunShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color(0xffdd66) },
  },
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      intensity *= 1.0 + sin(time * 2.0) * 0.2;
      gl_FragColor = vec4(color, 1.0) * vec4(vec3(1.0), intensity);
    }
  `,
};

export const moonShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color(0xaaaacc) },
  },
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      intensity *= 0.8 + sin(time) * 0.1;
      gl_FragColor = vec4(color, 1.0) * vec4(vec3(1.0), intensity);
    }
  `,
};
