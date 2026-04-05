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
uniform vec2 u_resolution;
uniform sampler2D u_waterMap;

varying vec2 vUv;

// Smooth RGB Subpixel generator from v2
vec3 getLCDColor(vec2 uv) {
    vec2 p = uv * u_resolution.xy * 0.18; 
    float r = sin(p.x * 2.094) * 0.5 + 0.5;
    float g = sin((p.x - 2.094) * 2.094) * 0.5 + 0.5;
    float b = sin((p.x - 4.188) * 2.094) * 0.5 + 0.5;
    
    // Add grid gaps
    float gridY = smoothstep(0.4, 0.6, sin(p.y * 3.1415));
    float gridX = smoothstep(0.4, 0.6, sin(p.x * 1.047)); 
    
    return vec3(r, g, b) * (0.6 + 0.4 * gridY * gridX);
}

float getWaterHeight(vec2 uv) {
    float rawH = texture2D(u_waterMap, uv).r;
    // Gooey Metaball thresholding
    // Only raw values above 0.05 are considered water, and they aggressively scale up
    // This creates surface tension (contact angle) and merges overlapping drops
    return smoothstep(0.05, 0.2, rawH) * rawH;
}

void main() {
    vec2 p = vUv;
    
    float h = getWaterHeight(p);
    
    // Approximate normal by sampling neighbor pixels
    vec2 texel = 1.0 / vec2(1024.0);
    // Use slightly wider sampling to prevent 8-bit texture banding artifacts
    float hR = getWaterHeight(p + vec2(texel.x * 2.0, 0.0));
    float hU = getWaterHeight(p + vec2(0.0, texel.y * 2.0));
    
    float dx = (hR - h) * 15.0; 
    float dy = (hU - h) * 15.0;
    
    vec2 normalOffset = vec2(dx, dy);
    
    // Lens Refraction (Magnification effect)
    vec2 distortedUv = p - normalOffset * 0.08;
    
    vec3 lcdColor = getLCDColor(distortedUv);
    
    // Increase internal drop contrast
    lcdColor = pow(lcdColor, vec3(0.7)) * 1.3;
    
    vec3 screenBase = vec3(0.98); 
    
    // Specular Highlight
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    vec3 L = normalize(vec3(-0.6, 0.8, 1.0));
    float spec = pow(max(dot(normal, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 90.0) * 1.8;
    
    float isWater = smoothstep(0.01, 0.08, h);
    
    // Darken drop edges
    float edge = smoothstep(0.0, 0.3, h) - smoothstep(0.3, 0.9, h);
    vec3 waterColor = lcdColor * (1.0 - edge * 0.4) + spec;
    
    vec3 finalColor = mix(screenBase, waterColor, isWater);
    
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

    useFrame(() => {
        const ctx = canvas2D.getContext('2d');
        if (ctx && texRef.current) {
            // Evaporation pass
            ctx.globalCompositeOperation = 'source-over';
            ctx.filter = 'none';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.01)'; // Very slow fade
            ctx.fillRect(0, 0, canvas2D.width, canvas2D.height);
            texRef.current.needsUpdate = true;
        }
    });

    const isPointerDown = useRef(false);
    const lastDrawTime = useRef(0);

    const sprayDrops = (uv: THREE.Vector2) => {
       const ctx = canvas2D.getContext('2d');
       if (!ctx) return;
       
       const x = uv.x * canvas2D.width;
       const y = (1.0 - uv.y) * canvas2D.height;
       
       // Draw highly blurred drops that ADD up.
       // This creates the gooey metaball thresholding effect when combined with the shader!
       ctx.globalCompositeOperation = 'lighter';
       
       const drops = 1 + Math.floor(Math.random() * 2);
       for(let i=0; i<drops; i++) {
           const ox = i===0 ? 0 : (Math.random() - 0.5) * 40;
           const oy = i===0 ? 0 : (Math.random() - 0.5) * 40;
           const r = i===0 ? 12 + Math.random() * 8 : 4 + Math.random() * 8;
           
           const grad = ctx.createRadialGradient(x+ox, y+oy, 0, x+ox, y+oy, r);
           grad.addColorStop(0, 'rgba(255, 255, 255, 0.5)'); // Semi-transparent so multiple strokes add up to form puddles
           grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
           
           ctx.fillStyle = grad;
           ctx.beginPath();
           ctx.arc(x+ox, y+oy, r, 0, Math.PI * 2);
           ctx.fill();
       }
    };

    const handlePointerDown = (e: any) => {
        isPointerDown.current = true;
        lastDrawTime.current = performance.now();
        sprayDrops(e.uv);
    };

    const handlePointerMove = (e: any) => {
        if (isPointerDown.current && e.uv) {
            const now = performance.now();
            if (now - lastDrawTime.current > 16) { // Throttle drawing slightly to ~60fps
                lastDrawTime.current = now;
                sprayDrops(e.uv);
            }
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

const RGBWater3: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'rgb-water-drops-v3.png') as () => void;

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

export default RGBWater3;
