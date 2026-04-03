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

// Triangular wave for origami-like sharp creases
vec2 tri(vec2 x) { 
    return abs(fract(x) - 0.5); 
}

float origamiFBM(vec2 p) {
    float n = 0.0;
    float a = 1.0;
    // Rotation matrix to make folds intersect at dynamic angles
    mat2 rot = mat2(cos(2.39), sin(2.39), -sin(2.39), cos(2.39));
    for (int i=0; i<5; i++) {
        vec2 t = tri(p);
        n += (t.x + t.y) * a;
        p = rot * p * 2.1;
        a *= 0.45;
    }
    return n;
}

void main() {
  vUv = uv;
  
  // Mask to keep edges flat and crumple the center
  float distToCenter = distance(uv, vec2(0.5));
  float edgeMask = smoothstep(0.5, 0.2, distToCenter);
  
  // Animated sharp paper folds
  float fold = origamiFBM(position.xy * 2.0 + u_time * 0.08);
  
  // Create displacement that has flat areas and sharp ridges
  // Subtly soften the extreme peaks
  vDisplacement = (fold * 0.25 - 0.1) * edgeMask;
  
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
  
  // High-frequency paper grain texture & micro-bumps
  float grain1 = random(vUv * 200.0);
  float grain2 = random(vUv * 400.0);
  float grain = mix(grain1, grain2, 0.5);
  
  // Perturb the normal slightly using grain to give a soft rough paper feel
  vec3 bumpedNormal = normalize(faceNormal + vec3(grain * 0.08 - 0.04));
  
  // Soft wide light
  vec3 L = normalize(u_lightDirection);
  
  // Diffuse Lighting (Half-Lambert for soft wrap around paper)
  float rawDiff = dot(bumpedNormal, L);
  float diff = rawDiff * 0.5 + 0.5; // very soft wrap 
  
  // Ambient occlusion based on fold depth (creases are darker)
  float ao = smoothstep(-0.05, 0.1, vDisplacement);
  
  vec3 baseColor = vec3(0.99, 0.98, 0.97); // pure warm-ish white paper
  
  // Add a slight sheen on flat surfaces
  vec3 V = normalize(-vViewPosition);
  float spec = pow(max(dot(reflect(-L, bumpedNormal), V), 0.0), 5.0) * 0.05;
  
  vec3 finalColor = baseColor * diff;
  finalColor *= (ao * 0.5 + 0.5);
  finalColor += spec;
  
  // Micro-texture shadowing
  finalColor *= (1.0 - grain * 0.03);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

const TissuePlane = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();

    const uniforms = useMemo(
        () => ({
            u_time: { value: 0 },
            // Soft angled light
            u_lightDirection: { value: new THREE.Vector3(-0.5, 0.8, 1.0) } 
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

const Tissue2: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const triggerExport = useExport(canvasRef, 'crumpled-tissue-v2.png') as () => void;

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

export default Tissue2;
