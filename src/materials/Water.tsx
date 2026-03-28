import React, { useRef, useMemo, useState } from 'react';
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
`;

type Ripple = {
    id: number;
    x: number;
    y: number;
    startTime: number;
    intensity: number;
};

const WaterPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const nextId = useRef(0);
    const lastClickTimeRef = useRef(0);

    const uniforms = useMemo(
        () => ({
            u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
            u_time: { value: 0 },
            u_ripples: { value: new Array(20).fill(null).map(() => new THREE.Vector4()) },
            u_rippleCount: { value: 0 },
        }),
        [size]
    );

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;

            const currentTime = state.clock.elapsedTime;
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
