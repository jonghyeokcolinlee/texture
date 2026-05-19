"use client";

import React, { useState } from 'react';
import { MATERIALS, MaterialDefinition } from '../lib/Materials';
import { Surface } from '../lib/Physics';

interface ControlsProps {
  material: MaterialDefinition;
  onMaterialChange: (material: MaterialDefinition) => void;
  isRunning: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  onExport: () => void;
  statistics?: {
    totalBounces: number;
    totalReflections: number;
    totalTransmissions: number;
    totalAbsorptions: number;
  };
}

export const Controls: React.FC<ControlsProps> = ({
  material,
  onMaterialChange,
  isRunning,
  onToggleRun,
  onReset,
  onExport,
  statistics,
}) => {
  const [selectedMaterial, setSelectedMaterial] = useState(material.name);
  const [showInfo, setShowInfo] = useState(false);

  const handleMaterialSelect = (name: string) => {
    const mat = Object.values(MATERIALS).find((m) => m.name === name);
    if (mat) {
      setSelectedMaterial(name);
      onMaterialChange(mat);
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Top Control Panel */}
      <div className="absolute top-0 left-0 right-0 pointer-events-auto">
        <div className="bg-gradient-to-b from-black/80 to-transparent p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {/* Title */}
            <div className="mb-6">
              <h1 className="text-2xl lg:text-4xl font-bold text-white mb-2">
                Digital Frottage
              </h1>
              <p className="text-sm lg:text-base text-gray-300">
                실험: 광선 산란으로 표면 특성 드러내기
              </p>
            </div>

            {/* Material Selector */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 uppercase tracking-wider mb-3 block">
                Material Selection
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
                {Object.values(MATERIALS).map((mat) => (
                  <button
                    key={mat.name}
                    onClick={() => handleMaterialSelect(mat.name)}
                    className={`p-3 rounded text-xs lg:text-sm font-medium transition-all ${
                      selectedMaterial === mat.name
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {mat.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Material Info Card */}
            <div className="bg-gray-900/80 backdrop-blur rounded-lg p-4 mb-6 border border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-base lg:text-lg">
                    {selectedMaterial}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {Object.values(MATERIALS).find((m) => m.name === selectedMaterial)?.description}
                  </p>
                </div>
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  {showInfo ? '−' : '+'}
                </button>
              </div>

              {/* Expandable Info */}
              {showInfo && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-gray-500 uppercase tracking-wider mb-1">Roughness</p>
                      <p className="text-white font-mono">
                        σ = {material.roughness.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase tracking-wider mb-1">Reflectivity</p>
                      <p className="text-white font-mono">
                        ρ = {material.reflectivity.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase tracking-wider mb-1">Transparency</p>
                      <p className="text-white font-mono">
                        τ = {material.transparency.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase tracking-wider mb-1">
                        Index of Refraction
                      </p>
                      <p className="text-white font-mono">n = {material.ior.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Panel */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
        <div className="bg-gradient-to-t from-black/80 to-transparent p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {/* Statistics */}
            {statistics && (
              <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="bg-gray-900/60 backdrop-blur rounded p-3 border border-gray-700">
                  <p className="text-gray-500 uppercase tracking-wider mb-1">Total Bounces</p>
                  <p className="text-white font-mono text-lg">
                    {statistics.totalBounces.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-900/60 backdrop-blur rounded p-3 border border-gray-700">
                  <p className="text-gray-500 uppercase tracking-wider mb-1">Reflections</p>
                  <p className="text-white font-mono text-lg">
                    {statistics.totalReflections.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-900/60 backdrop-blur rounded p-3 border border-gray-700">
                  <p className="text-gray-500 uppercase tracking-wider mb-1">Transmissions</p>
                  <p className="text-white font-mono text-lg">
                    {statistics.totalTransmissions.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-900/60 backdrop-blur rounded p-3 border border-gray-700">
                  <p className="text-gray-500 uppercase tracking-wider mb-1">Absorptions</p>
                  <p className="text-white font-mono text-lg">
                    {statistics.totalAbsorptions.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onToggleRun}
                className={`px-6 py-2 rounded font-medium text-sm transition-all ${
                  isRunning
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isRunning ? '⏸ Pause' : '▶ Run Simulation'}
              </button>
              <button
                onClick={onReset}
                className="px-6 py-2 rounded font-medium text-sm bg-gray-700 hover:bg-gray-600 text-white transition-all"
              >
                ↻ Reset
              </button>
              <button
                onClick={onExport}
                className="px-6 py-2 rounded font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all"
              >
                ⬇ Export PNG
              </button>
            </div>

            {/* Info Text */}
            <div className="mt-4 text-xs text-gray-400 max-w-2xl">
              <p className="mb-2">
                <strong>실험 원리:</strong> 광선들이 표면과 상호작용하며 반사/굴절되고,
                투영 스크린에 누적되어 텍스처가 드러납니다.
              </p>
              <p>
                <strong>비유:</strong> Rutherford 금박 실험처럼, 입자(광선)의 산란 패턴으로부터
                미지의 매질(표면 거칠기)의 특성을 역으로 추론합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
