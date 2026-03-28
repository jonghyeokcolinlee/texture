module.exports=[70835,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(10129),e=a.i(12303),f=a.i(52253),g=a.i(35258),h=a.i(889);let i=`
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,j=`
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
`,k=()=>{let a=(0,c.useRef)(null),{size:d,viewport:h}=(0,f.useThree)(),[k,l]=(0,c.useState)([]),m=(0,c.useRef)(0),n=(0,c.useRef)(0),o=(0,c.useMemo)(()=>({u_resolution:{value:new g.Vector2(d.width*window.devicePixelRatio,d.height*window.devicePixelRatio)},u_time:{value:0},u_ripples:{value:Array(20).fill(null).map(()=>new g.Vector4)},u_rippleCount:{value:0}}),[d]);return(0,e.useFrame)(b=>{if(a.current){a.current.uniforms.u_time.value=b.clock.elapsedTime;let c=b.clock.elapsedTime,d=k.filter(a=>c-a.startTime<4);d.length!==k.length&&l(d);let e=Math.min(d.length,20);a.current.uniforms.u_rippleCount.value=e;for(let b=0;b<20;b++)if(b<e){let c=d[b];a.current.uniforms.u_ripples.value[b].set(c.x,c.y,c.startTime,c.intensity)}else a.current.uniforms.u_ripples.value[b].set(0,0,0,0)}}),(0,b.jsxs)("mesh",{onPointerDown:b=>{b.stopPropagation();let c=performance.now(),d=c-n.current,e=1;d<200?e=2:d<500&&(e=1.5),n.current=c;let f=b.uv?.x??.5,g=b.uv?.y??.5;l(b=>{let c=[...b,{id:m.current++,x:f,y:g,startTime:a.current?.uniforms.u_time.value||0,intensity:e}];return c.length>20?c.slice(c.length-20):c})},children:[(0,b.jsx)("planeGeometry",{args:[h.width,h.height]}),(0,b.jsx)("shaderMaterial",{ref:a,vertexShader:i,fragmentShader:j,uniforms:o})]})},l=()=>{let a=(0,c.useRef)(null);return(0,h.useExport)(a,"water-ripple-v1.png"),(0,b.jsx)("div",{className:"canvas-container",children:(0,b.jsx)(d.Canvas,{ref:a,gl:{preserveDrawingBuffer:!0,antialias:!1},camera:{position:[0,0,1]},children:(0,b.jsx)(k,{})})})};a.s(["default",0,function(){return(0,b.jsx)(l,{})}],70835)}];

//# sourceMappingURL=src_app_water_1_page_tsx_0e~~x4.._.js.map