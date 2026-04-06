"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';

const vertexShader = `
uniform float u_time;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

void main() {
    vUv = uv;
    
    // Subtle wobbling deformation for liquid bubble feel
    float wobble = sin(position.x * 4.0 + u_time * 2.0) * cos(position.y * 4.0 + u_time * 1.5) * 0.05;
    vec3 newPos = position + normal * wobble;
    
    vec4 worldPos = modelMatrix * vec4(newPos, 1.0);
    vWorldPos = worldPos.xyz;
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
varying vec3 vWorldPos;

// Soft pastel iridescence palette
vec3 getPastelIris(float cosTheta) {
    float t = cosTheta;
    vec3 color;
    color.r = 0.85 + 0.15 * cos(6.28 * (t + 0.1));
    color.g = 0.8 + 0.2 * cos(6.28 * (t + 0.4));
    color.b = 0.9 + 0.1 * cos(6.28 * (t + 0.7));
    return color;
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    
    float dotNV = dot(N, V);
    float fresnel = pow(1.0 - max(0.0, dotNV), 3.5);
    
    // 1. Base Iridescence (Soft pink / blue highlights)
    float irisShift = sin(vWorldPos.x * 2.0 + u_time * 0.5) * 0.1;
    vec3 iris = getPastelIris(dotNV + irisShift);
    
    // 2. Strong White Specular Marks (Like reference)
    vec3 L1 = normalize(vec3(0.5, 1.0, 1.0));
    vec3 L2 = normalize(vec3(-0.8, -0.5, 0.5));
    
    float spec1 = pow(max(0.0, dot(reflect(-L1, N), V)), 60.0);
    float spec2 = pow(max(0.0, dot(reflect(-L2, N), V)), 30.0);
    vec3 highlights = vec3(1.0) * (spec1 * 1.2 + spec2 * 0.4);
    
    // 3. Rim Glow
    vec3 rimColor = vec3(0.9, 0.7, 0.9) * fresnel * 0.6;
    
    // 4. Final Composition
    // Higher transparency in center, stronger iris/rim at edges
    float alpha = (fresnel * 0.7 + 0.05 + spec1 * 0.5) * u_opacity;
    vec3 finalColor = mix(vec3(1.0), iris, 0.4) * fresnel + highlights + rimColor;
    
    // Final soft pastel touch
    finalColor *= vec3(1.05, 1.0, 1.08);

    gl_FragColor = vec4(finalColor, alpha);
}
`;

interface BubbleData {
    id: number;
    position: THREE.Vector3;
    scale: number;
    velocity: THREE.Vector3;
    life: number;
}

const Bubble = ({ data }: { data: BubbleData }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
        if (meshRef.current && materialRef.current) {
            data.position.add(data.velocity);
            data.position.x += Math.sin(state.clock.elapsedTime * 0.8 + data.id) * 0.003;
            meshRef.current.position.copy(data.position);
            
            const scalePulse = 1.0 + Math.sin(state.clock.elapsedTime * 1.5 + data.id) * 0.03;
            meshRef.current.scale.setScalar(data.scale * scalePulse);
            
            materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
            if (data.life < 1.0) {
                materialRef.current.uniforms.u_opacity.value = data.life;
            }
        }
    });

    const uniforms = useMemo(() => ({
        u_time: { value: 0 },
        u_opacity: { value: 1.0 }
    }), []);

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent={true}
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

const BubbleSystem = () => {
    const [bubbles, setBubbles] = useState<BubbleData[]>([]);
    const nextId = useRef(0);
    const { mouse, camera } = useThree();

    const spawnBubble = () => {
        const vec = new THREE.Vector3(mouse.x, mouse.y, 0).unproject(camera);
        const pos = vec.clone();
        
        const newBubble: BubbleData = {
            id: nextId.current++,
            position: pos,
            scale: 0.05 + Math.random() * 0.12,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.003,
                0.006 + Math.random() * 0.01,
                (Math.random() - 0.5) * 0.003
            ),
            life: 4.0 + Math.random() * 3.0
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
        <group 
            onPointerDown={spawnBubble} 
            onPointerMove={(e) => { if(e.buttons > 0) spawnBubble() }}
        >
            <mesh visible={false}>
                <planeGeometry args={[100, 100]} />
            </mesh>
            {bubbles.map(b => (
                <Bubble key={b.id} data={b} />
            ))}
        </group>
    );
};

const SoapBubbles2: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'soap-bubbles-v2.png') as () => void;

    return (
        <div className="canvas-container bg-white cursor-crosshair relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
                camera={{ position: [0, 0, 5], fov: 45 }} 
                className="w-full h-full"
            >
                <BubbleSystem />
            </Canvas>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default SoapBubbles2;
