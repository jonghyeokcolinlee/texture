"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';

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
    vec3 finalColor = vec3(0.08); 

    if (isCap) {
        float spread = 6.2; 
        for(float m = 1.0; m <= 3.0; m++) {
            float w = abs(u) * spread / m + (radius * 0.1); 
            vec3 spectral = spectralColor(w);
            float mask = smoothstep(0.0, 0.4, w) * smoothstep(2.2, 1.1, w);
            finalColor += spectral * mask * (1.7 / m);
        }
        
        vec3 H = normalize(L + V);
        float HdotT = dot(H, T);
        float specStreak = pow(max(1.0 - HdotT * HdotT, 0.0), 110.0);
        finalColor += vec3(1.0) * specStreak * 1.8;

        float dotLN = clamp(dot(N, L), 0.0, 1.0);
        finalColor += vec3(0.15) * dotLN + vec3(0.05);

        // Subtle plastic inner/outer darkening
        float innerRim = smoothstep(0.22, 0.18, radius);
        float outerRim = smoothstep(0.95, 1.0, radius);
        finalColor *= (1.0 - innerRim * 0.3);
        finalColor *= (1.0 - outerRim * 0.4);
    } else {
        float dotLN = clamp(dot(N, L), 0.0, 1.0);
        finalColor = vec3(0.62, 0.65, 0.68) * dotLN + vec3(0.2);
    }

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

const RequestGyroBanner = ({ onGranted }: { onGranted: () => void }) => {
    const [needsUI, setNeedsUI] = useState(false);

    useEffect(() => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            setNeedsUI(true);
        } else {
            onGranted();
        }
    }, [onGranted]);

    const requestPermission = () => {
        (DeviceOrientationEvent as any).requestPermission()
            .then((response: string) => {
                if (response === 'granted') onGranted();
            })
            .catch(console.error);
    };

    if (!needsUI) return null;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-white/90 backdrop-blur-sm pointer-events-auto">
            <button 
                onClick={requestPermission}
                className="px-8 py-4 border border-black/10 text-black font-medium hover:bg-black/5 transition-all lowercase text-lg tracking-tight"
            >
                enable gyroscope to feel the material
            </button>
        </div>
    );
};

const DiscMesh = ({ targetInput }: { targetInput: React.MutableRefObject<{ x: number, y: number }> }) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const shadowOuterRef = useRef<THREE.Mesh>(null);
    const shadowInnerRef = useRef<THREE.Mesh>(null);
    const currentInput = useRef({ x: 0, y: 0 });
    const { viewport } = useThree();

    const uniforms = useMemo(() => ({
        u_lightDir: { value: new THREE.Vector3(0, 0, 1) },
        u_cameraPos: { value: new THREE.Vector3() }
    }), []);

    useFrame((state) => {
        if (!meshRef.current || !materialRef.current || !shadowOuterRef.current || !shadowInnerRef.current) return;
        
        currentInput.current.x += (targetInput.current.x - currentInput.current.x) * 0.1;
        currentInput.current.y += (targetInput.current.y - currentInput.current.y) * 0.1;

        const maxTilt = 0.55;
        meshRef.current.rotation.x = Math.PI / 2 + currentInput.current.y * maxTilt;
        meshRef.current.rotation.y = currentInput.current.x * maxTilt;
        
        // Shadow tracking
        const tiltIntensity = 1.0 - Math.min(1.0, Math.sqrt(currentInput.current.x**2 + currentInput.current.y**2));
        
        shadowOuterRef.current.position.x = currentInput.current.x * 0.12;
        shadowOuterRef.current.position.y = -0.75 - currentInput.current.y * 0.12;
        shadowOuterRef.current.scale.setScalar(1.0 + Math.abs(currentInput.current.y) * 0.1);
        
        shadowInnerRef.current.position.x = currentInput.current.x * 0.08;
        shadowInnerRef.current.position.y = -0.75 - currentInput.current.y * 0.08;
        shadowInnerRef.current.scale.setScalar(0.22);
        
        if (shadowOuterRef.current.material instanceof THREE.MeshBasicMaterial) {
            shadowOuterRef.current.material.opacity = 0.12 * (0.6 + 0.4 * tiltIntensity);
        }
        if (shadowInnerRef.current.material instanceof THREE.MeshBasicMaterial) {
            shadowInnerRef.current.material.opacity = 0.18 * (0.6 + 0.4 * tiltIntensity);
        }

        uniforms.u_cameraPos.value.copy(state.camera.position);

        const lx = currentInput.current.x * 5.0; 
        const ly = currentInput.current.y * 5.0; 
        const lz = 1.8; 
        materialRef.current.uniforms.u_lightDir.value.set(lx, ly, lz).normalize();
    });
    
    // Physical aspect scale: keep perfectly circular but responsive to width
    const cdScale = Math.min(viewport.width, viewport.height) * 0.28; 

    const shadowTex = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(canvas);
    }, []);

    return (
        <group>
            {/* Outer Shadow */}
            <mesh ref={shadowOuterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.75, 0]}>
                <planeGeometry args={[1.6, 1.6]} />
                <meshBasicMaterial transparent map={shadowTex} opacity={0.12} />
            </mesh>
            {/* Inner Shadow (Hole) */}
            <mesh ref={shadowInnerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.75, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial transparent map={shadowTex} opacity={0.18} color="#000" />
            </mesh>

            {/* CD Disc */}
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

const CDIridescence4: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'cd-iridescence-v4.png') as () => void;
    const targetInput = useRef({ x: 0, y: 0 });
    const [gyroActive, setGyroActive] = useState(false);

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (gyroActive) return;
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            targetInput.current = { x, y };
        };
        const handleOrientation = (e: DeviceOrientationEvent) => {
            if (e.beta !== null && e.gamma !== null) {
                // beta: tilt front/back [-180, 180], gamma: left/right [-90, 90]
                const bx = (e.gamma || 0) / 40.0;
                const by = ((e.beta || 45) - 45) / 40.0;
                targetInput.current = { 
                    x: Math.max(-1, Math.min(1, bx)), 
                    y: Math.max(-1, Math.min(1, by)) 
                };
            }
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('deviceorientation', handleOrientation);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [gyroActive]);

    return (
        <div className="canvas-container bg-white cursor-grab active:cursor-grabbing relative w-full h-full flex items-center justify-center overflow-hidden">
            <RequestGyroBanner onGranted={() => setGyroActive(true)} />
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 5], fov: 30 }} 
                className="w-full h-full"
            >
                <DiscMesh targetInput={targetInput} />
            </Canvas>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default CDIridescence4;
