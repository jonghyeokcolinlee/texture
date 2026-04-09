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

// Blur function for camera feed (creates anisotropic blur mimicking brushed metal)
vec3 sampleCameraBlur(vec2 uv, float scratchOffset) {
    if(u_hasCamera == 0) return vec3(0.0);
    
    vec3 col = vec3(0.0);
    float total = 0.0;
    
    // Blur vertically to mimic the way horizontal brushing scatters light
    // We sample mostly along the Y axis of the screen for the reflection
    int samples = 5;
    for(int i = -samples; i <= samples; i++) {
        float offset = float(i) * 0.005; // Blur span
        vec2 sampleUv = uv + vec2(scratchOffset * 0.02, offset);
        sampleUv = clamp(sampleUv, 0.0, 1.0);
        
        float weight = 1.0 - (abs(float(i)) / float(samples));
        col += texture2D(u_cameraFeed, sampleUv).rgb * weight;
        total += weight;
    }
    return col / total;
}

void main() {
    // 1. Wavy macro vertical bands (base metal shape - large underlying unevenness)
    float band = fbm(vUv * vec2(8.0, 1.0)); 
    band = smoothstep(0.2, 0.8, band);

    // 2. Fine HORIZONTAL scratches (줄눈) -> stretch X heavily, keep Y dense
    // To make horizontal lines, X scale is tiny (1.0), Y scale is huge (800.0)
    float scratch = random(vUv * vec2(1.0, 800.0));
    // Additional noise for variation
    float scratch2 = noise(vUv * vec2(5.0, 500.0));

    // Combine for texture variation (the brushing effect)
    float textureVariancy = scratch * 0.4 + scratch2 * 0.4 + band * 0.2;

    vec3 V = vec3(0.0, 0.0, 1.0); 
    
    // Create underlying CYLINDER Normal mapping across the screen
    vec2 p = vUv * 2.0 - 1.0;
    float curveIntensity = 0.85; 
    float cylX = p.x * curveIntensity;
    float cylZ = sqrt(max(1.0 - cylX * cylX, 0.0));
    
    vec3 baseN = normalize(vec3(cylX, 0.0, cylZ));
    
    // Add the heavy horizontal brushing micro details to the normal (vertical bump)
    // We perturb Y normal significantly to scatter reflections vertically
    vec3 N = normalize(baseN + vec3(0.0, (scratch - 0.5) * 0.4 + (scratch2 - 0.5) * 0.2, 0.0)); 
    
    // Reflection calculation
    vec3 R = reflect(-V, N);
    
    // Base Reflection UV
    vec2 videoUv = R.xy * 0.45 + 0.5; 
    videoUv.x = 1.0 - videoUv.x;
    videoUv = clamp(videoUv, 0.0, 1.0);

    // Fetch camera reflection with Anisotropic Blur based on the scratch pattern
    vec3 envColor = sampleCameraBlur(videoUv, (scratch - 0.5));
    
    // Anisotropic Tangent (Horizontal grain) for the specular highlight
    // Tangent points horizontally along the "julnun"
    vec3 TBase = vec3(1.0, 0.0, 0.0);
    vec3 T = normalize(TBase + vec3(0.0, (scratch - 0.5) * 0.1, 0.0));
    
    // Dual light sources to show the vertical highlight band typical of horizontal brushing
    vec3 lightDir1 = normalize(vec3(0.5, 0.2, 0.8));
    vec3 lightDir2 = normalize(vec3(-0.6, 0.5, 0.4));
    
    vec3 H1 = normalize(lightDir1 + V);
    vec3 H2 = normalize(lightDir2 + V);

    // Kajiya-Kay Anisotropic Reflection
    float dotTH1 = dot(T, H1);
    float sinTH1 = sqrt(max(0.0, 1.0 - dotTH1 * dotTH1));
    float dotTH2 = dot(T, H2);
    float sinTH2 = sqrt(max(0.0, 1.0 - dotTH2 * dotTH2));
    
    // Because grain is horizontal, highlight stretches vertically!
    float specBroad = pow(sinTH1, 15.0) + pow(sinTH2, 10.0);
    float specSharp = pow(sinTH1, 60.0) + pow(sinTH2, 50.0);

    float diff1 = max(dot(baseN, lightDir1), 0.0);
    float diff2 = max(dot(baseN, lightDir2), 0.0);
    float diff = (diff1 + diff2 * 0.5);

    // Base color of the steel (Neutral, dark grey)
    vec3 colorDark = vec3(0.08, 0.08, 0.08);
    vec3 colorLight = vec3(0.25, 0.25, 0.25);
    // Darken grooves using textureVariancy
    vec3 baseColor = mix(colorDark, colorLight, textureVariancy);
    
    // Simulate rim shadows of the cylinder
    float edgeShadow = pow(cylZ, 0.6);
    baseColor *= max(edgeShadow, 0.05);

    // Diffuse lighting
    vec3 color = baseColor * (diff * 0.6 + 0.2); 
    
    // Process environment reflection (Camera feed) for heavy contrast
    // Convert camera colors to pure grayscale (Achromatic)
    float luminance = dot(envColor, vec3(0.299, 0.587, 0.114));
    
    // Apply a base moderate contrast mapping
    luminance = smoothstep(0.1, 0.8, luminance);
    
    // Create an arbitrary main light source directly shining on the center-right of the cylinder
    vec3 mainLightPos = normalize(vec3(0.2, 0.0, 1.0));
    // Calculate a mask that is strong at the light reflection point and drops off towards the edges
    float highlightMask = pow(max(dot(baseN, mainLightPos), 0.0), 3.0); 

    // The camera feed shouldn't indiscriminately bloom. 
    // It should bloom ONLY where the main light mask points (the center/highlight zone).
    float bloom = smoothstep(0.6, 1.0, luminance) * 2.0 * highlightMask;
    
    // Mix the spatial brightness: 
    // Areas far from the light reflect very dimly (15%), areas near the light reflect very brightly (120%)
    float localBrightness = mix(0.15, 1.2, highlightMask);
    envColor = vec3(luminance * localBrightness + bloom);

    // Reflection intensity (modulated by brushed metal texture)
    float refIntensity = mix(0.3, 1.0, textureVariancy) * edgeShadow;
    color += envColor * refIntensity;
    
    // Add strong specular reflections (Neutral White, completely removed blue tint)
    color += vec3(0.9, 0.9, 0.9) * specBroad * 0.3;
    color += vec3(1.0, 1.0, 1.0) * specSharp * 0.5 * textureVariancy;

    // Contrast
    color = smoothstep(0.0, 1.0, color);

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
