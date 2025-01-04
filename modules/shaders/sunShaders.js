export const sunGlowShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: null },
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
      float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
      intensity *= 1.0 + sin(time * 3.0) * 0.2;
      gl_FragColor = vec4(color, intensity * 0.5);
    }
  `,
};
