"use client";
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InteractionUI } from '../components/InteractionUI';
import * as THREE from 'three';

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

// FBM
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

// Subtle blur for brushed reflection
vec3 sampleCameraBlur(vec2 uv, float scratchOffset) {
    if(u_hasCamera == 0) return vec3(0.0);
    vec3 col = vec3(0.0);
    float total = 0.0;
    // Tiny vertical blur to simulate horizontal brushing without destroying shapes
    int samples = 3;
    for(int i = -samples; i <= samples; i++) {
        float offset = float(i) * 0.008; 
        vec2 sampleUv = clamp(uv + vec2(0.0, offset + scratchOffset * 0.01), 0.0, 1.0);
        float weight = 1.0 - (abs(float(i)) / float(samples));
        col += texture2D(u_cameraFeed, sampleUv).rgb * weight;
        total += weight;
    }
    return col / total;
}

void main() {
    // 1. Wavy macro vertical bands (base metal shape)
    float band = fbm(vUv * vec2(4.0, 1.0)); 
    band = smoothstep(0.2, 0.8, band);

    // 2. Fine HORIZONTAL scratches (줄눈) -> stretch X heavily, keep Y dense
    float scratch = random(vUv * vec2(1.0, 500.0));
    float scratch2 = noise(vUv * vec2(5.0, 300.0));

    // Combine for texture variation (the brushing effect)
    float textureVariancy = scratch * 0.3 + scratch2 * 0.3 + band * 0.2;

    vec3 V = vec3(0.0, 0.0, 1.0); 
    
    // Create CYLINDER Normal mapping across the screen
    vec2 p = vUv * 2.0 - 1.0;
    float curveIntensity = 0.95; // Wrap heavily so edges squeeze the reflection
    float cylX = p.x * curveIntensity;
    float cylZ = sqrt(max(1.0 - cylX * cylX, 0.0));
    
    vec3 baseN = normalize(vec3(cylX, 0.0, cylZ));
    
    // Tiny normal perturbation so the image remains largely intact but slightly frosted vertically
    vec3 N = normalize(baseN + vec3(0.0, (scratch - 0.5) * 0.08 + (scratch2 - 0.5) * 0.04, 0.0)); 
    
    // Reflection calculation
    // R.x will rapidly change near the left/right edges, squeezing the reflection image!
    vec3 R = reflect(-V, N);
    
    // Base Reflection UV mapped to the curved reflection vector R
    vec2 videoUv = R.xy * 0.45 + 0.5; 
    videoUv.x = 1.0 - videoUv.x; // Mirror webcam
    videoUv = clamp(videoUv, 0.0, 1.0);

    // Fetch camera reflection with subtle Anisotropic Blur
    vec3 envColor = sampleCameraBlur(videoUv, (scratch - 0.5));
    
    // Tangent (Horizontal grain) for specular highlight
    vec3 TBase = vec3(1.0, 0.0, 0.0);
    vec3 T = normalize(TBase + vec3(0.0, (scratch - 0.5) * 0.1, 0.0));
    
    // Dual light sources for the vertical highlight bands (the standard cylinder specular)
    vec3 lightDir1 = normalize(vec3(0.3, 0.2, 0.9));
    vec3 lightDir2 = normalize(vec3(-0.7, 0.5, 0.4));
    
    vec3 H1 = normalize(lightDir1 + V);
    vec3 H2 = normalize(lightDir2 + V);

    // Kajiya-Kay Anisotropic Reflection
    float dotTH1 = dot(T, H1);
    float dotTH2 = dot(T, H2);
    float sinTH1 = sqrt(max(0.0, 1.0 - dotTH1 * dotTH1));
    float sinTH2 = sqrt(max(0.0, 1.0 - dotTH2 * dotTH2));
    
    float specBroad = pow(sinTH1, 8.0) + pow(sinTH2, 6.0);
    float specSharp = pow(sinTH1, 40.0) + pow(sinTH2, 30.0);

    float diff1 = max(dot(baseN, lightDir1), 0.0);
    float diff2 = max(dot(baseN, lightDir2), 0.0);
    float diff = (diff1 + diff2 * 0.5);

    // Base color of the steel (Neutral, dark grey)
    vec3 colorDark = vec3(0.1, 0.1, 0.1);
    vec3 colorLight = vec3(0.35, 0.35, 0.35);
    vec3 baseColor = mix(colorDark, colorLight, textureVariancy);
    
    // Simulate rim shadows of the cylinder (makes it look 3D and cylindrical)
    float edgeShadow = pow(cylZ, 0.6);
    baseColor *= max(edgeShadow, 0.05);

    // Background lighting
    vec3 color = baseColor * (diff * 0.5 + 0.3); 
    
    // Process environment reflection (Camera feed)
    // Convert camera colors to pure grayscale
    float luminance = dot(envColor, vec3(0.299, 0.587, 0.114));

    // Contrast the camera feed moderately
    luminance = smoothstep(0.1, 0.9, luminance);
    
    // Highlight mask specifically for blooming bright spots (but NOT darkening the whole cylinder!)
    float highlightMask = pow(max(dot(baseN, normalize(vec3(0.3, 0.0, 1.0))), 0.0), 3.0); 
    float bloom = smoothstep(0.7, 1.0, luminance) * 1.5 * highlightMask;
    
    // The camera image lives across the entire cylinder surface! (No heavy dark falloff on edges)
    // Edges just fade slightly into the rim shadow.
    float refIntensity = mix(0.7, 1.5, textureVariancy) * edgeShadow;
    color += vec3(luminance + bloom) * refIntensity;
    
    // Add strong specular reflections
    color += vec3(0.9) * specBroad * 0.2;
    color += vec3(1.0) * specSharp * 0.4 * textureVariancy;

    // Output with final contrast adjustment
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
    const [isPlaying, setIsPlaying] = useState(true);

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
      <InteractionUI title="01 brushed steel" isPlaying={isPlaying} onTogglePlay={() => setIsPlaying(!isPlaying)} />
      
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
