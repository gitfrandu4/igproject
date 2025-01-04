export const fishShaders = {
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
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      // Efectos submarinos caustics
      float caustics = sin(vPosition.x * 3.0 + time) * 
                      sin(vPosition.z * 3.0 + time) * 0.8 + 0.2;
      
      // Rim lighting submarino
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float rimLight = pow(1.0 - max(0.0, dot(viewDirection, vNormal)), 2.0);
      
      vec3 finalColor = color * (1.0 + caustics + rimLight);
      gl_FragColor = vec4(finalColor, 0.95);
    }
  `,
};
