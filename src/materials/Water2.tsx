"use client";
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

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
`;

type Ripple = {
    id: number;
    x: number;
    y: number;
    startTime: number;
    intensity: number;
};

const WaterPlane = ({ isPlaying }: { isPlaying: boolean }) => {
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const accumulatedTimeRef = useRef(0);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const nextId = useRef(0);
    const lastClickTimeRef = useRef(0);

    
    // Update resolution on window resize / size change
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_resolution.value.set(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio);
        }
    }, [size]);
const uniforms = useMemo(
        () => ({
            u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
            u_time: { value: 0 },
            u_ripples: { value: new Array(20).fill(null).map(() => new THREE.Vector4()) },
            u_rippleCount: { value: 0 },
        }),
        [size]
    );

    
    
  
    
    useFrame((state, delta) => {
        if (!isPlayingRef.current) return;
        if (materialRef.current) {
            materialRef.current.uniforms.u_time.value = accumulatedTimeRef.current;

            if (isPlayingRef.current) { accumulatedTimeRef.current += delta; }
            const currentTime = accumulatedTimeRef.current;
            // Filter out old ripples
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
                } else {
                    materialRef.current.uniforms.u_ripples.value[i].set(0, 0, 0, 0);
                }
            }
        }
    });

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        if (!isPlayingRef.current) return;
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

        setRipples(prev => {
            const newRips = [...prev, {
                id: nextId.current++,
                x: uvX,
                y: uvY,
                startTime: materialRef.current?.uniforms.u_time.value || 0,
                intensity
            }];
            // Optional: slice to keep under 20
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
    const [isPlaying, setIsPlaying] = useState(true);

    return (
        <div className="canvas-container">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: false }}
                camera={{ position: [0, 0, 1] }}
            >
                <WaterPlane isPlaying={isPlaying} />
            </Canvas>
            <InteractionUI title="02 scattered puddle" isPlaying={isPlaying} onTogglePlay={() => setIsPlaying(!isPlaying)} />
        </div>
    );
};

export default WaterMaterial;
