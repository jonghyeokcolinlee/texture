"use client";
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';
import type { ThreeEvent } from '@react-three/fiber';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec2 u_resolution;
uniform sampler2D u_cameraFeed;
uniform int u_hasCamera;
uniform float u_time;

uniform vec3 u_impacts[10]; // x, y, startTime
uniform int u_impactCount;

varying vec2 vUv;

// 2D Random
vec2 random2(vec2 p) {
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 st = vUv;
    vec2 videoUv = vec2(1.0 - st.x, st.y);
    
    float shatterMask = 0.0;
    float maxShatter = 0.0; // tracks the max radius influence

    // Correct aspect ratio for distance calculation
    float aspect = u_resolution.x / u_resolution.y;

    for (int i = 0; i < 10; i++) {
        if (i >= u_impactCount) break;
        vec3 impact = u_impacts[i];
        float age = max(0.0, u_time - impact.z);
        
        if (age > 0.0) {
            vec2 diff = st - impact.xy;
            diff.x *= aspect; // correct aspect for circular expansion
            float dist = length(diff);
            
            // Shatter grows rapidly at first then slows down (sqrt)
            float maxRadius = min(1.2, sqrt(age) * 2.0);
            
            // Add jaggedness to the leading edge of the crack
            float noiseEdge = random(floor(st * 40.0)) * 0.15;
            
            if (dist < maxRadius - noiseEdge) {
                shatterMask = 1.0;
                // Fade out shatter strength away from impact
                maxShatter = max(maxShatter, smoothstep(maxRadius, 0.0, dist));
            }
        }
    }
    
    vec2 uvOffset = vec2(0.0);
    float crackLine = 0.0;
    
    if (shatterMask > 0.0) {
        vec2 st_v = st * 35.0; // scale for voronoi (more cells = smaller glass shards)
        st_v.x *= aspect; 
        
        vec2 i_st = floor(st_v);
        vec2 f_st = fract(st_v);

        float m_dist = 10.0;
        vec2 mr;
        vec2 mo;
        
        // 1st pass: find Voronoi cell
        for (int y= -1; y <= 1; y++) {
            for (int x= -1; x <= 1; x++) {
                vec2 neighbor = vec2(float(x),float(y));
                vec2 offset = random2(i_st + neighbor);
                vec2 r = neighbor + offset - f_st;
                float d = dot(r, r);
                if(d < m_dist) {
                    m_dist = d;
                    mr = r;
                    mo = offset;
                }
            }
        }
        
        // 2nd pass: border distance
        float border_dist = 8.0;
        for (int y= -1; y <= 1; y++) {
            for (int x= -1; x <= 1; x++) {
                vec2 neighbor = vec2(float(x),float(y));
                vec2 offset = random2(i_st + neighbor);
                vec2 r = neighbor + offset - f_st;
                if(dot(mr-r, mr-r) > 0.00001) {
                    float d = dot(0.5*(mr+r), normalize(r-mr));
                    border_dist = min(border_dist, d);
                }
            }
        }
        
        // UV Shift based on cell offset, stronger at impact center
        uvOffset = (mo - 0.5) * 0.08 * maxShatter; 
        
        // Sharper crack lines
        crackLine = smoothstep(0.03, 0.0, border_dist);
        
        // Add random missing shards near the center
        if (random(i_st + mo) < 0.04 * maxShatter) {
            shatterMask = 2.0; // indicates dropped out piece
        }
    }
    
    videoUv += uvOffset * (shatterMask > 0.0 && shatterMask < 2.0 ? 1.0 : 0.0);
    videoUv = clamp(videoUv, 0.0, 1.0);
    
    vec3 color = vec3(0.05); // behind glass (dark)
    
    if (shatterMask == 2.0) {
        // Missing glass shard, looks dark / empty
        color = vec3(0.0);
    } else {
        if(u_hasCamera == 1) {
           color = texture2D(u_cameraFeed, videoUv).rgb;
        } else {
           // Default gray environment if no camera
           color = vec3(0.15) + 0.05 * random(videoUv*100.0); 
        }
    }
    
    // Add bright cracks and specular edges
    if (shatterMask == 1.0 && crackLine > 0.0) {
        color = mix(color, vec3(0.8, 0.9, 1.0), crackLine * maxShatter);
    }
    
    // Vignette for depth mirroring
    float vignette = length(st - 0.5);
    color *= smoothstep(0.8, 0.2, vignette);
    
    gl_FragColor = vec4(color, 1.0);
}
`;

type Impact = { x: number; y: number; startTime: number };

const WebcamEnvMap = ({ setEnvMap }: { setEnvMap: (tex: THREE.VideoTexture) => void }) => {
  useEffect(() => {
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => {
        console.error("Camera access denied or unavailable", err);
      });

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    setEnvMap(texture);

    return () => {
      if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      texture.dispose();
    };
  }, [setEnvMap]);

  return null;
};

const GlassPlane = ({ envMap }: { envMap: THREE.Texture | null }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();
  const [impacts, setImpacts] = useState<Impact[]>([]);

  useEffect(() => {
    if (materialRef.current) {
        materialRef.current.uniforms.u_resolution.value.set(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio);
    }
  }, [size]);

  const uniforms = useMemo(
    () => ({
      u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
      u_cameraFeed: { value: envMap },
      u_hasCamera: { value: envMap ? 1 : 0 },
      u_time: { value: 0 },
      u_impacts: { value: new Array(10).fill(null).map(() => new THREE.Vector3()) },
      u_impactCount: { value: 0 }
    }),
    [envMap]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
      
      const count = Math.min(impacts.length, 10);
      materialRef.current.uniforms.u_impactCount.value = count;
      for (let i = 0; i < 10; i++) {
        if (i < count) {
            materialRef.current.uniforms.u_impacts.value[i].set(impacts[i].x, impacts[i].y, impacts[i].startTime);
        } else {
            materialRef.current.uniforms.u_impacts.value[i].set(0, 0, 0);
        }
      }
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const uvX = e.uv?.x ?? 0.5;
    const uvY = e.uv?.y ?? 0.5;
    const startTime = materialRef.current?.uniforms.u_time.value || 0;

    setImpacts(prev => {
        const next = [...prev, { x: uvX, y: uvY, startTime }];
        if (next.length > 10) return next.slice(next.length - 10);
        return next;
    });
  };

  return (
    <mesh onPointerDown={handlePointerDown}>
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

const Glass1: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [envMap, setEnvMap] = useState<THREE.VideoTexture | null>(null);
  const triggerExport = useExport(canvasRef, 'shattered-glass-v1.png') as () => void;

  return (
    <div className="canvas-container bg-black cursor-crosshair">
      <WebcamEnvMap setEnvMap={setEnvMap} />
      <Canvas
        ref={canvasRef}
        gl={{ preserveDrawingBuffer: true, antialias: false }}
        camera={{ position: [0, 0, 1] }}
      >
        <GlassPlane envMap={envMap} />
      </Canvas>
      <InteractionUI onExport={triggerExport} />
      {!envMap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
          <div className="text-white/40 text-sm tracking-widest font-mono mb-2 uppercase z-0">Camera Interaction</div>
          <div className="text-white/20 text-xs z-0">Waiting for permissions...</div>
        </div>
      )}
    </div>
  );
};

export default Glass1;
