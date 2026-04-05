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
    // Real world normal
    vNormal = normalize(normalMatrix * normal);
    
    // For CylinderGeometry oriented along Y-axis, local tangent forms circles on XZ plane.
    vec3 localT = vec3(-position.z, 0.0, position.x);
    float tLen = length(localT);
    if (tLen < 0.001) {
        localT = vec3(1.0, 0.0, 0.0);
    } else {
        localT /= tLen;
    }
    
    // Safe transform to world space
    vTangent = normalize(mat3(modelMatrix) * localT);
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform vec3 u_lightDir;
uniform vec3 cameraPosition;

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
    // 1. Geometry Hole (Discard center to make it look like a CD)
    float radius = length(vLocalPos.xz);
    if (radius < 0.15) {
        discard;
    }

    // 2. Safely capture normalized vectors
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(u_lightDir);
    vec3 T = normalize(vTangent); 

    // 3. Cylinder thickness logic. Depth is Y (-0.01 to 0.01)
    // ONLY the back surface gets iridescence!
    bool isBackFace = vLocalPos.y < -0.005;

    // 4. Base Silver Metallic (Edges & Front)
    float dotLN = clamp(dot(N, L), 0.0, 1.0);
    vec3 H = normalize(L + V);
    float dotNH = clamp(dot(N, H), 0.0, 1.0);
    
    vec3 silverBase = vec3(0.5, 0.52, 0.55);
    vec3 silverSpec = vec3(1.0) * pow(dotNH, 50.0) * 0.8;
    vec3 silverMaterial = silverBase * dotLN + silverSpec + vec3(0.1, 0.12, 0.15);

    // 5. Iridescence (Back Face Only)
    // Continuous wide spreading rainbow based on tangents
    float dotLT = clamp(dot(L, T), -1.0, 1.0);
    float dotVT = clamp(dot(V, T), -1.0, 1.0);
    
    float u = dotLT - dotVT; 
    float w = abs(u) * 1.5; 
    
    vec3 spectral = spectralColor(w);
    spectral = clamp(smoothstep(0.1, 0.95, spectral), 0.0, 1.0);
    
    // Specular Streak cutting through the rainbow
    float HdotT = clamp(dot(H, T), -1.0, 1.0);
    float specStreak = pow(max(1.0 - HdotT * HdotT, 0.0), 30.0);
    
    vec3 iridescenceMaterial = spectral * (0.6 + 0.4 * dotLN) + vec3(1.0) * specStreak * 0.8;

    // 6. Output Safe Blend
    vec3 finalColor = isBackFace ? iridescenceMaterial : silverMaterial;
    
    // Add micro physical noise to break flatness
    float noise = fract(sin(dot(vLocalPos.xz, vec2(12.9898, 78.233))) * 43758.5453) * 0.015;
    finalColor -= noise;

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

const DiscMesh = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const { viewport } = useThree();
    
    const targetInput = useRef({ x: 0, y: 0 });
    const currentInput = useRef({ x: 0, y: 0 });
    const [gyroGranted, setGyroGranted] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (gyroGranted) return; 
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            targetInput.current = { x, y };
        };
        
        const handleTouchMove = (e: TouchEvent) => {
            if (gyroGranted || !e.touches.length) return;
            const touch = e.touches[0];
            const x = (touch.clientX / window.innerWidth) * 2 - 1;
            const y = -(touch.clientY / window.innerHeight) * 2 + 1;
            targetInput.current = { x, y };
        };

        const handleOrientation = (e: DeviceOrientationEvent) => {
            if (e.beta !== null && e.gamma !== null) {
                setGyroGranted(true); 
                let bx = (e.gamma || 0) / 40.0; 
                let by = ((e.beta || 45) - 45) / 40.0; 
                bx = Math.max(-1, Math.min(1, bx));
                by = Math.max(-1, Math.min(1, by));
                targetInput.current = { x: bx, y: by };
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('deviceorientation', handleOrientation);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [gyroGranted]);

    const uniforms = useMemo(() => ({
        u_lightDir: { value: new THREE.Vector3(0, 0, 1) }
    }), []);

    useFrame(() => {
        if (!meshRef.current || !materialRef.current) return;
        
        // Easing interpolation for smooth physical feel
        currentInput.current.x += (targetInput.current.x - currentInput.current.x) * 0.1;
        currentInput.current.y += (targetInput.current.y - currentInput.current.y) * 0.1;
        
        // Tilt the CD slightly
        const maxTilt = 0.45; // Subtle tilting limit
        
        // By default, rotate the Cylinder -90 degrees on X to point the Y-axis backwards.
        // This ensures the camera is directly viewing the "-Y" back surface where the iridescence is!
        meshRef.current.rotation.x = -Math.PI / 2 + currentInput.current.y * maxTilt;
        meshRef.current.rotation.y = currentInput.current.x * maxTilt;
        
        // Dynamic Virtual Light
        const lx = currentInput.current.x * 2.5; 
        const ly = currentInput.current.y * 2.5; 
        const lz = 1.5; 
        materialRef.current.uniforms.u_lightDir.value.set(lx, ly, lz).normalize();
    });
    
    // Scale ensuring perfect visibility and proportions on all screens natively!
    // Using min makes sure it behaves strictly like 'object-fit: contain'
    const cdScale = Math.min(viewport.width, viewport.height) * 0.42;

    return (
        <mesh ref={meshRef} scale={[cdScale, cdScale, cdScale]}>
            {/* Extremely safe built-in geometry! */}
            <cylinderGeometry args={[1.0, 1.0, 0.02, 64]} />
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
        <div className="canvas-container bg-[#f7f7f7] cursor-grab active:cursor-grabbing relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 5], fov: 35 }} 
                className="w-full h-full"
            >
                <ambientLight intensity={1.0} /> // Debug fallback ambient
                <DiscMesh />
            </Canvas>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default CDIridescence2;
