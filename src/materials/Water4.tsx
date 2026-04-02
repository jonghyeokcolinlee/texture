"use client";
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';

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
uniform vec2 u_rippleVels[20]; // vx, vy
uniform int u_rippleCount;

varying vec2 vUv;

float random(in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(random(i), random(i + vec2(1.0, 0.0)), u.x),
               mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), u.x), u.y);
}

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
    
    vec2 p = vUv * 15.0;
    float timeSlow = u_time * 0.2;
    float baseBump = fbm(p + timeSlow);
    
    vec2 eps = vec2(0.02, 0.0);
    float dX = fbm(p + eps.xy + timeSlow) - baseBump;
    float dY = fbm(p + eps.yx + timeSlow) - baseBump;
    vec2 normalOffset = vec2(dX, dY) * 2.5;

    // Mobile specific scaling modifier
    float mobileScale = max(1.0, u_resolution.y / u_resolution.x); 

    for(int i = 0; i < 20; i++) {
        if(i >= u_rippleCount) break;
        
        vec4 r = u_ripples[i];
        float age = u_time - r.z;
        if(age > 0.0 && age < 4.0) {
            vec2 vel = u_rippleVels[i];
            vec2 currentCenter = r.xy + vel * age; 
            vec2 d = uv - currentCenter;
            
            // Apply proper circle ratio and dynamic screen scaling to prevent huge blobs on mobile
            d.x *= u_resolution.x / u_resolution.y;
            d *= mobileScale;
            float dist = length(d);
            
            // Adjust speed based on whether it's a moving droplet or a static click
            float isMoving = length(vel) > 0.01 ? 1.0 : 0.0;
            float speed = mix(0.35, 0.6, isMoving); 
            
            // Faster frequency for droplets to look like dense small splashes
            float freq = mix(20.0, 40.0, isMoving); 
            float decay = mix(1.0, 1.5, isMoving);
            
            float wavePhase = (dist - age * speed) * freq;
            
            if (dist < age * speed) {
                float edgeFade = smoothstep(age * speed, age * speed - 0.05, dist);
                float centerFade = smoothstep(0.0, mix(0.15, 0.05, isMoving), dist);
                
                float envelope = exp(-age * decay) * r.w * edgeFade * centerFade;
                float derivative = cos(wavePhase) * freq;
                
                float dInfluence = derivative * envelope * mix(0.12, 0.05, isMoving);
                if (dist > 0.001) {
                    normalOffset += (d / dist) * dInfluence;
                }
            }
        }
    }
    
    vec3 N = normalize(vec3(-normalOffset.x, -normalOffset.y, 1.0));
    vec3 L = normalize(vec3(0.6, 0.8, 1.0)); 
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);
    
    vec3 baseColor = vec3(0.12, 0.13, 0.14); 
    vec3 color = baseColor;
    
    float dotNH = max(dot(N, H), 0.0);
    float spec = pow(dotNH, 15.0); 
    float glint = smoothstep(0.55, 0.65, spec); 
    
    color += vec3(0.15, 0.16, 0.18) * spec * 0.5; 
    color += vec3(1.0, 1.0, 1.0) * glint; 

    gl_FragColor = vec4(color, 1.0);
}
`;

type Ripple = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    startTime: number;
    intensity: number;
};

const WaterPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const nextId = useRef(0);
    const lastClickTimeRef = useRef(0);
    
    // Mediapipe references
    const videoElementRef = useRef<HTMLVideoElement | null>(null);
    const handLandmarkerRef = useRef<any>(null);
    const lastHandPosRef = useRef<{ x: number, y: number, z: number } | null>(null);

    const uniforms = useMemo(
        () => ({
            u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
            u_time: { value: 0 },
            u_ripples: { value: new Array(20).fill(null).map(() => new THREE.Vector4()) },
            u_rippleVels: { value: new Array(20).fill(null).map(() => new THREE.Vector2()) },
            u_rippleCount: { value: 0 },
        }),
        [size]
    );

    useEffect(() => {
        let isActive = true;
        
        const initMediapipe = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                if (!isActive) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                const video = document.createElement("video");
                video.srcObject = stream;
                video.playsInline = true;
                video.muted = true;
                await video.play();
                videoElementRef.current = video;

                const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );
                
                handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1
                });
            } catch (err) {
                console.log("Hand tracking init skipped or failed (camera permissions):", err);
            }
        };
        initMediapipe();

        return () => {
            isActive = false;
            if (videoElementRef.current && videoElementRef.current.srcObject) {
                (videoElementRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }
            if (handLandmarkerRef.current) {
                handLandmarkerRef.current.close();
            }
        };
    }, []);

    useFrame((state) => {
        if (materialRef.current) {
            const currentTime = state.clock.elapsedTime;
            materialRef.current.uniforms.u_time.value = currentTime;

            // Update ripples uniform
            const activeRipples = ripples.filter(r => currentTime - r.startTime < 4.0);
            if (activeRipples.length !== ripples.length) {
                setRipples(activeRipples);
            }

            const MAX_RIPPLES = 20;
            const count = Math.min(activeRipples.length, MAX_RIPPLES);
            materialRef.current.uniforms.u_rippleCount.value = count;

            for (let i = 0; i < MAX_RIPPLES; i++) {
                if (i < count) {
                    const r = activeRipples[i];
                    materialRef.current.uniforms.u_ripples.value[i].set(r.x, r.y, r.startTime, r.intensity);
                    materialRef.current.uniforms.u_rippleVels.value[i].set(r.vx, r.vy);
                } else {
                    materialRef.current.uniforms.u_ripples.value[i].set(0, 0, 0, 0);
                    materialRef.current.uniforms.u_rippleVels.value[i].set(0, 0);
                }
            }

            // Detect Flick/Shake
            if (videoElementRef.current && handLandmarkerRef.current && videoElementRef.current.readyState >= 2) {
                const results = handLandmarkerRef.current.detectForVideo(videoElementRef.current, performance.now());
                if (results.landmarks && results.landmarks.length > 0) {
                    const hand = results.landmarks[0];
                    const wrist = hand[0]; // Landmark 0 is the wrist
                    
                    if (lastHandPosRef.current) {
                        const dx = wrist.x - lastHandPosRef.current.x;
                        const dy = wrist.y - lastHandPosRef.current.y;
                        const dz = wrist.z - lastHandPosRef.current.z;
                        
                        // Velocity magnitude
                        const speed = Math.sqrt(dx*dx + dy*dy + dz*dz);
                        
                        // If hand moves super fast between frames (>0.08 normalized units)
                        if (speed > 0.08) {
                            spawnFlickWater(1.0 - wrist.x, wrist.y, dx, dy);
                        }
                    }
                    lastHandPosRef.current = { x: wrist.x, y: wrist.y, z: wrist.z };
                } else {
                    lastHandPosRef.current = null; // reset if lost
                }
            }
        }
    });

    const spawnFlickWater = (uvX: number, uvY: number, dx: number, dy: number) => {
        const now = performance.now();
        // Debounce heavily to prevent 60fps spawning cascades
        if (now - lastClickTimeRef.current < 150) return; 
        lastClickTimeRef.current = now;
        
        setRipples(prev => {
            const numDrops = 4 + Math.floor(Math.random() * 4); // 4-7 drops
            const newRips = [];
            for (let i=0; i<numDrops; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spread = Math.random() * 0.3; // Splash outward velocity
                
                // Add hand momentum + random directional scatter
                const vx = -dx * 1.5 + Math.cos(angle) * spread; // Invert dx because camera X is usually flipped
                const vy = dy * 1.5 + Math.sin(angle) * spread;

                newRips.push({
                    id: nextId.current++,
                    x: uvX + (Math.random() - 0.5) * 0.1, // tiny offset so they don't exactly overlap
                    y: uvY + (Math.random() - 0.5) * 0.1,
                    vx,
                    vy,
                    startTime: materialRef.current?.uniforms.u_time.value || 0,
                    intensity: 0.5 + Math.random() * 0.5 
                });
            }
            return [...prev, ...newRips].slice(-20);
        });
    };

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const currentTime = performance.now();
        const dt = currentTime - lastClickTimeRef.current;

        let intensity = 1.0;
        if (dt < 200) intensity = 2.0; 
        else if (dt < 500) intensity = 1.5;
        lastClickTimeRef.current = currentTime;

        let uvX = e.uv?.x ?? 0.5;
        let uvY = e.uv?.y ?? 0.5;

        setRipples(prev => {
            const newRips = [...prev, {
                id: nextId.current++,
                x: uvX,
                y: uvY,
                vx: 0, // static click
                vy: 0,
                startTime: materialRef.current?.uniforms.u_time.value || 0,
                intensity
            }];
            if (newRips.length > 20) return newRips.slice(newRips.length - 20);
            return newRips;
        });
    };

    return (
        <mesh onPointerDown={handlePointerDown}>
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

const WaterMaterial: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useExport(canvasRef, 'water-ripple.png');

    return (
        <div className="canvas-container">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: false }}
                camera={{ position: [0, 0, 1] }}
            >
                <WaterPlane />
            </Canvas>
        </div>
    );
};

export default WaterMaterial;

