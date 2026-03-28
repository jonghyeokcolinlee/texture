(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,32942,e=>{"use strict";var t=e.i(43476),i=e.i(71645),r=e.i(75056),o=e.i(71753),a=e.i(15080),l=e.i(90072),n=e.i(51513);let s=`
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

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Water base color
    vec3 baseColor = vec3(0.02, 0.05, 0.08); // dark water
    
    float height = 0.0;
    vec2 normalOffset = vec2(0.0);

    for(int i = 0; i < 20; i++) {
        if(i >= u_rippleCount) break;
        
        vec4 r = u_ripples[i];
        float age = u_time - r.z;
        if(age > 0.0 && age < 4.0) { // live for 4 seconds
            vec2 d = uv - r.xy;
            // Adjust for aspect ratio
            d.x *= u_resolution.x / u_resolution.y;
            
            float dist = length(d);
            
            // Wave parameters
            float speed = 0.5;
            float freq = 40.0;
            float decay = 1.5;
            float wavePhase = (dist - age * speed) * freq;
            
            // Only calc wave if it's within the expanding radius
            if (dist < age * speed) {
                float wave = sin(wavePhase);
                float envelope = exp(-age * decay) * r.w; // w is intensity
                float derivative = cos(wavePhase) * freq;
                
                height += wave * envelope * 0.02;
                
                // normal adjustment for reflection (approx)
                float dInfluence = derivative * envelope * 0.05;
                if (dist > 0.001) {
                    normalOffset += (d / dist) * dInfluence;
                }
            }
        }
    }
    
    // Normal lighting calculation
    vec3 N = normalize(vec3(-normalOffset.x, -normalOffset.y, 1.0));
    vec3 L = normalize(vec3(0.5, 0.5, 1.0)); // subtle static light for reflection
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);
    
    float spec = pow(max(dot(N, H), 0.0), 50.0);
    
    vec3 color = baseColor + vec3(0.1, 0.15, 0.2) * spec * 0.5;
    
    // Sky reflection approx (very dark)
    float refl = max(dot(N, V), 0.0);
    color += vec3(0.05, 0.08, 0.1) * (1.0 - refl);

    gl_FragColor = vec4(color, 1.0);
}
`,c=()=>{let e=(0,i.useRef)(null),{size:r,viewport:n}=(0,a.useThree)(),[c,v]=(0,i.useState)([]),f=(0,i.useRef)(0),p=(0,i.useRef)(0),d=(0,i.useMemo)(()=>({u_resolution:{value:new l.Vector2(r.width*window.devicePixelRatio,r.height*window.devicePixelRatio)},u_time:{value:0},u_ripples:{value:Array(20).fill(null).map(()=>new l.Vector4)},u_rippleCount:{value:0}}),[r]);return(0,o.useFrame)(t=>{if(e.current){e.current.uniforms.u_time.value=t.clock.elapsedTime;let i=t.clock.elapsedTime,r=c.filter(e=>i-e.startTime<4);r.length!==c.length&&v(r);let o=Math.min(r.length,20);e.current.uniforms.u_rippleCount.value=o;for(let t=0;t<20;t++)if(t<o){let i=r[t];e.current.uniforms.u_ripples.value[t].set(i.x,i.y,i.startTime,i.intensity)}else e.current.uniforms.u_ripples.value[t].set(0,0,0,0)}}),(0,t.jsxs)("mesh",{onPointerDown:t=>{t.stopPropagation();let i=performance.now(),r=i-p.current,o=1;r<200?o=2:r<500&&(o=1.5),p.current=i;let a=t.uv?.x??.5,l=t.uv?.y??.5;v(t=>{let i=[...t,{id:f.current++,x:a,y:l,startTime:e.current?.uniforms.u_time.value||0,intensity:o}];return i.length>20?i.slice(i.length-20):i})},children:[(0,t.jsx)("planeGeometry",{args:[n.width,n.height]}),(0,t.jsx)("shaderMaterial",{ref:e,vertexShader:s,fragmentShader:u,uniforms:d})]})},v=()=>{let e=(0,i.useRef)(null);return(0,n.useExport)(e,"water-ripple-v1.png"),(0,t.jsx)("div",{className:"canvas-container",children:(0,t.jsx)(r.Canvas,{ref:e,gl:{preserveDrawingBuffer:!0,antialias:!1},camera:{position:[0,0,1]},children:(0,t.jsx)(c,{})})})};e.s(["default",0,function(){return(0,t.jsx)(v,{})}],32942)}]);