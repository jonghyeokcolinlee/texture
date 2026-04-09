"use client";
import React from 'react';
import Link from 'next/link';

interface InteractionUIProps {
    title: string;
    isPlaying?: boolean;
    onTogglePlay?: () => void;
}

export const InteractionUI: React.FC<InteractionUIProps> = ({ title, isPlaying, onTogglePlay }) => {
    return (
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 lg:p-10 z-50 pointer-events-none select-none">
            <div className="text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.1] font-medium text-black flex items-baseline gap-6 md:gap-10">
                <Link 
                    href="/" 
                    className="indent-[1.8em] pointer-events-auto hover:opacity-30 transition-opacity"
                >
                    home
                </Link>
                <span className="opacity-100 uppercase md:lowercase">
                    {title}
                </span>
            </div>
            
            {/* Additional controls like Play/Pause could be added here if needed */}
        </div>
    );
};
