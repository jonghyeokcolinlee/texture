"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 vUv;

// 2D Random
float random (in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// 2D Noise based on random
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// FBM for wavy bands
float fbm(vec2 x) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    for (int i = 0; i < 4; ++i) {
        v += a * noise(x);
        x = x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    // We adjust mouse range for more subtle tilt
    vec3 lightDir = normalize(vec3(u_mouse.x * -1.5, u_mouse.y * -1.5, 1.5));

    // 1. Wavy macro vertical bands
    // Multiply X more than Y to stretch horizontally, meaning bands are vertical
    float band = fbm(vUv * vec2(12.0, 0.5)); 
    band = smoothstep(0.2, 0.8, band); // Increase contrast

    // 2. Fine vertical scratches (high frequency on X, low on Y)
    float scratch = random(vUv * vec2(600.0, 1.0));
    float scratch2 = noise(vUv * vec2(200.0, 2.0));

    // Combine for texture variation
    float textureVariancy = band * 0.7 + scratch * 0.15 + scratch2 * 0.15;

    // True normal perturbation based on the wavy bands
    // Taking the derivative of the band roughly for normal map
    float bandDx = fbm((vUv + vec2(0.01, 0.0)) * vec2(12.0, 0.5)) - band;
    vec3 N = normalize(vec3(-bandDx * 15.0, 0.0, 1.0)); 

    // View direction
    vec3 V = vec3(0.0, 0.0, 1.0); 

    // Anisotropic Tangent (Vertical grain)
    vec3 TBase = vec3(0.0, 1.0, 0.0);
    // Perturb tangent slightly with scratches for realism
    vec3 T = normalize(TBase + vec3(0.0, 0.0, (scratch - 0.5) * 0.2));

    vec3 H = normalize(lightDir + V);

    // Kajiya-Kay Anisotropic Reflection
    float dotTH = dot(T, H);
    float sinTH = sqrt(max(0.0, 1.0 - dotTH * dotTH));
    
    // Two specular lobes for brushed metal (one broad, one sharp)
    float specBroad = pow(sinTH, 20.0);
    float specSharp = pow(sinTH, 100.0);

    // Diffuse component
    float diff = max(dot(N, lightDir), 0.0);

    // Base color from dark grey to lighter grey
    vec3 colorDark = vec3(0.18, 0.19, 0.20);
    vec3 colorLight = vec3(0.55, 0.57, 0.60);
    vec3 baseColor = mix(colorDark, colorLight, textureVariancy);

    // Apply lighting
    vec3 color = baseColor * (diff * 0.5 + 0.3); // Diffuse + Ambient
    
    // Add Specular reflections
    color += vec3(0.8, 0.85, 0.9) * specBroad * 0.4;
    color += vec3(1.0, 1.0, 1.0) * specSharp * 0.7;

    gl_FragColor = vec4(color, 1.0);
}
`;

const SteelPlane = ({ isPlaying }: { isPlaying: boolean }) => {
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    const [gyro, setGyro] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleOrientation = (event: DeviceOrientationEvent) => {
            // Very basic mapping for gyro to mouse coordinate equivalent (-1 to 1)
            let x = event.gamma ? event.gamma / 45 : 0; // -90 to 90
            let y = event.beta ? (event.beta - 45) / 45 : 0; // typical holding angle
            x = Math.max(-1, Math.min(1, x));
            y = Math.max(-1, Math.min(1, y));
            setGyro({ x, y: -y });
        };

        if (window.DeviceOrientationEvent && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            // Just check if we already have it, although we can't without asking.
            // We will also bind it on unhandled touch/click
            window.addEventListener('deviceorientation', handleOrientation);
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
        }

        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    const handlePointerDown = () => {
        // For iOS 13+ devices, requesting permission requires a user action
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            (DeviceOrientationEvent as any).requestPermission()
                .then((response: string) => {
                    if (response === 'granted') {
                        // Already hooked up in useEffect, but now it will start firing
                    }
                })
                .catch(console.error);
        }
    };

    const uniforms = useMemo(
        () => ({
            u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
            u_mouse: { value: new THREE.Vector2(0, 0) },
        }),
        [size]
    );

    
    
  
    
    useFrame((state, delta) => {
        if (!isPlayingRef.current) return;
        if (materialRef.current) {
            if (gyro.x !== 0 || gyro.y !== 0) {
                // Gyro dominates if active
                // Smooth transition could be added
                materialRef.current.uniforms.u_mouse.value.lerp(new THREE.Vector2(gyro.x, gyro.y), 0.1);
            } else {
                // Mouse mapping: pointer goes from -1 to 1
                materialRef.current.uniforms.u_mouse.value.lerp(state.pointer, 0.1);
            }
        }
    });

    return (
        <mesh onPointerDown={handlePointerDown}>
            <planeGeometry args={[viewport.width, viewport.height]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
           />
        </mesh>
    );
};

const SteelMaterial: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);

    return (
        <div className="canvas-container">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: false }}
                camera={{ position: [0, 0, 1] }}
            >
                <SteelPlane isPlaying={isPlaying} />
            </Canvas>
            <InteractionUI isPlaying={isPlaying} onTogglePlay={() => setIsPlaying(!isPlaying)} />
        </div>
    );
};

export default SteelMaterial;
