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
    
    // Local circle tangent (CD Grooves are microscopic concentric circles)
    vec3 localT = vec3(-position.y, position.x, 0.0);
    if(length(localT) < 0.001) {
        localT = vec3(1.0, 0.0, 0.0);
    }
    
    // Transform tangent to world space to interact beautifully with the camera and lights
    vTangent = normalize(mat3(modelMatrix) * normalize(localT));
    
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
    return vec3(r, g, b);
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(u_lightDir);
    vec3 T = normalize(vTangent); 
    
    // We extruded the geometry with a depth of 0.04 and centered it.
    // So Z bounds are approximately -0.02 to +0.02.
    // The iridescent surface is exclusively the flat front face (+Z).
    // Using smoothstep creates a seamless aliasing-free blend over the bevel.
    float isFrontFace = smoothstep(0.015, 0.018, vLocalPos.z);
    
    // --- 1. Edge & Back Material (Neutral Silver Metallic Thickness) ---
    float dotLN = max(dot(N, L), 0.0);
    vec3 H = normalize(L + V);
    float dotNH = max(dot(N, H), 0.0);
    
    vec3 silverBase = vec3(0.55, 0.57, 0.6);
    // Soft, bright edge specular highlight
    vec3 silverSpecular = vec3(1.0) * pow(dotNH, 50.0) * 0.8;
    
    // Edge Material combines diffuse silver reflection and specular highlights
    vec3 edgeMaterial = silverBase * dotLN + silverSpecular + vec3(0.12, 0.12, 0.14);

    // --- 2. Front Face Material (Continuous Diffraction Iridescence) ---
    float dotLT = dot(L, T);
    float dotVT = dot(V, T);
    
    // Optical Diffraction Interference Formula
    // Based on the tangent difference between light and view angles
    float u = dotLT - dotVT; 
    
    // Adjust multiplier '1.5' to spread the rainbow correctly across the ENTIRE surface.
    // By keeping it wide and continuous, it avoids localized harsh spot-bands.
    float w = abs(u) * 1.5; 
    
    vec3 spectral = spectralColor(w);
    // High-end: contrast the rainbow slightly to make it look physically vibrant but smooth
    spectral = smoothstep(0.1, 0.95, spectral);
    
    // Anisotropic Specular Highlight (The sharp white light streak cutting through the rainbow)
    float HdotT = dot(H, T);
    // 1.0 - HdotT^2 maps perpendicularity for the bright silver streak
    float specStreak = pow(max(1.0 - HdotT * HdotT, 0.0), 30.0);
    
    vec3 iridescenceMaterial = spectral * (0.6 + 0.4 * dotLN) + vec3(1.0) * specStreak * 0.5;

    // --- Final Blend ---
    vec3 finalColor = mix(edgeMaterial, iridescenceMaterial, isFrontFace);
    
    // Realistic Micro-noise (mimics tiny physical imperfections on the material face/edges)
    float noise = fract(sin(dot(vLocalPos.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.015;
    finalColor -= noise;

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
        
        // Extrude it into a visibly thick cylinder
        return {
            shape,
            options: {
                depth: 0.04,
                curveSegments: 128, // High-res curve
                bevelEnabled: true,
                bevelSegments: 3,
                steps: 1,
                bevelSize: 0.005,
                bevelThickness: 0.005
            }
        };
    }, []);

    useEffect(() => {
        // Shift geometry center perfectly to (0,0,0) so rotation happens from the core
        if (geomRef.current) {
            geomRef.current.center();
        }
    }, [cdGeometryDef]);

    // Input Control State
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
        
        // Smooth lerp (easing) for premium physics feel
        currentInput.current.x += (targetInput.current.x - currentInput.current.x) * 0.08;
        currentInput.current.y += (targetInput.current.y - currentInput.current.y) * 0.08;
        
        // 1. Tilt the physical CD geometry
        const maxTilt = 0.5; // rad
        meshRef.current.rotation.y = currentInput.current.x * maxTilt;
        meshRef.current.rotation.x = currentInput.current.y * maxTilt * -1; // invert Y
        
        // 2. Adjust Virtual Light dynamically to make diffraction wildly reactive
        const lx = currentInput.current.x * 2.0; 
        const ly = currentInput.current.y * 2.0; 
        const lz = 1.0; 
        materialRef.current.uniforms.u_lightDir.value.set(lx, ly, lz).normalize();
    });
    
    // Scale CD dimensionally to achieve perfectly circular "Object-Fit: Contain"
    // Using Min width/height avoids any aspect distortion on Mobile or Desktop.
    const cdScale = Math.min(viewport.width, viewport.height) * 0.40;

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
                // Move camera out to allow depth thickness to be visible in perspective
                // This adds a massive amount of realism as perspective warping shows edges.
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
