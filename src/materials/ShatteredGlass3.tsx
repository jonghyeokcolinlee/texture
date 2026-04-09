"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D u_videoTexture;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_aspect;
uniform int u_hasVideo;
varying vec2 vUv;

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123); }

float crackPattern(vec2 uv, vec2 center, float time, float aspect) {
    vec2 p = uv - center;
    p.x *= aspect;
    float dist = length(p);
    float angle = atan(p.y, p.x);
    
    float nRadials = 16.0;
    float rAngle = floor(angle * nRadials / 6.2831) * 6.2831 / nRadials;
    float radialNoise = hash(rAngle + 12.0) * 0.4;
    float radial = smoothstep(0.01 + radialNoise * 0.05, 0.0, abs(angle - rAngle + sin(dist * 20.0) * 0.02));
    
    float concentricScale = 12.0;
    float cDist = floor(dist * concentricScale);
    float concentric = smoothstep(0.015, 0.0, abs(dist - (cDist + 0.5) / concentricScale + hash(cDist) * 0.02));
    
    float impact = smoothstep(0.12, 0.0, dist) * (hash2(uv * 100.0) > 0.5 ? 1.0 : 0.0);
    
    return clamp(radial + concentric + impact, 0.0, 1.0);
}

void main() {
    vec2 center = vec2(0.5);
    float cracks = crackPattern(vUv, center, u_time, u_aspect);
    
    vec2 p = vUv - center;
    p.x *= u_aspect;
    float d = length(p);
    float a = atan(p.y, p.x);
    vec2 cellId = vec2(floor(a * 16.0 / 6.2831), floor(d * 12.0));
    float shardSeed = hash2(cellId);
    
    vec2 shift = u_mouse * 0.1;
    vec2 cubistUv = (vUv - 0.5) * (0.8 + 0.4 * shardSeed) + 0.5;
    cubistUv += (cellId - 0.5) * 0.02 + shift * (shardSeed - 0.5) * 2.0;
    
    vec3 videoColor;
    if (u_hasVideo == 1) {
        videoColor = texture2D(u_videoTexture, cubistUv).rgb;
    } else {
        videoColor = vec3(0.9) + 0.1 * vec3(hash2(cubistUv + u_time * 0.01));
    }
    
    vec3 finalColor = mix(vec3(1.0), videoColor, 1.0 - cracks * 0.9);
    float highlight = crackPattern(vUv - 0.002, center, u_time, u_aspect);
    finalColor += highlight * vec3(0.5) * cracks;

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const ShatteredScene = ({ targetInput }: { targetInput: React.MutableRefObject<{ x: number, y: number }> }) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
    const { viewport } = useThree();
    const currentInput = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const video = document.createElement('video');
        video.autoplay = true; video.playsInline = true;
        const setupCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play();
                    setVideoTexture(new THREE.VideoTexture(video));
                };
            } catch {}
        };
        setupCamera();
        return () => {
            if (video.srcObject) (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        };
    }, []);

    const uniforms = useMemo(() => ({
        u_videoTexture: { value: null },
        u_time: { value: 0 },
        u_mouse: { value: new THREE.Vector2() },
        u_aspect: { value: 1.0 },
        u_hasVideo: { value: 0 }
    }), []);

    useFrame((state) => {
        if (!materialRef.current) return;
        currentInput.current.x += (targetInput.current.x - currentInput.current.x) * 0.1;
        currentInput.current.y += (targetInput.current.y - currentInput.current.y) * 0.1;
        materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
        materialRef.current.uniforms.u_mouse.value.set(currentInput.current.x, currentInput.current.y);
        materialRef.current.uniforms.u_aspect.value = viewport.width / viewport.height;
        if (videoTexture) {
            materialRef.current.uniforms.u_videoTexture.value = videoTexture;
            materialRef.current.uniforms.u_hasVideo.value = 1;
        }
    });

    return (
        <mesh>
            <planeGeometry args={[viewport.width, viewport.height]} />
            <shaderMaterial
                ref={materialRef}
                fragmentShader={fragmentShader}
                vertexShader={vertexShader}
                uniforms={uniforms}
           />
        </mesh>
    );
};

const ShatteredGlass3: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const targetInput = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            targetInput.current = { 
                x: (e.clientX / window.innerWidth) * 2 - 1,
                y: -(e.clientY / window.innerHeight) * 2 + 1
            };
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    return (
        <div className="canvas-container bg-white cursor-crosshair relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 1] }} 
                className="w-full h-full"
            >
                <ShatteredScene targetInput={targetInput} />
            </Canvas>
            <InteractionUI />
        </div>
    );
};

export default ShatteredGlass3;
