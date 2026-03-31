"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

type HoverData = {
    active: boolean;
    text: string;
    prompt?: string;
};

export default function Home() {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [hoverData, setHoverData] = useState<HoverData>({ active: false, text: "", prompt: "" });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    const materials = [
        {
            title: "Metal",
            versions: [
                {
                    id: "Metal v1",
                    url: "/steel/1",
                    prompt: "마우스 움직임에 반응하는 메탈 재질을 만들어줘.",
                    script: "float grain = random(vUv * vec2(1.0, 300.0));\nvec3 T = normalize(vec3(1.0, grain * 0.05, 0.0));",
                },
                {
                    id: "Metal v2",
                    url: "/steel/2",
                    prompt: "조금 더 무겁고 파도 같은 브러시 결이 있는 스틸이 필요해.",
                    script: "float band = fbm(vUv * vec2(12.0, 0.5));\nfloat textureVariancy = band * 0.7 + scratch * 0.15;",
                },
                {
                    id: "Metal v3",
                    url: "/steel/3",
                    prompt: "금속 표면이 곡면 컵처럼 화면을 꽉 채우게 하고, 카메라 웹캠이 반사되도록 해봐.",
                    script: "vec2 videoUv = R.xy * 0.45 + 0.5;\nfloat cylZ = sqrt(max(1.0 - cylX * cylX, 0.0));",
                },
                {
                    id: "Metal v4",
                    url: "/steel/4",
                    prompt: "수평으로 줄눈이 강하게 들어가 있는 스테인리스 스틸로 바꿔줘. 주변 환경이 무채색, 하얗게 타오르는 대비로 강렬하게 비춰지도록.",
                    script: "float luminance = dot(envColor, vec3(0.299, 0.587, 0.114));\nenvColor = vec3(luminance); // Grayscale conversion",
                },
                {
                    id: "Metal v5",
                    url: "/steel",
                    prompt: "너무 카메라 피드가 빛 부분만 살지 않고, 둥근 실린더 컵 전체에 비친듯한 풀 왜곡 렌더링 방식이 빛과 함께 표시되게금 해줘.",
                    script: "vec3 R = reflect(-V, N);\nvideoUv.x = 1.0 - videoUv.x; // Cylindrical Distortion across entire face",
                },
            ],
        },
        {
            title: "Water",
            versions: [
                {
                    id: "Water v1",
                    url: "/water/1",
                    prompt: "마우스 클릭으로 물결이 퍼지는 효과를 만들어줘.",
                    script: "float wave = sin(wavePhase);\nfloat envelope = exp(-age * decay) * intensity;",
                },
                {
                    id: "Water v2",
                    url: "/water/2",
                    prompt: "대비가 훨씬 세고 빛이 강렬하게 반사되는 거칠고 날카로운 파장으로 변경해.",
                    script: "vec2 normalOffset = vec2(dX, dY) * 2.5;\nfloat glint = smoothstep(0.55, 0.65, spec);",
                },
                {
                    id: "Water v3",
                    url: "/water",
                    prompt: "물결 파장 주파수를 조절하고 외곽을 부드럽게 감쇠시켜줘.",
                    script: "float freq = 20.0;\nfloat edgeFade = smoothstep(age * speed, age * speed - 0.05, dist);",
                },
            ],
        },
    ];

    return (
        <main className="h-full w-full bg-white">
            <div className="h-full w-full overflow-y-auto no-scrollbar p-4 lg:p-6">
                <div className="max-w-[400px] text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.25] font-medium text-black pb-20">

                    <div className="flex flex-col gap-6 lg:gap-8">
                        {materials.map((mat) => (
                            <div key={mat.title} className="flex flex-col">
                                <p className="mb-0">
                                    {mat.title}
                                </p>
                                <div className="flex flex-col space-y-0">
                                    {mat.versions.map((ver) => (
                                        <Link
                                            key={ver.id}
                                            href={ver.url}
                                            className="opacity-20 hover:opacity-100 transition-opacity duration-300 block w-fit"
                                            onMouseEnter={() => setHoverData({ active: true, text: ver.script, prompt: ver.prompt })}
                                            onMouseLeave={() => setHoverData({ active: false, text: "", prompt: "" })}
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

            {hoverData.active && (
                <div
                    className="pointer-events-none fixed z-50 bg-black text-white p-4 max-w-[300px] text-[12px] lg:text-[14px] leading-relaxed rounded-sm shadow-xl"
                    style={{
                        left: mousePos.x + 20,
                        top: mousePos.y + 20,
                    }}
                >
                    {hoverData.prompt && (
                        <div className="mb-3 font-serif italic text-white/90 border-b border-white/20 pb-2 leading-[1.4]">
                            "{hoverData.prompt}"
                        </div>
                    )}
                    <div className="font-mono opacity-80 whitespace-pre-wrap">{hoverData.text}</div>
                </div>
            )}
        </main>
    );
}
