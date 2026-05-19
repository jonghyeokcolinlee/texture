"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  generateParallelRays,
  simulationStep,
  createProjectionScreen,
  recordScreenHit,
  finalizeProjection,
  SimulationState,
  Ray,
} from '../lib/Physics';
import { Surface } from '../lib/Physics';

interface SimulatorCanvasProps {
  surface: Surface;
  rayCount: number;
  maxBounces: number;
  isRunning: boolean;
  onStepComplete?: (state: SimulationState) => void;
  projectionTexture?: THREE.CanvasTexture;
  projectionCanvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
}

export const SimulatorCanvas: React.FC<SimulatorCanvasProps> = ({
  surface,
  rayCount,
  maxBounces,
  isRunning,
  onStepComplete,
  projectionTexture,
  projectionCanvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raysRef = useRef<Ray[]>([]);
  const stateRef = useRef<SimulationState>({
    rays: [],
    surfaceHits: [],
    screenHits: [],
    statistics: {
      totalBounces: 0,
      totalReflections: 0,
      totalTransmissions: 0,
      totalAbsorptions: 0,
    },
  });

  const rayLinesRef = useRef<THREE.LineSegments | null>(null);
  const hitsRef = useRef<THREE.Points | null>(null);
  const screenRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // ===== Scene Setup =====
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);
    sceneRef.current = scene;

    // ===== Camera =====
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);

    // ===== Renderer =====
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ===== Lights =====
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // ===== Surface (Plane) =====
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2a4a,
      roughness: Math.min(surface.roughness, 0.8),
      metalness: 0.6,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.copy(surface.position);
    plane.lookAt(surface.position.clone().add(surface.normal));
    scene.add(plane);

    // ===== Projection Screen =====
    const screenGeometry = new THREE.PlaneGeometry(20, 20);
    const screenMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: false,
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 8;
    scene.add(screen);
    screenRef.current = screen;

    // ===== Initial Rays =====
    const rayCount_ = Math.floor(Math.sqrt(rayCount));
    stateRef.current.rays = generateParallelRays(rayCount_, 0.8, 10, new THREE.Vector3(0, 0, -1));

    // ===== Ray Lines Geometry =====
    const rayGeometry = new THREE.BufferGeometry();
    const rayMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.5,
      linewidth: 1,
    });
    const rayLines = new THREE.LineSegments(rayGeometry, rayMaterial);
    scene.add(rayLines);
    rayLinesRef.current = rayLines;

    // ===== Hit Points =====
    const hitGeometry = new THREE.BufferGeometry();
    const hitMaterial = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });
    const hits = new THREE.Points(hitGeometry, hitMaterial);
    scene.add(hits);
    hitsRef.current = hits;

    // ===== Projection Data =====
    const projectionData = createProjectionScreen(512, 512, -10, 10);
    if (projectionCanvasRef) {
      projectionCanvasRef.current = projectionData.canvas;
    }

    // ===== Animation Loop =====
    let frameCount = 0;
    let aliveRayCount = 0;

    const animate = () => {
      requestAnimationFrame(animate);

      if (isRunning) {
        // Step simulation
        simulationStep(stateRef.current, surface, 8, maxBounces);

        // Record screen hits
        stateRef.current.screenHits.forEach((hit) => {
          recordScreenHit(projectionData, hit);
        });

        // ===== Update Ray Lines =====
        if (frameCount % 2 === 0) {
          const rayPositions: number[] = [];
          aliveRayCount = 0;

          stateRef.current.rays.forEach((ray) => {
            if (!ray.alive) return;
            aliveRayCount++;

            rayPositions.push(ray.origin.x, ray.origin.y, ray.origin.z);
            const endPoint = ray.origin.clone().addScaledVector(ray.direction, 15);
            rayPositions.push(endPoint.x, endPoint.y, endPoint.z);
          });

          if (rayPositions.length > 0) {
            rayGeometry.setAttribute(
              'position',
              new THREE.BufferAttribute(new Float32Array(rayPositions), 3)
            );
            rayGeometry.attributes.position.needsUpdate = true;
          }
        }

        // ===== Update Hit Points =====
        if (stateRef.current.surfaceHits.length > 0) {
          const hitPositions = new Float32Array(
            stateRef.current.surfaceHits.flatMap((p) => [p.x, p.y, p.z])
          );
          hitGeometry.setAttribute('position', new THREE.BufferAttribute(hitPositions, 3));
          hitGeometry.attributes.position.needsUpdate = true;
        }

        // ===== Update Projection Screen (매 프레임) =====
        frameCount++;
        if (frameCount % 2 === 0) {
          const texture = finalizeProjection(projectionData);
          screenMaterial.map = texture;
          screenMaterial.needsUpdate = true;
          texture.needsUpdate = true;
        }

        // ===== Regenerate Dead Rays =====
        const deadCount = stateRef.current.rays.filter((r) => !r.alive).length;
        if (deadCount > stateRef.current.rays.length * 0.5) {
          // Regenerate half the rays
          const rayCount_ = Math.floor(Math.sqrt(rayCount));
          const newRays = generateParallelRays(rayCount_, 0.8, 10, new THREE.Vector3(0, 0, -1));
          newRays.forEach((ray) => {
            ray.id = Math.max(...stateRef.current.rays.map((r) => r.id)) + 1;
          });
          stateRef.current.rays.push(...newRays);
        }

        // Reset for next frame
        stateRef.current.screenHits = [];
        stateRef.current.surfaceHits = [];

        // Callback
        onStepComplete?.(stateRef.current);
      }

      renderer.render(scene, camera);
    };

    animate();

    // ===== Window Resize =====
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [surface, rayCount, maxBounces, isRunning, onStepComplete]);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
};
