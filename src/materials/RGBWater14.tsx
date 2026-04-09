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

// "v9버전의 스타일과, 코드 똑같이 rollback해주고"
// 아래 쉐이더는 RGBWater9.tsx 와 완전히 100% 동일한 코드입니다.
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

type Drop = {
    x: number;
    y: number;
    r: number;
    birth: number;
    isMove: boolean;
    active: boolean;
};

const RGBWaterPlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    const dropsRef = useRef<Drop[]>([]);
    
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
        
        const currentTime = performance.now() / 1000;
        
        // 매 프레임마다 캔버스를 완전히 초기화
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas2D.width, canvas2D.height);
        
        // 현재 활성화된 물방울들만 다시 그려줌
        ctx.globalCompositeOperation = 'lighter';
        
        dropsRef.current.forEach(d => {
            if (!d.active) return;
            
            const age = currentTime - d.birth;
            let currentR = d.r;
            let opacityMultiplier = 1.0;
            
            // "생성된 이후, 일정 시간이 지나면 수축되면서 증발"
            // -> 생성 후 1.5초 동안은 온전한 크기 유지, 그 이후 1.0초간 오그라들면서 사라짐
            if (age > 1.5) {
                const decayRatio = (age - 1.5) / 1.0; 
                if (decayRatio >= 1.0) {
                    d.active = false;
                    return;
                }
                // (1.0 - decayRatio)를 거듭제곱하여 더 빠르게 쪼그라들도록 타격감 부여
                const shrinkFactor = Math.pow(1.0 - decayRatio, 1.5);
                currentR = d.r * shrinkFactor;
                opacityMultiplier = shrinkFactor;
            }
            
            // 크기가 0.1 이하로 너무 작아지면 그리지 않음
            if (currentR < 0.1) return;
            
            const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, currentR);
            if (d.isMove) {
                // v9의 움직임 스플래터 스타일
                grad.addColorStop(0, `rgba(255, 255, 255, ${0.3 * opacityMultiplier})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else {
                // v9의 클릭 메인 스플래터 스타일
                grad.addColorStop(0, `rgba(255, 255, 255, ${0.5 * opacityMultiplier})`); 
                grad.addColorStop(0.6, `rgba(255, 255, 255, ${0.15 * opacityMultiplier})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            }
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(d.x, d.y, currentR, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // 수명이 다한 물방울 제거
        dropsRef.current = dropsRef.current.filter(d => d.active);

        texRef.current.needsUpdate = true;
    });

    const splashWater = (uv: THREE.Vector2) => {
        const centerX = uv.x * canvas2D.width;
        const centerY = (1.0 - uv.y) * canvas2D.height;
        const currentTime = performance.now() / 1000;
        
        const numDrops = 10 + Math.floor(Math.random() * 10);
        
        const newDrops: Drop[] = [];
        
        for (let i = 0; i < numDrops; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distRatio = Math.pow(Math.random(), 1.5); 
            
            const distance = distRatio * 60.0; 
            
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            let r;
            if (i < 2) {
                r = 15 + Math.random() * 15; 
            } else {
                r = 2 + Math.random() * 10 * (1.0 - distRatio); 
            }
            
            newDrops.push({
                x, y, r, birth: currentTime, isMove: false, active: true
            });
        }
        
        dropsRef.current.push(...newDrops);
    };

    const handlePointerDown = (e: any) => {
        if (e.uv) splashWater(e.uv);
    };

    const handlePointerMove = (e: any) => {
        if (e.buttons > 0 && e.uv) {
            const x = e.uv.x * canvas2D.width;
            const y = (1.0 - e.uv.y) * canvas2D.height;
            const currentTime = performance.now() / 1000;
            
            const r = 5 + Math.random() * 8;
            
            dropsRef.current.push({
                x, y, r, birth: currentTime, isMove: true, active: true
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

const RGBWater14: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    return (
        <div className="canvas-container bg-white w-full h-full cursor-crosshair">
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

export default RGBWater14;
