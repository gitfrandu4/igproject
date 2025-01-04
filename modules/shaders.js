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
    
    void main() {
      vUv = uv * 50.0; // Tile the texture 50 times
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D grassTexture;
    uniform sampler2D grassNormal;
    uniform float time;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      // Add some variation to UV coordinates based on position
      vec2 uv = vUv + 0.01 * vec2(
        sin(vPosition.x * 10.0 + time),
        cos(vPosition.z * 10.0 + time)
      );
      
      // Sample texture with modified UVs
      vec4 grassColor = texture2D(grassTexture, uv);
      
      // Add subtle color variation
      float variation = sin(vPosition.x * 2.0) * cos(vPosition.z * 2.0) * 0.1;
      grassColor.rgb *= (1.0 + variation);
      
      gl_FragColor = grassColor;
    }
  `,
  uniforms: {
    grassTexture: { value: null },
    grassNormal: { value: null },
    time: { value: 0 },
  },
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
