"use client";

import React, { useState, useCallback, useRef } from 'react';
import { SimulatorCanvas } from './components/SimulatorCanvas';
import { Controls } from './components/Controls';
import { MATERIALS, createSurface } from './lib/Materials';
import { SimulationState } from './lib/Physics';
import * as THREE from 'three';

export default function SimulatorPage() {
  const [currentMaterial, setCurrentMaterial] = useState(
    Object.values(MATERIALS)[0]
  );
  const [surface, setSurface] = useState(
    createSurface(currentMaterial)
  );
  const [isRunning, setIsRunning] = useState(true);
  const [statistics, setStatistics] = useState({
    totalBounces: 0,
    totalReflections: 0,
    totalTransmissions: 0,
    totalAbsorptions: 0,
  });

  const projectionCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const rayCount = 256; // 16x16 grid
  const maxBounces = 5;

  const handleMaterialChange = useCallback((material: typeof currentMaterial) => {
    setCurrentMaterial(material);
    setSurface(createSurface(material));
  }, []);

  const handleToggleRun = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setStatistics({
      totalBounces: 0,
      totalReflections: 0,
      totalTransmissions: 0,
      totalAbsorptions: 0,
    });
  }, []);

  const handleStepComplete = useCallback((state: SimulationState) => {
    setStatistics(state.statistics);
  }, []);

  const handleExport = useCallback(() => {
    if (!projectionCanvasRef.current) return;

    const canvas = projectionCanvasRef.current;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const materialName = currentMaterial.name.replace(/\s+/g, '_');
    const filename = `digital-frottage_${materialName}_${timestamp}.png`;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }, [currentMaterial.name]);

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      {/* 3D Canvas */}
      <SimulatorCanvas
        surface={surface}
        rayCount={rayCount}
        maxBounces={maxBounces}
        isRunning={isRunning}
        onStepComplete={handleStepComplete}
        projectionCanvasRef={projectionCanvasRef}
      />

      {/* Control UI */}
      <Controls
        material={currentMaterial}
        onMaterialChange={handleMaterialChange}
        isRunning={isRunning}
        onToggleRun={handleToggleRun}
        onReset={handleReset}
        onExport={handleExport}
        statistics={statistics}
      />
    </main>
  );
}
