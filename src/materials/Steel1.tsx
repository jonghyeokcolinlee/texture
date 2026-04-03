"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';

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

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Light position mapped from mouse (-1 to 1)
    vec3 lightDir = normalize(vec3(u_mouse.x * -2.0, u_mouse.y * -2.0, 1.0));

    // Brushed texture generation
    // Anisotropic stretch: scale x heavily, y less
    vec2 grainUv = vUv * vec2(1.0, 300.0);
    float grain = random(grainUv);
    grain = (grain - 0.5) * 2.0;

    // A bit of lower freq noise for variations
    float variation = noise(vUv * vec2(10.0, 1000.0));
    
    // Tangent for anisotropic highlights (vertical brushing = horizontal tangent)
    vec3 T = normalize(vec3(1.0, grain * 0.05, 0.0)); 
    
    vec3 N = vec3(0.0, 0.0, 1.0);
    vec3 V = vec3(0.0, 0.0, 1.0); // Looking straight at it
    vec3 H = normalize(lightDir + V);

    // Ward anisotropic specular approx
    float dotTH = dot(T, H);
    float sinTH = sqrt(max(0.0, 1.0 - dotTH * dotTH));
    float spec = pow(sinTH, 80.0); // shiny
    
    // Isotropic diffuse approx
    float diff = max(dot(N, lightDir), 0.0);

    // Steel base color
    vec3 baseColor = vec3(0.12, 0.13, 0.15); // darker metal
    
    vec3 color = baseColor + (diff * 0.15) * (0.8 + variation * 0.2);
    
    // Add specular highlight
    color += vec3(0.6, 0.6, 0.6) * spec;
    
    // Subtly mix in the grain into diffuse
    color *= 1.0 + grain * 0.08;
    
    // Ambient light
    color += vec3(0.05);

    gl_FragColor = vec4(color, 1.0);
}
`;

const SteelPlane = ({ isPlaying }: { isPlaying: boolean }) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    const [gyro, setGyro] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleOrientation = (event: DeviceOrientationEvent) => {
            let x = event.gamma ? event.gamma / 45 : 0;
            let y = event.beta ? (event.beta - 45) / 45 : 0;
            x = Math.max(-1, Math.min(1, x));
            y = Math.max(-1, Math.min(1, y));
            setGyro({ x, y: -y });
        };

        if (window.DeviceOrientationEvent && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            window.addEventListener('deviceorientation', handleOrientation);
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
        }

        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    const handlePointerDown = () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            (DeviceOrientationEvent as any).requestPermission().catch(console.error);
        }
    };

    const uniforms = useMemo(
        () => ({
            u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
            u_mouse: { value: new THREE.Vector2(0, 0) },
        }),
        [size]
    );

    
    const isPlayingRef = useRef(true);
    useEffect(() => {
        const handleSetPlay = (e: any) => { isPlayingRef.current = e.detail; };
        window.addEventListener('set-play', handleSetPlay);
        return () => window.removeEventListener('set-play', handleSetPlay);
    }, []);
  
    const accumulatedTimeRef = useRef(0);
    useFrame((state, delta) => {
        if (materialRef.current) {
            if (gyro.x !== 0 || gyro.y !== 0) {
                materialRef.current.uniforms.u_mouse.value.lerp(new THREE.Vector2(gyro.x, gyro.y), 0.1);
            } else {
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

const Steel1: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'brushed-steel-v1.png') as () => void;
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
            <InteractionUI isPlaying={isPlaying} onTogglePlay={() => {
        const next = !isPlaying;
        setIsPlaying(next);
        window.dispatchEvent(new CustomEvent('set-play', { detail: next }));
  }} onExport={triggerExport} />
        </div>
    );
};

export default Steel1;
