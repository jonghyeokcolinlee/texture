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

// 2D Simplex Noise for static shapes
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
    vec2 p = uv * u_resolution.xy * 0.08; // scale macro blocks
    
    // Staggering
    float isOdd = mod(floor(p.y), 2.0);
    p.x += isOdd * 0.5; 
    
    float r = sin(p.x * 2.094) * 0.5 + 0.5;
    float g = sin((p.x - 2.094) * 2.094) * 0.5 + 0.5;
    float b = sin((p.x - 4.188) * 2.094) * 0.5 + 0.5;
    
    // Softer grids to avoid aliased "sand" look
    float gridY = smoothstep(0.2, 0.8, sin(p.y * 3.1415));
    float gridX = smoothstep(0.1, 0.9, sin(p.x * 1.047)); 
    
    return vec3(r, g, b) * (0.5 + 0.5 * gridY * gridX);
}

// Static wobbly water shapes
float getWaterHeight(vec2 uv) {
    // Only scale coordinates, NO time animation so drops are static
    float noise1 = snoise(uv * 12.0) * 0.015;
    float noise2 = snoise(uv * 8.0 + vec2(12.3)) * 0.02;
    // Taper noise at the screen edge to avoid weird wrapping artifacts
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
    
    // Chromatic Aberration
    vec2 distR = p - normalOffset * 0.12;
    vec2 distG = p - normalOffset * 0.09;
    vec2 distB = p - normalOffset * 0.06;
    
    vec3 lcdColor = vec3(
        getLCDColor(distR).r,
        getLCDColor(distG).g,
        getLCDColor(distB).b
    );
    lcdColor = pow(lcdColor, vec3(0.6)) * 1.5; // high contrast vibrant
    
    // Control RGB Visibility based on Drop Size / Height
    float slope = length(normalOffset);
    
    // If a drop is very large, the center reaches h -> 1.0 (flat). 
    // Small drops peak around h=0.3 to 0.6.
    // Thus we hide RGB in the center of large drops by ensuring h < 0.8
    float rgbMaxH = smoothstep(0.9, 0.75, h);
    
    // We also need some slope (don't show RGB on the flat blank screen h=0)
    float rgbMinSlope = smoothstep(0.02, 0.12, slope);
    
    // Add chunky patchwork noise for irregular RGB blobs
    float patchNoise = snoise(p * u_resolution.xy * 0.02);
    float rgbIrregularity = smoothstep(-0.2, 0.8, patchNoise);
    
    // Final RGB visibility formula
    // Satisfies: small drops full RGB, large drops edge RGB only.
    float rgbVisibility = rgbMaxH * rgbMinSlope * rgbIrregularity;
    
    // Clear water center for large puddles
    vec3 clearWater = vec3(0.96) - (h * 0.03); 
    
    vec3 dropColor = mix(clearWater, lcdColor, rgbVisibility);
    
    // Specular Highlight
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    vec3 L = normalize(vec3(-0.6, 0.8, 1.0));
    float spec = pow(max(dot(normal, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 60.0) * 1.6;
    
    vec3 screenBase = vec3(1.0); // pure white bg
    
    float isWater = smoothstep(0.005, 0.04, h);
    float edge = smoothstep(0.0, 0.2, h) - smoothstep(0.2, 0.8, h);
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
    const pressureTime = useRef(0); 

    useFrame((state, delta) => {
        const ctx = canvas2D.getContext('2d');
        if (ctx && texRef.current) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.filter = 'none';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.012)'; // gentle evaporation limit
            ctx.fillRect(0, 0, canvas2D.width, canvas2D.height);
            
            if (isPointerDown.current) {
                // Grow quickly when held still
                pressureTime.current += delta * 60.0;
                const currentRadius = Math.min(10 + pressureTime.current, 130);
                
                const x = pointerPos.current.x * canvas2D.width;
                const y = (1.0 - pointerPos.current.y) * canvas2D.height;
                
                ctx.globalCompositeOperation = 'lighter';
                const grad = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
                
                // 0.3 center fill forces large drops to rapidly hit 1.0 (flat), eliminating RGB in the core
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.3)'); 
                grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
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
        pressureTime.current = 0.0; 
        if (e.uv) pointerPos.current.copy(e.uv);
    };

    const handlePointerMove = (e: any) => {
        if (isPointerDown.current && e.uv) {
            pointerPos.current.copy(e.uv);
            // Move lowers pressure so rapid scrubbing drops tiny drops
            pressureTime.current = Math.max(0.0, pressureTime.current - 10.0); 
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

const RGBWater6: React.FC = () => {
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

export default RGBWater6;
