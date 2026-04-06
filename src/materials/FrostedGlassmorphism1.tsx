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

// High-fidelity Grain / Frost noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Wider Gaussian Blur for deep translucency
vec3 deepBlur(sampler2D tex, vec2 uv, float radius) {
    vec3 col = vec3(0.0);
    float total = 0.0;
    float step = 0.008 * radius;
    // 7x7 kernel for smoother diffusion
    for (float x = -3.0; x <= 3.0; x++) {
        for (float y = -3.0; y <= 3.0; y++) {
            float weight = exp(-(x*x + y*y) / (6.0));
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
    
    float dist = length(p - m);
    
    // Dynamic translucency: Blurrier at edges, slightly clearer at focus
    float blurAmount = 1.8 + smoothstep(0.15, 0.45, dist) * 2.5;
    
    vec3 bg;
    if (u_hasVideo == 1) {
        bg = deepBlur(u_videoTexture, uv, blurAmount);
    } else {
        bg = vec3(0.85, 0.88, 0.9);
    }
    
    // Glassmorphism Frost Effect
    float grain = hash(uv * 500.0 + u_time * 0.01) * 0.08;
    
    // Translucent white layer (The "Glass" itself)
    // Darken the background shapes slightly and add white tint
    vec3 glassColor = mix(bg * 0.9, vec3(1.0), 0.35); 
    glassColor += grain; // Frosted texture
    
    // Specular / Light interaction
    vec3 L = normalize(vec3(0.3, 0.6, 1.0));
    vec3 N = normalize(vec3(grain * 0.1, grain * 0.1, 1.0));
    float highlight = pow(max(0.0, dot(N, L)), 40.0) * 0.5;
    
    // Combine layers
    vec3 finalColor = glassColor + highlight;
    
    // Subtle edge fade for the clarity spot
    float clarity = smoothstep(0.18, 0.12, dist);
    finalColor = mix(finalColor, bg * 1.1 + highlight, clarity * 0.3);

    gl_FragColor = vec4(finalColor, 1.0);
}
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
    const triggerExport = useExport(canvasRef, 'frosted-glassmorphism-v1.png') as () => void;

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
                <GlassScene targetInput={targetInput} />
            </Canvas>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default FrostedGlassmorphism1;
