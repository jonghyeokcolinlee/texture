"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vTangent;

void main() {
    vUv = uv;
    // Local circle tangent (CD Grooves are microscopic concentric circles)
    vec2 localP = uv - 0.5;
    float dist = length(localP) + 0.0001;
    // Tangent vector is perpendicular to the radial vector
    vec3 localT = vec3(-localP.y, localP.x, 0.0) / dist;
    
    // Transform to world space to interact beautifully with the camera and lights
    vTangent = normalize(mat3(modelMatrix) * localT);
    vNormal = normalize(normalMatrix * normal);
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform vec3 u_lightDir;
uniform vec2 u_viewAspect; 
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vTangent;

// Spectral function: maps wavelength scalar to specific RGB rainbow value
vec3 spectralColor(float w) {
    float r = 0.5 + 0.5 * cos(6.28318 * (w - 0.00));
    float g = 0.5 + 0.5 * cos(6.28318 * (w - 0.33));
    float b = 0.5 + 0.5 * cos(6.28318 * (w - 0.67));
    return vec3(r, g, b);
}

void main() {
    vec2 p = vUv - 0.5;
    p *= u_viewAspect; // To force a perfect circle regardless of plane stretching
    float dist = length(p);
    
    // Draw the CD Physical shape
    float cdMask = smoothstep(0.48, 0.47, dist) - smoothstep(0.08, 0.07, dist);
    
    if (cdMask <= 0.0) {
        // Aesthetic minimal Drop shadow on light background
        float shadow = smoothstep(0.55, 0.45, dist) * 0.15;
        // Inner hole shadow
        float innerShadow = smoothstep(0.01, 0.08, dist) * smoothstep(0.08, 0.07, dist) * 0.1;
        gl_FragColor = vec4(vec3(0.96 - shadow - innerShadow), 1.0);
        return;
    }
    
    vec3 N = normalize(vNormal);
    vec3 T = normalize(vTangent); 
    
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(u_lightDir);
    
    float dotLN = max(dot(L, N), 0.0);
    float dotLT = dot(L, T);
    float dotVT = dot(V, T);
    
    // Optical Diffraction Interference Formula
    // Based on the tangent difference between light and view angles
    float u = dotLT - dotVT; 
    
    vec3 color = vec3(0.0);
    
    // Generate multiple Diffraction Orders (Rainbow repetitions)
    float spread = 3.5; 
    
    for(float m = 1.0; m <= 3.0; m++) {
        float w = abs(u) * spread / m;
        
        // Narrow bands to simulate high quality polished grooves
        float bandMask = smoothstep(0.0, 0.4, w) * smoothstep(1.5, 0.8, w);
        vec3 spectral = spectralColor(w);
        
        // High-end: saturate and contrast the rainbow slightly
        spectral = smoothstep(0.1, 0.9, spectral);
        
        color += spectral * bandMask * (1.2 / m);
    }
    
    // Shiny Anisotropic Specular Highlight (The sharp white streak on CDs)
    vec3 H = normalize(L + V);
    float HdotT = dot(H, T);
    // 1.0 - HdotT^2 maps perpendicularity for the bright silver streak
    float specStreak = pow(max(1.0 - HdotT * HdotT, 0.0), 80.0);
    color += vec3(1.0) * specStreak * 0.8;
    
    // Base silver reflection (The polished aluminum layer)
    vec3 silver = vec3(0.65, 0.68, 0.70);
    color += silver * dotLN * 0.35 + vec3(0.1); 
    
    // Bevels for 3D thickness feeling
    float edgeDark = smoothstep(0.45, 0.48, dist);
    color *= (1.0 - edgeDark * 0.4);
    
    float innerDark = smoothstep(0.10, 0.07, dist);
    color *= (1.0 - innerDark * 0.4);
    
    // Realistic Micro-noise (mimics tiny dust and physical materiality)
    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) * 0.02;
    color -= noise;

    gl_FragColor = vec4(color, 1.0);
}
`;

const DiscMesh = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const { viewport, size } = useThree();
    
    // Normalize target values [-1, 1]
    const targetInput = useRef({ x: 0, y: 0 });
    const currentInput = useRef({ x: 0, y: 0 });
    
    const [gyroGranted, setGyroGranted] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (gyroGranted) return; // gyro overrides mouse if active
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
                setGyroGranted(true); // Gyro active naturally!
                let bx = (e.gamma || 0) / 45.0; // [-1, 1] range for 45deg tilt
                let by = ((e.beta || 45) - 45) / 45.0; 
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
        u_lightDir: { value: new THREE.Vector3(0, 0, 1) },
        u_viewAspect: { value: new THREE.Vector2(1.0, 1.0) }
    }), []);

    useEffect(() => {
        if (materialRef.current) {
            // Keep the CD perfectly round even if the canvas is stretched
            const aspect = viewport.width / viewport.height;
            if (aspect > 1.0) {
                materialRef.current.uniforms.u_viewAspect.value.set(aspect, 1.0);
            } else {
                materialRef.current.uniforms.u_viewAspect.value.set(1.0, 1.0 / aspect);
            }
        }
    }, [viewport]);

    useFrame(() => {
        if (!meshRef.current || !materialRef.current) return;
        
        // Smooth lerp (easing) for premium physics feel
        currentInput.current.x += (targetInput.current.x - currentInput.current.x) * 0.08;
        currentInput.current.y += (targetInput.current.y - currentInput.current.y) * 0.08;
        
        // 1. Tilt the physical CD geometry
        // Moving mouse to the right causes the CD to tilt as if facing right
        const maxTilt = 0.4; // rad
        meshRef.current.rotation.y = currentInput.current.x * maxTilt;
        meshRef.current.rotation.x = currentInput.current.y * maxTilt * -1; // -1 to invert naturally
        
        // 2. Adjust Virtual Light dynamically to make diffraction wildly reactive
        const lx = currentInput.current.x * 2.0; 
        const ly = currentInput.current.y * 2.0; 
        const lz = 1.2; 
        materialRef.current.uniforms.u_lightDir.value.set(lx, ly, lz).normalize();
    });
    
    // Provide a geometry large enough to fill the screen on most devices, 
    // aspect logic in shader will carve out a perfect circle
    const meshSize = Math.max(viewport.width, viewport.height);

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[meshSize, meshSize, 2, 2]} />
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
        // Typical iOS check:
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-auto">
            <button 
                onClick={requestActivation}
                className="px-6 py-3 border border-white/40 text-white hover:bg-white/10 transition-colors uppercase text-xs tracking-widest"
            >
                Tap to enable Gyroscope for Mobile AR Iridescence
            </button>
        </div>
    );
};

const CDIridescence1: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    return (
        <div className="canvas-container bg-[#f5f5f5] cursor-grab active:cursor-grabbing relative overflow-hidden">
            <RequestGyroBanner />
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 1] }} // Simple straight orthographic-like view, perspective is OK too
            >
                <DiscMesh />
            </Canvas>
            <InteractionUI />
        </div>
    );
};

export default CDIridescence1;
