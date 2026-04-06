"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';

const vertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
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

// Thin-film interference spectral colors
vec3 iridescence(float cosTheta) {
    float angle = acos(cosTheta);
    vec3 color;
    color.r = 0.5 + 0.5 * cos(6.28318 * (angle * 2.0 - 0.00));
    color.g = 0.5 + 0.5 * cos(6.28318 * (angle * 2.0 - 0.33));
    color.b = 0.5 + 0.5 * cos(6.28318 * (angle * 2.0 - 0.67));
    return color;
}

void main() {
    vec2 p = vUv - 0.5;
    float dist = length(p);
    
    // Bubble shape mask
    if (dist > 0.5) discard;
    
    // Fresnel effect for transparency and rim highlights
    float fresnel = pow(1.0 - dot(vNormal, vViewDir), 3.0);
    
    // Iridescence based on view angle and thickness variation
    float thickness = 1.0 + 0.1 * sin(vUv.x * 10.0 + u_time) * cos(vUv.y * 12.0 - u_time);
    vec3 iris = iridescence(dot(vNormal, vViewDir) * thickness);
    
    // Specular highlight (Virtual light source)
    vec3 lightDir = normalize(vec3(1.0, 1.0, 2.0));
    float spec = pow(max(0.0, dot(reflect(-lightDir, vNormal), vViewDir)), 40.0);
    
    // Main bubble color compositing
    // Transparency in center, iridescent at rims
    float alpha = smoothstep(0.5, 0.45, dist) * (fresnel * 0.8 + 0.1);
    vec3 finalColor = iris * fresnel + vec3(1.0) * spec * 0.8;
    
    // Subtle surface wobbling reflection
    float wobble = sin(dist * 20.0 - u_time * 5.0) * 0.02;
    finalColor += vec3(0.1) * wobble;

    gl_FragColor = vec4(finalColor, alpha * u_opacity);
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
            // Apply floating physics
            data.position.add(data.velocity);
            data.position.x += Math.sin(state.clock.elapsedTime + data.id) * 0.005;
            meshRef.current.position.copy(data.position);
            
            // Wobble scale
            const s = data.scale * (1.0 + Math.sin(state.clock.elapsedTime * 2.0 + data.id) * 0.05);
            meshRef.current.scale.setScalar(s);
            
            materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
            
            // Fade out at end of life
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
            <sphereGeometry args={[1, 32, 32]} />
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
    const { viewport, mouse, camera } = useThree();

    const spawnBubble = () => {
        // Unproject mouse to 3D world position at Z=0
        const vec = new THREE.Vector3(mouse.x, mouse.y, 0).unproject(camera);
        const pos = vec.clone();
        
        const newBubble: BubbleData = {
            id: nextId.current++,
            position: pos,
            scale: 0.1 + Math.random() * 0.2,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                0.01 + Math.random() * 0.02,
                (Math.random() - 0.5) * 0.01
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
        <group onPointerDown={spawnBubble} onPointerMove={(e) => { if(e.buttons > 0) spawnBubble() }}>
            {/* Invisible interaction plane */}
            <mesh visible={false}>
                <planeGeometry args={[100, 100]} />
            </mesh>
            {bubbles.map(b => (
                <Bubble key={b.id} data={b} />
            ))}
        </group>
    );
};

const SoapBubbles1: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'soap-bubbles-v1.png') as () => void;

    return (
        <div className="canvas-container bg-[#f0f4f8] cursor-crosshair relative w-full h-full flex items-center justify-center overflow-hidden">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
                camera={{ position: [0, 0, 5], fov: 45 }} 
                className="w-full h-full"
            >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <BubbleSystem />
            </Canvas>
            <div className="absolute top-10 right-10 text-black/20 uppercase text-[10px] tracking-[0.2em] pointer-events-none">
                click or drag to create / drifting soap bubbles
            </div>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default SoapBubbles1;
