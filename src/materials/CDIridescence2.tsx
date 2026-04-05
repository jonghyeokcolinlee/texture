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
    // Calculate accurate world normal
    vNormal = normalize(normalMatrix * normal);
    
    // Local circle tangent (CD Grooves are concentric circles on the XY plane)
    vec3 localT = vec3(-position.y, position.x, 0.0);
    float tLen = length(localT);
    if(tLen < 0.0001) {
        localT = vec3(1.0, 0.0, 0.0);
    } else {
        localT /= tLen;
    }
    
    // Transform tangent to world space
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

// Spectral function: maps wavelength scalar to specific RGB rainbow value smoothly
vec3 spectralColor(float w) {
    float r = 0.5 + 0.5 * cos(6.28318 * (w - 0.00));
    float g = 0.5 + 0.5 * cos(6.28318 * (w - 0.33));
    float b = 0.5 + 0.5 * cos(6.28318 * (w - 0.67));
    return clamp(vec3(r, g, b), 0.0, 1.0);
}

void main() {
    // Safety normalizations to prevent shader warnings/NaNs
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(u_lightDir);
    vec3 T = normalize(vTangent); 
    
    // We extruded the geometry with a depth of 0.04 and centered it.
    // So local Z bounds are approximately -0.02 to +0.02.
    // The user requested: "The iridescence effect is applied ONLY to the back surface"
    // Back face is at z = -0.02. We use smoothstep to select it softly avoiding aliasing.
    float isBackFace = smoothstep(-0.015, -0.019, vLocalPos.z);
    
    // --- 1. Base Material (Neutral Silver Metallic for Front & Thickness Edges) ---
    float dotLN = clamp(dot(N, L), 0.0, 1.0);
    vec3 H = normalize(L + V);
    float dotNH = clamp(dot(N, H), 0.0, 1.0);
    
    vec3 silverBase = vec3(0.4, 0.42, 0.45);
    vec3 silverSpecular = vec3(1.0) * pow(dotNH, 50.0) * 0.7;
    vec3 silverMaterial = silverBase * dotLN + silverSpecular + vec3(0.08, 0.08, 0.1);

    // --- 2. Back Face Material (Continuous Diffraction Iridescence) ---
    float dotLT = clamp(dot(L, T), -1.0, 1.0);
    float dotVT = clamp(dot(V, T), -1.0, 1.0);
    
    // Optical Diffraction Interference Formula
    float u = dotLT - dotVT; 
    
    // Adjust multiplier to spread the rainbow across the ENTIRE surface.
    float w = abs(u) * 1.5; 
    
    vec3 spectral = spectralColor(w);
    // Over-saturate gently for premium aesthetic
    spectral = smoothstep(0.1, 0.95, spectral);
    
    // Anisotropic Specular Highlight (The sharp white light streak cutting through the rainbow)
    float HdotT = clamp(dot(H, T), -1.0, 1.0);
    float specStreak = pow(max(1.0 - HdotT * HdotT, 0.0), 30.0);
    
    vec3 iridescenceMaterial = spectral * (0.6 + 0.4 * dotLN) + vec3(1.0) * specStreak * 0.8;

    // --- Final Blend ---
    vec3 finalColor = mix(silverMaterial, iridescenceMaterial, isBackFace);
    
    // Add micro-noise
    float noise = fract(sin(dot(vLocalPos.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.02;
    finalColor -= noise;
    
    // Final hard-clamp to guarantee no blank screen from over-exposure or negatives
    finalColor = clamp(finalColor, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const DiscMesh = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const geomRef = useRef<THREE.ExtrudeGeometry>(null);
    const { viewport } = useThree();
    
    // Build actual physical CD Geometry with a hole using ExtrudeGeometry
    const cdGeometryDef = useMemo(() => {
        const shape = new THREE.Shape();
        shape.absarc(0, 0, 1.0, 0, Math.PI * 2, false);
        
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, 0.15, 0, Math.PI * 2, true);
        shape.holes.push(holePath);
        
        return {
            shape,
            options: {
                depth: 0.04,
                curveSegments: 128, 
                bevelEnabled: true,
                bevelSegments: 3,
                steps: 1,
                bevelSize: 0.005,
                bevelThickness: 0.005
            }
        };
    }, []);

    useEffect(() => {
        // Center the geometry so rotation pivots exactly around the middle and Z spans [-0.02, 0.02]
        if (geomRef.current) {
            geomRef.current.center();
        }
    }, [cdGeometryDef]);

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
        
        // Easing interpolation
        currentInput.current.x += (targetInput.current.x - currentInput.current.x) * 0.08;
        currentInput.current.y += (targetInput.current.y - currentInput.current.y) * 0.08;
        
        const maxTilt = 0.5; // rad
        
        // By default, rotate the CD 180 degrees (Math.PI) so the BACK face (-Z) is visible to the camera!
        // This is crucial because iridescence is only applied to the back face.
        meshRef.current.rotation.y = Math.PI + (currentInput.current.x * maxTilt);
        meshRef.current.rotation.x = currentInput.current.y * maxTilt * -1;
        
        const lx = currentInput.current.x * 2.0; 
        const ly = currentInput.current.y * 2.0; 
        const lz = 1.0; 
        // Light direction transforms slightly
        materialRef.current.uniforms.u_lightDir.value.set(lx, ly, lz).normalize();
    });
    
    // Uniform scaling based on viewport size ensuring NO aspect ratio distortion
    const cdScale = Math.min(viewport.width, viewport.height) * 0.38;

    return (
        <mesh ref={meshRef} scale={[cdScale, cdScale, cdScale]}>
            <extrudeGeometry 
                ref={geomRef} 
                args={[cdGeometryDef.shape, cdGeometryDef.options]} 
            />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                side={THREE.FrontSide}
            />
        </mesh>
    );
};

const RequestGyroBanner = () => {
    const [granted, setGranted] = useState(false);
    const [needsUI, setNeedsUI] = useState(false);

    useEffect(() => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            setNeedsUI(true);
        } else {
            setGranted(true);
        }
    }, []);

    const requestActivation = () => {
        (DeviceOrientationEvent as any).requestPermission()
            .then((response: string) => {
                if (response === 'granted') setGranted(true);
            })
            .catch(console.error);
    };

    if (granted || !needsUI) return null;

    return (
        <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-auto z-50">
            <button 
                onClick={requestActivation}
                className="px-6 py-2 bg-black text-white rounded-full text-xs font-bold tracking-widest shadow-xl active:bg-neutral-800 transition-colors"
                style={{ backdropFilter: "blur(10px)" }}
            >
                Tap to enable Gyroscope for Mobile AR
            </button>
        </div>
    );
};

const CDIridescence2: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'cd-iridescence-v2.png') as () => void;

    return (
        <div className="canvas-container bg-[#fcfcfc] cursor-grab active:cursor-grabbing relative overflow-hidden">
            <RequestGyroBanner />
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                // Perspective camera is used so 3D thickness is easily visible
                camera={{ position: [0, 0, 5], fov: 35 }} 
            >
                <ambientLight intensity={0.5} />
                <DiscMesh />
            </Canvas>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default CDIridescence2;
