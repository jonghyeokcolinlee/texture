"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { materials } from "@/data/materials";

export type Material = {
    title: string;
    versions: {
        id: string;
        url: string;
        prompt: string;
    }[];
};

const renderMixedText = (text: string) => {
    return text.split(/([가-힣ㄱ-ㅎㅏ-ㅣ]+)/g).map((part, index) => {
        if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(part)) {
            return <span key={index} className="font-semibold">{part}</span>;
        }
        return part;
    });
};

const TriangleUp = ({ className }: { className?: string }) => (
    <svg width="14" height="11" viewBox="0 0 24 20" fill="currentColor" className={className}>
        <path d="M12 0l12 20h-24z" />
    </svg>
);

const TriangleDown = ({ className }: { className?: string }) => (
    <svg width="14" height="11" viewBox="0 0 24 20" fill="currentColor" className={className}>
        <path d="M12 20l12-20h-24z" />
    </svg>
);

export default function Home() {

    const [activeMaterialTitle, setActiveMaterialTitle] = useState<string>(materials[0].title);
    const [previewMaterialTitle, setPreviewMaterialTitle] = useState<string | null>(null);
    const [activeVersionIndex, setActiveVersionIndex] = useState<number>(materials[0].versions.length - 1);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const wheelRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Save state to sessionStorage & history
    useEffect(() => {
        if (!isInitialized) return;
        const state = {
            title: activeMaterialTitle,
            version: activeVersionIndex,
        };
        sessionStorage.setItem('texture_archive_state', JSON.stringify(state));
        window.history.replaceState(state, "");
    }, [activeMaterialTitle, activeVersionIndex, isInitialized]);

    // Restore state from sessionStorage or history.state
    useEffect(() => {
        const savedStateString = sessionStorage.getItem('texture_archive_state');
        const hState = window.history.state;
        const savedScroll = sessionStorage.getItem('texture_archive_scroll');
        
        let savedState = hState && hState.title ? hState : null;
        if (!savedState && savedStateString) {
            try { savedState = JSON.parse(savedStateString); } catch (e) {}
        }

        if (savedState) {
            setIsRestoring(true);
            try {
                const { title, version } = savedState;
                if (materials.some(m => m.title === title)) {
                    setActiveMaterialTitle(title);
                    const mat = materials.find(m => m.title === title);
                    if (mat && version < mat.versions.length) {
                        setActiveVersionIndex(version);
                    }
                }
            } catch (e) {
                console.error("Failed to parse saved state", e);
            }
        }

        // Handle scroll restoration and initialization cleanup
        if (savedScroll && wheelRef.current) {
            const scrollTop = parseInt(savedScroll, 10);
            if (!isNaN(scrollTop)) {
                requestAnimationFrame(() => {
                    if (wheelRef.current) {
                        wheelRef.current.scrollTop = scrollTop;
                        setTimeout(() => {
                            setIsRestoring(false);
                            setIsInitialized(true);
                        }, 100);
                    } else {
                        setIsRestoring(false);
                        setIsInitialized(true);
                    }
                });
            } else {
                setIsRestoring(false);
                setIsInitialized(true);
            }
        } else {
            setIsRestoring(false);
            setIsInitialized(true);
        }
    }, []);

    const displayMaterialTitle = previewMaterialTitle || activeMaterialTitle;
    const activeMat = materials.find(m => m.title === displayMaterialTitle) || materials[0];
    const activeVersion = activeMat.versions[activeVersionIndex] || activeMat.versions[0];

    // (Removed redundant scroll reset to prevent conflict with restoration)

    const handleScroll = (e?: React.UIEvent<HTMLDivElement>) => {
        // 0. Suppress logic during restoration to prevent state resets
        if (isRestoring) return;

        // 1. Persistence
        if (isInitialized && wheelRef.current) {
            sessionStorage.setItem('texture_archive_scroll', wheelRef.current.scrollTop.toString());
        }

        // 2. Mobile Detection
        if (!wheelRef.current || window.innerWidth >= 768) return;
        const container = wheelRef.current;
        const topOffset = container.scrollTop;

        let closestIdx = 0;
        let minDiff = Infinity;

        materials.forEach((mat, i) => {
            const item = itemRefs.current[i];
            if (!item) return;
            const itemTop = item.offsetTop;
            const diff = Math.abs(itemTop - topOffset);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        });

        const newActive = materials[closestIdx].title;
        if (newActive !== activeMaterialTitle) {
            setActiveMaterialTitle(newActive);
            // Only reset to latest if we are not in the middle of restoring or manual selection
            setActiveVersionIndex(materials[closestIdx].versions.length - 1);
        }
    };

    return (
        <main className="h-screen w-screen bg-white flex flex-col md:flex-row overflow-hidden lowercase md:p-6 lg:p-10 gap-0 md:gap-24 lg:gap-40">
            <div className="flex-none md:w-[22%] h-[180px] md:h-full px-4 md:px-0 bg-white relative flex flex-col overflow-hidden">
                <div className="flex items-center w-full py-1 text-black select-none flex-none bg-white z-30 text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.1] font-medium">
                    <span className="w-[1.8em] shrink-0"></span>
                    <span>textures</span>
                </div>

                <div className="w-full flex-1 relative overflow-hidden text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.1] font-medium text-black">
                    <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-30" />

                    {/* scrollable list (overflow: auto) */}
                    <div
                        ref={wheelRef}
                        onScroll={handleScroll}
                        className="w-full h-full overflow-y-auto no-scrollbar snap-y snap-mandatory md:snap-none relative z-20"
                        style={{ scrollBehavior: 'smooth' }}
                    >
                        {materials.map((mat, i) => {
                                const match = mat.title.match(/^0?(\d+)\s+(.*)$/);
                                const num = match ? parseInt(match[1]) : 0;
                                const indicator = num > 0 ? num : "";
                                const text = match ? match[2] : mat.title;
                                const isActive = activeMaterialTitle === mat.title;

                                return (
                                    <div
                                        key={mat.title}
                                        ref={(el) => { itemRefs.current[i] = el; }}
                                        onMouseEnter={() => {
                                            if (window.innerWidth >= 768) {
                                                setPreviewMaterialTitle(mat.title);
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            if (window.innerWidth >= 768) {
                                                setPreviewMaterialTitle(null);
                                            }
                                        }}
                                        onClick={() => {
                                            if (window.innerWidth >= 768) {
                                                if (mat.title !== activeMaterialTitle) {
                                                    setActiveMaterialTitle(mat.title);
                                                    setActiveVersionIndex(mat.versions.length - 1);
                                                }
                                            }
                                        }}
                                        className={`flex items-start w-full py-1 snap-start md:snap-align-none transition-opacity duration-300 md:cursor-pointer select-none 
                                            ${displayMaterialTitle === mat.title ? "opacity-100" : (activeMaterialTitle === mat.title ? "opacity-30" : "opacity-30")}`}
                                    >
                                        <span className={`w-[1.8em] shrink-0 text-left transition-colors duration-300 ${displayMaterialTitle === mat.title && activeMaterialTitle !== mat.title ? "text-black/100" : ""}`}>
                                            {indicator}
                                        </span>
                                        <p className="mb-0 flex-1 text-left">{text}</p>
                                    </div>
                                );
                            })}
                            <div className="min-h-[100%] md:min-h-0 md:h-24" /> {/* End Spacer to allow scrolling past the last item */}
                    </div>
                </div>
            </div>

            {/* 2. Right Pane: Information Details */}
            <div className="flex-none md:flex-1 h-[60vh] md:h-full bg-white relative flex flex-col md:flex-row overflow-hidden px-4 md:px-0">
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* FIXED HEADER: prompt + version picker */}
                    <div className="flex items-center w-full py-1 text-black select-none flex-none bg-white z-40 text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.1] font-medium">
                        <span className="w-[1.8em] shrink-0"></span>
                        <span>prompt </span>
                        {activeMat && activeMat.versions.length > 1 && (
                            <div className="inline-flex items-center ml-2 gap-0.5 h-[1.1em]">
                                <button 
                                    onClick={() => {
                                        if (activeVersionIndex > 0) setActiveVersionIndex(activeVersionIndex - 1);
                                    }}
                                    className={`flex items-center justify-center rounded-[4px] w-8 lg:w-9 h-full transition-colors ${activeVersionIndex === 0 ? 'pointer-events-none bg-[#f9f9f9] text-black/10' : 'bg-[#f2f2f2] text-black hover:opacity-60'}`}
                                    aria-label="older version"
                                >
                                    <TriangleDown />
                                </button>
                                <div className="flex items-center justify-center bg-[#f2f2f2] rounded-[4px] h-full px-2">
                                    <span className="text-black text-[0.85em] lg:text-[0.82em] tracking-tight text-center select-none leading-none">v{activeVersionIndex + 1}</span>
                                </div>
                                <button 
                                    onClick={() => {
                                        if (activeVersionIndex < activeMat.versions.length - 1) {
                                            setActiveVersionIndex(activeVersionIndex + 1);
                                        }
                                    }}
                                    className={`flex items-center justify-center rounded-[4px] w-8 lg:w-9 h-full transition-colors ${activeVersionIndex === activeMat.versions.length - 1 ? 'pointer-events-none bg-[#f9f9f9] text-black/10' : 'bg-[#f2f2f2] text-black hover:opacity-60'}`}
                                    aria-label="newer version"
                                >
                                    <TriangleUp />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 w-full relative overflow-hidden">
                        <div className="h-full w-full overflow-y-auto no-scrollbar pb-0 flex flex-col">
                            <div className="max-w-[800px] text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.2] text-black font-medium w-full pb-32 md:pb-40">
                                {activeMat && activeVersion ? (
                                    <div className="flex flex-col justify-start">
                                        <div className="flex flex-col gap-8 py-1">
                                            {activeVersion.prompt.split("\n\n").map((para, i) => (
                                                <div key={i} className={`indent-[1.8em] ${i === 0 ? "opacity-100" : "opacity-30"} whitespace-pre-wrap break-keep`}>
                                                    {renderMixedText(para)}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-12 indent-[1.8em]">
                                            <Link 
                                                href={activeVersion.url} 
                                                className="inline-flex items-center text-[20px] lg:text-[28px] tracking-[-0.03em] font-medium opacity-100 hover:opacity-60 transition-opacity bg-[#f2f2f2] rounded-[4px] px-1.5 py-0.5 h-[1.2em] leading-none"
                                            >
                                                view interaction
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-1 indent-[1.8em]">
                                        <div className="opacity-30 font-medium select-none">
                                            choose a material
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </main>
    );
}
