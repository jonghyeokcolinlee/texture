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
    vec3 finalColor = vec3(0.12); // Slightly higher base for flat feel

    if (isCap) {
        float spread = 6.8; 
        for(float m = 1.0; m <= 3.0; m++) {
            float w = abs(u) * spread / m + (radius * 0.1); 
            vec3 spectral = spectralColor(w);
            float mask = smoothstep(0.0, 0.5, w) * smoothstep(2.5, 1.0, w);
            finalColor += spectral * mask * (2.0 / m);
        }
        
        vec3 H = normalize(L + V);
        float HdotT = dot(H, T);
        float specStreak = pow(max(1.0 - HdotT * HdotT, 0.0), 100.0);
        finalColor += vec3(1.0) * specStreak * 2.2;

        float dotLN = clamp(dot(N, L), 0.0, 1.0);
        finalColor += vec3(0.2) * dotLN + vec3(0.05);

        // REMOVED: Deep rim/edge shadows to maintain FLAT feel
    } else {
        float dotLN = clamp(dot(N, L), 0.0, 1.0);
        finalColor = vec3(0.65, 0.68, 0.7) * dotLN + vec3(0.2);
    }

    // Subtle black rims for both inner and outer edges for physical detail
    float outerFade = smoothstep(0.985, 0.995, radius);
    float innerFade = smoothstep(0.195, 0.185, radius);
    finalColor *= (1.0 - outerFade * 0.8);
    finalColor *= (1.0 - innerFade * 0.8);

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

const RequestGyroBanner = ({ onGranted, granted }: { onGranted: () => void, granted: boolean }) => {
    const [needsUI, setNeedsUI] = useState(false);

    useEffect(() => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            setNeedsUI(true);
        }
    }, []);

    const requestPermission = () => {
        (DeviceOrientationEvent as any).requestPermission()
            .then((response: string) => {
                if (response === 'granted') onGranted();
            })
            .catch(console.error);
    };

    if (!needsUI || granted) return null;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm pointer-events-auto">
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
    const currentInput = useRef({ x: 0, y: 0 });
    const { viewport } = useThree();

    const uniforms = useMemo(() => ({
        u_lightDir: { value: new THREE.Vector3(0, 0, 1) },
        u_cameraPos: { value: new THREE.Vector3() }
    }), []);

    const isMobile = useMemo(() => viewport.width < 4.5, [viewport]);

    useFrame((state) => {
        if (!meshRef.current || !materialRef.current) return;
        
        currentInput.current.x += (targetInput.current.x - currentInput.current.x) * 0.1;
        currentInput.current.y += (targetInput.current.y - currentInput.current.y) * 0.1;

        const maxTilt = 0.55;
        meshRef.current.rotation.x = Math.PI / 2 + currentInput.current.y * maxTilt;
        meshRef.current.rotation.y = currentInput.current.x * maxTilt;
        
        // Alignment: Mobile shows right half centered slightly off left edge
        if (isMobile) {
            meshRef.current.position.x = -viewport.width * 0.42;
        } else {
            meshRef.current.position.x = 0;
        }

        uniforms.u_cameraPos.value.copy(state.camera.position);

        const lx = currentInput.current.x * 5.0; 
        const ly = currentInput.current.y * 5.0; 
        const lz = 1.8; 
        materialRef.current.uniforms.u_lightDir.value.set(lx, ly, lz).normalize();
    });
    
    // Scale logic: On mobile, radius fills most of the width but not 100%
    const cdScale = isMobile ? viewport.width * 0.88 : Math.min(viewport.width, viewport.height) * 0.28; 

    return (
        <group>
            <mesh ref={meshRef} scale={[cdScale, cdScale, cdScale]}>
                {/* Thin cylinder geometry maintained */}
                <cylinderGeometry args={[1, 1, 0.012, 64]} />
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
            if (e.beta !== null && e.gamma !== null && (e.beta !== 0 || e.gamma !== 0)) {
                setGyroActive(true);
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
            <RequestGyroBanner granted={gyroActive} onGranted={() => setGyroActive(true)} />
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

export default CDIridescence4;
