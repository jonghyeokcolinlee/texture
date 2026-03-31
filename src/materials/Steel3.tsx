"use client";
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useExport } from '../hooks/useExport';

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec2 u_resolution;
uniform sampler2D u_cameraFeed;
uniform int u_hasCamera;
varying vec2 vUv;

// 2D Random
float random (in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// 2D Noise based on random
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// FBM for wavy bands
float fbm(vec2 x) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    for (int i = 0; i < 4; ++i) {
        v += a * noise(x);
        x = x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    // 1. Wavy macro vertical bands (base metal shape)
    float band = fbm(vUv * vec2(12.0, 0.5)); 
    band = smoothstep(0.2, 0.8, band); // Increase contrast

    // 2. Fine vertical scratches
    float scratch = random(vUv * vec2(600.0, 1.0));
    float scratch2 = noise(vUv * vec2(200.0, 2.0));

    // Combine for texture variation
    float textureVariancy = band * 0.7 + scratch * 0.15 + scratch2 * 0.15;

    // View direction
    vec3 V = vec3(0.0, 0.0, 1.0); 

    // True normal perturbation based on the wavy bands
    float bandDx = fbm((vUv + vec2(0.01, 0.0)) * vec2(12.0, 0.5)) - band;
    
    // Create underlying CYLINDER Normal mapping across the screen
    vec2 p = vUv * 2.0 - 1.0;
    
    // Map screen X to a curved cylinder facing the camera
    float curveIntensity = 0.85; // How much it wraps around
    float cylX = p.x * curveIntensity;
    float cylZ = sqrt(max(1.0 - cylX * cylX, 0.0));
    
    vec3 baseN = normalize(vec3(cylX, 0.0, cylZ));
    
    // Add the surface micro details to the normal (brushed bump)
    vec3 N = normalize(baseN + vec3(-bandDx * 1.5, (scratch - 0.5) * 0.05, 0.0)); 
    
    // Reflection calculation
    vec3 R = reflect(-V, N);
    
    // Map the reflection vector R to the 2D video texture.
    vec2 videoUv = R.xy * 0.45 + 0.5; // Scale and shift into [0,1]
    
    // Since it's a webcam mirror, invert the X axis
    videoUv.x = 1.0 - videoUv.x;
    videoUv = clamp(videoUv, 0.0, 1.0);

    // Fetch camera reflection color
    vec3 envColor = vec3(0.0);
    if(u_hasCamera == 1) {
       envColor = texture2D(u_cameraFeed, videoUv).rgb;
    }
    
    // Anisotropic Tangent (Vertical grain) for the specular highlight
    vec3 TBase = vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(TBase + vec3(0.0, 0.0, (scratch - 0.5) * 0.1));
    
    // Ambient / Studio static light for strong highlight on the cylinder edge
    vec3 lightDir = normalize(vec3(0.6, 0.4, 1.0));
    vec3 H = normalize(lightDir + V);

    // Kajiya-Kay Anisotropic Reflection
    float dotTH = dot(T, H);
    float sinTH = sqrt(max(0.0, 1.0 - dotTH * dotTH));
    
    float specBroad = pow(sinTH, 15.0);
    float specSharp = pow(sinTH, 80.0);

    float diff = max(dot(N, lightDir), 0.0);

    // Color mixing (Base metal)
    vec3 colorDark = vec3(0.1, 0.11, 0.12);
    vec3 colorLight = vec3(0.5, 0.52, 0.55);
    vec3 baseColor = mix(colorDark, colorLight, textureVariancy);
    
    // Fade out base color on the horizon edges to simulate rim & depth
    float edgeShadow = pow(cylZ, 0.7);
    baseColor *= max(edgeShadow, 0.1);

    // Apply lighting
    vec3 color = baseColor * (diff * 0.5 + 0.4); 
    
    // Add environment reflection (camera feed)
    // Blend it beautifully into the steel, making it bright and metallic
    float refIntensity = mix(0.5, 1.2, textureVariancy) * edgeShadow;
    color += envColor * refIntensity;
    
    // Add Specular reflections on top
    color += vec3(0.8, 0.85, 0.9) * specBroad * 0.25;
    color += vec3(1.0, 1.0, 1.0) * specSharp * 0.5;

    // Enhance contrast overall
    color = smoothstep(0.0, 1.1, color);

    gl_FragColor = vec4(color, 1.0);
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

const CylinderShaderPlane = ({ envMap }: { envMap: THREE.Texture | null }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
      u_cameraFeed: { value: envMap },
      u_hasCamera: { value: envMap ? 1 : 0 },
    }),
    [size, envMap]
  );

  return (
    <mesh>
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

const Steel3: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [envMap, setEnvMap] = useState<THREE.VideoTexture | null>(null);
  useExport(canvasRef, 'steel-webcam-fullscreen.png');

  return (
    <div className="canvas-container bg-black cursor-crosshair">
      <WebcamEnvMap setEnvMap={setEnvMap} />
      <Canvas
        ref={canvasRef}
        gl={{ preserveDrawingBuffer: true, antialias: false }}
        camera={{ position: [0, 0, 1] }}
      >
        <CylinderShaderPlane envMap={envMap} />
      </Canvas>
      
      {!envMap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-white/40 text-sm tracking-widest font-mono mb-2 uppercase">Camera Interaction</div>
          <div className="text-white/20 text-xs">Waiting for permissions...</div>
        </div>
      )}
    </div>
  );
};

export default Steel3;
