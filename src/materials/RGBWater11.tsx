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
    // 아주 거대하게 확대된 RGB 서브픽셀 렌즈
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
    
    // 강렬한 색수차 분리
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
    
    // (변경점) 깊은 웅덩이일수록 렌즈 안팎의 액체가 가진 본연의 탁한 톤을 살려줌.
    // 1.0 완전한 순백이 아니라 0.85~0.9의 묵직한 탁함을 블렌딩.
    vec3 clearWater = mix(vec3(1.0), vec3(0.86, 0.88, 0.90), min(h * 1.8, 1.0)); 
    
    vec3 dropColor = mix(clearWater, lcdColor, rgbVisibility);
    
    // 강력한 스펙큘러 라이트 (탁한 렌즈 위에서의 반짝임 극대화)
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    vec3 L = normalize(vec3(-0.6, 0.8, 1.0));
    float spec = pow(max(dot(normal, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 50.0) * 1.8;
    
    vec3 screenBase = vec3(1.0);
    
    float isWater = smoothstep(0.005, 0.04, h);
    float edge = smoothstep(0.0, 0.3, h) - smoothstep(0.3, 0.9, h);
    vec3 waterFinal = dropColor * (1.0 - edge * 0.05) + spec;
    
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

        // 증발 로직 (배경 깎아내기)
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.012)'; 
        ctx.fillRect(0, 0, canvas2D.width, canvas2D.height);
        
        // 애니메이션이 진행중인(퍼져나가는 형태의) 물방울 처리
        ctx.globalCompositeOperation = 'lighter';
        
        splatsRef.current.forEach(s => {
            if (!s.active) return;
            
            // 물이 바깥으로 서서히 확장되는 애니메이션 계수 (Lerp)
            const dr = s.targetR - s.currentR;
            s.currentR += dr * 0.25; 
            
            if (dr < 0.5) {
                s.active = false;
                s.currentR = s.targetR;
            }
            
            // 애니메이션 과정 중 누적되어 쌓이는 걸 계산하여 조금씩 덧칠 (Incremental Draw)
            // 서서히 덧칠해주면서 중앙은 깊어지고 바깥은 퍼져나가는 자연스러운 웅덩이가 완성됨
            const alpha = 0.08; 
            
            const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.currentR);
            grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`); 
            grad.addColorStop(0.6, `rgba(255, 255, 255, ${alpha * 0.3})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.currentR, 0, Math.PI * 2);
            ctx.fill();
            
            needsUpdate = true;
        });

        splatsRef.current = splatsRef.current.filter(s => s.active);

        // 증발 및 스플랫 활동이 있으면 텍스처 업데이트 
        // (캔버스는 계속 증발해야하므로 항상 업데이트해도 됨)
        texRef.current.needsUpdate = true;
    });

    const splashWater = (uv: THREE.Vector2) => {
        const centerX = uv.x * canvas2D.width;
        const centerY = (1.0 - uv.y) * canvas2D.height;
        
        const newSplats: Splat[] = [];
        
        // 거대한 중앙 메인 덩어리
        newSplats.push({
            x: centerX + (Math.random() - 0.5) * 10,
            y: centerY + (Math.random() - 0.5) * 10,
            targetR: 45 + Math.random() * 25,
            currentR: 2, // 아주 작은 점에서 시작해서 촥! 퍼져나감
            active: true
        });
        
        // 주위로 튀어나가는 중간/작은 스플래터들
        const numDrops = 15 + Math.floor(Math.random() * 8);
        for (let i = 0; i < numDrops; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distRatio = Math.pow(Math.random(), 1.5); 
            const distance = 40.0 + distRatio * 50.0;
            
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
            // 드래그 시에는 잔잔한 궤적 스플랫 형성
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

const RGBWater11: React.FC = () => {
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

export default RGBWater11;
