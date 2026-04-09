"use client";
import React from 'react';
import Link from 'next/link';

interface InteractionUIProps {
    title: string;
    isPlaying?: boolean;
    onTogglePlay?: () => void;
}

export const InteractionUI: React.FC<InteractionUIProps> = ({ title, isPlaying, onTogglePlay }) => {
    const match = title.match(/^0?(\d+)\s+(.*)$/);
    const num = match ? parseInt(match[1]) : "";
    const text = match ? match[2] : title;

    return (
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 lg:p-10 z-50 pointer-events-none select-none">
            <div className="text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.1] font-medium text-black flex flex-col">
                <Link 
                    href="/" 
                    className="indent-[1.8em] pointer-events-auto hover:opacity-30 transition-opacity"
                >
                    home
                </Link>
                <div className="flex items-start">
                    <span className="w-[1.8em] shrink-0 text-left">
                        {num}
                    </span>
                    <span className="flex-1 text-left lowercase">
                        {text}
                    </span>
                </div>
            </div>
            
            {/* Additional controls like Play/Pause could be added here if needed */}
        </div>
    );
};
