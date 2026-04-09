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
    float radius = length(vLocalPos.xz);
    if (radius < 0.18 || radius > 1.0) {
        discard;
    }

    vec3 N = normalize(vNormal);
    vec3 V = normalize(u_cameraPos - vWorldPos);
    vec3 L = normalize(u_lightDir);
    vec3 T = normalize(vTangent); 

    vec3 L2 = normalize(L + T * 0.12); 
    vec3 V2 = normalize(V - T * 0.12);

    float dotL2T = dot(L2, T);
    float dotV2T = dot(V2, T);
    float u = dotL2T - dotV2T; 
    
    bool isCap = abs(vLocalPos.y) > 0.005;
    vec3 finalColor = vec3(0.1); 

    if (isCap) {
        float spread = 6.0; 
        for(float m = 1.0; m <= 3.0; m++) {
            float w = abs(u) * spread / m + (radius * 0.08); 
            vec3 spectral = spectralColor(w);
            float mask = smoothstep(0.0, 0.4, w) * smoothstep(2.0, 0.9, w);
            finalColor += spectral * mask * (1.6 / m);
        }
        
        vec3 H = normalize(L + V);
        float HdotT = dot(H, T);
        float specStreak = pow(max(1.0 - HdotT * HdotT, 0.0), 120.0);
        finalColor += vec3(1.0) * specStreak * 2.0;

        float dotLN = clamp(dot(N, L), 0.0, 1.0);
        finalColor += vec3(0.2) * dotLN + vec3(0.05);
    } else {
        float dotLN = clamp(dot(N, L), 0.0, 1.0);
        finalColor = vec3(0.65, 0.68, 0.72) * dotLN + vec3(0.15);
    }

    float fade = smoothstep(0.98, 1.0, radius);
    finalColor *= (1.0 - fade);

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

const DiscMesh = ({ targetInput }: { targetInput: React.MutableRefObject<{ x: number, y: number }> }) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const shadowRef = useRef<THREE.Mesh>(null);
    const currentInput = useRef({ x: 0, y: 0 });
    const { viewport } = useThree();

    const uniforms = useMemo(() => ({
        u_lightDir: { value: new THREE.Vector3(0, 0, 1) },
        u_cameraPos: { value: new THREE.Vector3() }
    }), []);

    useFrame((state) => {
        if (!meshRef.current || !materialRef.current || !shadowRef.current) return;
        
        // Interpolate input inside Canvas for smooth R3F behavior
        currentInput.current.x += (targetInput.current.x - currentInput.current.x) * 0.1;
        currentInput.current.y += (targetInput.current.y - currentInput.current.y) * 0.1;

        const maxTilt = 0.5;
        meshRef.current.rotation.x = Math.PI / 2 + currentInput.current.y * maxTilt;
        meshRef.current.rotation.y = currentInput.current.x * maxTilt;
        
        shadowRef.current.position.x = currentInput.current.x * 0.15;
        shadowRef.current.position.y = -0.7 - currentInput.current.y * 0.15;
        shadowRef.current.scale.setScalar(1.0 - Math.abs(currentInput.current.y) * 0.1);
        if (shadowRef.current.material instanceof THREE.MeshBasicMaterial) {
            shadowRef.current.material.opacity = 0.1 - Math.abs(currentInput.current.y) * 0.05;
        }

        uniforms.u_cameraPos.value.copy(state.camera.position);

        const lx = currentInput.current.x * 4.0; 
        const ly = currentInput.current.y * 4.0; 
        const lz = 1.5; 
        materialRef.current.uniforms.u_lightDir.value.set(lx, ly, lz).normalize();
    });
    
    const cdScale = 1.1; 

    return (
        <group>
            <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
                <planeGeometry args={[1.5, 1.5]} />
                <meshBasicMaterial 
                    transparent 
                    opacity={0.1} 
                    map={new THREE.CanvasTexture((() => {
                        const canvas = document.createElement('canvas');
                        canvas.width = 128;
                        canvas.height = 128;
                        const ctx = canvas.getContext('2d')!;
                        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
                        grad.addColorStop(0, 'rgba(0,0,0,1)');
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = grad;
                        ctx.fillRect(0, 0, 128, 128);
                        return canvas;
                    })())}
               />
            </mesh>

            <mesh ref={meshRef} scale={[cdScale, cdScale, cdScale]}>
                <cylinderGeometry args={[1, 1, 0.015, 64]} />
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    uniforms={uniforms}
               />
            </mesh>
        </group>
    );
};

const CDIridescence3: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const targetInput = useRef({ x: 0, y: 0 });
    const [gyroGranted, setGyroGranted] = useState(false);

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (gyroGranted) return;
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            targetInput.current = { x, y };
        };
        const handleOrientation = (e: DeviceOrientationEvent) => {
            if (e.beta !== null && e.gamma !== null) {
                setGyroGranted(true);
                let bx = (e.gamma || 0) / 45.0; 
                let by = ((e.beta || 45) - 45) / 45.0; 
                targetInput.current = { x: Math.max(-1, Math.min(1, bx)), y: Math.max(-1, Math.min(1, by)) };
            }
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('deviceorientation', handleOrientation);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [gyroGranted]);

    return (
        <div className="canvas-container bg-white cursor-grab active:cursor-grabbing relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 5], fov: 30 }} 
                className="w-full h-full"
            >
                <DiscMesh targetInput={targetInput} />
            </Canvas>
            <InteractionUI title="06 cd iridescence" />
        </div>
    );
};

export default CDIridescence3;
