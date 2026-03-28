(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,77015,e=>{"use strict";var i=e.i(43476),o=e.i(71645),t=e.i(75056),r=e.i(71753),n=e.i(15080),a=e.i(90072),s=e.i(51513);let c=`
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,v=`
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 vUv;

// 2D Random
float random (in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// 2D Noise based on random
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Light position mapped from mouse (-1 to 1)
    vec3 lightDir = normalize(vec3(u_mouse.x * -2.0, u_mouse.y * -2.0, 1.0));

    // Brushed texture generation
    // Anisotropic stretch: scale x heavily, y less
    vec2 grainUv = vUv * vec2(1.0, 300.0);
    float grain = random(grainUv);
    grain = (grain - 0.5) * 2.0;

    // A bit of lower freq noise for variations
    float variation = noise(vUv * vec2(10.0, 1000.0));
    
    // Tangent for anisotropic highlights (vertical brushing = horizontal tangent)
    vec3 T = normalize(vec3(1.0, grain * 0.05, 0.0)); 
    
    vec3 N = vec3(0.0, 0.0, 1.0);
    vec3 V = vec3(0.0, 0.0, 1.0); // Looking straight at it
    vec3 H = normalize(lightDir + V);

    // Ward anisotropic specular approx
    float dotTH = dot(T, H);
    float sinTH = sqrt(max(0.0, 1.0 - dotTH * dotTH));
    float spec = pow(sinTH, 80.0); // shiny
    
    // Isotropic diffuse approx
    float diff = max(dot(N, lightDir), 0.0);

    // Steel base color
    vec3 baseColor = vec3(0.12, 0.13, 0.15); // darker metal
    
    vec3 color = baseColor + (diff * 0.15) * (0.8 + variation * 0.2);
    
    // Add specular highlight
    color += vec3(0.6, 0.6, 0.6) * spec;
    
    // Subtly mix in the grain into diffuse
    color *= 1.0 + grain * 0.08;
    
    // Ambient light
    color += vec3(0.05);

    gl_FragColor = vec4(color, 1.0);
}
`,l=()=>{let e=(0,o.useRef)(null),{size:t,viewport:s}=(0,n.useThree)(),[l,u]=(0,o.useState)({x:0,y:0});(0,o.useEffect)(()=>{let e=e=>{let i=e.gamma?e.gamma/45:0,o=e.beta?(e.beta-45)/45:0;u({x:i=Math.max(-1,Math.min(1,i)),y:-(o=Math.max(-1,Math.min(1,o)))})};return window.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission,window.addEventListener("deviceorientation",e),()=>window.removeEventListener("deviceorientation",e)},[]);let d=(0,o.useMemo)(()=>({u_resolution:{value:new a.Vector2(t.width*window.devicePixelRatio,t.height*window.devicePixelRatio)},u_mouse:{value:new a.Vector2(0,0)}}),[t]);return(0,r.useFrame)(i=>{e.current&&(0!==l.x||0!==l.y?e.current.uniforms.u_mouse.value.lerp(new a.Vector2(l.x,l.y),.1):e.current.uniforms.u_mouse.value.lerp(i.pointer,.1))}),(0,i.jsxs)("mesh",{onPointerDown:()=>{"function"==typeof DeviceOrientationEvent.requestPermission&&DeviceOrientationEvent.requestPermission().catch(console.error)},children:[(0,i.jsx)("planeGeometry",{args:[s.width,s.height]}),(0,i.jsx)("shaderMaterial",{ref:e,vertexShader:c,fragmentShader:v,uniforms:d})]})},u=()=>{let e=(0,o.useRef)(null);return(0,s.useExport)(e,"brushed-steel-v1.png"),(0,i.jsx)("div",{className:"canvas-container",children:(0,i.jsx)(t.Canvas,{ref:e,gl:{preserveDrawingBuffer:!0,antialias:!1},camera:{position:[0,0,1]},children:(0,i.jsx)(l,{})})})};e.s(["default",0,function(){return(0,i.jsx)(u,{})}],77015)}]);