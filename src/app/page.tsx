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
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ "01 brushed steel": true, "02 scattered puddle": true, "03 crumpled tissue": true, "04 shattered glass": true, "05 rgb drops": true, "06 gooey dripping": true, "07 frosted glass": true });

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
                    url: "/water/3",
                    prompt: "\"링이 튀는 외곽 형태를 없애고 주파수를 낮춰서 유기적으로 확산되도록.\"\n\n거리-시간 기반 감쇠 함수 적용 및 저주파수 노이즈 블렌딩 추가.",
                    script: "float freq = 20.0;\nfloat edgeFade = smoothstep(age * speed, age * speed - 0.05, dist);",
                },
                {
                    id: "v4",
                    url: "/water",
                    prompt: "\"모바일 환경에서 너무 크게 보이는 문제를 해결하고, 파동의 끝이 어색하지 않게 잔잔하게 사라지게끔 수정.\"\n\n단말기 aspect ratio 좌표 보정 및 smoothstep을 활용한 파동 소멸 구간(timeFade) 페이드아웃 적용.",
                    script: "float mobileScale = max(1.0, u_resolution.y / u_resolution.x);\nfloat timeFade = smoothstep(5.0, 3.5, age);",
                },
            ],
        },
        {
            title: "03 crumpled tissue",
            versions: [
                {
                    id: "v1",
                    url: "/tissue/1",
                    prompt: "\"구겨진 휴지가 천천히 펴지는 기본 형태를 쉐이더로 구현해줘.\"\n\n정점 쉐이더(vertex shader)에서 3D Simplex 노이즈를 활용하여 평면 메쉬(plane mesh)에 불규칙적인 굴곡과 주름을 형성하고, 단편 쉐이더(fragment shader)에서 외적(cross product)을 이용해 표면 노멀을 재계산하여 질감을 표현.",
                    script: "float noiseVal = snoise(vec3(pos.x, pos.y, u_time)) * 0.15;\nvec3 newPosition = position + normal * noiseVal;",
                },
                {
                    id: "v2",
                    url: "/tissue/2",
                    prompt: "\"근데 휴지 너무 돌같아 v2버전으로, 종이가 구겨진듯한 모습 다시 표현해줘.\"\n\n종이 특유의 날카롭고 직선적인 주름을 재현하기 위해 삼각파(triangular wave)를 기반으로 한 프랙탈 브라운 운동(FBM) 노이즈를 적용하여, 면과 면이 만나는 엣지를 입체적으로 각지게 구현.",
                    script: "vec2 tri(vec2 x) { return abs(fract(x) - 0.5); }\n// FBM with rotated triangular waves",
                },
            ],
        },
        {
            title: "04 shattered glass",
            versions: [
                {
                    id: "v1",
                    url: "/glass/1",
                    prompt: "\"거울을 깨는듯한 인터랙션. 카메라로 환경이 비치고, 주먹으로 치는듯한 인터랙션이 감지되면 조금씩 금이 가는 그래픽을 구현해줘.\"\n\n웹캠 비디오 텍스처를 배경으로 활용하고, 마우스 클릭 지점을 중심으로 시간에 따라 전파되는 보로노이 필드(Voronoi field)를 계산하여 파편화된 UV 왜곡과 균열선(crack line)을 생성.",
                    script: "vec2 uvOffset = (cellOffset - 0.5) * 0.08 * maxShatter;\ncrackLine = smoothstep(0.03, 0.0, border_dist);",
                },
            ],
        },
        {
            title: "05 rgb drops",
            versions: [
                {
                    id: "v1",
                    url: "/rgb/1",
                    prompt: "\"흰색 화면에 물을 흩뿌렸을때 물방울이 돋보기 역할을 해서 RGB 색상이 확대되어 보이는 효과를 마우스 드래그로 구현해줘.\"\n\n임시 캔버스(Canvas API)를 활용하여 마우스 궤적에 따라 물방울(반경과 그라데이션)을 텍스처로 그리고, 단편 쉐이더(Fragment Shader)에서 이 높이 맵(Height map)의 편미분을 통해 물방울의 노멀과 피사계 심도를 계산하여 하단에 깔린 LCD 서브픽셀 패턴(RGB Strip)을 굴절 및 확대(Magnification)시킴.",
                    script: "vec2 distortedUv = uv - offset;\nvec3 lcdColor = getLCDColor(distortedUv);",
                },
                {
                    id: "v2",
                    url: "/rgb/2",
                    prompt: "\"rgb drops는 모래같아, 그래서 투명한 물방울이 화면에 맺힌듯한 인터랙션으로 바꿔줘.\"\n\n캔버스 텍스처에서 발생하던 노이즈(모래알 현상)를 없애기 위해 수학적으로 완벽한 형태의 3D 반구(Hemisphere) 방정식을 사용해 표면 장력을 모사하고 투명하고 매끄러운 굴절을 구현. RGB 서브픽셀 또한 Sine 파형으로 대체해 안티에일리어싱(Anti-aliasing) 처리 완료.",
                    script: "float dropH = sqrt(radius * radius - dist * dist);\nnormalOffset += diff / max(dropH, 0.001);",
                },
            ],
        },
        {
            title: "06 gooey dripping",
            versions: [
                {
                    id: "v1",
                    url: "/gooey/1",
                    prompt: "\"천정에서 액체와 같은 끈적한게 떨어지는 듯한 gooey effect 구현해줘. 마우스와도 인터랙션하게.\"\n\n2D 부호화 거리장(SDF, Signed Distance Field) 기반의 메타볼(Metaball) 렌더링 방식을 사용하여 끈적한 유체 역학을 모사. 스무스 미니엄(smin) 함수로 물방울과 천장, 그리고 마우스가 지나간 궤적 간의 점성을 계산하고 광택(Specular)과 프레넬(Fresnel) 반사를 추가해 사실적인 입체감을 부여.",
                    script: "float d = smin(dCeiling, dDrop, 0.15);\nvec3 n = normalize(vec3(dFdx(d), dFdy(d), 0.008));",
                },
                {
                    id: "v2",
                    url: "/gooey/2",
                    prompt: "\"gooey effect는 모두 검정으로 나오게끔, 그리고 입자를 더 작게하고 떨어지는 빈도를 더 많이, 더끈적이게.\"\n\n조명과 굴절을 제거해 완벽하게 새카만 2D 실루엣(Silhouette)으로 스타일을 변경. 입자(Drops) 갯수와 낙하 속도를 대폭 높이고 smin 파라미터의 보간 거리(k=0.25)를 늘려 서로가 늘어나며 달라붙는 점성(Viscosity)을 극대화.",
                    script: "d = smin(d, dDrop, 0.25);\n// pure mask mix for bold black silhouette",
                },
            ],
        },
        {
            title: "07 frosted glass",
            versions: [
                {
                    id: "v1",
                    url: "/frost/1",
                    prompt: "\"frosted glass해서, 거울에 성에가 낀거, 그리고 마우스커서로 그걸 걷을 수 있게 하는거 구현해줘.\"\n\n웹캠 피드(Webcam Feed) 위에 하얗게 얼어붙은 성에(Frost) 레이어를 덮고 9-tap 노이즈 블러(Noise Blur)로 시야를 흐림. 사용자가 드래그한 궤적에 따라 임시 캔버스에 지워진 영역이 기록되며, 이 가장자리의 편미분(Derivative)을 계산해 물기가 맺힌 듯한 물방울 굴절(Refraction)과 스펙큘러 엣지(Specular Edge)를 구현. 지워진 성에는 시간이 지남에 따라 천천히 다시 복원(Healing).",
                    script: "float blurScale = (0.015 + 0.005 * microFrost) * frostOpacity;\ncol = mix(col, smoothstep(0.0, 0.9, col), frostOpacity * 0.5);",
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
