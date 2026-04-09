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

// 2D Simplex Noise
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

vec3 getLCDColor(vec2 uv) {
    vec2 p = uv * u_resolution.xy * 0.010; 
    
    float isOdd = mod(floor(p.y), 2.0);
    p.x += isOdd * 0.5; 
    
    float r = smoothstep(0.1, 0.9, sin(p.x * 2.094));
    float g = smoothstep(0.1, 0.9, sin((p.x - 2.094) * 2.094));
    float b = smoothstep(0.1, 0.9, sin((p.x - 4.188) * 2.094));
    
    float gridY = smoothstep(0.1, 0.9, sin(p.y * 3.1415));
    float gridX = smoothstep(0.0, 1.0, sin(p.x * 1.047)); 
    
    return vec3(r, g, b) * (0.65 + 0.45 * gridY * gridX); 
}

float getWaterHeight(vec2 uv) {
    // 거친 왜곡(굴곡)보다는 사실적이고 매끄러운 굴절을 위해 노이즈 강도 축소
    float noise1 = snoise(uv * 12.0) * 0.010;
    float noise2 = snoise(uv * 8.0 + vec2(12.3)) * 0.015;
    vec2 warpedUv = uv + vec2(noise1, noise2);
    
    float rawH = texture2D(u_waterMap, warpedUv).r;
    // 물방울이 줄어들며 사라지는 효과를 위해 임계값 조정 (0.02 미만은 바로 투명화)
    return smoothstep(0.02, 0.25, rawH) * rawH;
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
    
    vec2 distR = p - normalOffset * 0.45; 
    vec2 distG = p - normalOffset * 0.30; 
    vec2 distB = p - normalOffset * 0.15; 
    
    vec3 lcdColor = vec3(
        getLCDColor(distR).r,
        getLCDColor(distG).g,
        getLCDColor(distB).b
    );
    lcdColor = pow(lcdColor, vec3(0.45)) * 1.9; 
    
    float slope = length(normalOffset);
    float rgbMaxH = smoothstep(0.95, 0.8, h);
    float rgbMinSlope = smoothstep(0.02, 0.12, slope);
    
    float patchNoise = snoise(p * u_resolution.xy * 0.02);
    float rgbIrregularity = smoothstep(-0.5, 1.0, patchNoise);
    
    float rgbVisibility = rgbMaxH * rgbMinSlope * rgbIrregularity;
    
    vec3 clearWater = mix(vec3(1.0), vec3(0.86, 0.88, 0.90), min(h * 1.8, 1.0)); 
    vec3 dropColor = mix(clearWater, lcdColor, rgbVisibility);
    
    // 조명 계산 (물방울 특유의 찰랑이는 반사광 추가)
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    
    // 주 스팟라이트
    vec3 L1 = normalize(vec3(-0.6, 0.8, 1.0));
    float spec1 = pow(max(dot(normal, normalize(L1 + viewDir)), 0.0), 50.0) * 1.5;
    
    // 보조 라이트 (물이 더 물처럼 보이도록, 찰랑거리는 빛)
    vec3 L2 = normalize(vec3(0.5, -0.4, 0.8));
    float spec2 = pow(max(dot(normal, normalize(L2 + viewDir)), 0.0), 20.0) * 0.8;
    
    // 프레넬 렌즈 반사 (물방울 표면의 얕은 난반사)
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * 0.4;
    
    vec3 glint = vec3(1.0, 0.98, 0.95) * (spec1 + spec2 + fresnel);
    
    vec3 screenBase = vec3(1.0);
    float isWater = smoothstep(0.002, 0.03, h);
    float edge = smoothstep(0.0, 0.2, h) - smoothstep(0.2, 0.9, h);
    
    // 빛이 더해지고 모서리가 투명하게 감쇠됨
    vec3 waterFinal = dropColor * (1.0 - edge * 0.05) + glint;
    
    vec3 finalColor = mix(screenBase, waterFinal, isWater);
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

type Splat = {
    x: number;
    y: number;
    targetR: number;
    currentR: number;
    active: boolean;
};

const RGBWaterPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    const splatsRef = useRef<Splat[]>([]);
    
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
        if (!ctx || !texRef.current) return;
        
        let needsUpdate = false;

        // 증발 로직: 넓은 범위(가장자리)는 빠르게 없어지고 중앙은 오래 남도록 
        // 캔버스 자체의 알파를 빠르게 깎아서 물리적으로 크기가 줄어드는(Shrink) 효과 가속 
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.02)'; // 이전(0.012)보다 더 빠르게 깎임
        ctx.fillRect(0, 0, canvas2D.width, canvas2D.height);
        
        ctx.globalCompositeOperation = 'lighter';
        
        splatsRef.current.forEach(s => {
            if (!s.active) return;
            
            const dr = s.targetR - s.currentR;
            // 살짝 더 빠른 팽창으로 촥 뿌려지는 느낌 강화
            s.currentR += dr * 0.35; 
            
            if (dr < 0.5) {
                s.active = false;
                s.currentR = s.targetR;
            }
            
            const alpha = 0.12; 
            
            // 중앙이 매우 희고 바깥이 빠르게 투명해지는 선형적인 그라데이션
            // 이로 인해 캔버스가 어두워질 때(증발할 때) 물방울의 반경 자체가 확연하게 줄어들어 보임.
            const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.currentR);
            grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`); 
            grad.addColorStop(0.3, `rgba(255, 255, 255, ${alpha * 0.5})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.currentR, 0, Math.PI * 2);
            ctx.fill();
            
            needsUpdate = true;
        });

        splatsRef.current = splatsRef.current.filter(s => s.active);

        texRef.current.needsUpdate = true;
    });

    const splashWater = (uv: THREE.Vector2) => {
        const centerX = uv.x * canvas2D.width;
        const centerY = (1.0 - uv.y) * canvas2D.height;
        
        const newSplats: Splat[] = [];
        
        newSplats.push({
            x: centerX + (Math.random() - 0.5) * 8,
            y: centerY + (Math.random() - 0.5) * 8,
            targetR: 45 + Math.random() * 25,
            currentR: 2, 
            active: true
        });
        
        const numDrops = 15 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numDrops; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distRatio = Math.pow(Math.random(), 1.5); 
            const distance = 45.0 + distRatio * 55.0;
            
            newSplats.push({
                x: centerX + Math.cos(angle) * distance,
                y: centerY + Math.sin(angle) * distance,
                targetR: 2 + Math.random() * 12 * (1.0 - distRatio),
                currentR: 0.1,
                active: true
            });
        }
        
        splatsRef.current.push(...newSplats);
    };

    const handlePointerDown = (e: any) => {
        if (e.uv) splashWater(e.uv);
    };

    const handlePointerMove = (e: any) => {
        if (e.buttons > 0 && e.uv) {
            const centerX = e.uv.x * canvas2D.width;
            const centerY = (1.0 - e.uv.y) * canvas2D.height;
            splatsRef.current.push({
                x: centerX,
                y: centerY,
                targetR: 5 + Math.random() * 5,
                currentR: 2,
                active: true
            });
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

const RGBWater12: React.FC = () => {
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

export default RGBWater12;
