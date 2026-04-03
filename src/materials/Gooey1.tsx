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

uniform vec3 u_drops[15]; // x, y, startTime
uniform int u_dropCount;

varying vec2 vUv;

// Polynomial smooth min for gooey blending (metaball effect)
float smin( float a, float b, float k ) {
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

float map(vec2 p) {
    // 1. The ceiling goo body
    // y goes from 0 (bottom) to 1 (top). So 1.0 - p.y is 0 at the top edge.
    float d = 1.0 - p.y; 
    
    // Add waviness to the ceiling base
    d += sin(p.x * 12.0 + u_time * 0.5) * 0.02;
    d += sin(p.x * 25.0 - u_time * 0.3) * 0.01;
    
    // 2. Background continuous dripping drops
    for(int i = 0; i < 7; i++) {
        float f_i = float(i);
        float xpos = fract(sin(f_i * 123.4) * 456.7) * 1.2 - 0.1;
        float speed = 0.15 + 0.1 * fract(sin(f_i * 43.2)*87.6);
        float t = fract(u_time * speed + f_i * 0.618);
        
        // Starts hanging at ceiling, then falls
        float dropY = 1.02 - pow(t, 3.0) * 2.0; 
        float r = 0.02 + 0.025 * fract(sin(f_i * 77.7)*88.8);
        
        // Stretch vertically as it falls fast
        float stretch = 1.0 + pow(t, 2.5) * 4.0; 
        
        vec2 diff = p - vec2(xpos, dropY);
        diff.y /= stretch; // non-euclidean distance for stretched drops
        float dDrop = length(diff) * stretch - r; 
        
        d = smin(d, dDrop, 0.15); // blend radius
    }
    
    // 3. User interaction drops
    for(int j = 0; j < 15; j++) {
        if(j >= u_dropCount) break;
        vec3 ud = u_drops[j];
        float age = max(0.0, u_time - ud.z);
        if(age < 4.0) { // lifespan of a dropped blob
            // They also stretch and fall slowly if they are disconnected,
            // but if they are placed, gravity pulls them down
            float dropY = ud.y - pow(age, 1.8) * 0.6;
            // Shrink as it falls to simulate depth / splatter
            float r = 0.04 * (1.0 - age/4.0); 
            
            float stretch = 1.0 + age * 2.5;
            vec2 diff = p - vec2(ud.x, dropY);
            diff.y /= stretch;
            float dDrop = length(diff) * stretch - r;
            
            d = smin(d, dDrop, 0.2); // stickier user drops
        }
    }
    
    // threshold defines the actual edge thickness
    return d - 0.04;
}

void main() {
    vec2 p = vUv;
    float d = map(p);
    
    // Smooth hard mask for the fluid silhouette
    float mask = smoothstep(0.005, -0.005, d);
    
    // Normal estimation from SDF gradient
    vec2 e = vec2(0.002, 0.0);
    float nx = map(p + e.xy) - map(p - e.xy);
    float ny = map(p + e.yx) - map(p - e.yx);
    // z component controls the apparent depth/puffiness of the fluid
    vec3 n = normalize(vec3(nx, ny, 0.008));
    
    // Lighting
    vec3 lightDir = normalize(vec3(-0.5, 0.8, 1.0));
    float diff = max(dot(n, lightDir), 0.0);
    
    // Glossy specular highlight
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfV = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfV), 0.0), 50.0);
    
    // Fresnel rim light 
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 4.0);
    
    // Color palette: sleek deep glossy black/blue goo on white
    vec3 baseColor = vec3(0.05, 0.06, 0.08);
    
    vec3 finalColor = baseColor * (diff * 0.6 + 0.4);
    finalColor += vec3(1.0) * spec * 1.5;
    finalColor += vec3(0.5, 0.8, 1.0) * fresnel * 0.8;
    
    // Background color
    vec3 bgColor = vec3(0.95, 0.95, 0.95);
    
    gl_FragColor = vec4(mix(bgColor, finalColor, mask), 1.0);
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
        u_drops: { value: new Array(15).fill(null).map(() => new THREE.Vector3()) },
        u_dropCount: { value: 0 }
    }), []);

    useFrame((state) => {
        if (materialRef.current) {
            const time = state.clock.elapsedTime;
            materialRef.current.uniforms.u_time.value = time;
            
            // Filter alive drops
            const activeDrops = drops.filter(d => time - d.startTime < 4.0);
            if(activeDrops.length !== drops.length) setDrops(activeDrops);
            
            const count = Math.min(activeDrops.length, 15);
            materialRef.current.uniforms.u_dropCount.value = count;
            
            for (let i = 0; i < 15; i++) {
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
        if (time - lastDropTime.current < 0.1) return; // limit drop rate to prevent array exhaustion over drag
        lastDropTime.current = time;
        
        setDrops(prev => {
            const next = [...prev, { x: uv.x, y: uv.y, startTime: time }];
            return next.length > 15 ? next.slice(next.length - 15) : next;
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

const Gooey1: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'gooey-drip-v1.png') as () => void;

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

export default Gooey1;
