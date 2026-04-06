"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';

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

// Gaussian Blur Kernel
vec3 blur(sampler2D tex, vec2 uv, float radius) {
    vec3 col = vec3(0.0);
    float total = 0.0;
    float step = 0.005 * radius;
    for (float x = -2.0; x <= 2.0; x++) {
        for (float y = -2.0; y <= 2.0; y++) {
            float weight = exp(-(x*x + y*y) / (2.0));
            col += texture2D(tex, uv + vec2(x, y) * step).rgb * weight;
            total += weight;
        }
    }
    return col / total;
}

void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(u_aspect, 1.0);
    vec2 m = (u_mouse - 0.5) * vec2(u_aspect, 1.0);
    
    // Glassmorphism Parameters
    float dist = length(p - m);
    float blurRadius = smoothstep(0.1, 0.4, dist) * 3.5; // Clearer around mouse
    
    // Background Sample (Video feed)
    vec3 color;
    if (u_hasVideo == 1) {
        // Blurred background
        color = blur(u_videoTexture, uv, 1.0 + blurRadius);
    } else {
        // Warm abstract fallback
        color = vec3(0.8, 0.82, 0.85);
    }
    
    // Frosted UI Overlay (Glassmorphism white tint)
    float frost = 0.35 + 0.15 * sin(uv.x * 50.0 + uv.y * 50.0); // Surface noise
    color = mix(color, vec3(1.0), 0.25); // White tint
    
    // Specular Highlight (Light hit on glass)
    vec3 L = normalize(vec3(0.5, 0.5, 1.0));
    vec3 N = vec3(0.0, 0.0, 1.0);
    // Add micro-normal noise for frost
    N.xy += (vec2(hash(uv.x * 123.0), hash(uv.y * 456.0)) - 0.5) * 0.05;
    N = normalize(N);
    
    float spec = pow(max(0.0, dot(N, L)), 30.0);
    color += spec * 0.4;
    
    // Edge lighting on clear spot
    float rim = smoothstep(0.12, 0.1, dist) * smoothstep(0.08, 0.1, dist);
    color += rim * vec3(1.0) * 0.1;

    gl_FragColor = vec4(color, 1.0);
}

float hash(float n) { return fract(sin(n) * 43758.5453); }
`;

const GlassScene = ({ targetInput }: { targetInput: React.MutableRefObject<{ x: number, y: number }> }) => {
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
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
        u_aspect: { value: 1.0 },
        u_hasVideo: { value: 0 }
    }), []);

    useFrame((state) => {
        if (!materialRef.current) return;
        currentInput.current.x += (targetInput.current.x - currentInput.current.x) * 0.1;
        currentInput.current.y += (targetInput.current.y - currentInput.current.y) * 0.1;
        
        materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
        materialRef.current.uniforms.u_mouse.value.set(
            (currentInput.current.x + 1) / 2, 
            (currentInput.current.y + 1) / 2
        );
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

const FrostedGlassmorphism1: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const targetInput = useRef({ x: 0, y: 0 });
    const triggerExport = useExport(canvasRef, 'frosted-glassmorphism.png') as () => void;

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
        <div className="canvas-container bg-[#f0f0f0] cursor-crosshair relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 1] }} 
                className="w-full h-full"
            >
                <GlassScene targetInput={targetInput} />
            </Canvas>
            <div className="absolute top-10 left-10 text-black/20 uppercase text-[9px] tracking-[0.3em] font-medium pointer-events-none">
                frosted glassmorphism / camera diffusion active
            </div>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default FrostedGlassmorphism1;
