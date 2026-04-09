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

// Bolder and Larger LCD Subpixels (알록달록함 극대화)
vec3 getLCDColor(vec2 uv) {
    // 확대비율 더욱 증가 (0.020)
    vec2 p = uv * u_resolution.xy * 0.020; 
    
    float isOdd = mod(floor(p.y), 2.0);
    p.x += isOdd * 0.5; 
    
    // Smoothstep을 사용해 부드럽게 겹치는 선명하고 밝은 무지개빛 RGB 생성
    float r = smoothstep(0.1, 0.9, sin(p.x * 2.094));
    float g = smoothstep(0.1, 0.9, sin((p.x - 2.094) * 2.094));
    float b = smoothstep(0.1, 0.9, sin((p.x - 4.188) * 2.094));
    
    // 그림자 영역을 밝게 조정 (어두운 부분 감소, 색감 증폭)
    float gridY = smoothstep(0.1, 0.9, sin(p.y * 3.1415));
    float gridX = smoothstep(0.0, 1.0, sin(p.x * 1.047)); 
    
    return vec3(r, g, b) * (0.65 + 0.45 * gridY * gridX); 
}

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
    
    // Extreme Chromatic Aberration (엄청난 색수차 갈라짐)
    vec2 distR = p - normalOffset * 0.40; // 빨강은 훨씬 멀리
    vec2 distG = p - normalOffset * 0.25; // 초록은 중간
    vec2 distB = p - normalOffset * 0.10; // 파랑은 조금만
    
    vec3 lcdColor = vec3(
        getLCDColor(distR).r,
        getLCDColor(distG).g,
        getLCDColor(distB).b
    );
    // 콘트라스트를 높이고 극강의 채도(Saturation) 확보
    lcdColor = pow(lcdColor, vec3(0.45)) * 1.9; 
    
    float slope = length(normalOffset);
    
    float rgbMaxH = smoothstep(0.95, 0.8, h);
    float rgbMinSlope = smoothstep(0.02, 0.12, slope);
    
    float patchNoise = snoise(p * u_resolution.xy * 0.02);
    // RGB가 좀 더 넓은 영역에서 잘 보이도록
    float rgbIrregularity = smoothstep(-0.4, 0.9, patchNoise);
    
    float rgbVisibility = rgbMaxH * rgbMinSlope * rgbIrregularity;
    
    // 큰 웅덩이 중앙의 투명한 물 (약간 그라데이션)
    vec3 clearWater = vec3(0.98) - (h * 0.02); 
    
    vec3 dropColor = mix(clearWater, lcdColor, rgbVisibility);
    
    // 강한 스펙큘러 라이트 (물방울 특유의 쨍한 광택)
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    vec3 L = normalize(vec3(-0.6, 0.8, 1.0));
    float spec = pow(max(dot(normal, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 50.0) * 1.8;
    
    vec3 screenBase = vec3(1.0);
    
    float isWater = smoothstep(0.005, 0.04, h);
    float edge = smoothstep(0.0, 0.3, h) - smoothstep(0.3, 0.9, h);
    vec3 waterFinal = dropColor * (1.0 - edge * 0.1) + spec;
    
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
        
        const numDrops = 10 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < numDrops; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distRatio = Math.pow(Math.random(), 1.5); 
            
            const distance = distRatio * 60.0; 
            
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            let r;
            if (i < 2) {
                // Main drops
                r = 15 + Math.random() * 15; 
            } else {
                // Secondary smaller droplets
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

    const handlePointerMove = (e: any) => {
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
    };

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

const RGBWater9: React.FC = () => {
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
            <InteractionUI />
        </div>
    );
};

export default RGBWater9;
