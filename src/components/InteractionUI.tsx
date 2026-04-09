"use client";
import React from 'react';

interface InteractionUIProps {
    isPlaying?: boolean;
    onTogglePlay?: () => void;
}

export const InteractionUI: React.FC<InteractionUIProps> = ({ isPlaying, onTogglePlay }) => {
    return (
        <>
            {/* Play/Pause control could go here if needed in the future, currently keeping empty as export was removed */}
        </>
    );
};
