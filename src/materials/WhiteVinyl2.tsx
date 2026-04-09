"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = `
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_interact; // Intensity of rustling
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Worley Noise for crushed structure
float worley(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float d = 1.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 b = vec2(float(x), float(y));
            vec2 r = b - f + hash(i + b);
            d = min(d, dot(r, r));
        }
    }
    return sqrt(d);
}

void main() {
    vec2 uv = vUv;
    
    // Distort UVs based on mouse interaction for "physical grab" feel
    float distToMouse = length(uv - u_mouse);
    float grab = smoothstep(0.4, 0.0, distToMouse) * u_interact;
    vec2 displacedUv = uv + (uv - u_mouse) * grab * 0.15;
    
    // Multi-scale crushed folds
    float folds = 0.0;
    float w1 = worley(displacedUv * 3.5 + u_time * 0.02);
    float w2 = worley(displacedUv * 8.0 - u_time * 0.03);
    float w3 = worley(displacedUv * 20.0 + grab * 5.0);
    
    // Sharp ridged noise
    folds = (1.0 - w1) * 0.5 + (1.0 - w2) * 0.3 + (1.0 - w3) * 0.2;
    folds = pow(folds, 4.0 + u_interact * 2.0); // Sharpen based on interaction
    
    // Normal calculation from ridges
    vec3 N = normalize(vNormal);
    float eps = 0.05;
    float f_x = (1.0 - worley((displacedUv + vec2(eps,0)) * 8.0)) - (1.0 - worley((displacedUv - vec2(eps,0)) * 8.0));
    float f_y = (1.0 - worley((displacedUv + vec2(0,eps)) * 8.0)) - (1.0 - worley((displacedUv - vec2(0,eps)) * 8.0));
    N = normalize(N + vec3(f_x, f_y, 0.0) * 1.5);

    // Lighting
    vec3 L = normalize(vec3(1.0, 1.0, 1.5));
    vec3 V = normalize(vViewDir);
    float dotNL = max(0.0, dot(N, L));
    
    // Sharp plastic specular (Rustling sparkles)
    float spec = pow(max(0.0, dot(reflect(-L, N), V)), 40.0 + grab * 20.0);
    
    // Subsurface scattering-like white base
    vec3 color = vec3(0.95, 0.96, 0.98); 
    color = color * (dotNL * 0.3 + 0.7) + vec3(1.0) * spec * 0.5;
    
    // Shadow in deep folds
    color *= mix(0.7, 1.0, smoothstep(0.0, 0.4, folds));
    
    // Micro Glints on ridges
    float glints = smoothstep(0.12, 0.0, 1.0 - folds) * (0.2 + grab * 0.3);
    color += vec3(1.0) * glints;

    gl_FragColor = vec4(color, 1.0);
}
`;

const VinylScene = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { viewport } = useThree();
    const targetInput = useRef({ x: 0, y: 0 });
    const currentInput = useRef({ x: 0, y: 0 });
    const interactScale = useRef(0);

    useFrame((state) => {
        if (!materialRef.current) return;
        
        // Physics for rustling inertia
        const dx = targetInput.current.x - currentInput.current.x;
        const dy = targetInput.current.y - currentInput.current.y;
        currentInput.current.x += dx * 0.08;
        currentInput.current.y += dy * 0.08;

        const speed = Math.sqrt(dx*dx + dy*dy);
        interactScale.current += (speed * 12.0 - interactScale.current) * 0.15;
        interactScale.current = Math.max(0.05, Math.min(2.5, interactScale.current));

        materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
        materialRef.current.uniforms.u_mouse.value.set(
            (currentInput.current.x + 1) / 2, 
            (currentInput.current.y + 1) / 2
        );
        materialRef.current.uniforms.u_interact.value = interactScale.current;
    });

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            targetInput.current = {
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
                    u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
                    u_interact: { value: 0 }
                }}
           />
        </mesh>
    );
};

const WhiteVinyl2: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    return (
        <div className="canvas-container bg-white cursor-move relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 1] }} 
                className="w-full h-full"
            >
                <VinylScene />
            </Canvas>
            <div className="absolute top-10 right-10 text-black/10 uppercase text-[9px] tracking-[0.3em] pointer-events-none">
                haptic emulation / tactile plastic rustling
            </div>
            <InteractionUI />
        </div>
    );
};

export default WhiteVinyl2;
