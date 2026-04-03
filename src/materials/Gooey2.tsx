"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';
import type { ThreeEvent } from '@react-three/fiber';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float u_time;
uniform vec2 u_resolution;

uniform vec3 u_drops[30]; // x, y, startTime
uniform int u_dropCount;

varying vec2 vUv;

// Polynomial smooth min for extreme slimy stickiness
float smin( float a, float b, float k ) {
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

float map(vec2 p) {
    // Ceiling base
    float d = 1.0 - p.y; 
    
    // Waviness to ceiling
    d += sin(p.x * 20.0 + u_time * 1.5) * 0.015;
    
    // Background dripping drops (frequent & small)
    for(int i = 0; i < 30; i++) {
        float f_i = float(i);
        float xpos = fract(sin(f_i * 123.4) * 456.7) * 1.2 - 0.1;
        float speed = 0.3 + 0.3 * fract(sin(f_i * 43.2)*87.6);
        float offset = f_i * 0.818;
        
        float t = fract(u_time * speed + offset);
        
        // Hangs shortly then drops fast
        float dropY = 1.01 - pow(t, 2.5) * 2.5; 
        
        // Smaller radii
        float r = 0.008 + 0.012 * fract(sin(f_i * 77.7)*88.8);
        
        float stretch = 1.0 + pow(t, 2.0) * 8.0; 
        
        vec2 diff = p - vec2(xpos, dropY);
        diff.y /= stretch;
        
        float dDrop = length(diff) * stretch - r; 
        
        // k = 0.25 blends them over a very long extreme distance (super sticky)
        d = smin(d, dDrop, 0.25); 
    }
    
    // User interaction drops
    for(int j = 0; j < 30; j++) {
        if(j >= u_dropCount) break;
        vec3 ud = u_drops[j];
        float age = max(0.0, u_time - ud.z);
        if(age < 5.0) { 
            float dropY = ud.y - pow(age, 2.0) * 0.8;
            
            // Shrink faster and smaller
            float r = 0.025 * (1.0 - age/5.0); 
            
            float stretch = 1.0 + age * 4.0;
            vec2 diff = p - vec2(ud.x, dropY);
            diff.y /= stretch;
            float dDrop = length(diff) * stretch - r;
            
            d = smin(d, dDrop, 0.25);
        }
    }
    
    return d - 0.03;
}

void main() {
    float d = map(vUv);
    
    // Pure graphic silhouette mask
    // Using anti-aliased edge
    float edgeWidth = 3.0 / u_resolution.y; 
    float mask = smoothstep(edgeWidth, -edgeWidth, d);
    
    vec3 blackGoo = vec3(0.0, 0.0, 0.0);
    vec3 whiteBg = vec3(1.0, 1.0, 1.0);
    
    gl_FragColor = vec4(mix(whiteBg, blackGoo, mask), 1.0);
}
`;

type UserDrop = { x: number; y: number; startTime: number };

const GooeyPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    const [drops, setDrops] = useState<UserDrop[]>([]);

    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_resolution.value.set(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio);
        }
    }, [size]);

    const uniforms = useMemo(() => ({
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
        u_drops: { value: new Array(30).fill(null).map(() => new THREE.Vector3()) },
        u_dropCount: { value: 0 }
    }), []);

    useFrame((state) => {
        if (materialRef.current) {
            const time = state.clock.elapsedTime;
            materialRef.current.uniforms.u_time.value = time;
            
            // Filter alive drops
            const activeDrops = drops.filter(d => time - d.startTime < 5.0);
            if(activeDrops.length !== drops.length) setDrops(activeDrops);
            
            const count = Math.min(activeDrops.length, 30);
            materialRef.current.uniforms.u_dropCount.value = count;
            
            for (let i = 0; i < 30; i++) {
                if (i < count) {
                    materialRef.current.uniforms.u_drops.value[i].set(activeDrops[i].x, activeDrops[i].y, activeDrops[i].startTime);
                } else {
                    materialRef.current.uniforms.u_drops.value[i].set(0, 0, 0);
                }
            }
        }
    });
    
    const isPointerDown = useRef(false);
    const lastDropTime = useRef(0);

    const addDrop = (uv: THREE.Vector2) => {
        const time = materialRef.current?.uniforms.u_time.value || 0;
        // Allows drawing line of blobs much faster (0.02s interval)
        if (time - lastDropTime.current < 0.02) return; 
        lastDropTime.current = time;
        
        setDrops(prev => {
            const next = [...prev, { x: uv.x, y: uv.y, startTime: time }];
            return next.length > 30 ? next.slice(next.length - 30) : next;
        });
    };

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        isPointerDown.current = true;
        addDrop(e.uv as THREE.Vector2);
    };

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (isPointerDown.current && e.uv) {
            addDrop(e.uv);
        }
    };

    const handlePointerUp = () => {
        isPointerDown.current = false;
    };

    return (
        <mesh
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
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

const Gooey2: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'gooey-drip-v2.png') as () => void;

    return (
        <div className="canvas-container bg-white cursor-crosshair">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: false }}
                camera={{ position: [0, 0, 1] }}
            >
                <GooeyPlane />
            </Canvas>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default Gooey2;
