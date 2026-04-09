"use client";
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = `
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_interact;
varying vec2 vUv;

// Noise function for crinkling texture
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 p = vUv * 4.0;
    
    // Sharp folds: Use absolute difference of noise to create "ridges"
    float folds = 0.0;
    float amp = 1.0;
    vec2 shift = u_mouse * 0.5;
    
    for(int i=0; i<4; i++) {
        // High frequency crinkles that respond to interaction
        float n = noise(p + u_time * 0.05 + shift * u_interact * float(i+1));
        folds += amp * abs(n - 0.5) * 2.0;
        p *= 2.5;
        amp *= 0.45;
    }
    
    // Invert and sharpen folds for that "crinkled plastic" look
    folds = pow(1.0 - folds, 3.0);
    
    // Normal estimation from fold gradient
    float eps = 0.01;
    float f_x = noise(p + vec2(eps, 0.0)) - noise(p - vec2(eps, 0.0));
    float f_y = noise(p + vec2(0.0, eps)) - noise(p - vec2(0.0, eps));
    vec3 N = normalize(vec3(-f_x * 5.0, -f_y * 5.0, 1.0));
    
    // Lighting
    vec3 L = normalize(vec3(1.0, 1.0, 2.0));
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);
    
    float diff = max(0.0, dot(N, L));
    float spec = pow(max(0.0, dot(N, H)), 50.0);
    
    // Base plastic color (Off-white with subtle translucency)
    vec3 baseCol = vec3(0.96, 0.97, 0.98);
    // Darker in the folds
    vec3 finalColor = baseCol * (diff * 0.4 + 0.6) + vec3(1.0) * spec * 0.5;
    finalColor *= mix(0.8, 1.0, folds);
    
    // Add micro-highlights on the ridges
    float ridges = smoothstep(0.1, 0.0, folds);
    finalColor += ridges * 0.15;

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const VinylPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { viewport } = useThree();
    const targetMouse = useRef({ x: 0, y: 0 });
    const currentMouse = useRef({ x: 0, y: 0 });
    const interactScale = useRef(0);

    useFrame((state) => {
        if (!materialRef.current) return;
        
        // Interaction smoothing
        const dx = targetMouse.current.x - currentMouse.current.x;
        const dy = targetMouse.current.y - currentMouse.current.y;
        currentMouse.current.x += dx * 0.1;
        currentMouse.current.y += dy * 0.1;

        // Interaction "velocity" based crinkling
        const speed = Math.sqrt(dx*dx + dy*dy);
        interactScale.current += (speed * 5.0 - interactScale.current) * 0.1;
        interactScale.current = Math.max(0.2, Math.min(2.0, interactScale.current));

        materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
        materialRef.current.uniforms.u_mouse.value.set(currentMouse.current.x, currentMouse.current.y);
        materialRef.current.uniforms.u_interact.value = interactScale.current;
    });

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            targetMouse.current = {
                x: (e.clientX / window.innerWidth) * 2 - 1,
                y: -(e.clientY / window.innerHeight) * 2 + 1
            };
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    return (
        <mesh>
            <planeGeometry args={[viewport.width, viewport.height]} />
            <shaderMaterial
                ref={materialRef}
                fragmentShader={fragmentShader}
                vertexShader={vertexShader}
                uniforms={{
                    u_time: { value: 0 },
                    u_mouse: { value: new THREE.Vector2() },
                    u_interact: { value: 0 }
                }}
           />
        </mesh>
    );
};

const WhiteVinyl1: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    return (
        <div className="canvas-container bg-[#eee] cursor-move relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 1] }} 
                className="w-full h-full"
            >
                <VinylPlane />
            </Canvas>
            <div className="absolute bottom-10 left-10 text-black/30 uppercase text-[10px] tracking-[0.2em] pointer-events-none">
                move to crinkle / white plastic vinyl
            </div>
            <InteractionUI />
        </div>
    );
};

export default WhiteVinyl1;
