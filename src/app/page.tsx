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
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ "01 brushed steel": true, "02 scattered puddle": true, "03 crumpled tissue": true, "04 shattered glass": true, "05 rgb drops": true, "06 gooey dripping": true, "07 frosted glass": true, "08 curved metal reflection": true });

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
                    prompt: "\"아니 v13을 아예 v9버전의 스타일과 코드로 똑같이 rollback해주고, 거기에 이제 물방울이 생성된 이후, 일정 시간이 지나면 증발하는 효과를 줘.\"\n\nv9의 스타일뿐만 아니라 코드를 100% 동일하게 복원한 후, 캔버스 그리기 로직을 완전히 재설계. 물방울 객체의 생성 시간(birth)을 추적하여 **일정 시간(1.5초) 동안은 온전한 크기를 유지하고, 그 이후에만 크기가 물리적으로 쪼그라들면서(shrink) 증발하는 타이머 기반 애니메이션**을 구현.",
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
                {
                    id: "v2",
                    url: "/frost/2",
                    prompt: "\"현재 버전에서 카메라를 통해 사용자의 검지 손가락을 인식해서 직관적으로 성에를 닦을 수 있도록 해줘. 그리고 시간이 지나면 다시 성에가 끼는 복원 효과도 제대로 동작하게 해줘.\"\n\nGoogle MediaPipe의 HandLandmarker AI 모델을 씬(Scene)에 결합하여 카메라 피드 내 손가락 랜드마크(Index Finger)를 실시간으로 추적. 거울 모드에 맞게 좌표를 반전(Mirroring)하여 실제 손가락을 움직이면 성에가 물리적으로 닦이는 직관적 AR 인터랙션을 구현. 또한 닦인 캔버스 픽셀을 미세한 투명도로 매 프레임 재색칠하여, 물기가 마르며 다시 성에가 천천히 끼어드는 Time-based Healing 효과를 견고하게 유지.",
                    script: "const wipePos = new THREE.Vector2(1.0 - indexFinger.x, indexFinger.y);\napplyWipe(wipePos, 1.5);",
                },
            ],
        },
        {
            title: "08 curved metal reflection",
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
            title: "09 glass brick wall",
            versions: [
                {
                    id: "v1",
                    url: "/glassgrid/1",
                    prompt: "\"웹캠 화면 위에 투명한 사각 유리 블록들이 쌓여있는 효과. 마우스를 올리면 블록이 볼록렌즈처럼 왜곡되고, 꾹 누르면 오목하게 눌리는 느낌을 줘.\"\n\n웹캠 스트림 비디오 텍스처를 15겹의 모자이크 타일로 분할(Segmentation)한 뒤, 타일별로 무작위 오프셋(Refraction), 색수차(CA), 다중 탭 방식의 흐림 효과(Blur)를 주어 유리 블록을 모사한 쉐이더. 호버/클릭 시 물리적으로 타일이 확대(Zoom)/축소되며 빛의 굴절이 즉각적으로 변하는 상호작용 구현.",
                    script: "vec2 tileCenterAspect = (gridId + 0.5) / tiles;\nvec2 sampleUv = tileCenter + (vUv - tileCenter) * zoom;",
                },
                {
                    id: "v2",
                    url: "/glassgrid/2",
                    prompt: "\"전체 화면이 하얗게 나오는 버그 수정 (웹캠 로드 및 Fallback 지원). 카메라 텍스처를 화면 비율에 맞춰 강제로 늘리지 말고 Object-fit: contain 처럼 비율을 유지하게끔 해줘.\"\n\n웹캠 로딩 안정성을 개선하고, 카메라 권한 거부 시 예비 추상 캔버스(Fallback Gradient)를 로드하여 빈 화면 현상을 완벽 차단. 텍스처 원본 종횡비(Aspect ratio)에 맞춰 3D 평면 메쉬 크기를 스스로 재계산하는 Object-fit Contain 로직을 브라우저 리사이징 시에도 실시간으로 대응하도록 구축.",
                    script: "planeW = viewport.width; planeH = planeW / texAspect;\ncolor = pow(color, vec3(0.9));",
                },
                {
                    id: "v3",
                    url: "/glassgrid/3",
                    prompt: "\"Glass Block은 이런 interaction을 말한거야 (실제 유리 벽돌 텍스처 레퍼런스 이미지 제공).\"\n\n프랙탈 브라운 운동(FBM) 노이즈를 각 타일별로 독립 계산하여, 실제 주조된 유리 벽돌 내부에 생기는 물결처럼 구불구불한 굴절(Wavy Internal Normal)을 정밀하게 모사. 또한 벽돌 사이사이를 채우는 짙고 두꺼운 시멘트 줄눈(Mortar)과, 유리 모서리에 빛이 맺히는 강력한 스펙큘러 하이라이트(Glint)를 더해 실사에 가까운 질감을 구현.",
                    script: "vec2 internalNormal = vec2(hx - h, hy - h) * 2.0;\ncolor = mix(color, mortarColor, isMortar);",
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
