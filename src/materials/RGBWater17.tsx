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

// Bolder structured LCD Subpixels
vec3 getLCDColor(vec2 uv) {
    // "rgb 픽셀 덩어리는 조금씩 크게": 기존 0.015에서 0.008로 두 배가량 크기 확대
    vec2 p = uv * u_resolution.xy * 0.008; 
    
    // offset every other row for interlocking pixel structure
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
    float noise1 = snoise(uv * 12.0) * 0.015;
    vec2 warpedUv = uv + vec2(noise1, noise1);
    
    float rawH = texture2D(u_waterMap, warpedUv).r;
    // 중심부가 완벽히 평평한 고원(Plateau)이 되도록 임계값을 자름
    return smoothstep(0.04, 0.12, rawH);
}

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = vUv;
    
    float h = getWaterHeight(p);
    
    vec2 texel = 1.0 / vec2(1024.0);
    float hR = getWaterHeight(p + vec2(texel.x * 3.0, 0.0));
    float hU = getWaterHeight(p + vec2(0.0, texel.y * 3.0));
    
    // 외곽선의 경사(Slope) 벡터
    float dx = (hR - h) * 15.0; 
    float dy = (hU - h) * 15.0;
    vec2 normalOffset = vec2(dx, dy);
    float slope = length(normalOffset);
    
    // 완전한 가장자리(Edge)에서만 굴절이 반응하도록 설정
    float edgeIntensity = smoothstep(0.01, 0.20, slope);
    
    // 색수차 극대화를 위한 물리적 오프셋 
    vec2 distR = p - normalOffset * 0.40; 
    vec2 distG = p - normalOffset * 0.25; 
    vec2 distB = p - normalOffset * 0.10; 
    
    vec3 lcdColor = vec3(
        getLCDColor(distR).r,
        getLCDColor(distG).g,
        getLCDColor(distB).b
    );
    lcdColor = pow(lcdColor, vec3(0.45)) * 1.9; 
    
    vec3 N = normalize(vec3(-dx, -dy, 1.0));
    
    // 상단/좌측 경사면(Top-Left slope)으로 향할 때 RGB 발현
    vec3 L_rgb = normalize(vec3(-1.0, 1.0, 0.5)); 
    float rgbSide = smoothstep(0.0, 0.6, max(dot(N, L_rgb), 0.0));
    
    // 하단/우측 경사면(Bottom-Right slope)으로 향할 땐 그림자 발현
    vec3 L_shadow = normalize(vec3(1.0, -1.0, 0.5)); 
    float shadowSide = smoothstep(0.2, 0.8, max(dot(N, L_shadow), 0.0));
    
    // RGB와 Shadow 블렌딩
    // "그림자는 적게" -> 기존의 어두운 검회색(0.4)에서, 매우 밝은 옅은 쿨그레이(0.85)로 수정하고 블렌딩 비율 축소
    vec3 edgeColor = mix(vec3(0.96), lcdColor, rgbSide);
    vec3 lightGreyShadow = vec3(0.85, 0.85, 0.85); 
    edgeColor = mix(edgeColor, lightGreyShadow, shadowSide * 0.6); // 그림자 영향력 절반 이하로 감소
    
    // "물방울은 완전 #fff말고 흰색과 구분되는 조금 옅은 회색"
    vec3 dropInsideColor = vec3(0.94, 0.94, 0.94); 
    
    // 경사면(Edge)에서만 굴절/RGB가 보이고 중심 평원은 내부 컬러
    vec3 dropFinalColor = mix(dropInsideColor, edgeColor, edgeIntensity);
    
    // 완벽한 흰색(Pure White) 캔버스 배면 베이스
    vec3 screenBase = vec3(1.0); 
    
    float isWater = smoothstep(0.005, 0.04, h);
    vec3 finalColor = mix(screenBase, dropFinalColor, isWater);
    
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
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas2D.width, canvas2D.height);
        
        ctx.globalCompositeOperation = 'lighter';
        
        dropsRef.current.forEach(d => {
            if (!d.active) return;
            
            const age = currentTime - d.birth;
            let currentR = d.r;
            let opacityMultiplier = 1.0;
            
            // 타이머 지연: 2.5초 유지 후 순차적 증발 수축
            if (age > 2.5) {
                const decayRatio = (age - 2.5) / 2.5; 
                if (decayRatio >= 1.0) {
                    d.active = false;
                    return;
                }
                
                const shrinkFactor = 1.0 - Math.pow(decayRatio, 2.0); 
                currentR = d.r * shrinkFactor;
                
                const fadeFactor = 1.0 - Math.pow(decayRatio, 1.5);
                opacityMultiplier = fadeFactor;
            }
            
            if (currentR < 0.1) return;
            
            const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, currentR);
            if (d.isMove) {
                grad.addColorStop(0, `rgba(255, 255, 255, ${0.4 * opacityMultiplier})`);
                grad.addColorStop(0.6, `rgba(255, 255, 255, ${0.4 * opacityMultiplier})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else {
                grad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * opacityMultiplier})`); 
                grad.addColorStop(0.7, `rgba(255, 255, 255, ${0.8 * opacityMultiplier})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            }
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(d.x, d.y, currentR, 0, Math.PI * 2);
            ctx.fill();
        });
        
        dropsRef.current = dropsRef.current.filter(d => d.active);
        texRef.current.needsUpdate = true;
    });

    const splashWater = (uv: THREE.Vector2) => {
        const centerX = uv.x * canvas2D.width;
        const centerY = (1.0 - uv.y) * canvas2D.height;
        const currentTime = performance.now() / 1000;
        
        const numDrops = 3 + Math.floor(Math.random() * 5); 
        
        const newDrops: Drop[] = [];
        
        for (let i = 0; i < numDrops; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distRatio = Math.pow(Math.random(), 1.5); 
            
            const distance = distRatio * 80.0; 
            
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            let r;
            if (i < 1) {
                r = 40 + Math.random() * 30; 
            } else {
                r = 5 + Math.random() * 15 * (1.0 - distRatio); 
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
            
            const r = 10 + Math.random() * 15;
            
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

const RGBWater17: React.FC = () => {
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
            <InteractionUI />
        </div>
    );
};

export default RGBWater17;
