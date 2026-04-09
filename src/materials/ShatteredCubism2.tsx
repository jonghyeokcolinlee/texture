"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform sampler2D u_videoTexture;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_aspect;
uniform int u_hasVideo;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
    vec2 p = vUv;
    vec2 centeredP = (p - 0.5) * vec2(u_aspect, 1.0);
    
    // 1. Shard Density Mask (Concentrated in center)
    float mask = smoothstep(0.5, 0.2, length(centeredP));
    
    // 2. Fragment Logic (Voronoi shards)
    float gridScale = 6.0;
    vec2 gv = fract(p * gridScale) - 0.5;
    vec2 id = floor(p * gridScale);
    
    float minDist = 1.0;
    vec2 cid = id;
    
    for(float y = -1.0; y <= 1.0; y++) {
        for(float x = -1.0; x <= 1.0; x++) {
            vec2 offset = vec2(x, y);
            vec2 n = id + offset;
            vec2 p_cell = offset + sin(hash(n) * 6.2831 + u_time * 0.1) * 0.3;
            float d = length(gv - p_cell);
            if(d < minDist) {
                minDist = d;
                cid = n;
            }
        }
    }
    
    float shardID = hash(cid);
    
    // Discard shards outside the concentration area or randomly
    if (shardID > mask * 1.5) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // White background
        return;
    }
    
    // 3. Cubism Reflection (Mirror Logic)
    // Offset view based on shard ID and interaction
    vec2 tilt = u_mouse * 0.2;
    float zoom = 0.7 + 0.3 * hash(cid + 5.0);
    vec2 viewOffset = vec2(hash(cid + 2.0), hash(cid + 4.0)) - 0.5;
    
    vec2 cubistUv = (vUv - 0.5) * zoom + 0.5;
    cubistUv += viewOffset * 0.3 + tilt * (shardID * 3.0);
    
    vec3 reflection;
    if (u_hasVideo == 1) {
        reflection = texture2D(u_videoTexture, cubistUv).rgb;
    } else {
        // High-end mirror fallback: metallic noise
        reflection = vec3(0.8) + 0.2 * vec3(hash(cubistUv + u_time * 0.01));
    }
    
    // 4. Physical Material (Mirror Shard)
    // Dark edges and specular highlights for a real glass shard feel
    float edge = smoothstep(0.04, 0.0, abs(minDist - 0.45));
    reflection *= (1.0 - edge * 0.6);
    
    // Bevel light on shards
    float light = pow(max(0.0, 1.2 - minDist * 3.0), 15.0) * 0.4;
    reflection += vec3(1.0) * light;
    
    // Subtle shadow cast by shard on the white background (inner shadow feel)
    float shadow = smoothstep(0.48, 0.4, minDist) * 0.1;
    reflection -= shadow;

    gl_FragColor = vec4(reflection, 1.0);
}
`;

const ShatteredPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
    const { viewport } = useThree();
    
    const targetInput = useRef({ x: 0, y: 0 });
    const currentInput = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const video = document.createElement('video');
        video.autoplay = true; video.playsInline = true;
        videoRef.current = video;

        const setupCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play();
                    setVideoTexture(new THREE.VideoTexture(video));
                };
            } catch (err) {
                console.warn("Camera fallback active", err);
            }
        };
        setupCamera();

        const handleMove = (e: MouseEvent) => {
            targetInput.current = { 
                x: (e.clientX / window.innerWidth) * 2 - 1,
                y: -(e.clientY / window.innerHeight) * 2 + 1
            };
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

const ShatteredCubism2: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    return (
        <div className="canvas-container bg-white cursor-crosshair relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 1] }} 
                className="w-full h-full"
            >
                <ShatteredPlane />
            </Canvas>
            <InteractionUI />
        </div>
    );
};

export default ShatteredCubism2;
