"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D u_tex;
uniform vec2 u_res;      
uniform vec2 u_videoRes;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_pressed; 
uniform int u_hasVideo;

varying vec2 vUv;

// Grid layout - larger blocks to match the reference image
const float tiles = 6.0; 

// Base noise functions for wavy glass interior
float hash(vec2 p) {
    p = fract(p * vec2(12.9898, 78.233));
    p += dot(p, p + 34.19);
    return fract(p.x * p.y);
}

float noise(in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Fractal Brownian Motion for rich bumpy texture
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

vec2 coverUv(vec2 uv) {
    if (u_hasVideo == 0) return uv; 
    float screenAspect = u_res.x / u_res.y;
    float videoAspect = u_videoRes.x / u_videoRes.y;
    vec2 st = uv - 0.5;
    if (screenAspect > videoAspect) {
        st.y *= videoAspect / screenAspect;
    } else {
        st.x *= screenAspect / videoAspect;
    }
    return st + 0.5;
}

void main() {
    float aspect = u_res.x / u_res.y;
    
    vec2 p = vUv; 
    p.x *= aspect; 
    
    // Grid segmentation
    vec2 gridId = floor(p * tiles);
    vec2 gridUv = fract(p * tiles);
    
    vec2 tileCenterAspect = (gridId + 0.5) / tiles; 
    vec2 tileCenter = vec2(tileCenterAspect.x / aspect, tileCenterAspect.y);
    
    float n1 = hash(gridId + 1.0);
    float n2 = hash(gridId + 2.0);
    
    // Interactions
    vec2 mouseAspect = u_mouse;
    mouseAspect.x *= aspect;
    float distToMouse = length(tileCenterAspect - mouseAspect);
    float localHover = smoothstep(0.4, 0.0, distToMouse);
    float localPressed = localHover * u_pressed;
    
    // ----------------------------------------
    // 1. Realistic Glass Normal Map (Internal Waves)
    // ----------------------------------------
    // Scale waves to fit inside block, adding random offset per tile
    vec2 warpUv = gridUv * 4.0 + vec2(n1, n2) * 50.0;
    // Add time for extremely subtle fluid swirl (idle animation)
    warpUv += vec2(u_time * 0.05, u_time * 0.04); 
    
    // Calculate normal from height map approximations
    float h = fbm(warpUv);
    float hx = fbm(warpUv + vec2(0.04, 0.0));
    float hy = fbm(warpUv + vec2(0.0, 0.04));
    
    // The deeper the wave normal, the more distorted the image
    vec2 internalNormal = vec2(hx - h, hy - h) * 2.0; 
    
    // ----------------------------------------
    // 2. Tile Edge Bevels & Mortar Boundary
    // ----------------------------------------
    vec2 edgeVec = abs(gridUv - 0.5) * 2.0; 
    float maxEdge = pow(pow(edgeVec.x, 6.0) + pow(edgeVec.y, 6.0), 1.0/6.0);
    
    // Bevel shading pushes normals towards the center near edges
    vec2 bevelNormal = (gridUv - 0.5) * 2.0;
    float innerBevel = smoothstep(0.7, 0.9, maxEdge); 
    
    // Combine internal wavy normal with the structural bevel normal
    // Interactive: When pressed, flatten the internal waves to "clear up" the image
    float flattenIntensity = 1.0 - localHover * 0.3 - localPressed * 0.7;
    vec2 finalNormal = bevelNormal * innerBevel + internalNormal * flattenIntensity * (1.0 - innerBevel*0.5);
    
    // ----------------------------------------
    // 3. Texture Sampling with Refraction
    // ----------------------------------------
    // Base zoom into the tile (thick glass magnifies)
    float zoom = mix(0.75, 0.45, localPressed);
    
    // Heavy refraction based on the combined normal vector
    // Creates the warped physical optical illusion
    vec2 refraction = finalNormal * 0.06;
    
    // Pointer Push Offset
    vec2 pushDir = normalize(tileCenterAspect - mouseAspect + 0.0001);
    refraction += pushDir * localHover * 0.02 * (1.0 - localPressed);
    
    vec2 sampleUv = tileCenter + (vUv - tileCenter) * zoom + refraction;
    sampleUv = coverUv(sampleUv);
    
    vec3 baseColor = texture2D(u_tex, sampleUv).rgb;
    
    // Chromatic Aberration for thick glass realism
    vec2 caOffset = finalNormal * 0.006 * flattenIntensity;
    float rParam = texture2D(u_tex, coverUv(sampleUv + caOffset)).r;
    float bParam = texture2D(u_tex, coverUv(sampleUv - caOffset)).b;
    baseColor.r = mix(baseColor.r, rParam, 0.7);
    baseColor.b = mix(baseColor.b, bParam, 0.7);

    // Fallback if no video
    if(u_hasVideo == 0) {
        baseColor = texture2D(u_tex, sampleUv).rgb;
    }

    // ----------------------------------------
    // 4. Glass Surface Lighting (Shiny Glints)
    // ----------------------------------------
    // Convert 2D normal to 3D. Z axis dictates depth of the bump.
    vec3 N = normalize(vec3(finalNormal, 0.6));
    vec3 L = normalize(vec3(-0.5, 0.8, 1.0)); // Light from top-left
    vec3 V = vec3(0.0, 0.0, 1.0); // Viewer
    vec3 H = normalize(L + V);
    
    // Diffuse light (brightens bevels facing light)
    float diffuse = max(dot(N, L), 0.0);
    // Specular glint (intense reflection on the bumpy wavy surface)
    float spec = pow(max(dot(N, H), 0.0), 40.0) * 1.5;
    
    vec3 color = baseColor;
    
    // Pure brightness glints from the glass surface
    color += vec3(1.0) * spec * (1.0 - localPressed * 0.8);
    // Soft ambient light variation
    color += vec3(0.8, 0.9, 1.0) * diffuse * 0.2; 
    
    // Outer glass bevel darkens slightly to simulate thick glass density blocking light
    color *= mix(1.0, 0.65, innerBevel);
    
    // Screen overall darkening when pressed
    color *= mix(1.0, 0.75, localPressed);
    
    // ----------------------------------------
    // 5. Mortar Boundary (Thick Dark/Deep Lines)
    // ----------------------------------------
    float isMortar = smoothstep(0.93, 0.98, maxEdge);
    // Deep shadowed mortar color like real construction
    vec3 mortarColor = vec3(0.08, 0.1, 0.11);
    
    color = mix(color, mortarColor, isMortar);
    
    // Contrast pop
    color = smoothstep(0.0, 1.05, color);

    gl_FragColor = vec4(color, 1.0);
}
`;

const GlassBrickPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    
    const [texParams, setTexParams] = useState<{tex: THREE.Texture | null, w: number, h: number}>({ tex: null, w: 1, h: 1 });
    
    const targetMouse = useRef(new THREE.Vector2(2.0, 2.0)); 
    const currentMouse = useRef(new THREE.Vector2(2.0, 2.0));
    const targetPressed = useRef(0.0);
    const currentPressed = useRef(0.0);
    const accumulatedTime = useRef(0);

    // Initialize Webcam / Fallback
    useEffect(() => {
        let active = true;
        const video = document.createElement('video');
        video.crossOrigin = "Anonymous";
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(stream => {
                    if (!active) return;
                    video.srcObject = stream;
                    video.play();
                    video.onloadedmetadata = () => {
                        if (!active) return;
                        const tex = new THREE.VideoTexture(video);
                        tex.minFilter = THREE.LinearFilter;
                        tex.magFilter = THREE.LinearFilter;
                        setTexParams({ tex, w: video.videoWidth, h: video.videoHeight });
                    };
                }).catch(err => {
                    console.warn("Webcam access denied. Generating fallback gradient.", err);
                    if (!active) return;
                    createFallback();
                });
        } else {
            createFallback();
        }
        
        function createFallback() {
            const canvas = document.createElement('canvas');
            canvas.width = 1024; canvas.height = 1024;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // To show off the highly refractive glass effect, we draw a high contrast background
                const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
                grad.addColorStop(0, '#5f72be');
                grad.addColorStop(1, '#9921e8');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 1024, 1024);
                
                // Draw sharp high contrast geometry so the bump maps visually break them
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(200, 200, 100, 600);
                ctx.fillRect(400, 100, 100, 800);
                ctx.fillRect(600, 300, 100, 400);
                ctx.fillRect(800, 200, 100, 500);
                
                ctx.fillStyle = '#ffde00';
                ctx.beginPath(); ctx.arc(300, 500, 80, 0, Math.PI * 2); ctx.fill();
            }
            const tex = new THREE.CanvasTexture(canvas);
            setTexParams({ tex, w: 1024, h: 1024 });
        }

        return () => {
            active = false;
            if (video.srcObject) {
                const stream = video.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const uniforms = useMemo(() => ({
        u_tex: { value: null },
        u_res: { value: new THREE.Vector2(0, 0) },
        u_videoRes: { value: new THREE.Vector2(1, 1) },
        u_mouse: { value: new THREE.Vector2(2.0, 2.0) },
        u_time: { value: 0 },
        u_pressed: { value: 0 },
        u_hasVideo: { value: 0 }
    }), []);
    
    // Object-fit: contain logic for plane dimensions
    const planeSize = useMemo(() => {
        let planeW = viewport.width;
        let planeH = viewport.height;
        
        if (texParams.w > 1 && texParams.h > 1) {
            const screenAspect = viewport.width / viewport.height;
            const texAspect = texParams.w / texParams.h;
            
            if (screenAspect > texAspect) {
                planeH = viewport.height;
                planeW = planeH * texAspect;
            } else {
                planeW = viewport.width;
                planeH = planeW / texAspect;
            }
        }
        return [planeW, planeH] as [number, number];
    }, [viewport.width, viewport.height, texParams.w, texParams.h]);

    useEffect(() => {
        if (materialRef.current && texParams.tex) {
            const ratio = size.width / viewport.width; 
            materialRef.current.uniforms.u_res.value.set(planeSize[0] * ratio, planeSize[1] * ratio);
            materialRef.current.uniforms.u_tex.value = texParams.tex;
            materialRef.current.uniforms.u_hasVideo.value = (texParams.w !== 1024) ? 1 : 0; // fallback checker
        }
    }, [planeSize, size, texParams]);

    useFrame((state, delta) => {
        const mat = materialRef.current;
        if (!mat) return;
        
        accumulatedTime.current += delta;
        mat.uniforms.u_time.value = accumulatedTime.current;
        
        currentMouse.current.lerp(targetMouse.current, 0.12);
        currentPressed.current += (targetPressed.current - currentPressed.current) * 0.15;
        
        mat.uniforms.u_mouse.value.copy(currentMouse.current);
        mat.uniforms.u_pressed.value = currentPressed.current;
    });

    return (
        <mesh
            onPointerMove={(e) => {
                if (e.uv && texParams.tex) targetMouse.current.set(e.uv.x, e.uv.y);
            }}
            onPointerDown={(e) => {
                if (e.uv && texParams.tex) targetMouse.current.set(e.uv.x, e.uv.y);
                targetPressed.current = 1.0;
            }}
            onPointerUp={() => { targetPressed.current = 0.0; }}
            onPointerLeave={() => { 
                targetPressed.current = 0.0; 
                targetMouse.current.set(2.0, 2.0); 
            }}
        >
            <planeGeometry args={[planeSize[0], planeSize[1]]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
            />
        </mesh>
    );
};

const GlassBrick3: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'glass-brick-wall-v3.png') as () => void;

    return (
        <div className="canvas-container bg-[#111111] flex items-center justify-center">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: false }}
                camera={{ position: [0, 0, 1] }}
                className="w-full h-full"
            >
                <GlassBrickPlane />
            </Canvas>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default GlassBrick3;
