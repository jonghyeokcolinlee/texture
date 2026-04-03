"use client";
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';

const vertexShader = `
uniform float u_time;
varying vec2 vUv;
varying vec3 vViewPosition;
varying float vDisplacement;

// 3D Simplex Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

// Sharp noise for crumpled folds
float sharpNoise(vec3 p) {
  return 1.0 - abs(snoise(p));
}

float crumpledNoise(vec3 p) {
  float n = 0.0;
  n += sharpNoise(p * 1.5) * 0.5;
  n += sharpNoise(p * 3.0) * 0.25;
  n += sharpNoise(p * 6.0) * 0.125;
  n += sharpNoise(p * 12.0) * 0.0625;
  return n;
}

void main() {
  vUv = uv;
  
  // Mask to keep edges flat and crumple the center
  float distToCenter = distance(uv, vec2(0.5));
  float edgeMask = smoothstep(0.5, 0.2, distToCenter);
  
  // Combine sharp crinkles with large wobbly displacement
  float n1 = crumpledNoise(vec3(position.x * 2.0, position.y * 2.0, u_time * 0.05)) * 0.1;
  float n2 = snoise(vec3(position.x * 3.0, position.y * 3.0, u_time * 0.1)) * 0.15;
  
  vDisplacement = (n1 + n2) * edgeMask;
  vec3 newPosition = position + normal * vDisplacement;
  
  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform vec3 u_lightDirection;
varying vec2 vUv;
varying vec3 vViewPosition;
varying float vDisplacement;

float random(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  // Use derivatives to calculate real normal from displaced position (crisp facets)
  vec3 fdx = dFdx(vViewPosition);
  vec3 fdy = dFdy(vViewPosition);
  vec3 faceNormal = normalize(cross(fdx, fdy));
  
  // High-frequency paper grain texture
  float grain1 = random(vUv * 150.0);
  float grain2 = random(vUv * 300.0);
  float grain = mix(grain1, grain2, 0.5);
  
  // Perturb the normal slightly using grain to give a rough feel
  vec3 bumpedNormal = normalize(faceNormal + vec3(grain * 0.12 - 0.06));
  
  vec3 L = normalize(u_lightDirection);
  
  // Calculate lighting with higher contrast
  float diff = max(dot(bumpedNormal, L), 0.0);
  
  // Fake ambient occlusion based on depth of folds
  float ao = smoothstep(-0.05, 0.2, vDisplacement);
  
  // Wrap lighting for softer shadows but preserve contrast
  float wrapDiff = diff * 0.7 + 0.3;
  wrapDiff *= (ao * 0.6 + 0.4);
  
  vec3 baseColor = vec3(0.98, 0.98, 0.98); // pure white paper
  vec3 finalColor = baseColor * wrapDiff;
  
  // Slight darkening from micro-texture
  finalColor *= (1.0 - grain * 0.04);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

const TissuePlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();

    const uniforms = useMemo(
        () => ({
            u_time: { value: 0 },
            // Light coming from top-left to cast sharp shadows rightwards
            u_lightDirection: { value: new THREE.Vector3(-1.0, 1.0, 1.0) } 
        }),
        []
    );

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
        }
    });

    return (
        <mesh>
            <planeGeometry args={[Math.min(viewport.width, viewport.height) * 0.6, Math.min(viewport.width, viewport.height) * 0.6, 250, 250]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

const Tissue1: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'crumpled-tissue-v1.png') as () => void;

    return (
        <div className="canvas-container bg-white">
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [0, 0, 1.5] }}
            >
                <TissuePlane />
            </Canvas>
            <InteractionUI onExport={triggerExport} />
        </div>
    );
};

export default Tissue1;
