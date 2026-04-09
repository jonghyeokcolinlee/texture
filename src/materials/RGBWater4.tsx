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

varying vec2 vUv;

// Smooth Anti-aliased RGB Subpixel generator
vec3 getLCDColor(vec2 uv) {
    vec2 p = uv * u_resolution.xy * 0.18; 
    float r = sin(p.x * 2.094) * 0.5 + 0.5;
    float g = sin((p.x - 2.094) * 2.094) * 0.5 + 0.5;
    float b = sin((p.x - 4.188) * 2.094) * 0.5 + 0.5;
    
    float gridY = smoothstep(0.4, 0.6, sin(p.y * 3.1415));
    float gridX = smoothstep(0.4, 0.6, sin(p.x * 1.047)); 
    
    return vec3(r, g, b) * (0.6 + 0.4 * gridY * gridX);
}

// Metaball gooey reading from our FBO
float getWaterHeight(vec2 uv) {
    float rawH = texture2D(u_waterMap, uv).r;
    // Hard surface tension clip
    return smoothstep(0.04, 0.15, rawH) * rawH;
}

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = vUv;
    
    float h = getWaterHeight(p);
    
    // Normal / Derivative calculation
    vec2 texel = 1.0 / vec2(1024.0);
    float hR = getWaterHeight(p + vec2(texel.x * 2.0, 0.0));
    float hU = getWaterHeight(p + vec2(0.0, texel.y * 2.0));
    
    float dx = (hR - h) * 35.0; 
    float dy = (hU - h) * 35.0;
    vec2 normalOffset = vec2(dx, dy);
    
    // Refraction Lens
    vec2 distortedUv = p - normalOffset * 0.05;
    
    // Evaluate LCD screen
    vec3 lcdColor = getLCDColor(distortedUv);
    lcdColor = pow(lcdColor, vec3(0.7)) * 1.5; // High contrast
    
    // Evaluate how flat the water is
    // The slope tells us if we are on the edge (steep) or the center (flat)
    float slope = length(normalOffset);
    
    // Small dots have very steep curves (slope is high everywhere). 
    // Giant puddles have steep edges but a totally flat center (slope is 0).
    float rgbVisibility = smoothstep(0.02, 0.3, slope);
    
    // Completely clear water view for the flat centers
    vec3 clearWater = vec3(0.95) - (h * 0.03); // very subtle darkening
    
    // Combine clear centers with RGB edges
    vec3 dropColor = mix(clearWater, lcdColor, rgbVisibility);
    
    // Glowing Specular Highlight for purely glossy water
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    vec3 L = normalize(vec3(-0.6, 0.8, 1.0));
    float spec = pow(max(dot(normal, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 90.0) * 1.6;
    
    // Pure White Background
    vec3 screenBase = vec3(1.0); 
    
    float isWater = smoothstep(0.005, 0.05, h);
    
    // Darken drop edges subtly for volume
    float edge = smoothstep(0.0, 0.3, h) - smoothstep(0.3, 0.9, h);
    vec3 waterFinal = dropColor * (1.0 - edge * 0.2) + spec;
    
    vec3 finalColor = mix(screenBase, waterFinal, isWater);
    
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
    }), []);
    
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_resolution.value.set(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio);
        }
    }, [size]);

    const isPointerDown = useRef(false);
    const pointerPos = useRef(new THREE.Vector2(0, 0));
    const pressureTime = useRef(0); // Simulates holding time / pressure
    const isFirstClick = useRef(true); // Track if pointer just went down

    useFrame((state, delta) => {
        const ctx = canvas2D.getContext('2d');
        if (ctx && texRef.current) {
            // Evaporation
            ctx.globalCompositeOperation = 'source-over';
            ctx.filter = 'none';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.02)'; // Fade out speed
            ctx.fillRect(0, 0, canvas2D.width, canvas2D.height);
            
            // Continuous drawing logic
            if (isPointerDown.current) {
                // Initial small drops when first clicked, then grow rapidly if held
                if (isFirstClick.current) {
                    pressureTime.current = 5.0; // Start size for quick dots
                    isFirstClick.current = false;
                } else {
                    // Accumulate pressure over time
                    pressureTime.current += delta * 60.0;
                }
                
                // Radius capped at large puddle size
                const currentRadius = Math.min(pressureTime.current, 120);
                
                const x = pointerPos.current.x * canvas2D.width;
                const y = (1.0 - pointerPos.current.y) * canvas2D.height;
                
                // Additive drawing creates strong domes when held, weak domes when moving fast
                ctx.globalCompositeOperation = 'lighter';
                
                const grad = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
                // The low opacity allows it to build up smoothly to intense flat domes
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            texRef.current.needsUpdate = true;
        }
    });

    const handlePointerDown = (e: any) => {
        isPointerDown.current = true;
        isFirstClick.current = true; // reset for new interaction
        if (e.uv) pointerPos.current.copy(e.uv);
    };

    const handlePointerMove = (e: any) => {
        if (isPointerDown.current && e.uv) {
            pointerPos.current.copy(e.uv);
            // Deduct pressure slightly so rapidly dragging creates a trail of small drops
            // Holding STILL lets it grow back into a massive puddle.
            pressureTime.current = Math.max(5.0, pressureTime.current - 12.0); 
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

const RGBWater4: React.FC = () => {
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

export default RGBWater4;
