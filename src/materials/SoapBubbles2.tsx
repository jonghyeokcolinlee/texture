"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';

const vertexShader = `
uniform float u_time;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
    vUv = uv;
    // Real soap bubbles wobble
    float wobble = sin(position.x * 12.0 + u_time * 3.0) * cos(position.y * 12.0 + u_time * 2.0) * 0.04;
    vec3 newPos = position + normal * wobble;
    
    vec4 worldPos = modelMatrix * vec4(newPos, 1.0);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = `
uniform float u_time;
uniform float u_opacity;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

vec3 getBubbleColor(float cosTheta) {
    float t = cosTheta;
    vec3 color;
    // Soft pastel rainbow (Reference palette)
    color.r = 0.9 + 0.1 * cos(6.28 * (t + 0.05));
    color.g = 0.85 + 0.15 * cos(6.28 * (t + 0.35));
    color.b = 0.95 + 0.05 * cos(6.28 * (t + 0.65));
    return color;
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    float dotNV = max(0.0, dot(N, V));
    float fresnel = pow(1.0 - dotNV, 3.0);
    
    // Iridescence
    vec3 iris = getBubbleColor(dotNV);
    
    // Specular highlights (High contrast marks like reference)
    vec3 L1 = normalize(vec3(0.5, 0.8, 1.0));
    vec3 L2 = normalize(vec3(-0.5, -0.2, 0.7));
    float spec1 = pow(max(0.0, dot(reflect(-L1, N), V)), 80.0);
    float spec2 = pow(max(0.0, dot(reflect(-L2, N), V)), 40.0);
    vec3 spec = vec3(1.0) * (spec1 * 1.5 + spec2 * 0.5);
    
    // Tiny dark rim for definition
    float rim = smoothstep(0.48, 0.5, length(vUv - 0.5));
    
    float alpha = (fresnel * 0.6 + spec1 * 0.4 + 0.05) * u_opacity;
    vec3 finalColor = iris * (fresnel + 0.2) + spec;
    
    // Subtract rim for sharp physical edge
    finalColor *= (1.0 - rim * 0.3);

    gl_FragColor = vec4(finalColor, alpha);
}
`;

interface Bubble {
    id: number;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    scale: number;
    life: number;
}

const BubbleMesh = ({ data }: { data: Bubble }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
        if (!meshRef.current || !materialRef.current) return;
        
        // Motion physics
        data.pos.add(data.vel);
        data.pos.x += Math.sin(state.clock.elapsedTime + data.id) * 0.002;
        meshRef.current.position.copy(data.pos);
        
        const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 4.0 + data.id) * 0.02;
        meshRef.current.scale.setScalar(data.scale * pulse);
        
        materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
        materialRef.current.uniforms.u_opacity.value = Math.min(1.0, data.life);
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[1, 32, 32]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={{ u_time: { value: 0 }, u_opacity: { value: 1.0 } }}
                transparent={true}
                depthWrite={false}
                side={THREE.DoubleSide}
           />
        </mesh>
    );
};

const BubbleSystem = () => {
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const count = useRef(0);
    const { viewport, mouse } = useThree();

    const spawn = () => {
        // Precise viewport mapping to prevent "huge" bubble errors
        const x = (mouse.x * viewport.width) / 2;
        const y = (mouse.y * viewport.height) / 2;
        
        const newBubble: Bubble = {
            id: count.current++,
            pos: new THREE.Vector3(x, y, 0),
            // DELICATE SCALE: Much smaller as requested
            scale: 0.03 + Math.random() * 0.08,
            vel: new THREE.Vector3(
                (Math.random() - 0.5) * 0.005,
                0.005 + Math.random() * 0.012,
                (Math.random() - 0.5) * 0.005
            ),
            life: 3.0 + Math.random() * 2.0
        };
        setBubbles(prev => [...prev, newBubble]);
    };

    useFrame((state, delta) => {
        setBubbles(prev => {
            const next = prev.map(b => ({ ...b, life: b.life - delta }));
            return next.filter(b => b.life > 0);
        });
    });

    return (
        <group onPointerDown={spawn} onPointerMove={(e) => { if(e.buttons > 0) spawn() }}>
            <mesh visible={false}>
                <planeGeometry args={[100, 100]} />
            </mesh>
            {bubbles.map(b => <BubbleMesh key={b.id} data={b} />)}
        </group>
    );
};

const SoapBubbles2: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    return (
        <div className="canvas-container bg-white cursor-crosshair relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 5], fov: 35 }} 
                className="w-full h-full"
            >
                <BubbleSystem />
            </Canvas>
            <InteractionUI />
        </div>
    );
};

export default SoapBubbles2;
