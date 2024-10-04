export const trackShader = {
    vertexShader: 
`
varying vec2 vUv;

void main() {
    vUv = uv;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
    fragmentShader: 
`
varying vec2 vUv;

uniform sampler2D map;

void main() {
    vec3 col = texture2D(map, vUv).rgb;
    
    gl_FragColor = vec4(col, 1.);
}
`
};
