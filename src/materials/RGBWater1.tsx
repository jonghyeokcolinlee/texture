"use client";
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec2 u_resolution;
uniform sampler2D u_waterMap;
uniform float u_time;

varying vec2 vUv;

vec3 getLCDColor(vec2 uv) {
    // 0.3 scales the density. adjust so it's clearly visible when magnified
    vec2 pixelPos = uv * u_resolution.xy * 0.15; 
    
    float modX = mod(pixelPos.x, 3.0);
    // Dark gaps
    float gapX = smoothstep(0.7, 1.0, fract(pixelPos.x));
    float gapY = smoothstep(0.8, 1.0, fract(pixelPos.y));
    float gap = max(gapX, gapY);
    
    vec3 color = vec3(0.0);
    // RGB strips
    if (modX < 1.0) color.r = 1.0;
    else if (modX < 2.0) color.g = 1.0;
    else color.b = 1.0;
    
    // A bit of organic imperfection / ambient light
    color += vec3(0.1); 
    
    return color * (1.0 - gap * 0.8);
}

void main() {
    vec2 uv = vUv;
    
    // Read water height
    float h = texture2D(u_waterMap, uv).r;
    
    // Calculate normal from height differences
    vec2 texel = 1.0 / vec2(1024.0); // canvas resolution
    float hR = texture2D(u_waterMap, uv + vec2(texel.x, 0.0)).r;
    float hU = texture2D(u_waterMap, uv + vec2(0.0, texel.y)).r;
    
    float dx = (hR - h) * 35.0; // strength of normal
    float dy = (hU - h) * 35.0;
    
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    
    // Refraction / Magnification: pull UVs towards center of drop
    vec2 offset = vec2(dx, dy) * 0.04;
    
    vec2 distortedUv = uv - offset; 
    
    // Dynamic shimmer based on time to simulate screen backing
    vec3 lcdColor = getLCDColor(distortedUv + vec2(0.0, sin(u_time * 0.5) * 0.005));
    
    // Specular highlight
    vec3 lightDir = normalize(vec3(-0.5, 0.8, 1.0));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfV = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfV), 0.0), 80.0) * h * 1.5;
    
    // Edge inner shadow (making it look like a physical droplet)
    float edge = smoothstep(0.0, 0.15, h) - smoothstep(0.15, 0.4, h);
    
    // Blend logic
    float isWater = smoothstep(0.01, 0.05, h);
    
    // Pure bright white for screen base
    vec3 whiteScreen = vec3(0.98, 0.98, 0.98);
    
    // Water drops intensify the LCD pattern and add glass-like shine
    vec3 waterColor = lcdColor * (1.0 - edge * 0.3) + spec;
    
    // Smooth composite
    vec3 finalColor = mix(whiteScreen, waterColor, isWater);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const RGBWaterPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    
    const [canvas2D] = useState(() => {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 1024;
        const ctx = c.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, c.width, c.height);
        }
        return c;
    });

    const texRef = useRef(new THREE.CanvasTexture(canvas2D));

    const uniforms = useMemo(() => ({
        u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
        u_waterMap: { value: texRef.current },
        u_time: { value: 0 }
    }), []);
    
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_resolution.value.set(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio);
        }
    }, [size]);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
        }
        
        // Slightly fade out drops over a long time to allow redrawing? 
        // We can keep it static for now for a persistent scattered look.
    });

    const isPointerDown = useRef(false);

    const sprayDrops = (uv: THREE.Vector2) => {
       const ctx = canvas2D.getContext('2d');
       if (!ctx) return;
       
       // Spray 3-6 droplets around the cursor per event
       const drops = 3 + Math.floor(Math.random() * 3);
       for(let i=0; i<drops; i++) {
           const ox = (Math.random() - 0.5) * 80;
           const oy = (Math.random() - 0.5) * 80;
           const x = uv.x * canvas2D.width + ox;
           const y = (1.0 - uv.y) * canvas2D.height + oy;
           const r = 8 + Math.random() * 25; // 8 to 33 px radius
           
           const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
           // dome-like bell curve for refraction
           grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
           grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
           grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
           
           ctx.fillStyle = grad;
           ctx.beginPath();
           ctx.arc(x, y, r, 0, Math.PI * 2);
           ctx.fill();
       }
       texRef.current.needsUpdate = true;
    };

    const handlePointerDown = (e: any) => {
        isPointerDown.current = true;
        sprayDrops(e.uv);
    };

    const handlePointerMove = (e: any) => {
        // Spray continuously while dragging
        if (isPointerDown.current && e.uv) {
            sprayDrops(e.uv);
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

const RGBWater1: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    return (
        <div className="canvas-container bg-white cursor-crosshair">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: false }}
                camera={{ position: [0, 0, 1] }}
            >
                <RGBWaterPlane />
            </Canvas>
            <InteractionUI title="03 rgb drops" />
        </div>
    );
};

export default RGBWater1;
