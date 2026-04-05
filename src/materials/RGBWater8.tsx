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

// 2D Simplex Noise for static wobbly shapes
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,  0.366025403784439, -0.577350269189626,  0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Smooth Anti-aliased Staggered RGB Subpixel pattern
vec3 getLCDColor(vec2 uv) {
    // 0.035 Scale makes the RGB pixels massively huge, prioritizing explicit interaction visuals over reality
    vec2 p = uv * u_resolution.xy * 0.035; 
    
    float isOdd = mod(floor(p.y), 2.0);
    p.x += isOdd * 0.5; 
    
    float r = sin(p.x * 2.094) * 0.5 + 0.5;
    float g = sin((p.x - 2.094) * 2.094) * 0.5 + 0.5;
    float b = sin((p.x - 4.188) * 2.094) * 0.5 + 0.5;
    
    float gridY = smoothstep(0.2, 0.8, sin(p.y * 3.1415));
    float gridX = smoothstep(0.1, 0.9, sin(p.x * 1.047)); 
    
    return vec3(r, g, b) * (0.5 + 0.5 * gridY * gridX);
}

// Static wobbly water shapes
float getWaterHeight(vec2 uv) {
    float noise1 = snoise(uv * 12.0) * 0.015;
    float noise2 = snoise(uv * 8.0 + vec2(12.3)) * 0.02;
    vec2 warpedUv = uv + vec2(noise1, noise2);
    
    float rawH = texture2D(u_waterMap, warpedUv).r;
    return smoothstep(0.04, 0.2, rawH) * rawH;
}

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = vUv;
    
    float h = getWaterHeight(p);
    
    vec2 texel = 1.0 / vec2(1024.0);
    float hR = getWaterHeight(p + vec2(texel.x * 3.0, 0.0));
    float hU = getWaterHeight(p + vec2(0.0, texel.y * 3.0));
    
    float dx = (hR - h) * 15.0; 
    float dy = (hU - h) * 15.0;
    vec2 normalOffset = vec2(dx, dy);
    
    // Aggressive Chromatic Aberration for extremely apparent visual feedback
    vec2 distR = p - normalOffset * 0.25;
    vec2 distG = p - normalOffset * 0.20;
    vec2 distB = p - normalOffset * 0.15;
    
    vec3 lcdColor = vec3(
        getLCDColor(distR).r,
        getLCDColor(distG).g,
        getLCDColor(distB).b
    );
    lcdColor = pow(lcdColor, vec3(0.6)) * 1.6; 
    
    float slope = length(normalOffset);
    
    // Smoothstep hides RGB in the center of purely flat/large puddles
    // Puddles only clear completely if they are truly deep (0.9+)
    float rgbMaxH = smoothstep(0.95, 0.8, h);
    float rgbMinSlope = smoothstep(0.02, 0.12, slope);
    
    // Irregular chunky patchwork noise 
    float patchNoise = snoise(p * u_resolution.xy * 0.02);
    float rgbIrregularity = smoothstep(-0.2, 0.8, patchNoise);
    
    float rgbVisibility = rgbMaxH * rgbMinSlope * rgbIrregularity;
    
    // Clear water center
    vec3 clearWater = vec3(0.98) - (h * 0.02); 
    
    vec3 dropColor = mix(clearWater, lcdColor, rgbVisibility);
    
    // Glossy Specular Highlight
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    vec3 L = normalize(vec3(-0.6, 0.8, 1.0));
    float spec = pow(max(dot(normal, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 60.0) * 1.6;
    
    vec3 screenBase = vec3(1.0); // pure white background
    
    float isWater = smoothstep(0.005, 0.04, h);
    float edge = smoothstep(0.0, 0.3, h) - smoothstep(0.3, 0.9, h);
    vec3 waterFinal = dropColor * (1.0 - edge * 0.15) + spec;
    
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

    useFrame(() => {
        const ctx = canvas2D.getContext('2d');
        if (ctx && texRef.current) {
            // Very soft evaporation
            ctx.globalCompositeOperation = 'source-over';
            ctx.filter = 'none';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.01)'; 
            ctx.fillRect(0, 0, canvas2D.width, canvas2D.height);
            texRef.current.needsUpdate = true;
        }
    });

    const splashWater = (uv: THREE.Vector2) => {
        const ctx = canvas2D.getContext('2d');
        if (!ctx) return;
        
        const centerX = uv.x * canvas2D.width;
        const centerY = (1.0 - uv.y) * canvas2D.height;
        
        ctx.globalCompositeOperation = 'lighter';
        
        const numDrops = 10 + Math.floor(Math.random() * 12);
        
        for (let i = 0; i < numDrops; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distRatio = Math.pow(Math.random(), 1.5); 
            
            // Radically tighten the scatter radius so it doesn't spray wildly across the screen
            const distance = distRatio * 60.0; 
            
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            let r;
            if (i < 2) {
                // Main concentrated drops
                r = 15 + Math.random() * 15; 
            } else {
                // Tightly clustered satellite droplets
                r = 2 + Math.random() * 10 * (1.0 - distRatio); 
            }
            
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.5)'); 
            grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        texRef.current.needsUpdate = true;
    };

    const handlePointerDown = (e: any) => {
        if (e.uv) splashWater(e.uv);
    };

    // Use PointerMove as well but with much smaller drops to allow dragging a trail
    const handlePointerMove = (e: any) => {
        // Optional: comment this out if user wants ONLY click. But usually dragging is expected.
        // We will make drag just draw very small droplets so it doesn't become a wild spray.
        if (e.buttons > 0 && e.uv) {
            const ctx = canvas2D.getContext('2d');
            if(!ctx) return;
            const x = e.uv.x * canvas2D.width;
            const y = (1.0 - e.uv.y) * canvas2D.height;
            
            ctx.globalCompositeOperation = 'lighter';
            const r = 5 + Math.random() * 8;
            
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            texRef.current.needsUpdate = true;
        }
    }

    return (
        <mesh
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
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

const RGBWater8: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'rgb-water-drops-v8.png') as () => void;

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

export default RGBWater8;
