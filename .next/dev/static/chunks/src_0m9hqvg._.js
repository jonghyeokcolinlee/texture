(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/hooks/useExport.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useExport",
    ()=>useExport
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
const useExport = (canvasRef, filename = 'export.png')=>{
    _s();
    const timeoutRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useExport.useEffect": ()=>{
            const handleExport = {
                "useExport.useEffect.handleExport": ()=>{
                    if (canvasRef.current) {
                        const dataURL = canvasRef.current.toDataURL('image/png');
                        const link = document.createElement('a');
                        link.href = dataURL;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                }
            }["useExport.useEffect.handleExport"];
            const handleKeyDown = {
                "useExport.useEffect.handleKeyDown": (e)=>{
                    if (e.key.toLowerCase() === 's') {
                        e.preventDefault();
                        handleExport();
                    }
                }
            }["useExport.useEffect.handleKeyDown"];
            const handleTouchStart = {
                "useExport.useEffect.handleTouchStart": ()=>{
                    timeoutRef.current = setTimeout({
                        "useExport.useEffect.handleTouchStart": ()=>{
                            handleExport();
                        }
                    }["useExport.useEffect.handleTouchStart"], 1000); // 1-second long press
                }
            }["useExport.useEffect.handleTouchStart"];
            const handleTouchEnd = {
                "useExport.useEffect.handleTouchEnd": ()=>{
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                    }
                }
            }["useExport.useEffect.handleTouchEnd"];
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('touchstart', handleTouchStart);
            window.addEventListener('touchend', handleTouchEnd);
            window.addEventListener('touchcancel', handleTouchEnd);
            return ({
                "useExport.useEffect": ()=>{
                    window.removeEventListener('keydown', handleKeyDown);
                    window.removeEventListener('touchstart', handleTouchStart);
                    window.removeEventListener('touchend', handleTouchEnd);
                    window.removeEventListener('touchcancel', handleTouchEnd);
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                    }
                }
            })["useExport.useEffect"];
        }
    }["useExport.useEffect"], [
        filename,
        canvasRef
    ]);
};
_s(useExport, "lXIkKenX1wXIs2/Ah8A4QzJneGI=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/materials/Water.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$react$2d$three$2d$fiber$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/react-three-fiber.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/events-5a94e5eb.esm.js [app-client] (ecmascript) <export D as useFrame>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__C__as__useThree$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/events-5a94e5eb.esm.js [app-client] (ecmascript) <export C as useThree>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useExport$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useExport.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const fragmentShader = `
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
            
            float speed = 0.35; // Slower, more natural spreading
            float freq = 20.0; // Lower frequency = wider, more organic ripples (fewer sharp rings)
            float decay = 1.0; 
            float wavePhase = (dist - age * speed) * freq;
            
            if (dist < age * speed) {
                // Smoothly fade out the leading edge so it doesn't look like a hard cut
                float edgeFade = smoothstep(age * speed, age * speed - 0.05, dist);
                // Also fade out the center to form an expanding ring 
                float centerFade = smoothstep(0.0, 0.15, dist);
                
                float envelope = exp(-age * decay) * r.w * edgeFade * centerFade;
                float derivative = cos(wavePhase) * freq;
                
                // Increased base influence because freq is lower 
                float dInfluence = derivative * envelope * 0.12;
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
    
    // Water base color: Lighter black (dark greyish tone)
    vec3 baseColor = vec3(0.12, 0.13, 0.14); 
    vec3 color = baseColor;
    
    // Specular reflection
    float dotNH = max(dot(N, H), 0.0);
    float spec = pow(dotNH, 15.0); // Broad specular base
    
    // Intense thresholding to create jagged stark white patches like ref image
    float glint = smoothstep(0.55, 0.65, spec); 
    
    // Combine base, soft glow around glints, and white glints
    color += vec3(0.15, 0.16, 0.18) * spec * 0.5; // brighter halo
    color += vec3(1.0, 1.0, 1.0) * glint; // pure electric white shapes

    gl_FragColor = vec4(color, 1.0);
}
`;
const WaterPlane = ()=>{
    _s();
    const materialRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const { size, viewport } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__C__as__useThree$3e$__["useThree"])();
    const [ripples, setRipples] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const nextId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const lastClickTimeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const uniforms = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "WaterPlane.useMemo[uniforms]": ()=>({
                u_resolution: {
                    value: new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector2"](size.width * window.devicePixelRatio, size.height * window.devicePixelRatio)
                },
                u_time: {
                    value: 0
                },
                u_ripples: {
                    value: new Array(20).fill(null).map({
                        "WaterPlane.useMemo[uniforms]": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector4"]()
                    }["WaterPlane.useMemo[uniforms]"])
                },
                u_rippleCount: {
                    value: 0
                }
            })
    }["WaterPlane.useMemo[uniforms]"], [
        size
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"])({
        "WaterPlane.useFrame": (state)=>{
            if (materialRef.current) {
                materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
                const currentTime = state.clock.elapsedTime;
                // Filter out old ripples
                const activeRipples = ripples.filter({
                    "WaterPlane.useFrame.activeRipples": (r)=>currentTime - r.startTime < 4.0
                }["WaterPlane.useFrame.activeRipples"]);
                if (activeRipples.length !== ripples.length) {
                    setRipples(activeRipples);
                }
                const MAX_RIPPLES = 20;
                const count = Math.min(activeRipples.length, MAX_RIPPLES);
                materialRef.current.uniforms.u_rippleCount.value = count;
                for(let i = 0; i < MAX_RIPPLES; i++){
                    if (i < count) {
                        const r = activeRipples[i];
                        materialRef.current.uniforms.u_ripples.value[i].set(r.x, r.y, r.startTime, r.intensity);
                    } else {
                        materialRef.current.uniforms.u_ripples.value[i].set(0, 0, 0, 0);
                    }
                }
            }
        }
    }["WaterPlane.useFrame"]);
    const handlePointerDown = (e)=>{
        e.stopPropagation();
        const currentTime = performance.now();
        const dt = currentTime - lastClickTimeRef.current;
        // Intensity based on how fast you click
        let intensity = 1.0;
        if (dt < 200) {
            intensity = 2.0; // Fast clicking = stronger ripples
        } else if (dt < 500) {
            intensity = 1.5;
        }
        lastClickTimeRef.current = currentTime;
        // e.uv is normalized [0, 1].
        let uvX = e.uv?.x ?? 0.5;
        let uvY = e.uv?.y ?? 0.5;
        setRipples((prev)=>{
            const newRips = [
                ...prev,
                {
                    id: nextId.current++,
                    x: uvX,
                    y: uvY,
                    startTime: materialRef.current?.uniforms.u_time.value || 0,
                    intensity
                }
            ];
            // Optional: slice to keep under 20
            if (newRips.length > 20) return newRips.slice(newRips.length - 20);
            return newRips;
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
        onPointerDown: handlePointerDown,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("planeGeometry", {
                args: [
                    viewport.width,
                    viewport.height
                ]
            }, void 0, false, {
                fileName: "[project]/src/materials/Water.tsx",
                lineNumber: 216,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("shaderMaterial", {
                ref: materialRef,
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                uniforms: uniforms
            }, void 0, false, {
                fileName: "[project]/src/materials/Water.tsx",
                lineNumber: 217,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/materials/Water.tsx",
        lineNumber: 215,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_s(WaterPlane, "l1H3W60Fx66zf1RHb7YeZMM+dB8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__C__as__useThree$3e$__["useThree"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"]
    ];
});
_c = WaterPlane;
const WaterMaterial = ()=>{
    _s1();
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useExport$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useExport"])(canvasRef, 'water-ripple.png');
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "canvas-container",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$react$2d$three$2d$fiber$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Canvas"], {
            ref: canvasRef,
            gl: {
                preserveDrawingBuffer: true,
                antialias: false
            },
            camera: {
                position: [
                    0,
                    0,
                    1
                ]
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(WaterPlane, {}, void 0, false, {
                fileName: "[project]/src/materials/Water.tsx",
                lineNumber: 238,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/src/materials/Water.tsx",
            lineNumber: 233,
            columnNumber: 13
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/src/materials/Water.tsx",
        lineNumber: 232,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_s1(WaterMaterial, "6naqriWdU1EVBMeFE3W9chvgZOM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useExport$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useExport"]
    ];
});
_c1 = WaterMaterial;
const __TURBOPACK__default__export__ = WaterMaterial;
var _c, _c1;
__turbopack_context__.k.register(_c, "WaterPlane");
__turbopack_context__.k.register(_c1, "WaterMaterial");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/water/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Page
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$materials$2f$Water$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/materials/Water.tsx [app-client] (ecmascript)");
"use client";
;
;
function Page() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$materials$2f$Water$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
        fileName: "[project]/src/app/water/page.tsx",
        lineNumber: 3,
        columnNumber: 41
    }, this);
}
_c = Page;
var _c;
__turbopack_context__.k.register(_c, "Page");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_0m9hqvg._.js.map