"use client";
import React, { useState } from "react";
import Link from "next/link";

type HoverData = {
    id: string;
    url: string;
    prompt: string;
    script: string;
};

// Helper function to render Korean parts with a thicker font weight (boldness)
const renderMixedText = (text: string) => {
    return text.split(/([가-힣ㄱ-ㅎㅏ-ㅣ]+)/g).map((part, index) => {
        if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(part)) {
            return <span key={index} className="font-semibold">{part}</span>;
        }
        return part;
    });
};

export default function Home() {
    const [activeInfo, setActiveInfo] = useState<HoverData | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ "01 brushed steel": true, "02 scattered puddle": true });

    const materials = [
        {
            title: "01 brushed steel",
            versions: [
                {
                    id: "v1",
                    url: "/steel/1",
                    prompt: "\"브러시드 스테인리스 스틸(brushed stainless steel)의 기본 방향성 하이라이트를 구현해봐.\"\n\nuv 좌표계에 고주파 노이즈를 입혀 단일 스펙큘러 로브를 통한 선형 반사율을 구현.",
                    script: "float grain = random(vUv * vec2(1.0, 300.0));\nvec3 T = normalize(vec3(1.0, grain * 0.05, 0.0));",
                },
                {
                    id: "v2",
                    url: "/steel/2",
                    prompt: "\"조금 더 파도 같은 굴곡과 거칠고 높은 대비 형태의 질감으로 개선해.\"\n\n프랙탈 브라운 운동(fbm) 노이즈와 이중 스펙큘러를 합성하여 고대비 메탈릭 단면 도출.",
                    script: "float band = fbm(vUv * vec2(12.0, 0.5));\nfloat textureVariancy = band * 0.7 + scratch * 0.15;",
                },
                {
                    id: "v3",
                    url: "/steel/3",
                    prompt: "\"카메라를 활용해서, 가장자리가 둥근 스테인리스 컵에 주변 환경 색이 비치는 걸 표현하고 싶어.\"\n\n평면 스크린 xy좌표를 원기둥(cylinder) 노멀 지오메트리로 역산하고 webrtc 비디오 텍스처를 웹캠 반사 벡터로 매핑.",
                    script: "vec2 videoUv = R.xy * 0.45 + 0.5;\nfloat cylZ = sqrt(max(1.0 - cylX * cylX, 0.0));",
                },
                {
                    id: "v4",
                    url: "/steel/4",
                    prompt: "\"줄눈이 있는 스테인리스 스틸로 줘. 금속이 너무 파래, 무채색 계열이었으면 좋겠고. 특정 빛 반사 물체만 아주 하얗게 비치게 끔.\"\n\nx축 1.0, y축 800.0 비율의 수평 고주파 노이즈로 텍스처를 조정하고, 루미넌스(luminance) 변환 및 국소적 스팟라이트 마스킹으로 극대비 반사 구현.",
                    script: "float luminance = dot(envColor, vec3(0.299, 0.587, 0.114));\nenvColor = vec3(luminance); // grayscale conversion",
                },
                {
                    id: "v5",
                    url: "/steel",
                    prompt: "\"너무 세로 빛만 살지 않고, 둥근 실린더 형태의 컵에 비친 왜곡된 모습이 빛과 함께 표시되었으면 좋겠어.\"\n\n스팟 마스크 제약을 해제하여 전면 실린더 곡률에 따른 환경 맵 풀 렌더링 유지 및 블러(blur) 감쇠 효과 추가.",
                    script: "vec3 R = reflect(-V, N);\nvideoUv.x = 1.0 - videoUv.x; // cylindrical distortion across entire face",
                },
            ],
        },
        {
            title: "02 scattered puddle",
            versions: [
                {
                    id: "v1",
                    url: "/water/1",
                    prompt: "\"가장 기본적인 water ripple surface 상호작용 형태를 구현해.\"\n\n2d 평면상 마우스 클릭 좌표와 시간 동기화 기반 둔감형 감쇠 삼각함수(sin)를 노멀에 맵핑.",
                    script: "float wave = sin(wavePhase);\nfloat envelope = exp(-age * decay) * intensity;",
                },
                {
                    id: "v2",
                    url: "/water/2",
                    prompt: "\"하쉬한 조명과 매우 거칠고 대비가 센 반사율이 필요해.\"\n\n스무스스텝(smoothstep) 임계치를 높이고 fbm 텍스처를 곱해 높은 스펙큘러 글린트를 유도.",
                    script: "vec2 normalOffset = vec2(dX, dY) * 2.5;\nfloat glint = smoothstep(0.55, 0.65, spec);",
                },
                {
                    id: "v3",
                    url: "/water",
                    prompt: "\"링이 튀는 외곽 형태를 없애고 주파수를 낮춰서 유기적으로 확산되도록.\"\n\n거리-시간 기반 감쇠 함수 적용 및 저주파수 노이즈 블렌딩 추가.",
                    script: "float freq = 20.0;\nfloat edgeFade = smoothstep(age * speed, age * speed - 0.05, dist);",
                },
            ],
        },
    ];

    const toggleExpanded = (title: string) => {
        setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <main className="h-full w-full bg-white flex flex-col md:flex-row overflow-hidden lowercase">
            {/* 1. Left / Top Pane: Navigation Menu */}
            <div className="flex-1 md:w-1/2 h-1/2 md:h-full overflow-y-auto no-scrollbar p-4 lg:p-6 border-b md:border-b-0 md:border-r border-black/10">
                <div className="max-w-[400px] text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.25] font-medium text-black pb-20">

                    <div className="flex flex-col">
                        {materials.map((mat) => (
                            <div key={mat.title} className="flex flex-col">
                                <div 
                                    onClick={() => toggleExpanded(mat.title)}
                                    className="flex items-center gap-3 cursor-pointer group w-fit"
                                >
                                    <p className="mb-0">{mat.title}</p>
                                    <svg 
                                        className={`w-[0.55em] h-[0.55em] mt-[0.1em] opacity-30 group-hover:opacity-100 transition-transform duration-300 ${expanded[mat.title] ? "" : "-rotate-90"}`}
                                        fill="currentColor" viewBox="0 0 10 10"
                                    >
                                        <path d="M0 2L10 2L5 8Z" />
                                    </svg>
                                </div>
                                <div className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${expanded[mat.title] ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                                    {mat.versions.map((ver) => (
                                        <Link
                                            key={ver.id}
                                            href={ver.url}
                                            onMouseEnter={() => setActiveInfo(ver)}
                                            className={`text-left opacity-30 hover:opacity-100 transition-opacity duration-300 block w-fit font-medium ${
                                                activeInfo?.url === ver.url ? "opacity-100" : ""
                                            }`}
                                        >
                                            {ver.id}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            {/* 2. Right / Bottom Pane: Information Details */}
            <div className="flex-1 md:w-1/2 h-1/2 md:h-full overflow-y-auto no-scrollbar p-4 lg:p-6 bg-[#f9f9f9]">
                <div className="max-w-[500px] text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.25] text-black pb-20 font-medium">
                    {activeInfo ? (
                        <div className="flex flex-col justify-start">
                            <div className="whitespace-pre-wrap">
                                {renderMixedText(activeInfo.prompt)}
                            </div>
                            <div className="font-mono opacity-40 text-[13px] lg:text-[14px] leading-[1.6] tracking-normal whitespace-pre-wrap mt-8 lg:mt-12 font-normal">
                                {activeInfo.script}
                            </div>
                        </div>
                    ) : (
                        <div className="opacity-30 font-medium">
                            select iteration
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
