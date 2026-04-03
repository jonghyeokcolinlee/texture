import { useEffect, useRef } from 'react';

export const useExport = (canvasRef: React.RefObject<HTMLCanvasElement | null>, filename: string = 'export.png') => {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleExport = () => {
            if (canvasRef.current) {
                const dataURL = canvasRef.current.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = dataURL;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleExport();
            }
        };

        const handleTouchStart = () => {
            timeoutRef.current = setTimeout(() => {
                handleExport();
            }, 1000); // 1-second long press
        };

        const handleTouchEnd = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [filename, canvasRef]);

    const handleExport = () => {
        if (canvasRef.current) {
            const dataURL = canvasRef.current.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return handleExport;
};
