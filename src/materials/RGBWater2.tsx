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
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_drops[40]; // x, y, startTime
uniform int u_dropCount;
varying vec2 vUv;

// Smooth RGB Subpixel generator
// Uses sine waves to prevent aliasing (sand-like noise)
vec3 getLCDColor(vec2 uv) {
    // 0.20 scaling controls how big the pixels look
    vec2 p = uv * u_resolution.xy * 0.18; 
    
    // Smooth transition RGB bands
    float r = sin(p.x * 2.094) * 0.5 + 0.5;
    float g = sin((p.x - 2.094) * 2.094) * 0.5 + 0.5;
    float b = sin((p.x - 4.188) * 2.094) * 0.5 + 0.5;
    
    // Add grid gaps for subpixel look
    float gridY = smoothstep(0.4, 0.6, sin(p.y * 3.1415));
    float gridX = smoothstep(0.4, 0.6, sin(p.x * 1.047)); // 3 subpixels per pixel
    
    // Output RGB subpixels with dark gaps
    return vec3(r, g, b) * (0.6 + 0.4 * gridY * gridX);
}

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = vUv;
    
    float h = 0.0;
    vec2 normalOffset = vec2(0.0);
    
    // Mathematically calculate perfect smooth water domes 
    for(int i = 0; i < 40; i++) {
        if(i >= u_dropCount) break;
        vec3 drop = u_drops[i]; 
        float age = u_time - drop.z;
        if(age > 0.0 && age < 12.0) {
            // Drop shrinks and evaporates slowly over 12 seconds
            float radius = 0.08 * (1.0 - age/12.0); 
            
            vec2 diff = p - drop.xy;
            diff.x *= aspect; // Correct spherical shape depending on screen ratio
            float dist = length(diff);
            
            if (dist < radius) {
                // Sphere height equation
                float dropH = sqrt(radius * radius - dist * dist);
                h += (dropH / radius); // Normalize height to 0-1
                
                // Analytical derivative of a sphere allows perfect normal refraction
                normalOffset += (diff / max(dropH, 0.001)); 
            }
        }
    }
    
    h = min(h, 1.0);
    
    // Magnification / Refraction Lens equation
    // Pulls UV towards the center of each droplet, effectively magnifying the screen below
    vec2 distortedUv = p - (normalOffset * 0.018);
    
    // Sample the LCD layer with warped UV
    vec3 lcdColor = getLCDColor(distortedUv);
    
    // Enhance contrast and brightness inside the drop (glass/water effect)
    lcdColor = pow(lcdColor, vec3(0.7)) * 1.3;
    
    // Base white screen (outside drops)
    vec3 screenBase = vec3(0.98); 
    
    // Specular Highlight for purely glossy water feel
    vec3 normal = normalize(vec3(-normalOffset.x * 0.08, -normalOffset.y * 0.08, 1.0));
    vec3 L = normalize(vec3(-0.6, 0.8, 1.0));
    float spec = pow(max(dot(normal, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 90.0) * 1.5;
    
    // Smoothly blend the drop edges with the screen
    float isWater = smoothstep(0.01, 0.1, h);
    
    // Add darker ring at the edge of the droplet for realistic water volume
    float edge = smoothstep(0.0, 0.3, h) - smoothstep(0.3, 0.9, h);
    vec3 waterColor = lcdColor * (1.0 - edge * 0.4) + spec;
    
    // Combine cleanly with no digital aliasing!
    vec3 finalColor = mix(screenBase, waterColor, isWater);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

type UserDrop = { x: number; y: number; startTime: number };

const RGBWaterPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    const [drops, setDrops] = useState<UserDrop[]>([]);
    
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_resolution.value.set(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio);
        }
    }, [size]);

    const uniforms = useMemo(() => ({
        u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
        u_time: { value: 0 },
        u_drops: { value: new Array(40).fill(null).map(() => new THREE.Vector3()) },
        u_dropCount: { value: 0 }
    }), []);

    useFrame((state) => {
        if (materialRef.current) {
            const time = state.clock.elapsedTime;
            materialRef.current.uniforms.u_time.value = time;
            
            const activeDrops = drops.filter(d => time - d.startTime < 12.0);
            if(activeDrops.length !== drops.length) setDrops(activeDrops);
            
            const count = Math.min(activeDrops.length, 40);
            materialRef.current.uniforms.u_dropCount.value = count;
            
            for (let i = 0; i < 40; i++) {
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
        // Moderate distance to prevent spam array exhaustion
        if (time - lastDropTime.current < 0.05) return; 
        lastDropTime.current = time;
        
        // Add one main big drop and couple small satellite ones to simulate organic scatter
        setDrops(prev => {
            const next = [...prev, { x: uv.x, y: uv.y, startTime: time }];
            return next.length > 40 ? next.slice(next.length - 40) : next;
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

const RGBWater2: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'rgb-water-drops-v2.png') as () => void;

    return (
        <div className="canvas-container bg-white cursor-crosshair">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: false }}
                camera={{ position: [0, 0, 1] }}
            >
                <RGBWaterPlane />
            </Canvas>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default RGBWater2;
