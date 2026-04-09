"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
varying vec3 vLocalPos;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vTangent;

void main() {
    vUv = uv;
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

varying vec2 vUv;
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
    // 1. CD Geometry (radius check)
    float radius = length(vLocalPos.xz);
    if (radius < 0.18 || radius > 1.0) {
        discard;
    }

    // 2. Vectors
    vec3 N = normalize(vNormal);
    vec3 V = normalize(u_cameraPos - vWorldPos);
    vec3 L = normalize(u_lightDir);
    vec3 T = normalize(vTangent); 

    // 3. Diffraction Logic (Anisotropic interference)
    // Add divergence to light to simulate environment spread and force colors
    vec3 L2 = normalize(L + T * 0.1); 
    vec3 V2 = normalize(V - T * 0.1);

    float dotL2T = dot(L2, T);
    float dotV2T = dot(V2, T);
    
    // Primary diffraction term
    float u = dotL2T - dotV2T; 
    
    // Selection: Is it a cap or the edge?
    // Local Y is depth. -0.01 to 0.01
    bool isCap = abs(vLocalPos.y) > 0.005;

    vec3 finalColor = vec3(0.1); // Dark base

    if (isCap) {
        // Rainbow orders
        float spread = 5.0; 
        for(float m = 1.0; m <= 3.0; m++) {
            float w = abs(u) * spread / m + (radius * 0.05); // Radius offset for variation
            vec3 spectral = spectralColor(w);
            
            // Masking higher orders for realism
            float mask = smoothstep(0.0, 0.4, w) * smoothstep(1.8, 0.9, w);
            finalColor += spectral * mask * (1.5 / m);
        }
        
        // Specular Streak
        vec3 H = normalize(L + V);
        float HdotT = dot(H, T);
        float specStreak = pow(max(1.0 - HdotT * HdotT, 0.0), 120.0);
        finalColor += vec3(1.0) * specStreak * 1.5;

        // Ambient Silver
        float dotLN = clamp(dot(N, L), 0.0, 1.0);
        finalColor += vec3(0.2) * dotLN + vec3(0.05);
    } else {
        // Edge silver
        float dotLN = clamp(dot(N, L), 0.0, 1.0);
        finalColor = vec3(0.5, 0.52, 0.55) * dotLN + vec3(0.1);
    }

    // Edge fading
    float fade = smoothstep(0.98, 1.0, radius);
    finalColor *= (1.0 - fade);

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

const DiscMesh = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const { viewport } = useThree();
    
    const targetInput = useRef({ x: 0, y: 0 });
    const currentInput = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
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
        
        const maxTilt = 0.45;
        // Flip CD 180 degrees initially to ensure we see iridescence cap
        meshRef.current.rotation.x = Math.PI / 2 + currentInput.current.y * maxTilt;
        meshRef.current.rotation.y = currentInput.current.x * maxTilt;
        
        uniforms.u_cameraPos.value.copy(state.camera.position);

        const lx = currentInput.current.x * 5.0; 
        const ly = currentInput.current.y * 5.0; 
        const lz = 2.0; 
        materialRef.current.uniforms.u_lightDir.value.set(lx, ly, lz).normalize();
    });
    
    const cdScale = 1.35; 

    return (
        <mesh ref={meshRef} scale={[cdScale, cdScale, cdScale]}>
            <cylinderGeometry args={[1, 1, 0.015, 64]} />
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

    return (
        <div className="canvas-container bg-[#080808] cursor-grab active:cursor-grabbing relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 5], fov: 30 }} 
                className="w-full h-full"
            >
                <DiscMesh />
            </Canvas>
            <InteractionUI />
        </div>
    );
};

export default CDIridescence2;
