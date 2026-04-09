"use client";
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';
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
uniform sampler2D u_wipeMap;
uniform int u_hasCamera;
uniform float u_time;

varying vec2 vUv;

// 2D Random
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Cheap noise for frost scatter
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(random(i + vec2(0.0,0.0)), random(i + vec2(1.0,0.0)), u.x),
               mix(random(i + vec2(0.0,1.0)), random(i + vec2(1.0,1.0)), u.x), u.y);
}

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 uv = vUv;
    vec2 videoUv = vec2(1.0 - uv.x, uv.y);
    
    // Read wipe map (0 = frosted, 1 = wiped clean)
    // Slightly offset the color channel so that the edge creates a meniscus
    float wipeCenter = texture2D(u_wipeMap, uv).r;
    
    // Smooth to prevent harsh edge clipping
    float wipe = smoothstep(0.05, 0.5, wipeCenter);
    
    // Frost settings
    float frostOpacity = 1.0 - wipe;
    
    // Frost structure (patchiness and micro distortion)
    float microFrost = noise(uv * 300.0 * aspect) * 0.5 + 0.5;
    float macroFrost = noise(uv * 10.0 * aspect);
    float frostFactor = mix(microFrost, macroFrost, 0.5) * frostOpacity;
    
    // Calculate Normal of the wiped edge to create a water ridge (condensation gathering)
    vec2 texel = 1.0 / vec2(1024.0);
    float wR = texture2D(u_wipeMap, uv + vec2(texel.x, 0.0)).r;
    float wU = texture2D(u_wipeMap, uv + vec2(0.0, texel.y)).r;
    float dx = (wR - wipeCenter) * 35.0;
    float dy = (wU - wipeCenter) * 35.0;
    
    vec3 N = normalize(vec3(-dx, -dy, 1.0));
    
    // Refract UV based on water drops (on the edge of wipe)
    vec2 refOffset = vec2(dx, dy) * 0.02 * (1.0 - frostOpacity); 
    
    vec3 col = vec3(0.0);
    if(u_hasCamera == 1) {
        // Simple Frosted Glass Blur
        // We use a 9-tap scattered sample for cheap but effective blur
        float blurScale = (0.015 + 0.005 * microFrost) * frostOpacity;
        vec2 blurCenter = videoUv - refOffset;
        
        col += texture2D(u_cameraFeed, blurCenter).rgb * 0.2;
        col += texture2D(u_cameraFeed, blurCenter + vec2(-1.0, -1.0) * blurScale).rgb * 0.1;
        col += texture2D(u_cameraFeed, blurCenter + vec2( 1.0,  1.0) * blurScale).rgb * 0.1;
        col += texture2D(u_cameraFeed, blurCenter + vec2( 1.0, -1.0) * blurScale).rgb * 0.1;
        col += texture2D(u_cameraFeed, blurCenter + vec2(-1.0,  1.0) * blurScale).rgb * 0.1;
        col += texture2D(u_cameraFeed, blurCenter + vec2( 0.0,  1.0) * blurScale * 1.4).rgb * 0.1;
        col += texture2D(u_cameraFeed, blurCenter + vec2( 1.0,  0.0) * blurScale * 1.4).rgb * 0.1;
        col += texture2D(u_cameraFeed, blurCenter + vec2( 0.0, -1.0) * blurScale * 1.4).rgb * 0.1;
        col += texture2D(u_cameraFeed, blurCenter + vec2(-1.0,  0.0) * blurScale * 1.4).rgb * 0.1;
        
        // Increase saturation/lightness when frosted due to scattering
        col = mix(col, smoothstep(0.0, 0.9, col), frostOpacity * 0.5);
    } else {
        col = vec3(0.2); // Fallback
    }
    
    // Blend with physical icy white condensation color
    vec3 iceColor = vec3(0.85, 0.9, 0.95);
    // Frost becomes whiter at thick patches
    float iceBlend = (0.4 + 0.3 * macroFrost) * frostOpacity;
    col = mix(col, iceColor, iceBlend);
    
    // Add Specular highlight to the water ridge (wiped edge)
    vec3 L = normalize(vec3(-0.5, 0.8, 1.0));
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 halfV = normalize(L + V);
    float spec = pow(max(dot(N, halfV), 0.0), 30.0);
    
    float edgeThickness = length(vec2(dx, dy));
    col += spec * edgeThickness * 0.6 * vec3(1.0);
    
    gl_FragColor = vec4(col, 1.0);
}
`;

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

const MistPlane = ({ envMap }: { envMap: THREE.Texture | null }) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();
    
    const [canvas2D] = useState(() => {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 1024;
        const ctx = c.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'black'; // started fully frosted
            ctx.fillRect(0, 0, c.width, c.height);
        }
        return c;
    });

    const texRef = useRef(new THREE.CanvasTexture(canvas2D));

    const uniforms = useMemo(() => ({
        u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
        u_cameraFeed: { value: envMap },
        u_hasCamera: { value: envMap ? 1 : 0 },
        u_wipeMap: { value: texRef.current },
        u_time: { value: 0 }
    }), [envMap]);
    
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_resolution.value.set(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio);
        }
    }, [size]);

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
        }
        
        // Healing effect: slowly recreate condensation over time
        const ctx = canvas2D.getContext('2d');
        if (ctx) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.005)'; 
            ctx.fillRect(0, 0, canvas2D.width, canvas2D.height);
            texRef.current.needsUpdate = true;
        }
    });

    const isPointerDown = useRef(false);

    const applyWipe = (uv: THREE.Vector2) => {
       const ctx = canvas2D.getContext('2d');
       if (!ctx) return;
       
       const x = uv.x * canvas2D.width;
       const y = (1.0 - uv.y) * canvas2D.height;
       
       // Finger wipe size
       const r = 35 + Math.random() * 10; 
       
       const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
       grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
       grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
       grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
       
       ctx.globalCompositeOperation = 'lighten';
       ctx.fillStyle = grad;
       ctx.beginPath();
       ctx.arc(x, y, r, 0, Math.PI * 2);
       ctx.fill();
       
       texRef.current.needsUpdate = true;
    };

    const handlePointerDown = (e: any) => {
        isPointerDown.current = true;
        applyWipe(e.uv);
    };

    const handlePointerMove = (e: any) => {
        // Continuous wiping
        if (isPointerDown.current && e.uv) {
            applyWipe(e.uv);
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

const FrostedGlass1: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [envMap, setEnvMap] = useState<THREE.VideoTexture | null>(null);

    return (
        <div className="canvas-container bg-white cursor-crosshair">
            <WebcamEnvMap setEnvMap={setEnvMap} />
            <Canvas
                ref={canvasRef}
                gl={{ preserveDrawingBuffer: true, antialias: false }}
                camera={{ position: [0, 0, 1] }}
            >
                <MistPlane envMap={envMap} />
            </Canvas>
            <InteractionUI />
            {!envMap && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                    <div className="text-black/40 mix-blend-difference text-sm tracking-widest font-mono mb-2 uppercase z-0">Camera Interaction</div>
                    <div className="text-black/20 mix-blend-difference text-xs z-0">Waiting for permissions...</div>
                </div>
            )}
        </div>
    );
};

export default FrostedGlass1;
