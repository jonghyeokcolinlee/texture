"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

type HoverData = {
    id: string;
    url: string;
    prompt: string;
    script: string;
};

const renderMixedText = (text: string) => {
    return text.split(/([가-힣ㄱ-ㅎㅏ-ㅣ]+)/g).map((part, index) => {
        if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(part)) {
            return <span key={index} className="font-semibold">{part}</span>;
        }
        return part;
    });
};

const VersionControls = ({ versions, activeIndex, onChange, className, vertical = false }: any) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [tempP, setTempP] = useState(0);

    const percent = isDragging ? tempP * 100 : (versions.length > 1 ? (activeIndex / (versions.length - 1)) * 100 : 50);

    const updateFromPosition = (clientX: number, clientY: number) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        let p = 0;
        if (vertical) {
            // vertical: top is 0%, bottom is 100%
            p = (clientY - rect.top) / rect.height;
        } else {
            p = (clientX - rect.left) / rect.width;
        }
        p = Math.max(0, Math.min(1, p));
        setTempP(p);
        const idx = Math.round(p * Math.max(0, versions.length - 1));
        onChange(idx);
    };

    if (versions.length <= 1) return null;

    return (
        <div 
            className={`relative flex items-center justify-center select-none touch-none ${vertical ? 'w-12 flex-col' : 'h-12 w-full'} ${className}`}
            onPointerDown={(e) => {
                setIsDragging(true);
                updateFromPosition(e.clientX, e.clientY);
                e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
                if(isDragging) updateFromPosition(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
                setIsDragging(false);
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            style={{ cursor: vertical ? 'ns-resize' : 'ew-resize' }}
        >
            <div ref={trackRef} className={`${vertical ? 'h-full w-[10px]' : 'w-full h-[10px]'} bg-black/10 rounded-full relative`} />
            <div 
                className={`absolute flex items-center justify-center pointer-events-none`}
                style={{ 
                    ...(vertical ? { top: `${percent}%`, left: '50%', transform: 'translate(-50%, -50%)' } : { left: `${percent}%`, top: '50%', transform: 'translate(-50%, -50%)' }),
                    transition: isDragging ? 'none' : (vertical ? 'top 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)')
                }}
            >
                <div className={`absolute ${vertical ? 'right-6' : 'bottom-5'} flex items-center justify-center`}>
                    <div className="relative whitespace-nowrap text-[14px] font-medium tracking-widest uppercase text-black z-10">
                        {versions[isDragging ? Math.round(tempP * (versions.length - 1)) : activeIndex]?.id}
                    </div>
                </div>
                {/* 반지름 8px 원 (w-4 h-4) */}
                <div className="w-4 h-4 bg-black rounded-full relative z-20" />
            </div>
        </div>
    );
};

export default function Home() {
    const materials = [
        {
            title: "01 brushed steel",
            versions: [
                { id: "v1", url: "/steel/1", prompt: "\"줄눈이 있는 스테인리스 재질 적용. 색상은 무채색 계열로 제한. 과도한 청색 제거. 특정 반사 영역만 강한 백색 하이라이트로 표현.\"\n\nx축 1.0, y축 800.0 비율의 수평 고주파 노이즈로 텍스처를 조정하고, 루미넌스(luminance) 변환 및 국소적 스팟라이트 마스킹으로 극대비 반사 구현.", script: "" },
                { id: "v2", url: "/steel/2", prompt: "\"세로 방향 반사 완화. 실린더 형태 왜곡 반사 적용. 곡면 기반 환경 반사 강조.\"\n\n스팟 마스크 제약을 해제하여 전면 실린더 곡률에 따른 환경 맵 풀 렌더링 유지 및 블러(blur) 감쇠 효과 추가.", script: "" },
            ],
        },
        {
            title: "02 scattered puddle",
            versions: [
                { id: "v1", url: "/water/1", prompt: "\"기본적인 water ripple 인터랙션 구현.\"\n\n2d 평면상 마우스 클릭 좌표와 시간 동기화 기반 둔감형 감쇠 삼각함수(sin)를 노멀에 맵핑.", script: "" },
                { id: "v2", url: "/water/2", prompt: "\"강한 조명 조건 적용. 높은 대비의 거친 반사율 설정.\"\n\n스무스스텝(smoothstep) 임계치를 높이고 fbm 텍스처를 곱해 높은 스펙큘러 글린트를 유도.", script: "" },
                { id: "v3", url: "/water/3", prompt: "\"외곽 링 형태 제거. 저주파 기반 확산 구조로 변경.\"\n\n거리-시간 기반 감쇠 함수 적용 및 저주파수 노이즈 블렌딩 추가.", script: "" },
                { id: "v4", url: "/water", prompt: "\"모바일 스케일 문제 보정. 파동 후반부 자연스럽게 처리.\"\n\n단말기 aspect ratio 좌표 보정 및 smoothstep을 활용한 파동 소멸 구간(timeFade) 페이드아웃 적용.", script: "" },
                { id: "v5", url: "/water/5", prompt: "\"기본 배경을 화이트로 유지. 파동 영역에 한해 옅은 회색 음영 적용.\"\n\n완전한 형태의 화이트 캔버스(White Backgrond) 베이스로 쉐이더를 다시 짜고, 빛의 반사각(Normals)이 크게 틀어지는 파동(Wave) 부분에 한해 은은한 회색 그림자(Gray Shadow)와 흰색 스펙큘러로 깔끔하게 떨어지는 미니멀한 반사 효과를 부여.", script: "" },
                { id: "v6", url: "/water/6", prompt: "\"파동 색감을 전체적으로 약화. 완전 무채색 처리.\"\n\n파동이 일 때 생기는 빛 반사 그림자의 강도(Intensity)와 대비(Contrast)를 대폭 줄이고, 블루/그레이 톤이 섞여 있던 기존 음영에서 채도를 완벽하게 0으로 제거하여 매우 옅고 깨끗한 퓨어 모노톤 아키텍처(Pure Achromatic) 음영으로 다듬음.", script: "" },
            ],
        },
        {
            title: "03 rgb drops",
            versions: [
                { id: "v1", url: "/rgb/1", prompt: "\"화이트 배경 위 물방울 렌즈 효과 적용. RGB 확대 굴절 표현. 드래그 기반 인터랙션 구현.\"\n\n임시 캔버스(Canvas API)를 활용하여 ...", script: "" },
                { id: "v2", url: "/rgb/2", prompt: "\"노이즈 제거. 모래 질감 제거. 매끄러운 투명 물방울 형태로 수정.\"\n\n캔버스 텍스처에서 발생하던 노이즈...", script: "" },
                { id: "v3", url: "/rgb/3", prompt: "\"gooey 결합 효과 적용. 물방울 개수 제한 제거. 증발 유지.\"\n\n임시 캔버스(FBO)를 다시 도입하여...", script: "" },
                { id: "v4", url: "/rgb/4", prompt: "\"RGB 표현을 가장자리 중심으로 제한. 작은 물방울은 전체 적용. 압력 기반 크기 변화 추가.\"\n\n물방울의 곡률...", script: "" },
                { id: "v5", url: "/rgb/5", prompt: "\"비정형 물방울 형태 적용. 균일 패턴 제거. 불규칙 RGB 덩어리 구조 적용.\"\n\n정원형 물방울 텍스처를...", script: "" },
                { id: "v6", url: "/rgb/6", prompt: "\"자체 이동 제거. 중앙 RGB 과도 노출 억제.\"\n\n물방울이 끓잡듯이...", script: "" },
                { id: "v7", url: "/rgb/7", prompt: "\"드래그 페인팅 제거. 클릭 기반 스플래터 생성 방식으로 변경.\"\n\n드래그 시 펜처럼...", script: "" },
                { id: "v8", url: "/rgb/8", prompt: "\"물방울 확산 범위 축소. RGB 확대 비율 증가.\"\n\n스플래터들의 산포 반경...", script: "" },
                { id: "v9", url: "/rgb/9", prompt: "\"RGB 크기 소폭 확대. 색감 강화.\"\n\nRGB 픽셀 스케일...", script: "" },
                { id: "v10", url: "/rgb/10", prompt: "\"중앙 대형 물방울 + 주변 스플래터 구조 적용. RGB 확대 강화.\"\n\n스플래터 로직 중앙에...", script: "" },
                { id: "v11", url: "/rgb/11", prompt: "\"물방울 색상 탁도 복원. 퍼지는 애니메이션 자연스럽게 개선.\"\n\n물방울이 생성될 때...", script: "" },
                { id: "v12", url: "/rgb/12", prompt: "\"반사광 추가. 증발 및 수축 효과 적용.\"\n\n환경광을 모사하는...", script: "" },
                { id: "v13", url: "/rgb/13", prompt: "\"v9 상태로 롤백. 순차적 수축 기반 증발 적용.\"\n\nv9의 알록달록...", script: "" },
                { id: "v14", url: "/rgb/14", prompt: "\"v9 코드 완전 복원. 일정 시간 후 증발 트리거 적용.\"\n\nv9의 스타일뿐만 아니라...", script: "" },
                { id: "v15", url: "/rgb/15", prompt: "\"증발 지연 시간 증가. 소멸 곡선 부드럽게 조정.\"\n\n물방울이 온전한 형태를...", script: "" },
                { id: "v16", url: "/rgb/16", prompt: "\"RGB 표현 규모 확대. 가장자리 중심 색수차 표현 유지.\"\n\n제공된 이미지를...", script: "" },
                { id: "v17", url: "/rgb/17", prompt: "\"그림자 대비 감소. RGB 입자 크기 확대. 물방울 색상 연회색으로 조정.\"\n\n레퍼런스 이미지의...", script: "" },
                { id: "v18", url: "/rgb/18", prompt: "\"RGB 두께 증가. 가장자리 영역 확장.\"\n\n경사면의 너비와...", script: "" },
                { id: "v19", url: "/rgb/19", prompt: "\"RGB 입자 크기 확대. 랜덤 위치 기반 가장자리 분포 적용.\"\n\nRGB 픽셀 연산 스케일...", script: "" },
            ],
        },
        {
            title: "04 frosted glass",
            versions: [
                { id: "v1", url: "/frost/1", prompt: "\"성에 낀 거울 표현. 마우스 드래그로 제거 인터랙션 구현.\"\n\n웹캠 피드 위에...", script: "" },
                { id: "v2", url: "/frost/2", prompt: "\"손가락 인식 기반 제거 인터랙션 적용. 성에 복원 로직 안정화.\"\n\nGoogle MediaPipe...", script: "" },
            ],
        },
        {
            title: "06 cd iridescence",
            versions: [
                { id: "v4", url: "/cd/4", prompt: "\"중앙 및 외곽 그림자 적용. 반응형 크기 조정. 모바일 자이로 인터랙션 추가.\"\n\nCD의 중앙 홀...", script: "" },
            ],
        },
        {
            title: "07 shattered glass",
            versions: [
                { id: "v1", url: "/shattered/1", prompt: "\"깨진 유리 레이어 구성. 다중 시점 반사 인터랙션 적용.\"\n\n", script: "" },
                { id: "v2", url: "/shattered/2", prompt: "\"중앙 집중형 거울 파편 구성. 각도별 반사 차이 강조.\"\n\n", script: "" },
                { id: "v3", url: "/shattered/3", prompt: "\"현실적인 파편 분산 구조 적용. 화이트 배경 기반 구성.\"\n\n", script: "" },
            ],
        },
        {
            title: "08 soap bubbles",
            versions: [
                { id: "v1", url: "/bubbles/1", prompt: "\"마우스 기반 생성형 비눗방울 인터랙션 구현.\"\n\n", script: "" },
                { id: "v2", url: "/bubbles/2", prompt: "\"레퍼런스 기반 드림형 비눗방울 질감 적용.\"\n\n", script: "" },
            ],
        },
        {
            title: "09 white vinyl",
            versions: [
                { id: "v1", url: "/vinyl/1", prompt: "\"흰색 비닐 질감 구현. 바스락거림 표현.\"\n\n", script: "" },
                { id: "v2", url: "/vinyl/2", prompt: "\"인터랙션 기반 변형 추가. 실제 비닐 거동 반영.\"\n\n", script: "" },
            ],
        },
        {
            title: "10 frosted glassmorphism",
            versions: [
                { id: "v1", url: "/frosted-glassmorphism/1", prompt: "\"반투명 유리 질감 적용. glassmorphism 스타일 인터랙션 구현.\"\n\n", script: "" },
            ],
        },
    ];

    const [activeMaterialTitle, setActiveMaterialTitle] = useState<string>(materials[0].title);
    const [previewMaterialTitle, setPreviewMaterialTitle] = useState<string | null>(null);
    const [activeVersionIndex, setActiveVersionIndex] = useState<number>(0);

    const displayMaterialTitle = previewMaterialTitle || activeMaterialTitle;
    const activeMat = materials.find(m => m.title === displayMaterialTitle) || materials[0];
    const activeVersion = activeMat.versions[activeVersionIndex];

    const wheelRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (wheelRef.current && itemRefs.current[0]) {
            const container = wheelRef.current;
            container.scrollTop = 0; // Initialize to very top
        }
    }, []);

    const handleScroll = () => {
        if (!wheelRef.current) return;
        if (window.innerWidth >= 768) return; // Disable scroll selection on PC
        const container = wheelRef.current;
        const topOffset = container.scrollTop;

        let closestIdx = 0;
        let minDiff = Infinity;

        materials.forEach((mat, i) => {
            const item = itemRefs.current[i];
            if (!item) return;
            // Now calculate diff from the top instead of the center
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
            setActiveVersionIndex(materials[closestIdx].versions.length - 1);
        }
    };

    return (
        <main className="h-screen w-screen bg-white flex flex-col md:flex-row overflow-hidden lowercase md:p-6 lg:p-10 gap-0 md:gap-24 lg:gap-40">
            {/* 1. Left Pane: Navigation Wheel (Mobile / Desktop) */}
            <div className="flex-none md:w-[22%] h-[180px] md:h-full px-4 md:px-0 bg-white relative flex flex-col overflow-hidden">
                {/* Fixed Title: textures */}
                <div className="w-full py-1 text-black/30 select-none flex-none bg-white z-30 text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.1] indent-[1.8em] font-medium">
                    textures
                </div>

                <div className="w-full flex-1 relative overflow-hidden text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.1] font-medium text-black">
                    {/* gradient overlay (position: absolute; bottom: 0) */}
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
                    {/* FIXED HEADER: prompt */}
                    <div className="w-full py-1 text-black/30 select-none flex-none bg-white z-40 text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.1] indent-[1.8em] font-medium">
                        prompt
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
                                                className="inline-flex items-center text-[20px] lg:text-[28px] tracking-[-0.03em] font-medium opacity-100 hover:opacity-70 transition-opacity underline underline-offset-4"
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

                {/* Desktop Slider Space */}
                {activeMat && activeMat.versions.length > 1 && (
                    <div className="hidden md:flex flex-col justify-start items-center w-32 bg-white z-10 shrink-0 pt-2 lg:pt-8">
                         <div className="relative w-full h-[30%] flex flex-col items-center">
                            <VersionControls 
                                versions={activeMat.versions} 
                                activeIndex={activeVersionIndex} 
                                onChange={setActiveVersionIndex} 
                                className="w-full h-[40%]"
                                vertical={true}
                            />
                         </div>
                    </div>
                )}

                {/* Mobile Slider / Overlay */}
                {activeMat && activeMat.versions.length > 1 && (
                    <div className="md:hidden">
                        <div className="absolute bottom-0 left-[10%] right-[10%] z-20">
                            <VersionControls 
                                versions={activeMat.versions} 
                                activeIndex={activeVersionIndex} 
                                onChange={setActiveVersionIndex} 
                                className="w-full" 
                                vertical={false}
                            />
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
