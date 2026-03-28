(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,84875,e=>{"use strict";var o=e.i(43476),t=e.i(71645),r=e.i(75056),a=e.i(71753),i=e.i(15080),n=e.i(90072),c=e.i(51513);let s=`
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,l=`
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

// FBM for wavy bands
float fbm(vec2 x) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    for (int i = 0; i < 4; ++i) {
        v += a * noise(x);
        x = x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    // We adjust mouse range for more subtle tilt
    vec3 lightDir = normalize(vec3(u_mouse.x * -1.5, u_mouse.y * -1.5, 1.5));

    // 1. Wavy macro vertical bands
    // Multiply X more than Y to stretch horizontally, meaning bands are vertical
    float band = fbm(vUv * vec2(12.0, 0.5)); 
    band = smoothstep(0.2, 0.8, band); // Increase contrast

    // 2. Fine vertical scratches (high frequency on X, low on Y)
    float scratch = random(vUv * vec2(600.0, 1.0));
    float scratch2 = noise(vUv * vec2(200.0, 2.0));

    // Combine for texture variation
    float textureVariancy = band * 0.7 + scratch * 0.15 + scratch2 * 0.15;

    // True normal perturbation based on the wavy bands
    // Taking the derivative of the band roughly for normal map
    float bandDx = fbm((vUv + vec2(0.01, 0.0)) * vec2(12.0, 0.5)) - band;
    vec3 N = normalize(vec3(-bandDx * 15.0, 0.0, 1.0)); 

    // View direction
    vec3 V = vec3(0.0, 0.0, 1.0); 

    // Anisotropic Tangent (Vertical grain)
    vec3 TBase = vec3(0.0, 1.0, 0.0);
    // Perturb tangent slightly with scratches for realism
    vec3 T = normalize(TBase + vec3(0.0, 0.0, (scratch - 0.5) * 0.2));

    vec3 H = normalize(lightDir + V);

    // Kajiya-Kay Anisotropic Reflection
    float dotTH = dot(T, H);
    float sinTH = sqrt(max(0.0, 1.0 - dotTH * dotTH));
    
    // Two specular lobes for brushed metal (one broad, one sharp)
    float specBroad = pow(sinTH, 20.0);
    float specSharp = pow(sinTH, 100.0);

    // Diffuse component
    float diff = max(dot(N, lightDir), 0.0);

    // Base color from dark grey to lighter grey
    vec3 colorDark = vec3(0.18, 0.19, 0.20);
    vec3 colorLight = vec3(0.55, 0.57, 0.60);
    vec3 baseColor = mix(colorDark, colorLight, textureVariancy);

    // Apply lighting
    vec3 color = baseColor * (diff * 0.5 + 0.3); // Diffuse + Ambient
    
    // Add Specular reflections
    color += vec3(0.8, 0.85, 0.9) * specBroad * 0.4;
    color += vec3(1.0, 1.0, 1.0) * specSharp * 0.7;

    gl_FragColor = vec4(color, 1.0);
}
`,v=()=>{let e=(0,t.useRef)(null),{size:r,viewport:c}=(0,i.useThree)(),[v,u]=(0,t.useState)({x:0,y:0});(0,t.useEffect)(()=>{let e=e=>{let o=e.gamma?e.gamma/45:0,t=e.beta?(e.beta-45)/45:0;u({x:o=Math.max(-1,Math.min(1,o)),y:-(t=Math.max(-1,Math.min(1,t)))})};return window.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission,window.addEventListener("deviceorientation",e),()=>window.removeEventListener("deviceorientation",e)},[]);let d=(0,t.useMemo)(()=>({u_resolution:{value:new n.Vector2(r.width*window.devicePixelRatio,r.height*window.devicePixelRatio)},u_mouse:{value:new n.Vector2(0,0)}}),[r]);return(0,a.useFrame)(o=>{e.current&&(0!==v.x||0!==v.y?e.current.uniforms.u_mouse.value.lerp(new n.Vector2(v.x,v.y),.1):e.current.uniforms.u_mouse.value.lerp(o.pointer,.1))}),(0,o.jsxs)("mesh",{onPointerDown:()=>{"function"==typeof DeviceOrientationEvent.requestPermission&&DeviceOrientationEvent.requestPermission().then(e=>{}).catch(console.error)},children:[(0,o.jsx)("planeGeometry",{args:[c.width,c.height]}),(0,o.jsx)("shaderMaterial",{ref:e,vertexShader:s,fragmentShader:l,uniforms:d})]})},u=()=>{let e=(0,t.useRef)(null);return(0,c.useExport)(e,"brushed-steel.png"),(0,o.jsx)("div",{className:"canvas-container",children:(0,o.jsx)(r.Canvas,{ref:e,gl:{preserveDrawingBuffer:!0,antialias:!1},camera:{position:[0,0,1]},children:(0,o.jsx)(v,{})})})};e.s(["default",0,function(){return(0,o.jsx)(u,{})}],84875)}]);