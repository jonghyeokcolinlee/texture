"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';

const vertexShader = `
varying vec3 vLocalPos;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vTangent;

void main() {
    vLocalPos = position;
    vNormal = normalize(normalMatrix * normal);
    
    // For Cylinder oriented along Y: tangent is circular on XZ plane
    vec3 localT = vec3(-position.z, 0.0, position.x);
    float tLen = length(localT);
    if (tLen < 0.001) {
        localT = vec3(1.0, 0.0, 0.0);
    } else {
        localT /= tLen;
    }
    
    vTangent = normalize(mat3(modelMatrix) * localT);
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform vec3 u_lightDir;
uniform vec3 u_cameraPos;

varying vec3 vLocalPos;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vTangent;

vec3 spectralColor(float w) {
    float r = 0.5 + 0.5 * cos(6.28318 * (w - 0.00));
    float g = 0.5 + 0.5 * cos(6.28318 * (w - 0.33));
    float b = 0.5 + 0.5 * cos(6.28318 * (w - 0.67));
    return clamp(vec3(r, g, b), 0.0, 1.0);
}

void main() {
    // 1. Hole (discard center)
    float radius = length(vLocalPos.xz);
    if (radius < 0.18) {
        discard;
    }

    // 2. Vectors
    vec3 N = normalize(vNormal);
    vec3 V = normalize(u_cameraPos - vWorldPos);
    vec3 L = normalize(u_lightDir);
    vec3 T = normalize(vTangent); 

    // 3. Surface differentiation
    // Cylinder Y is depth. -0.01 to 0.01.
    // If we rotate X by 90deg, local Y- faces us.
    bool facingCamera = vLocalPos.y < -0.005;

    // 4. CD Interaction (Continuous Iridescence)
    float dotLN = clamp(dot(N, L), 0.0, 1.0);
    float dotLT = dot(L, T);
    float dotVT = dot(V, T);
    
    float u = dotLT - dotVT; 
    float w = abs(u) * 2.5; 
    
    vec3 spectral = spectralColor(w);
    // Saturate and contrast the rainbow for premium high-end feel
    spectral = pow(spectral, vec3(0.6)) * 1.6;
    spectral = clamp(spectral, 0.0, 1.0);
    
    // Specular Streak
    vec3 H = normalize(L + V);
    float HdotT = dot(H, T);
    float specStreak = pow(max(1.0 - HdotT * HdotT, 0.0), 80.0);
    
    vec3 iridescence = spectral * (0.4 + 0.6 * dotLN) + vec3(1.0) * specStreak * 0.9;
    
    // Sub-specular highlight (rim-like effect)
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.3;
    iridescence += vec3(0.8, 0.9, 1.0) * rim;

    // 5. Silver side (The metal layer)
    vec3 silver = vec3(0.7, 0.72, 0.75) * (dotLN * 0.5 + 0.5) + vec3(0.1);
    silver += vec3(1.0) * pow(max(dot(N, H), 0.0), 100.0) * 0.5;

    // 6. Final Color
    vec3 finalColor = facingCamera ? iridescence : silver;
    
    // Micro-groove noise to simulate CD material
    float noise = fract(sin(dot(vLocalPos.xz, vec2(12.9898, 78.233))) * 43758.5453) * 0.02;
    finalColor -= noise;

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

const DiscMesh = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const { viewport, camera } = useThree();
    
    const targetInput = useRef({ x: 0, y: 0 });
    const currentInput = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMove = (e: any) => {
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            targetInput.current = { x, y };
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    const uniforms = useMemo(() => ({
        u_lightDir: { value: new THREE.Vector3(0, 0, 1) },
        u_cameraPos: { value: new THREE.Vector3() }
    }), []);

    useFrame((state) => {
        if (!meshRef.current || !materialRef.current) return;
        
        currentInput.current.x += (targetInput.current.x - currentInput.current.x) * 0.1;
        currentInput.current.y += (targetInput.current.y - currentInput.current.y) * 0.1;
        
        // Orient cylinder cap to camera
        const maxTilt = 0.4;
        meshRef.current.rotation.x = Math.PI / 2 + currentInput.current.y * maxTilt;
        meshRef.current.rotation.y = currentInput.current.x * maxTilt;
        
        // Pass camera position explicitly to be safe
        uniforms.u_cameraPos.value.copy(state.camera.position);

        const lx = currentInput.current.x * 2.0; 
        const ly = currentInput.current.y * 2.0; 
        const lz = 1.8; 
        materialRef.current.uniforms.u_lightDir.value.set(lx, ly, lz).normalize();
    });
    
    // Use a fixed scale that fits the FOV 30 at dist 5 safely
    const meshSize = 1.2; 

    return (
        <mesh ref={meshRef} scale={[meshSize, meshSize, meshSize]}>
            <cylinderGeometry args={[1, 1, 0.02, 64]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
            />
        </mesh>
    );
};

const CDIridescence2: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'cd-iridescence-v2.png') as () => void;

    return (
        <div className="canvas-container bg-[#111] cursor-grab active:cursor-grabbing relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 5], fov: 30 }} 
                className="w-full h-full"
            >
                <DiscMesh />
            </Canvas>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default CDIridescence2;
