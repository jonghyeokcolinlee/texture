(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,71851,e=>{"use strict";var t=e.i(43476),i=e.i(71645),r=e.i(75056),o=e.i(71753),a=e.i(15080),l=e.i(90072),n=e.i(51513);let s=`
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,u=`
uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_ripples[20]; // x, y, startTime, intensity
uniform int u_rippleCount;

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

// FBM for rough base water
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
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Base rough texture shifting slowly
    vec2 p = vUv * 15.0;
    float timeSlow = u_time * 0.2;
    float baseBump = fbm(p + timeSlow);
    
    vec2 eps = vec2(0.02, 0.0);
    float dX = fbm(p + eps.xy + timeSlow) - baseBump;
    float dY = fbm(p + eps.yx + timeSlow) - baseBump;
    
    vec2 normalOffset = vec2(dX, dY) * 2.5; // Strength of bumpy surface

    // Add ripples
    for(int i = 0; i < 20; i++) {
        if(i >= u_rippleCount) break;
        
        vec4 r = u_ripples[i];
        float age = u_time - r.z;
        if(age > 0.0 && age < 4.0) {
            vec2 d = uv - r.xy;
            d.x *= u_resolution.x / u_resolution.y;
            float dist = length(d);
            
            float speed = 0.4;
            float freq = 50.0;
            float decay = 1.2;
            float wavePhase = (dist - age * speed) * freq;
            
            if (dist < age * speed) {
                float envelope = exp(-age * decay) * r.w;
                float derivative = cos(wavePhase) * freq;
                float dInfluence = derivative * envelope * 0.08;
                if (dist > 0.001) {
                    normalOffset += (d / dist) * dInfluence;
                }
            }
        }
    }
    
    // Normal lighting calculation
    vec3 N = normalize(vec3(-normalOffset.x, -normalOffset.y, 1.0));
    
    // Light from top corner to create the stark reflection gradient
    vec3 L = normalize(vec3(0.6, 0.8, 1.0)); 
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);
    
    // Water base color very dark, almost black
    vec3 baseColor = vec3(0.04, 0.04, 0.05); 
    vec3 color = baseColor;
    
    // Specular reflection
    float dotNH = max(dot(N, H), 0.0);
    float spec = pow(dotNH, 15.0); // Broad specular base
    
    // Intense thresholding to create jagged stark white patches like ref image
    float glint = smoothstep(0.55, 0.65, spec); 
    
    // Combine base, soft glow around glints, and white glints
    color += vec3(0.1, 0.12, 0.15) * spec * 0.5; // subtle halo
    color += vec3(1.0, 1.0, 1.0) * glint; // pure electric white shapes

    gl_FragColor = vec4(color, 1.0);
}
`,c=()=>{let e=(0,i.useRef)(null),{size:r,viewport:n}=(0,a.useThree)(),[c,f]=(0,i.useState)([]),v=(0,i.useRef)(0),m=(0,i.useRef)(0),d=(0,i.useMemo)(()=>({u_resolution:{value:new l.Vector2(r.width*window.devicePixelRatio,r.height*window.devicePixelRatio)},u_time:{value:0},u_ripples:{value:Array(20).fill(null).map(()=>new l.Vector4)},u_rippleCount:{value:0}}),[r]);return(0,o.useFrame)(t=>{if(e.current){e.current.uniforms.u_time.value=t.clock.elapsedTime;let i=t.clock.elapsedTime,r=c.filter(e=>i-e.startTime<4);r.length!==c.length&&f(r);let o=Math.min(r.length,20);e.current.uniforms.u_rippleCount.value=o;for(let t=0;t<20;t++)if(t<o){let i=r[t];e.current.uniforms.u_ripples.value[t].set(i.x,i.y,i.startTime,i.intensity)}else e.current.uniforms.u_ripples.value[t].set(0,0,0,0)}}),(0,t.jsxs)("mesh",{onPointerDown:t=>{t.stopPropagation();let i=performance.now(),r=i-m.current,o=1;r<200?o=2:r<500&&(o=1.5),m.current=i;let a=t.uv?.x??.5,l=t.uv?.y??.5;f(t=>{let i=[...t,{id:v.current++,x:a,y:l,startTime:e.current?.uniforms.u_time.value||0,intensity:o}];return i.length>20?i.slice(i.length-20):i})},children:[(0,t.jsx)("planeGeometry",{args:[n.width,n.height]}),(0,t.jsx)("shaderMaterial",{ref:e,vertexShader:s,fragmentShader:u,uniforms:d})]})},f=()=>{let e=(0,i.useRef)(null);return(0,n.useExport)(e,"water-ripple.png"),(0,t.jsx)("div",{className:"canvas-container",children:(0,t.jsx)(r.Canvas,{ref:e,gl:{preserveDrawingBuffer:!0,antialias:!1},camera:{position:[0,0,1]},children:(0,t.jsx)(c,{})})})};e.s(["default",0,function(){return(0,t.jsx)(f,{})}],71851)}]);