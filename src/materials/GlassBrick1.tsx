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
uniform vec2 u_res;
uniform vec2 u_videoRes;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_pressed;
uniform int u_hasVideo;

varying vec2 vUv;

const float tiles = 15.0; // number of tiles vertically

vec2 coverUv(vec2 uv) {
    if (u_hasVideo == 0) return uv; // 텍스처가 없을 때는 기본 UV 반환
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
    p.x *= aspect; // maintain squares
    
    // Grid segmentation
    vec2 gridId = floor(p * tiles);
    vec2 gridUv = fract(p * tiles);
    
    vec2 tileCenterAspect = (gridId + 0.5) / tiles; 
    
    vec2 tileCenter = tileCenterAspect;
    tileCenter.x /= aspect; // revert to 0..1 bounding box
    
    // Noise for per-tile randomness
    float n1 = fract(sin(dot(gridId, vec2(12.9898, 78.233))) * 43758.5453);
    float n2 = fract(sin(dot(gridId, vec2(39.346, 11.135))) * 43758.5453);
    
    // Hover and Press interaction logic
    vec2 mouseAspect = u_mouse;
    mouseAspect.x *= aspect;
    float distToMouse = length(tileCenterAspect - mouseAspect);
    
    float localHover = smoothstep(0.35, 0.0, distToMouse);
    float localPressed = localHover * u_pressed;
    
    // Magnification & Base Distortion
    // Base zoom is slightly magnified (0.8) to simulate thick glass
    // Pushed inward increases magnification mapping (0.6 means closer to center UV = closer zoom)
    float zoom = mix(0.85, 0.60, localPressed);
    
    vec2 sampleUv = tileCenter + (vUv - tileCenter) * zoom;
    
    // Refraction Shift per tile to scramble layout like a mosaic wall
    vec2 staticShift = (vec2(n1, n2) - 0.5) * 0.06;
    sampleUv += staticShift * (1.0 - localPressed * 0.8);
    
    // Idle subtle animation (swimming glass)
    sampleUv += vec2(sin(u_time * 0.5 + n1*10.0), cos(u_time * 0.5 + n2*10.0)) * 0.002;
    
    // Hover shifts nearby tiles outwards like pressure
    vec2 pushDir = normalize(tileCenterAspect - mouseAspect + 0.0001);
    sampleUv += pushDir * localHover * 0.03 * (1.0 - localPressed);
    
    // Blur factor (less blur when pushed)
    float blur = mix(0.008, 0.000, localPressed); 
    blur *= mix(0.5, 1.5, fract(n1 * 123.456)); // varying blur per tile
    
    vec2 ca = vec2(0.004, 0.0) * (1.0 + localHover * 0.5 + localPressed * 1.5);
    
    // Map to object-fit video area
    vec2 sR0 = coverUv(sampleUv + ca);
    vec2 sR1 = coverUv(sampleUv + ca + vec2(blur, blur));
    vec2 sR2 = coverUv(sampleUv + ca + vec2(-blur, -blur));
    
    vec2 sG0 = coverUv(sampleUv);
    vec2 sG1 = coverUv(sampleUv + vec2(blur, -blur));
    vec2 sG2 = coverUv(sampleUv + vec2(-blur, blur));
    
    vec2 sB0 = coverUv(sampleUv - ca);
    vec2 sB1 = coverUv(sampleUv - ca + vec2(0.0, blur));
    vec2 sB2 = coverUv(sampleUv - ca + vec2(0.0, -blur));
    
    // Fallback background color if webcam is blocked
    vec3 colR = u_hasVideo == 1 ? (texture2D(u_tex, sR0).r * 2.0 + texture2D(u_tex, sR1).r + texture2D(u_tex, sR2).r) / 4.0 : vec3(0.9, 0.9, 0.95).r;
    vec3 colG = u_hasVideo == 1 ? (texture2D(u_tex, sG0).g * 2.0 + texture2D(u_tex, sG1).g + texture2D(u_tex, sG2).g) / 4.0 : vec3(0.9, 0.9, 0.95).g;
    vec3 colB = u_hasVideo == 1 ? (texture2D(u_tex, sB0).b * 2.0 + texture2D(u_tex, sB1).b + texture2D(u_tex, sB2).b) / 4.0 : vec3(0.9, 0.9, 0.95).b;
    
    vec3 color = vec3(colR, colG, colB);
    
    // Block Boundary & Soft Bevel Edge
    vec2 edgeVec = abs(gridUv - 0.5) * 2.0; 
    // Smooth rounded rect calculation
    float maxEdge = pow(pow(edgeVec.x, 8.0) + pow(edgeVec.y, 8.0), 1.0/8.0); 
    
    float highlight = smoothstep(0.85, 0.95, maxEdge);
    float boundary = smoothstep(0.95, 1.0, maxEdge);
    
    // Fake Bevel Normal Lighting
    vec2 bevelNormal = (gridUv - 0.5) * 2.0;
    vec3 N = normalize(vec3(bevelNormal * highlight, 1.5));
    vec3 L = normalize(vec3(-0.6, 0.6, 1.0));
    float ndotl = max(dot(N, L), 0.0);
    
    // Apple-like clean soft highlight
    vec3 highlightColor = vec3(1.0);
    // Add bright edge when facing light
    color += ndotl * highlight * 0.45 * (1.0 - localPressed * 0.5);
    // Slight frosty overlay on the edge gap
    color = mix(color, highlightColor, highlight * 0.15 * (1.0 - localPressed));
    
    // Depth push gap shadow: Thicken boundary and darken when pushed inward
    float pressBoundary = boundary + smoothstep(0.6, 1.0, maxEdge) * localPressed * 0.6;
    color *= (1.0 - clamp(pressBoundary, 0.0, 1.0) * 0.85);
    
    // Overall dimming on press to simulate shadow depth
    color *= mix(1.0, 0.75, localPressed);
    
    // Subtle contrast touch up
    color = pow(color, vec3(0.95));
    
    gl_FragColor = vec4(color, 1.0);
}
`;

const GlassBrickPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    
    const [video, setVideo] = useState<HTMLVideoElement | null>(null);
    const textureRef = useRef<THREE.VideoTexture | null>(null);
    const hasVideo = useRef(0);
    
    const targetMouse = useRef(new THREE.Vector2(2.0, 2.0)); // Offscreen initial
    const currentMouse = useRef(new THREE.Vector2(2.0, 2.0));
    
    const targetPressed = useRef(0.0);
    const currentPressed = useRef(0.0);

    const accumulatedTime = useRef(0);

    // Initialize Webcam
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const v = document.createElement('video');
            v.crossOrigin = "Anonymous";
            v.loop = true;
            v.muted = true;
            v.playsInline = true;
            v.autoplay = true;

            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(stream => {
                    v.srcObject = stream;
                    v.play();
                    setVideo(v);
                }).catch(err => {
                    console.warn("Webcam access denied or unavailable", err);
                });
            
            return () => {
                if (v.srcObject) {
                    const stream = v.srcObject as MediaStream;
                    stream.getTracks().forEach(track => track.stop());
                }
            };
        }
    }, []);

    useEffect(() => {
        if (video) {
            textureRef.current = new THREE.VideoTexture(video);
            textureRef.current.minFilter = THREE.LinearFilter;
            textureRef.current.magFilter = THREE.LinearFilter;
            hasVideo.current = 1;
        }
    }, [video]);

    const uniforms = useMemo(() => ({
        u_tex: { value: null },
        u_res: { value: new THREE.Vector2(0, 0) },
        u_videoRes: { value: new THREE.Vector2(1, 1) },
        u_mouse: { value: new THREE.Vector2(2.0, 2.0) },
        u_time: { value: 0 },
        u_pressed: { value: 0 },
        u_hasVideo: { value: 0 }
    }), []);
    
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_res.value.set(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio);
        }
    }, [size]);

    useFrame((state, delta) => {
        const mat = materialRef.current;
        if (!mat) return;
        
        accumulatedTime.current += delta;
        mat.uniforms.u_time.value = accumulatedTime.current;
        
        if (textureRef.current && video) {
            mat.uniforms.u_tex.value = textureRef.current;
            mat.uniforms.u_hasVideo.value = hasVideo.current;
            
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                mat.uniforms.u_videoRes.value.set(video.videoWidth, video.videoHeight);
            }
        }
        
        // Smooth lerps for aesthetic physical interaction
        currentMouse.current.lerp(targetMouse.current, 0.1);
        currentPressed.current += (targetPressed.current - currentPressed.current) * 0.15;
        
        mat.uniforms.u_mouse.value.copy(currentMouse.current);
        mat.uniforms.u_pressed.value = currentPressed.current;
    });

    return (
        <mesh
            onPointerMove={(e) => {
                if (e.uv) {
                    targetMouse.current.set(e.uv.x, e.uv.y);
                }
            }}
            onPointerDown={(e) => {
                if (e.uv) targetMouse.current.set(e.uv.x, e.uv.y);
                targetPressed.current = 1.0;
            }}
            onPointerUp={() => { targetPressed.current = 0.0; }}
            onPointerLeave={() => { 
                targetPressed.current = 0.0; 
                targetMouse.current.set(2.0, 2.0); // Move away
            }}
        >
            <planeGeometry args={[viewport.width, viewport.height]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
           />
        </mesh>
    );
};

const GlassBrick1: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    return (
        <div className="canvas-container bg-white">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: false }}
                camera={{ position: [0, 0, 1] }}
            >
                <GlassBrickPlane />
            </Canvas>
            {/* Webcam disclaimer overlay for UX (only briefly, or just leave minimalistic) */}
            <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-black/30 text-xs tracking-wide">
                Camera access required for glass brick reflection
            </div>
            <InteractionUI />
        </div>
    );
};

export default GlassBrick1;
