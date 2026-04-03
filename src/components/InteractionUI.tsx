"use client";
import React from 'react';

interface InteractionUIProps {
    onExport: () => void;
    isPlaying?: boolean;
    onTogglePlay?: () => void;
}

export const InteractionUI: React.FC<InteractionUIProps> = ({ onExport }) => {
    return (
        <>
            {/* Export: "select iteration" Position (Top-left of the right pane relative bounds) */}
            <button 
                onClick={(e) => { e.stopPropagation(); onExport(); }} 
                className="absolute top-[calc(50%+0.75rem)] left-4 md:top-[1.25rem] md:left-[calc(50%+1.5rem)] leading-none z-50 pointer-events-auto lowercase font-medium tracking-[-0.03em] leading-none text-[20px] lg:text-[28px] text-white mix-blend-difference opacity-30 hover:opacity-100 transition-opacity duration-300"
            >
                export
            </button>
        </>
    );
};
