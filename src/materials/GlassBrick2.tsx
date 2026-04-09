"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D u_tex;
uniform vec2 u_res;      // Resolution of the plane mesh itself
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_pressed; // global press state

varying vec2 vUv;

// Grid layout
const float tiles = 14.0; // Number of rows (vertical tiles)

// Reusable pseudo-random
float hash(vec2 p) {
    p = fract(p * vec2(12.9898, 78.233));
    p += dot(p, p + 34.19);
    return fract(p.x * p.y);
}

void main() {
    float aspect = u_res.x / u_res.y;
    
    // vUv is 0..1 bounding the plane perfectly.
    // Make coordinates proportional to resolution so we can segment exact squares.
    vec2 p = vUv;
    p.x *= aspect; // scaled to aspect ratio space
    
    // Segmentation into square tiles
    vec2 gridId = floor(p * tiles);
    vec2 gridUv = fract(p * tiles); // 0..1 within the tile
    
    vec2 tileCenterAspect = (gridId + 0.5) / tiles; 
    
    // We must map tileCenter back to 0..1 space to read the texture correctly!
    vec2 tileCenter = vec2(tileCenterAspect.x / aspect, tileCenterAspect.y);
    
    // Random per-tile metrics
    float n1 = hash(gridId + 1.0);
    float n2 = hash(gridId + 2.0);
    float n3 = hash(gridId + 3.0);
    
    // Mouse hover (in aspect-aware space)
    vec2 mouseAspect = u_mouse;
    mouseAspect.x *= aspect;
    
    float distToMouse = length(tileCenterAspect - mouseAspect);
    
    // Smooth falloffs for interactions
    float hover = smoothstep(0.4, 0.0, distToMouse); 
    // Pressed effect is strongest under the mouse
    float localPressed = hover * u_pressed;
    
    // --- 1. Base UV & Magnification (Zoom) ---
    // Instead of using original UV directly, we zoom into the tile center.
    // Default zoom is e.g. 0.8 (magnified, since we multiply by 0.8 to sample smaller area)
    // When pressed, zoom increases drastically (0.45 = zooming deeper inside).
    float zoom = mix(0.85, 0.45, localPressed);
    vec2 sampleUv = tileCenter + (vUv - tileCenter) * zoom;
    
    // --- 2. UV Distortion (Refraction/Shift) ---
    vec2 shift = (vec2(n1, n2) - 0.5) * 0.05;
    // When holding, increase local distortion, creating chaotic push pressure
    shift *= (1.0 + localPressed * 2.0);
    sampleUv += shift;
    
    // --- 3. Pointer Move Local Distortion ---
    // Push nearby tiles outwards around cursor
    vec2 pushDir = normalize(tileCenterAspect - mouseAspect + 0.0001);
    sampleUv += pushDir * hover * 0.02 * (1.0 - localPressed * 0.5);
    
    // --- 4. Idle Animation ---
    sampleUv += vec2(sin(u_time * 0.5 + n1*10.0), cos(u_time * 0.5 + n2*10.0)) * 0.002;
    
    // --- 5. Blur & Chromatic Aberration (CA) ---
    // Hover: Clear tile out (reduce blur). Press: Maintain clear.
    float blurAmt = mix(0.006, 0.0, hover);
    blurAmt *= mix(0.5, 1.5, n3); // add natural irregularity
    
    float caAmt = mix(0.002, 0.004, localPressed); // Slight CA, stronger when pressed
    
    // 3-tap or 5-tap blur sample
    // Adding slight offset to rgb channels independently for CA
    vec3 color = vec3(0.0);
    
    vec2 off1 = vec2(blurAmt, blurAmt);
    vec2 off2 = vec2(-blurAmt, -blurAmt);
    
    float r0 = texture2D(u_tex, sampleUv + vec2(caAmt, 0.0)).r;
    float r1 = texture2D(u_tex, sampleUv + vec2(caAmt, 0.0) + off1).r;
    float r2 = texture2D(u_tex, sampleUv + vec2(caAmt, 0.0) + off2).r;
    color.r = (r0 * 2.0 + r1 + r2) / 4.0;
    
    float g0 = texture2D(u_tex, sampleUv).g;
    float g1 = texture2D(u_tex, sampleUv + vec2(-blurAmt, blurAmt)).g;
    float g2 = texture2D(u_tex, sampleUv + vec2(blurAmt, -blurAmt)).g;
    color.g = (g0 * 2.0 + g1 + g2) / 4.0;
    
    float b0 = texture2D(u_tex, sampleUv - vec2(caAmt, 0.0)).b;
    float b1 = texture2D(u_tex, sampleUv - vec2(caAmt, 0.0) + vec2(0.0, blurAmt)).b;
    float b2 = texture2D(u_tex, sampleUv - vec2(caAmt, 0.0) + vec2(0.0, -blurAmt)).b;
    color.b = (b0 * 2.0 + b1 + b2) / 4.0;

    // --- 6. Soft Edge Highlight (Glass Border) ---
    // Calculate bounds of individual squared tile
    vec2 edgeVec = abs(gridUv - 0.5) * 2.0; 
    // Smooth rounded square
    float maxEdge = pow(pow(edgeVec.x, 6.0) + pow(edgeVec.y, 6.0), 1.0/6.0); 
    
    // Apple-like Soft White Glow at edge bounds
    float highlight = smoothstep(0.85, 0.95, maxEdge);
    float boundary = smoothstep(0.96, 1.0, maxEdge);
    
    // Simulate fake 3D volume by adding normal shading to the top-left edges
    vec2 bevelNormal = (gridUv - 0.5) * 2.0;
    // Pushing inward flips light normal perception or creates depth shadow
    vec3 N = normalize(vec3(bevelNormal * highlight * mix(1.0, -1.0, localPressed), 1.5));
    vec3 L = normalize(vec3(-0.6, 0.6, 1.0));
    float ndotl = max(dot(N, L), 0.0);
    
    color += ndotl * highlight * 0.35 * (1.0 - hover * 0.5);
    color = mix(color, vec3(1.0), highlight * mix(0.1, 0.3, localPressed));
    
    // Deepen boundary gaps when pushed
    float pressBoundary = boundary + smoothstep(0.7, 1.0, maxEdge) * localPressed * 0.4;
    color *= (1.0 - clamp(pressBoundary, 0.0, 1.0) * 0.7);
    
    // Overall shadow for pressed blocks
    color *= mix(1.0, 0.8, localPressed);
    
    // Minimal contrast bump
    color = pow(color, vec3(0.9));
    
    gl_FragColor = vec4(color, 1.0);
}
`;

// Helper component handling texture load & "object-fit: contain" plane aspect
const GlassBrickPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    
    const [texParams, setTexParams] = useState<{tex: THREE.Texture | null, w: number, h: number}>({ tex: null, w: 1, h: 1 });
    
    const targetMouse = useRef(new THREE.Vector2(2.0, 2.0)); 
    const currentMouse = useRef(new THREE.Vector2(2.0, 2.0));
    const targetPressed = useRef(0.0);
    const currentPressed = useRef(0.0);
    const accumulatedTime = useRef(0);

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
                const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
                grad.addColorStop(0, '#e0c3fc');
                grad.addColorStop(1, '#8ec5fc');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 1024, 1024);
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.beginPath(); ctx.arc(300, 300, 200, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(800, 700, 350, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(200, 800, 150, 0, Math.PI * 2); ctx.fill();
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
        u_mouse: { value: new THREE.Vector2(2.0, 2.0) },
        u_time: { value: 0 },
        u_pressed: { value: 0 }
    }), []);
    
    // "Object-fit: contain" logic natively for the 3D Plane Mesh.
    // This perfectly averts UV stretching and aligns grid correctly inside the fragment.
    const planeSize = useMemo(() => {
        let planeW = viewport.width;
        let planeH = viewport.height;
        
        if (texParams.w > 1 && texParams.h > 1) {
            const screenAspect = viewport.width / viewport.height;
            const texAspect = texParams.w / texParams.h;
            
            if (screenAspect > texAspect) {
                // Screen is wider than video (letterboxing left/right)
                planeH = viewport.height;
                planeW = planeH * texAspect;
            } else {
                // Screen is taller than video (letterboxing top/bottom)
                planeW = viewport.width;
                planeH = planeW / texAspect;
            }
        }
        return [planeW, planeH] as [number, number];
    }, [viewport.width, viewport.height, texParams.w, texParams.h]);

    useEffect(() => {
        if (materialRef.current && texParams.tex) {
            // Provide resolution in actual real-world pixel values of the fitted plane
            // so shader aspect ratio logic results in perfect squares without distortion.
            const ratio = size.width / viewport.width; 
            materialRef.current.uniforms.u_res.value.set(planeSize[0] * ratio, planeSize[1] * ratio);
            materialRef.current.uniforms.u_tex.value = texParams.tex;
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
                if (e.uv && texParams.tex) {
                    targetMouse.current.set(e.uv.x, e.uv.y);
                }
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
            {/* Contains preserving original aspect */}
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

const GlassBrick2: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    return (
        <div className="canvas-container bg-[#1a1a1a] flex items-center justify-center">
            {/* The canvas fills the container window natively, but the mesh inside will strictly shrink to contain ratio with letterboxing */}
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: false }}
                camera={{ position: [0, 0, 1] }}
                className="w-full h-full"
            >
                <GlassBrickPlane />
            </Canvas>
            <InteractionUI title="05 glass brick" />
        </div>
    );
};

export default GlassBrick2;
