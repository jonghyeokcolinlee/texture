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
    // 1. CD Physical Bounds (Radius 0.2 to 1.0)
    float radius = length(vLocalPos.xz);
    if (radius < 0.18 || radius > 1.0) {
        discard;
    }

    // 2. Vectors
    vec3 N = normalize(vNormal);
    vec3 V = normalize(u_cameraPos - vWorldPos);
    vec3 L = normalize(u_lightDir);
    vec3 T = normalize(vTangent); 

    // 3. Selection: Which face are we looking at?
    // With Math.PI/2 X rotation, Y is depth. -0.01 to 0.01.
    // Facing camera is Bottom (Y < 0).
    bool facingCamera = vLocalPos.y < -0.005;

    // 4. Iridescence (Rainbow)
    // To solve the "U=0" problem when light/view are parallel to normal:
    // We add a subtle virtual offset to the vectors to simulate the cone of light
    vec3 offsetV = normalize(V + vec3(0.05, 0.05, 0.0));
    vec3 offsetL = normalize(L + vec3(-0.05, -0.05, 0.0));

    float dotLT = dot(offsetL, T);
    float dotVT = dot(offsetV, T);
    
    float u = dotLT - dotVT; 
    
    vec3 finalColor = vec3(0.0);
    
    if (facingCamera) {
        // Multiple orders of diffraction to fill the surface
        for(float m = 1.0; m <= 3.0; m++) {
            float w = abs(u) * (4.5 / m) + radius * 0.1; // Offset by radius to prevent center-deadness
            vec3 spectral = spectralColor(w);
            
            // Mask for this order
            float mask = smoothstep(0.0, 0.5, w) * smoothstep(2.0, 1.0, w);
            finalColor += spectral * mask * (1.0 / m);
        }
        
        // Specular streak
        vec3 H = normalize(L + V);
        float HdotT = dot(H, T);
        float specStreak = pow(max(1.0 - HdotT * HdotT, 0.0), 100.0);
        finalColor += vec3(1.0) * specStreak * 0.8;
        
        // Base silver
        float dotLN = clamp(dot(N, L), 0.0, 1.0);
        finalColor += vec3(0.3) * dotLN + vec3(0.1);
    } else {
        // Silver edges and back
        float dotLN = clamp(dot(N, L), 0.0, 1.0);
        finalColor = vec3(0.65, 0.68, 0.7) * dotLN + vec3(0.15);
        vec3 H = normalize(L + V);
        finalColor += vec3(1.0) * pow(max(dot(N, H), 0.0), 30.0) * 0.5;
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
        
        currentInput.current.x += (targetInput.current.x - currentInput.current.x) * 0.08;
        currentInput.current.y += (targetInput.current.y - currentInput.current.y) * 0.08;
        
        const maxTilt = 0.5;
        // X-rotation 90 deg + tilt
        meshRef.current.rotation.x = Math.PI / 2 + currentInput.current.y * maxTilt;
        meshRef.current.rotation.y = currentInput.current.x * maxTilt;
        
        uniforms.u_cameraPos.value.copy(state.camera.position);

        const lx = currentInput.current.x * 3.0; 
        const ly = currentInput.current.y * 3.0; 
        const lz = 1.5; 
        materialRef.current.uniforms.u_lightDir.value.set(lx, ly, lz).normalize();
    });
    
    const cdScale = 1.5; 

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
    const triggerExport = useExport(canvasRef, 'cd-iridescence-v2.png') as () => void;

    return (
        <div className="canvas-container bg-[#0a0a0a] cursor-grab active:cursor-grabbing relative w-full h-full flex items-center justify-center overflow-hidden">
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
