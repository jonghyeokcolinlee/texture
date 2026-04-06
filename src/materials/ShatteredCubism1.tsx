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

// Hash for random shard offsets
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
    vec2 p = vUv;
    p.x *= u_aspect;
    
    // 1. Shatter Grid (Voronoi-like fragmentation)
    // Scale for shard density
    float gridScale = 5.0;
    vec2 gv = fract(p * gridScale) - 0.5;
    vec2 id = floor(p * gridScale);
    
    float minDist = 1.0;
    vec2 cid = id;
    
    // Search neighbors for Voronoi edges
    for(float y = -1.0; y <= 1.0; y++) {
        for(float x = -1.0; x <= 1.0; x++) {
            vec2 offset = vec2(x, y);
            vec2 n = id + offset;
            vec2 p_cell = offset + sin(hash(n) * 6.2831) * 0.4;
            float d = length(gv - p_cell);
            if(d < minDist) {
                minDist = d;
                cid = n;
            }
        }
    }
    
    // 2. Cubism Shift Logic
    // Each shard gets a random "angle" from the camera view
    float shardID = hash(cid);
    
    // Interaction shift based on mouse/gyro
    vec2 shift = u_mouse * 0.15 + vec2(sin(u_time * 0.2), cos(u_time * 0.2)) * 0.05;
    
    // Random zoom/offset for each cubist fragment
    float shardZoom = 0.8 + 0.4 * hash(cid + 13.0);
    vec2 shardCenter = vec2(hash(cid + 7.0), hash(cid + 9.0));
    
    // Apply different UV mapping per shard to create the Cubism effect
    vec2 cubistUv = (vUv - 0.5) * shardZoom + 0.5;
    cubistUv += (shardCenter - 0.5) * 0.4;
    cubistUv += shift * (shardID * 2.0 - 1.0);
    
    // 3. Texture Sampling
    vec3 color;
    if (u_hasVideo == 1) {
        // Sample reconstructed camera view
        color = texture2D(u_videoTexture, cubistUv).rgb;
    } else {
        // Fallback: Abstract prismatic noise if camera blocked
        float t = u_time * 0.1;
        float r = hash(cubistUv + t);
        float g = hash(cubistUv + t + 1.0);
        float b = hash(cubistUv + t + 2.0);
        color = vec3(r, g, b) * 0.5 + 0.2;
    }
    
    // 4. Fragment Edge Lighting (Glass depth)
    // Darken edges based on voronoi dist to create shard separation
    float edge = smoothstep(0.02, 0.0, abs(minDist - 0.4)); // Approximation of edges
    float shade = 1.0 - smoothstep(0.4, 0.5, minDist) * 0.2;
    color *= shade;
    
    // Bright glint on shards
    float glint = pow(max(0.0, 1.0 - minDist * 2.5), 20.0) * shardID * 0.3;
    color += glint;

    gl_FragColor = vec4(color, 1.0);
}
`;

const ShatteredPlane = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
    const { viewport, size } = useThree();
    
    const targetInput = useRef({ x: 0, y: 0 });
    const currentInput = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // Setup Video
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        videoRef.current = video;

        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play();
                    setVideoTexture(new THREE.VideoTexture(video));
                };
            })
            .catch(err => {
                console.warn("Camera blocked or unavailable", err);
            });

        const handleMove = (e: any) => {
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            targetInput.current = { x, y };
        };
        window.addEventListener('mousemove', handleMove);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(t => t.stop());
            }
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
        <mesh ref={meshRef}>
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

const ShatteredCubism1: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'shattered-cubism-v1.png') as () => void;

    return (
        <div className="canvas-container bg-black cursor-crosshair relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 1] }} 
                className="w-full h-full"
            >
                <ShatteredPlane />
            </Canvas>
            <div className="absolute bottom-10 left-10 text-white/40 uppercase text-[10px] tracking-[0.2em] pointer-events-none">
                fragmened perspective / interaction active
            </div>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default ShatteredCubism1;
