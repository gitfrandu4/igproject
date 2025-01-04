export const grassShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      
      // Add wind movement to grass
      vec3 pos = position;
      if (pos.y > 0.0) {
        pos.x += sin(time * 2.0 + position.x * 4.0) * 0.03 * pos.y;
        pos.z += cos(time * 2.0 + position.z * 4.0) * 0.03 * pos.y;
      }
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    uniform float time;
    
    void main() {
      vec3 grassColor = mix(
        vec3(0.2, 0.5, 0.1),
        vec3(0.3, 0.6, 0.2),
        smoothstep(0.0, 1.0, vPosition.y)
      );
      
      // Add subtle variation
      float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
      grassColor = mix(grassColor, grassColor * 1.2, noise * 0.2);
      
      gl_FragColor = vec4(grassColor, 1.0);
    }
  `,
};

export const terrainShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying float vElevation;
    
    uniform float time;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      float elevation = 0.0;
      float frequency = 1.0;
      float amplitude = 0.5;
      
      for(int i = 0; i < 4; i++) {
        elevation += noise(vUv * frequency) * amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      
      vElevation = elevation;
      vec3 pos = position;
      pos.y += elevation * 0.5;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying float vElevation;
    
    void main() {
      vec3 baseColor = mix(
        vec3(0.7, 0.6, 0.5),  // Sand/dirt color
        vec3(0.4, 0.7, 0.3),  // Grass color
        smoothstep(0.0, 0.5, vElevation)
      );
      
      // Add rock color for steep areas
      baseColor = mix(
        baseColor,
        vec3(0.6, 0.6, 0.6),
        smoothstep(0.6, 0.8, vElevation)
      );
      
      gl_FragColor = vec4(baseColor, 1.0);
    }
  `,
};

export const fishShaderMaterial = {
  uniforms: {
    time: { value: 0 },
    waterLevel: { value: -0.3 },
    color: { value: null },
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
      // Reduce water darkening effect
      float depth = abs(vPosition.y - waterLevel) * 0.1;  // Reduced from 0.15
      
      // Stronger caustics
      float caustics = sin(vPosition.x * 3.0 + time) * sin(vPosition.z * 3.0 + time) * 0.7 + 0.3;
      
      // Enhanced rim lighting
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float rimLight = 1.0 - max(0.0, dot(viewDirection, vNormal));
      rimLight = pow(rimLight, 1.5) * 0.8;  // Increased rim light intensity
      
      // Brighter base color
      vec3 brightColor = color * 2.0;  // Increased from 1.5
      vec3 finalColor = brightColor * (1.0 - depth) + caustics * 0.4 + rimLight;
      
      // Stronger glow effect
      float glow = sin(time * 1.5) * 0.15 + 0.95;  // Increased glow intensity
      finalColor *= glow;
      
      gl_FragColor = vec4(finalColor, opacity);
    }
  `,
};
