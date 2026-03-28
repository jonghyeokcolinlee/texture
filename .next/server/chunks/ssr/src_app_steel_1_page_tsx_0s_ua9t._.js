module.exports=[85176,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(10129),e=a.i(12303),f=a.i(52253),g=a.i(35258),h=a.i(889);let i=`
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,j=`
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
`,k=()=>{let a=(0,c.useRef)(null),{size:d,viewport:h}=(0,f.useThree)(),[k,l]=(0,c.useState)({x:0,y:0});(0,c.useEffect)(()=>{let a=a=>{let b=a.gamma?a.gamma/45:0,c=a.beta?(a.beta-45)/45:0;l({x:b=Math.max(-1,Math.min(1,b)),y:-(c=Math.max(-1,Math.min(1,c)))})};return window.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission,window.addEventListener("deviceorientation",a),()=>window.removeEventListener("deviceorientation",a)},[]);let m=(0,c.useMemo)(()=>({u_resolution:{value:new g.Vector2(d.width*window.devicePixelRatio,d.height*window.devicePixelRatio)},u_mouse:{value:new g.Vector2(0,0)}}),[d]);return(0,e.useFrame)(b=>{a.current&&(0!==k.x||0!==k.y?a.current.uniforms.u_mouse.value.lerp(new g.Vector2(k.x,k.y),.1):a.current.uniforms.u_mouse.value.lerp(b.pointer,.1))}),(0,b.jsxs)("mesh",{onPointerDown:()=>{"function"==typeof DeviceOrientationEvent.requestPermission&&DeviceOrientationEvent.requestPermission().catch(console.error)},children:[(0,b.jsx)("planeGeometry",{args:[h.width,h.height]}),(0,b.jsx)("shaderMaterial",{ref:a,vertexShader:i,fragmentShader:j,uniforms:m})]})},l=()=>{let a=(0,c.useRef)(null);return(0,h.useExport)(a,"brushed-steel-v1.png"),(0,b.jsx)("div",{className:"canvas-container",children:(0,b.jsx)(d.Canvas,{ref:a,gl:{preserveDrawingBuffer:!0,antialias:!1},camera:{position:[0,0,1]},children:(0,b.jsx)(k,{})})})};a.s(["default",0,function(){return(0,b.jsx)(l,{})}],85176)}];

//# sourceMappingURL=src_app_steel_1_page_tsx_0s_ua9t._.js.map