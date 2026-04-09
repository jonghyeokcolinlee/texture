"use client";
import React, { useRef, useMemo, useState, useEffect } from 'react';
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

    float mobileScale = max(1.0, u_resolution.y / u_resolution.x); 

    for(int i = 0; i < 20; i++) {
        if(i >= u_rippleCount) break;
        
        vec4 r = u_ripples[i];
        float age = u_time - r.z;
        if(age > 0.0 && age < 5.0) { 
            vec2 vel = u_rippleVels[i];
            vec2 currentCenter = r.xy + vel * age; 
            vec2 d = uv - currentCenter;
            
            d.x *= u_resolution.x / u_resolution.y;
            d *= mobileScale;
            float dist = length(d);
            
            float isMoving = length(vel) > 0.01 ? 1.0 : 0.0;
            float speed = mix(0.35, 0.6, isMoving); 
            
            float freq = mix(20.0, 40.0, isMoving); 
            float decay = mix(1.0, 1.5, isMoving);
            
            float wavePhase = (dist - age * speed) * freq;
            
            if (dist < age * speed) {
                float edgeFade = smoothstep(age * speed, age * speed - 0.05, dist);
                float centerFade = smoothstep(0.0, mix(0.15, 0.05, isMoving), dist);
                float timeFade = smoothstep(5.0, 3.5, age);
                
                float envelope = exp(-age * decay) * r.w * edgeFade * centerFade * timeFade;
                float derivative = cos(wavePhase) * freq;
                
                float dInfluence = derivative * envelope * mix(0.12, 0.05, isMoving);
                if (dist > 0.001) {
                    normalOffset += (d / dist) * dInfluence;
                }
            }
        }
    }
    
    // Normal vector
    vec3 N = normalize(vec3(-normalOffset.x, -normalOffset.y, 1.0));
    
    // Pure White surface aesthetic
    vec3 baseColor = vec3(1.0); 
    
    // Calculate wave intensity
    float waveIntensity = smoothstep(0.01, 0.5, length(normalOffset));
    
    // Light calculation for subtle grey shading
    vec3 lightDir = normalize(vec3(0.5, 0.7, 1.0));
    float ndotl = dot(N, lightDir);
    float shadow = smoothstep(1.0, 0.5, ndotl);
    
    // (변경점) 채도를 0으로 없앤 무채색(Achromatic) 설정 + 그림자의 강도를 약하게(옅게) 조절
    // 0.7 -> 0.88 로 밝혀서 그림자가 훨씬 연하고 모던하게 지도록 
    vec3 waveColor = mix(vec3(1.0), vec3(0.88, 0.88, 0.88), shadow);
    
    // Mix the flat white canvas with the light grey wave sections
    vec3 color = mix(baseColor, waveColor, waveIntensity);
    
    // Crisp specular highlight
    vec3 L = normalize(vec3(0.6, 0.8, 1.0)); 
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 30.0); 
    
    color = mix(color, vec3(1.0), spec * waveIntensity); 

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

const WaterPlane = ({ isPlaying }: { isPlaying: boolean }) => {
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const accumulatedTimeRef = useRef(0);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const nextId = useRef(0);
    const lastClickTimeRef = useRef(0);
    
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
            u_rippleVels: { value: new Array(20).fill(null).map(() => new THREE.Vector2()) },
            u_rippleCount: { value: 0 },
        }),
        [size]
    );

    useFrame((state, delta) => {
        if (!isPlayingRef.current) return;
        if (materialRef.current) {
            if (isPlayingRef.current) { accumulatedTimeRef.current += delta; }
            const currentTime = accumulatedTimeRef.current;
            materialRef.current.uniforms.u_time.value = currentTime;

            const activeRipples = ripples.filter(r => currentTime - r.startTime < 5.0);
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
        }
    });

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        if (!isPlayingRef.current) return;
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
                vx: 0, 
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

const WaterMaterial6: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // For consistency with other interactions, we remove pause/play from screen but keep logic intact
    const [isPlaying, setIsPlaying] = useState(true);

    return (
        <div className="canvas-container bg-white">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: false }}
                camera={{ position: [0, 0, 1] }}
            >
                <WaterPlane isPlaying={isPlaying} />
            </Canvas>
            <InteractionUI />
        </div>
    );
};

export default WaterMaterial6;
