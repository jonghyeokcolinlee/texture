"use client";
import React, { useState, useRef, useEffect } from "react";
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
    const [activeMaterialTitle, setActiveMaterialTitle] = useState<string | null>(null);
    const [activeVersionIndex, setActiveVersionIndex] = useState<number>(0);

    const materials = [
        {
            title: "01 brushed steel",
            versions: [
                {
                    id: "v1",
                    url: "/steel/1",
                    prompt: "\"줄눈이 있는 스테인리스 스틸로 줘. 금속이 너무 파래, 무채색 계열이었으면 좋겠고. 특정 빛 반사 물체만 아주 하얗게 비치게 끔.\"\n\nx축 1.0, y축 800.0 비율의 수평 고주파 노이즈로 텍스처를 조정하고, 루미넌스(luminance) 변환 및 국소적 스팟라이트 마스킹으로 극대비 반사 구현.",
                    script: "float luminance = dot(envColor, vec3(0.299, 0.587, 0.114));\nenvColor = vec3(luminance); // grayscale conversion",
                },
                {
                    id: "v2",
                    url: "/steel/2",
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
                {
                    id: "v5",
                    url: "/water/5",
                    prompt: "\"scattered puddle은 평소에 배경이 하얀색이다가, 물결 치는 부분이 조금 회색으로 바뀌는 걸로 수정되어야할 것 같아.\"\n\n완전한 형태의 화이트 캔버스(White Backgrond) 베이스로 쉐이더를 다시 짜고, 빛의 반사각(Normals)이 크게 틀어지는 파동(Wave) 부분에 한해 은은한 회색 그림자(Gray Shadow)와 흰색 스펙큘러로 깔끔하게 떨어지는 미니멀한 반사 효과를 부여.",
                    script: "float shadow = smoothstep(1.0, 0.5, ndotl);\nvec3 waveColor = mix(vec3(1.0), vec3(0.7, 0.7, 0.73), shadow);",
                },
                {
                    id: "v6",
                    url: "/water/6",
                    prompt: "\"scattered puddle 퍼져나갈 때 파동의 색감이 조금 더 옅었으면 좋겠고, 그리고 무채색으로 해서 채도를 0으로.\"\n\n파동이 일 때 생기는 빛 반사 그림자의 강도(Intensity)와 대비(Contrast)를 대폭 줄이고, 블루/그레이 톤이 섞여 있던 기존 음영에서 채도를 완벽하게 0으로 제거하여 매우 옅고 깨끗한 퓨어 모노톤 아키텍처(Pure Achromatic) 음영으로 다듬음.",
                    script: "vec3 waveColor = mix(vec3(1.0), vec3(0.88, 0.88, 0.88), shadow);",
                },
            ],
        },
        {
            title: "03 rgb drops",
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
                {
                    id: "v3",
                    url: "/rgb/3",
                    prompt: "\"물끼리 붙는듯한 gooey한 effect넣어주고, 물방울의 개수에 제한 없도록 해줘. 증발하는 효과 유지.\"\n\n임시 캔버스(FBO)를 다시 도입하여 무제한 갯수의 물방울 생성을 지원하고, 캔버스의 Additive Blending(lighter)과 쉐이더의 smoothstep을 결합해 가까이 있는 물방울끼리 스르륵 합쳐지는 메타볼(Gooey) 표면 장력 효과를 구현.",
                    script: "ctx.globalCompositeOperation = 'lighter';\nfloat h = smoothstep(0.05, 0.2, rawH) * rawH;",
                },
                {
                    id: "v4",
                    url: "/rgb/4",
                    prompt: "\"전체에 rgb가 다 보이는게 아니고, 물방울 테두리변두리에 보이게, 작다면 전체가 rgb로 보이게끔. 누르는 압력에 따라 크기도 조절해줘.\"\n\n물방울의 곡률(Slope, 편미분 벡터의 길이)을 계산하여 곡률이 가파른 가장자리나 작은 물방울에서만 RGB가 굴절되게 보이도록 visibility를 조절. 사용자가 마우스를 누르고 있는 시간(Pressure / Hold Time)을 추적해 `requestAnimationFrame` 내에서 브러시 크기를 키워 거대한 물방울 웅덩이가 만들어지도록 인터랙션 고도화.",
                    script: "float slope = length(normalOffset);\nfloat rgbVisibility = smoothstep(0.02, 0.3, slope);",
                },
                {
                    id: "v5",
                    url: "/rgb/5",
                    prompt: "\"물방울이 비정형적으로 퍼졌으면 좋겠고, 고른 RGB 패턴(모래) 대신 레퍼런스 이미지처럼 불규칙적이고 큰 RGB 덩어리가 있었으면 좋겠음.\"\n\n정원형 물방울 텍스처를 읽어올 때 2D Simplex 노이즈로 UV를 뒤틀어(Warping) 매우 불규칙적인 비정형 물방울 형태 생성. 렌즈 굴절 시 RGB 채널별로 오프셋을 다르게 주는 색수차(Chromatic Aberration)와 패치 노이즈(Patch Noise) 마스킹을 결합해 일정하지 않고 덩어리진 픽셀 무지개 반사가 나타나도록 고도화.",
                    script: "vec2 distR = p - normalOffset * 0.10;\nvec2 distB = p - normalOffset * 0.06;",
                },
                {
                    id: "v6",
                    url: "/rgb/6",
                    prompt: "\"물방울이 자기 혼자 너무 움직인다. 그리고 물방울이 커질때 가장자리만 커져야하는데 가운데 RGB 표현이 너무 심하게 드러나.\"\n\n물방울이 끓잡듯이 스스로 움직이던 애니메이션(u_time)을 제거하고 고정된 비정형 형태(Static Noise)로 안정화. 큰 물웅덩이의 중앙(가장 깊고 평평한 곳)을 높이값(height > 0.8)으로 감지하여 강제로 RGB 굴절을 없앰으로써, 큰 웅덩이는 가운데가 깨끗하고 가장자리만 무지개빛이 맺히도록 구조를 개선.",
                    script: "float rgbMaxH = smoothstep(0.9, 0.75, h);\nfloat rgbVisibility = rgbMaxH * rgbMinSlope * rgbIrregularity;",
                },
                {
                    id: "v7",
                    url: "/rgb/7",
                    prompt: "\"물이 커서 따라서 페인트처럼 칠해지는게 아니라, 한번 클릭하면 여러 방울이 튀겨지는 것처럼 하고 싶어.\"\n\n드래그 시 펜처럼 물이 칠해지던 인터랙션(PointerMove)을 폐기. 대신 한 번 클릭(PointerDown)할 때마다 클릭한 지점을 중심으로 거대한 중심 물방울과 사방으로 튀어오르는 수십 개의 작은 물방울 스플래터(Splatter)들이 방사형으로 동시에 튀겨지도록 로직 전면 개편.",
                    script: "const angle = Math.random() * Math.PI * 2;\nconst distance = Math.pow(Math.random(), 2.0) * 180.0;",
                },
                {
                    id: "v8",
                    url: "/rgb/8",
                    prompt: "\"물방울이 너무 크게 퍼지고, rgb가 되게 작게 보여. rgb가 크게 확대되어 보이고, 물을 뿌릴때도 심하게 퍼지지 않았으면 좋겠어.\"\n\n스플래터(튀기는 물방울)들의 산포 반경(Scatter radius)을 대폭 줄여 깔끔하게 밀집된 웅덩이를 형성. 현실적 재현보다는 인터랙션의 시각적 명확성을 높이기 위해, RGB 서브픽셀의 시각적 크기를 두 배 이상 확대하고 굴절 강도(Refraction Offset) 또한 공격적으로 높여 매우 도드라지고 강렬한 색수차 렌즈 효과를 연출.",
                    script: "vec2 distR = p - normalOffset * 0.25;\nvec2 p = uv * u_resolution.xy * 0.035;",
                },
                {
                    id: "v9",
                    url: "/rgb/9",
                    prompt: "\"rgb가 조금식만 더 크게 보이고, 알록달록하게 보일 수 있도록 수정해서 새로 만들어줘.\"\n\nRGB 픽셀 스케일 배수를 줄여(`0.020`) 입자를 이전보다 더 큼지막하게 확대하고, 색수차 굴절값을 극한으로 밀어붙여(`distR = 0.4`, `distB = 0.1`) 가장자리에 강렬한 빨/초/파 무지개 띠가 생성되도록 조정. 또한 그림자/명암 대비를 낮추고 색상 채도(Saturation)를 대폭 끌어올려 전체적으로 물방울 안이 무지개빛으로 꽉 찬 알록달록한 커스텀 렌즈 이펙트 구현.",
                    script: "vec2 p = uv * u_resolution.xy * 0.020;\nlcdColor = pow(lcdColor, vec3(0.45)) * 1.9;",
                },
                {
                    id: "v10",
                    url: "/rgb/10",
                    prompt: "\"한번 물 뿌렸을 때 덩어리가 크게 한개+ 주위로 튀긴것으로 나오게끔하고, RGB가 더 확대된 모습이었으면 좋겠어.\"\n\n스플래터(Splatter) 로직 중앙에 반경이 압도적으로 큰 커다란 메인 물방울(Blob) 하나를 무조건 생성하도록 구조를 개편하고, 쉐이더의 RGB 서브픽셀 확대 스케일을 `0.010`으로 극한값까지 키워 작은 픽셀도 돋보기처럼 큼지막하게 굴절되어 보이게끔 렌즈 효과를 고도화.",
                    script: "vec2 p = uv * u_resolution.xy * 0.010;\nif (i === 0) r = 45 + Math.random() * 25;",
                },
                {
                    id: "v11",
                    url: "/rgb/11",
                    prompt: "\"원래 물방울 색은 배경에비해 살짝 탁했었는데 그것 살려주고, 딱 뿌릴 때 RGB가 모여있다가 퍼지는걸 좀 더 자연스럽게 해줘.\"\n\n물방울이 생성될 때 캔버스 상에서 목표 반경(target radius)까지 점진적으로 뻗어나가는 선형 보간(Lerp) 기반의 **동적 팽창 애니메이션**을 구현하여, 클릭 직후 액체가 촥! 퍼져나가는 물리적 느낌을 제공. 물방울 렌즈 중앙은 맑은 순백색 대신 `vec3(0.86, 0.88, 0.90)`의 탁한 블루/그레이 톤으로 블렌딩하여 주변 하얀 배경과 대비되는 물방울 특유의 톤다운된 탁한 질감 복구.",
                    script: "s.currentR += (s.targetR - s.currentR) * 0.25;\nvec3 clearWater = mix(vec3(1.0), vec3(0.86, 0.88, 0.90), min(h * 1.8, 1.0));",
                },
                {
                    id: "v12",
                    url: "/rgb/12",
                    prompt: "\"물에 조금씩 반사광이 있어서 더 물처럼 보이게, 그리고 물방울들은 시간이 지나면 증발해서 줄어드는 효과를 줘.\"\n\n환경광을 모사하는 보조 **스팟라이트와 프레넬 반사광(Fresnel Glint)**을 추가하여 표면의 매끄러운 찰랑거림을 극대화. 캔버스의 증발 로직과 그라데이션 알파 값을 조절하여(Opacity fade), 웅덩이 가장자리가 빠르게 마르며 **점점 안쪽으로 쪼그라드는 물리적인 증발 효과(Shrinking)**를 완벽하게 모사.",
                    script: "float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * 0.4;\n// gradient fade -> shape shrink",
                },
                {
                    id: "v13",
                    url: "/rgb/13",
                    prompt: "\"아니다 v9로 rollback하고, 거기에 시간이 지나면 순차적으로 옛날에 생성되었던 물방울들이 점점 수축되면서 증발하는듯한 효과를 줘.\"\n\nv9의 알록달록하고 극단적인 색수차, 고정형 스플래터 로직으로 완전히 롤백(Rollback)한 뒤, 물파장 캔버스의 감쇠(Fade) 로직과 방사형 알파 그라데이션(Radial gradient) 구조를 선형적으로 튜닝. 이를 통해 캔버스의 픽셀이 증발할 때 외곽에서 중앙으로 서서히 알파가 제거되며 **오래된 물방울일수록 순차적으로 크기가 줄어들다 소멸하는(Sequential Shrinking)** 완벽한 증발 효과를 재수립.",
                    script: "ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';\ngrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');",
                },
                {
                    id: "v14",
                    url: "/rgb/14",
                    prompt: "\"아니 v13을 아예 v9버전의 스타일과 코드로 똑같이 rollback해주고, 거기에 이제 물방울이 생성된 이후, 일정 시간이 지나면 증발하는 효과를 줘.\"\n\nv9의 스타일뿐만 아니라 코드를 100% 동일하게 복원한 후, 캔버스 그리기 로직을 완전히 재설계. 물방울 객체의 생성 시간(birth)을 추적하여 **일정 시간(1.5초) 동안은 온전한 전성기를 유지하고, 그 이후에만 크기가 물리적으로 쪼그라들면서(shrink) 증발하는 타이머 애니메이션**을 구현.",
                    script: "if (age > 1.5) currentR = d.r * Math.pow(1.0 - decayRatio, 1.5);",
                },
                {
                    id: "v15",
                    url: "/rgb/15",
                    prompt: "\"조금 시간을 더 지연시켜주고, 사라지는것도 더 자연스럽게 사라지게끔.\"\n\n물방울이 온전한 형태를 유지하는 대기 시간(Delay)을 1.5초에서 **2.5초**로 넉넉하게 늘려주어 감상할 시간을 확보. 또한 증발 애니메이션에 딱딱한 거듭제곱 감쇠 대신 **부드러운 곡선(Ease-Out 곡선)**을 추가 도입하여, 서서히 쪼그라들며 투명해지는 형태 왜곡이 훨씬 자연스럽게(Natural fade) 이루어지도록 튜닝.",
                    script: "if (age > 2.5) currentR = d.r * (1.0 - Math.pow(decayRatio, 2.0));",
                },
                {
                    id: "v16",
                    url: "/rgb/16",
                    prompt: "\"rgb interaction 이렇게 크게 보이게 수정 못해? 이렇게까지 크게는 아니여도, 이런 느낌으로 가장자리에 rgb 조금씩 보이게해서 (레퍼런스 이미지 제공).\"\n\n제공된 이미지를 철저히 분석하여 색수차와 빛의 굴절 매커니즘을 새롭게 짰습니다. 캔버스에 닿는 물방울의 수직 단면을 완벽한 평면 고원(Plateau)으로 깎아내 중앙부에는 전혀 왜곡 없이 투명한 순백색 코어가 유지되도록 하고, 가장자리(Edge)의 급격한 경사에만 방사형 빛 연산을 구해서 좌상단 가장자리에만 강렬한 스텝의 RGB 서브픽셀 굴절이 맺히도록 구조를 완전히 분리(Isolate)했습니다.",
                    script: "float edgeIntensity = smoothstep(0.01, 0.20, slope);\nfloat rgbSide = smoothstep(0.0, 0.6, max(dot(N, L_rgb), 0.0));",
                },
                {
                    id: "v17",
                    url: "/rgb/17",
                    prompt: "\"아니 내가 보내준 사진과 유사하게, 그림자는 적게, rgb 픽셀 덩어리는 조금씩 크게, 물방울은 완전 #fff말고 흰색과 구분되는 조금 옅은 회색으로\"\n\n레퍼런스 이미지의 미묘한 톤 앤 매너(Tone & Manner)를 완벽하게 모사하기 위해 다음과 같이 튜닝했습니다: 1. `getLCDColor`의 배율 스케일을 줄여 픽셀 덩어리를 물리적으로 두 배 이상 키웠습니다. 2. 검회색이던 강한 그림자를 아주 옅은 쿨그레이(Light Grey) 톤으로 밝히고 혼합 수치(Blend ratio)를 크게 낮춰 그림자의 대비를 없앴습니다. 3. 순백(Pure White)이던 물방울 코어의 베이스 컬러를 미세하게 옅은 회색(0.94)으로 낮춰서, 순백색의 뒷배경과 투명하게 구별되는 얕은 물의 체적(Volume)을 구현했습니다.",
                    script: "vec2 p = uv * u_resolution.xy * 0.008;\nvec3 dropInsideColor = vec3(0.94); edgeColor = mix(edgeColor, vec3(0.85), shadowSide * 0.6);",
                },
                {
                    id: "v18",
                    url: "/rgb/18",
                    prompt: "\"근데 지금 rgb부분이 내가 보내준 사진처럼 더 뭉쳐서 두껍게 있어야돼. 물방울이 커진만큼 표현자체가.\"\n\n경사면(Slope)의 너비와 캔버스의 Gradient 알파값을 넓게 분산시켜서 **RGB 블록이 올라탈 수 있는 모서리(Edge)의 두께감 자체를 2배 이상 두껍게 확장**했습니다. 경사가 두꺼워진 만큼 서로 다른 색상 패널이 크게 분리될 수 있도록 Red/Green/Blue 색수차 채널의 오프셋 거리(offset gap)도 2배로 넓히고 증폭시켜서, 레퍼런스 사진처럼 굵고 강렬한 RGB 픽셀 띠가 모서리를 둥글게 감싸며 뭉치도록 표현력을 극대화했습니다.",
                    script: "float edgeIntensity = smoothstep(0.005, 0.40, slope);\nvec2 distR = p - normalOffset * 0.80;",
                },
                {
                    id: "v19",
                    url: "/rgb/19",
                    prompt: "\"아니 근데 rgb자체가 입자가 커져야되고, 한쪽에만 뭉쳐있는게 아니라, 보낸 사진처럼 random한 가장자리에 위치하게끔!\"\n\nRGB 픽셀 연산 스케일을 한 번 더 극한으로 줄여서(`0.008 -> 0.0035`), 마치 브릭 장난감처럼 **물리적인 픽셀 입자 크기를 거대하게 키웠습니다**. 또한 항상 특정 방향(Top-Left)에만 RGB가 맺히던 고정 로직을 폐기하고, 낮은 주파수의 3D 노이즈(snoise)를 화면 공간 전체에 매핑하는 방식으로 변경했습니다. 이를 통해 **조명 방향에 관계없이 윤곽선을 따라 예측 불가능한 랜덤한 위치에 RGB 블록들이 무작위로 맺히거나 사라지는(Random Edge CA Placement) 형태**를 완벽하게 구현했습니다.",
                    script: "vec2 p = uv * u_resolution.xy * 0.0035;\nfloat edgeNoise = snoise(vUv * 15.0); float rgbSide = smoothstep(-0.1, 0.5, edgeNoise);",
                },
            ],
        },
        {
            title: "04 frosted glass",
            versions: [
                {
                    id: "v1",
                    url: "/frost/1",
                    prompt: "\"frosted glass해서, 거울에 성에가 낀거, 그리고 마우스커서로 그걸 걷을 수 있게 하는거 구현해줘.\"\n\n웹캠 피드(Webcam Feed) 위에 하얗게 얼어붙은 성에(Frost) 레이어를 덮고 9-tap 노이즈 블러(Noise Blur)로 시야를 흐림. 사용자가 드래그한 궤적에 따라 임시 캔버스에 지워진 영역이 기록되며, 이 가장자리의 편미분(Derivative)을 계산해 물기가 맺힌 듯한 물방울 굴절(Refraction)과 스펙큘러 엣지(Specular Edge)를 구현. 지워진 성에는 시간이 지남에 따라 천천히 다시 복원(Healing).",
                    script: "float blurScale = (0.015 + 0.005 * microFrost) * frostOpacity;\ncol = mix(col, smoothstep(0.0, 0.9, col), frostOpacity * 0.5);",
                },
                {
                    id: "v2",
                    url: "/frost/2",
                    prompt: "\"현재 버전에서 카메라를 통해 사용자의 검지 손가락을 인식해서 직관적으로 성에를 닦을 수 있도록 해줘. 그리고 시간이 지나면 다시 성에가 끼는 복원 효과도 제대로 동작하게 해줘.\"\n\nGoogle MediaPipe의 HandLandmarker AI 모델을 씬(Scene)에 결합하여 카메라 피드 내 손가락 랜드마크(Index Finger)를 실시간으로 추적. 거울 모드에 맞게 좌표를 반전(Mirroring)하여 실제 손가락을 움직이면 성에가 물리적으로 닦이는 직관적 AR 인터랙션을 구현. 또한 닦인 캔버스 픽셀을 미세한 투명도로 매 프레임 재색칠하여, 물기가 마르며 다시 성에가 천천히 끼어드는 Time-based Healing 효과를 견고하게 유지.",
                    script: "const wipePos = new THREE.Vector2(1.0 - indexFinger.x, indexFinger.y);\napplyWipe(wipePos, 1.5);",
                },
            ],
        },
        {
            title: "05 curved metal reflection",
            versions: [
                {
                    id: "v1",
                    url: "/curved-metal/1",
                    prompt: "\"브러시드 스테인리스 스틸(brushed stainless steel)의 기본 방향성 하이라이트를 구현해봐.\"\n\nuv 좌표계에 고주파 노이즈를 입혀 단일 스펙큘러 로브를 통한 선형 반사율을 구현.",
                    script: "float grain = random(vUv * vec2(1.0, 300.0));\nvec3 T = normalize(vec3(1.0, grain * 0.05, 0.0));",
                },
                {
                    id: "v2",
                    url: "/curved-metal/2",
                    prompt: "\"조금 더 파도 같은 굴곡과 거칠고 높은 대비 형태의 질감으로 개선해.\"\n\n프랙탈 브라운 운동(fbm) 노이즈와 이중 스펙큘러를 합성하여 고대비 메탈릭 단면 도출.",
                    script: "float band = fbm(vUv * vec2(12.0, 0.5));\nfloat textureVariancy = band * 0.7 + scratch * 0.15;",
                },
                {
                    id: "v3",
                    url: "/curved-metal/3",
                    prompt: "\"카메라를 활용해서, 가장자리가 둥근 스테인리스 컵에 주변 환경 색이 비치는 걸 표현하고 싶어.\"\n\n평면 스크린 xy좌표를 원기둥(cylinder) 노멀 지오메트리로 역산하고 webrtc 비디오 텍스처를 웹캠 반사 벡터로 매핑.",
                    script: "vec2 videoUv = R.xy * 0.45 + 0.5;\nfloat cylZ = sqrt(max(1.0 - cylX * cylX, 0.0));",
                },
            ],
        },
        {
            title: "06 cd iridescence",
            versions: [
                {
                    id: "v1",
                    url: "/cd/1",
                    prompt: "\"Create an interactive web-based visual that simulates CD-like iridescence using light diffraction and interference. Use surface normal + view/light direction to compute angle and map to wavelength RGB.\"\n\n광학적 회절 간섭(Diffraction Interference) 이론 기반의 이방성 쉐이더(Anisotropic Shader)로 CD 뒷면의 무지갯빛 반사광을 시뮬레이션. 빛의 벡터(Light Dir), 카메라의 벡터(View), 그리고 마이크로 그루브의 둥근 접선(Radius Tangent) 방향 간의 내적(Dot product)을 통해 위상 차이를 계산하고, 이를 `cos()` 파동 함수로 맵핑하여 강렬한 스펙트럼 밴드를 절삭. 모바일(DeviceOrientation 자이로스코프)과 데스크탑(Mouse) 입력을 하나로 통합해 기기를 기울이거나 커서를 움직이면 물리적인 표면의 기울기와 조명 방향이 동시에 연동되는 리얼타임 AR 렌더링 구현.",
                    script: "vec3 localT = vec3(-localP.y, localP.x, 0.0) / dist;\nfloat u = dotLT - dotVT; ... spectralColor(w);",
                },
                {
                    id: "v2",
                    url: "/cd/2",
                    prompt: "\"The CD must have visible thickness (not a flat plane). Model it as a thin cylinder (disc with depth). Maintain correct aspect ratio regardless of screen size. The ENTIRE back surface should display iridescent colors continuously.\"\n\nThree.js의 `ExtrudeGeometry`를 활용해 실제 CD와 동일하게 구멍이 뚫린 입체 원판(Solid Disc)을 물리적으로 압출(Extrusion)하여 모델링했습니다. 카메라와 거리를 둔 원근(Perspective) 모델의 Z축을 역으로 뒤집어 유저가 항상 CD의 광원이 반사되는 뒷면(-Z)을 바라볼 수 있도록 기본 셋업을 강제했습니다. 표면의 z값을 감별해 측면의 링 형태에는 메탈 질감을 부여하고 뒷면에만 연속적인 회절 프리즘(Continuous Diffraction) 무지갯빛이 끊임없이 쪼개어지며 발광하도록 수식을 안전하게 클램핑(Clamp)하여 오류를 완벽히 해결했습니다.",
                    script: "float isBackFace = smoothstep(-0.015, -0.019, vLocalPos.z);\nvec3 finalColor = mix(silverMaterial, iridescenceMaterial, isBackFace);",
                },
                {
                    id: "v3",
                    url: "/cd/3",
                    prompt: "\"CD 크기를 조금 줄여주고, 좌우로도 움직였을 때 기울어지고 색 바뀌는 인터랙션 추가 + 배경흰색으로 변경, 그대신 CD 그림자 추가해서 v3로 수정\"\n\nCD의 전체적인 스케일을 콤팩트하게 조정하고, 마우스/자이로 X축 입력에 따른 Y축 회전 관성을 추가하여 좌우 기울기에서도 다이내믹한 무지갯빛 변화를 유도했습니다. 배경을 순백색(#fff)으로 전환하는 대신, 부유하는 CD 하단에 타원형의 방사형 그라데이션 그림자(Radial Shadow)를 동적으로 배치하여 화이트 캔버스상의 입체감과 물리적 존재감을 극대화했습니다.",
                    script: "meshRef.current.rotation.y = currentInput.current.x * maxTilt;\n// Shadow logic: 1.0 - Math.abs(input.y) * 0.1",
                },
                {
                    id: "v4",
                    url: "/cd/4",
                    prompt: "\"속에 있는 원에도 그림자 주고, 가장자리 원도 그림자 적용, 그리고 화면 가로 크기에 따라 interactiveg하게 크기 변하도록, 그리고 모바일에서는 자이로 센서 허용을 받아서, 핸드폰 실제 기울임에 따라 기울어지도록 v4로 업데이트\"\n\nCD의 중앙 홀(Hole)과 외곽 테두리에 각각 독립적인 이중 그림자(Dual Shadow) 시스템을 적용하여 디테일을 살렸습니다. `viewport.width`에 대응하는 반응형 스케일 로직을 통해 어떤 기기에서도 최적의 크기로 노출되며, 모바일 환경에서는 DeviceOrientation API 권한 획득 오버레이를 통해 실제 기기의 물리적 기울임과 1:1 동기화되는 실감 나는 물성 상호작용을 구현했습니다.",
                    script: "const cdScale = Math.min(viewport.width, viewport.height) * 0.28;\n// RequestGyroBanner Integration",
                },
            ],
        },
        {
            title: "07 shattered glass",
            activeInfo: {
                version: "v1",
                description: "깨진 유리 파편들이 화면을 뒤덮고 있으며, 각각의 파편은 큐비즘(Cubism) 예술처럼 카메라에 비친 모습을 서로 다른 각도와 시점으로 재구성하여 보여줍니다. 사용자의 움직임에 따라 파편들이 미세하게 반응하며 실시간으로 조각난 시각적 입체감을 유지합니다.",
            },
            versions: [
                {
                    id: "v1",
                    url: "/shattered/1",
                    prompt: "\"깨진유리가 화면 상에 쌓여있고, 거기에 카메라를 통해 큐비즘처럼 여러 각도에서 비춰지는 모습의 interaction 07로 만들어줘\"",
                    script: "float shardID = hash(cid);\nvec2 cubistUv = (vUv - 0.5) * shardZoom + shift * (shardID * 2.0 - 1.0);",
                },
                {
                    id: "v2",
                    url: "/shattered/2",
                    prompt: "\"깨진 거울처럼 보이질 않아서, 깨진 거울 조각들이 흰 화면에 집중되어서 모여있고, 거기서 생기는 각도에 따른 서로 다른 모습이 나오면 좋을 것 같아\"",
                    script: "float mask = smoothstep(0.5, 0.2, length(centeredP));\nif (shardID > mask * 1.5) discard;",
                },
                {
                    id: "v3",
                    url: "/shattered/3",
                    prompt: "\"사실적으로 유리가 깨진 모습, 유리조각이 퍼져있는 모습이거 레퍼런스 삼아서 흰 배경으로 해서 넣어줘\"",
                    script: "float radial = smoothstep(0.01, 0.0, abs(angle - rAngle));\nfloat concentric = smoothstep(0.02, 0.0, abs(dist - cDist));",
                },
            ],
        },
        {
            title: "08 soap bubbles",
            activeInfo: {
                version: "v1",
                description: "화면을 클릭하거나 드래그하면 영롱한 비눗방울들이 생성되어 공중으로 떠오릅니다. 비눗방울 표면에는 빛의 간섭 현상(Thin-film interference)에 의한 무지갯빛 오일 슬릭 효과가 실시간으로 일렁이며, 실제 비눗방울처럼 가볍게 흔들리다 사라지는 몽환적인 상호작용을 선사합니다.",
            },
            versions: [
                {
                    id: "v1",
                    url: "/bubbles/1",
                    prompt: "\"다음은 비눗방울... 그냥 마우스 커서로 생성해서 되는 인터랙션으로\"",
                    script: "const iris = iridescence(dot(vNormal, vViewDir) * thickness);",
                },
                {
                    id: "v2",
                    url: "/bubbles/2",
                    prompt: "\"이런 레퍼런스로 (드림이하고 영롱한 비눗방울 이미지)\"",
                    script: "vec3 highlights = vec3(1.0) * (spec1 * 1.2 + spec2 * 0.4);\nfloat wobble = sin(position.x * 4.0 + u_time * 2.0);",
                },
            ],
        },
        {
            title: "09 white vinyl",
            activeInfo: {
                version: "v1",
                description: "순백색의 얇은 플라스틱 비닐 소재로, 화면 위로 커서를 움직이면 비닐 특유의 날카로운 주름(Creases)들이 바스락거리며 실시간으로 생성됩니다. 빛을 강하게 반사하는 매끄러운 재질감과 겹겹이 접힌 주름들 사이의 명암 대비를 통해 비닐 특유의 바스락거리는 물성을 시각적으로 재현했습니다.",
            },
            versions: [
                {
                    id: "v1",
                    url: "/vinyl/1",
                    prompt: "\"흰색비닐 바스락거리는 효과로 09 만들어줘\"",
                    script: "folds = pow(1.0 - folds, 3.0);\ninteractScale.current += (speed * 5.0 - interactScale.current) * 0.1;",
                },
                {
                    id: "v2",
                    url: "/vinyl/2",
                    prompt: "\"interaction으로 사부작사부작할 수 있게, 실제 비닐처럼 인터랙션을 넣어줘\"",
                    script: "float grab = smoothstep(0.4, 0.0, distToMouse) * u_interact;\nvec2 displacedUv = uv + (uv - u_mouse) * grab * 0.15;",
                },
            ],
        },
        {
            title: "10 frosted glassmorphism",
            activeInfo: {
                version: "v1",
                description: "반투명하게 가공된 프로스티드 유리의 질감(Frosted Glass)을 시뮬레이션한 글래스모피즘(Glassmorphism) 상호작용입니다. 화면 뒤로 비치는 카메라 영상을 정교한 블러(Blur) 필터로 확산시키며, 마우스가 움직이는 지점만이 성에가 닦이듯 선명하게 보이게 하여 신비로운 공간감과 현대적인 UI 미학을 제공합니다.",
            },
            versions: [
                {
                    id: "v1",
                    url: "/frosted-glassmorphism/1",
                    prompt: "\"불투명? 반투명한 유리에 비춰지는 모습처럼 구현해줘 glassmorphism느낌으로 10번 새로운 인터랙션\"",
                    script: "float blurRadius = smoothstep(0.1, 0.4, dist) * 3.5;\ncolor = blur(u_videoTexture, uv, 1.0 + blurRadius);",
                },
            ],
        },
    ];

    const activeMaterial = activeMaterialTitle || materials[0].title;
    const activeMat = materials.find(m => m.title === activeMaterial);
    const activeVersion = activeMat?.versions[activeVersionIndex] || (activeMat ? activeMat.versions[activeMat.versions.length - 1] : null);

    const wheelRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    const versionWheelRef = useRef<HTMLDivElement>(null);
    const versionRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (wheelRef.current && itemRefs.current[0]) {
            wheelRef.current.scrollTop = itemRefs.current[0].offsetTop - 12; 
        }
    }, []);

    useEffect(() => {
        if (versionWheelRef.current && versionRefs.current[activeVersionIndex]) {
            versionWheelRef.current.scrollTop = versionRefs.current[activeVersionIndex]!.offsetTop - 12;
        }
    }, [activeMaterial, activeVersionIndex]);

    const handleScroll = () => {
        if (!wheelRef.current) return;
        const top = wheelRef.current.scrollTop;
        let closestIdx = 0;
        let minDiff = Infinity;
        materials.forEach((_, i) => {
            const item = itemRefs.current[i];
            if (!item) return;
            const diff = Math.abs(item.offsetTop - top - 12);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        });
        if (materials[closestIdx].title !== activeMaterial) {
            setActiveMaterialTitle(materials[closestIdx].title);
            setActiveVersionIndex(materials[closestIdx].versions.length - 1);
        }
    };

    const handleVersionScroll = () => {
        if (!versionWheelRef.current || !activeMat || activeMat.versions.length <= 1) return;
        const top = versionWheelRef.current.scrollTop;
        let closestIdx = 0;
        let minDiff = Infinity;
        activeMat.versions.forEach((_, i) => {
            const item = versionRefs.current[i];
            if (!item) return;
            const diff = Math.abs(item.offsetTop - top - 12);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        });
        if (closestIdx !== activeVersionIndex) {
            setActiveVersionIndex(closestIdx);
        }
    };

    return (
        <main className="h-full w-full flex flex-col overflow-hidden lowercase bg-[#f9f9f9]">
            {/* Top Panel: Control Area */}
            <div className="w-full h-[140px] md:h-[160px] flex-none bg-[#f9f9f9] border-b border-black/10 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-row z-20">
                
                {/* Left Control: Materials List */}
                <div className="flex-1 w-1/2 h-full relative border-r border-black/5">
                    <div className="absolute inset-0 p-6 lg:p-8 pb-0">
                        <div className="relative w-full h-full overflow-hidden text-[20px] lg:text-[24px] tracking-[-0.03em] leading-[1.1] font-medium text-black">
                            <div className="absolute bottom-0 left-0 w-full h-[40px] bg-gradient-to-t from-[#f9f9f9] to-transparent pointer-events-none z-30" />
                            
                            <div 
                                ref={wheelRef}
                                onScroll={handleScroll}
                                className="w-full h-full overflow-y-auto no-scrollbar snap-y snap-mandatory relative z-20"
                                style={{ scrollBehavior: 'smooth' }}
                            >
                                <div className="h-[12px]" />
                                {materials.map((mat, i) => {
                                    const match = mat.title.match(/^0?(\d+)\s+(.*)$/);
                                    const num = match ? parseInt(match[1]) : 0;
                                    const indicator = num > 0 ? String.fromCharCode(96 + num) + "." : "";
                                    const text = match ? match[2] : mat.title;
                                    const isActive = activeMaterial === mat.title;

                                    return (
                                        <div
                                            key={mat.title}
                                            ref={(el) => { itemRefs.current[i] = el; }}
                                            className={`flex items-start w-full py-2.5 lg:py-3 scroll-mt-[12px] snap-start transition-opacity duration-300 select-none cursor-pointer ${isActive ? "opacity-100" : "opacity-30"}`}
                                            onClick={() => {
                                                if (isActive) return;
                                                setActiveMaterialTitle(mat.title);
                                                setActiveVersionIndex(mat.versions.length - 1);
                                            }}
                                        >
                                            <span className="w-[1.2em] shrink-0 text-left">{indicator}</span>
                                            <p className="mb-0 flex-1 text-left">{text}</p>
                                        </div>
                                    );
                                })}
                                <div className="h-[100px] md:h-[120px]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Control: Version History */}
                <div className="flex-1 w-1/2 h-full relative">
                    <div className="absolute inset-0 p-6 lg:p-8 pb-0">
                        {activeMat && activeMat.versions.length > 1 ? (
                            <div className="relative w-full h-full overflow-hidden text-[16px] lg:text-[20px] tracking-widest font-medium text-black lowercase" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                                <div className="absolute bottom-0 left-0 w-full h-[40px] bg-gradient-to-t from-[#f9f9f9] to-transparent pointer-events-none z-30" />
                                
                                <div 
                                    ref={versionWheelRef}
                                    onScroll={handleVersionScroll}
                                    className="w-full h-full overflow-y-auto no-scrollbar snap-y snap-mandatory relative z-20"
                                    style={{ scrollBehavior: 'smooth' }}
                                >
                                    <div className="h-[12px]" />
                                    {activeMat.versions.map((ver, i) => {
                                        const isActive = activeVersionIndex === i;
                                        return (
                                            <div
                                                key={ver.id}
                                                ref={(el) => { versionRefs.current[i] = el; }}
                                                className={`flex items-start w-full py-2.5 lg:py-3 scroll-mt-[12px] snap-start transition-opacity duration-300 select-none cursor-pointer ${isActive ? "opacity-100" : "opacity-30"}`}
                                                onClick={() => {
                                                    if (isActive) return;
                                                    setActiveVersionIndex(i);
                                                }}
                                            >
                                                <p className="mb-0">{ver.id}</p>
                                            </div>
                                        );
                                    })}
                                    <div className="h-[100px] md:h-[120px]" />
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-start pt-[12px] opacity-30 text-[16px] lg:text-[20px] tracking-widest lowercase font-medium" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                                v1
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Panel: Main Content View */}
            <div className="flex-1 w-full bg-white relative flex flex-col z-10">
                <div className="flex-1 h-full overflow-y-auto no-scrollbar p-6 lg:p-12 relative flex justify-center">
                    <div className="w-full max-w-[800px] text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.3] text-black pb-32 font-medium">
                        {activeMat && activeVersion ? (
                            <div className="flex flex-col justify-start">
                                <div className="whitespace-pre-wrap">
                                    {renderMixedText(activeVersion.prompt)}
                                </div>
                                <div className="font-mono opacity-40 text-[14px] leading-[1.6] tracking-normal whitespace-pre-wrap mt-12 font-normal">
                                    {activeVersion.script}
                                </div>
                                <Link
                                    href={activeVersion.url}
                                    className="mt-16 sm:mt-24 inline-flex items-center gap-2 text-[14px] tracking-widest font-bold uppercase opacity-80 hover:opacity-100 transition-opacity"
                                >
                                    View Interaction
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                </Link>
                            </div>
                        ) : (
                            <div className="opacity-30 font-medium select-none">
                                choose a material
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
