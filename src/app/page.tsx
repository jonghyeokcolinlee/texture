"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

type HoverData = {
    id: string;
    url: string;
    prompt: string;
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
    const materials = [
        {
            title: "01 brushed steel",
            versions: [
                { id: "v1", url: "/steel/1", prompt: "\"줄눈이 있는 스테인리스 재질 적용. 색상은 무채색 계열로 제한. 과도한 청색 제거. 특정 반사 영역만 강한 백색 하이라이트로 표현.\"\n\nx축 1.0, y축 800.0 비율의 수평 고주파 노이즈로 텍스처를 조정하고, 루미넌스(luminance) 변환 및 국소적 스팟라이트 마스킹으로 극대비 반사 구현." },
                { id: "v2", url: "/steel/2", prompt: "\"세로 방향 반사 완화. 실린더 형태 왜곡 반사 적용. 곡면 기반 환경 반사 강조.\"\n\n스팟 마스크 제약을 해제하여 전면 실린더 곡률에 따른 환경 맵 풀 렌더링 유지 및 블러(blur) 감쇠 효과 추가." },
            ],
        },
        {
            title: "02 scattered puddle",
            versions: [
                { id: "v1", url: "/water/1", prompt: "\"기본적인 water ripple 인터랙션 구현.\"\n\n2d 평면상 마우스 클릭 좌표와 시간 동기화 기반 둔감형 감쇠 삼각함수(sin)를 노멀에 맵핑." },
                { id: "v2", url: "/water/2", prompt: "\"강한 조명 조건 적용. 높은 대비의 거친 반사율 설정.\"\n\n스무스스텝(smoothstep) 임계치를 높이고 fbm 텍스처를 곱해 높은 스펙큘러 글린트를 유도." },
                { id: "v3", url: "/water/3", prompt: "\"외곽 링 형태 제거. 저주파 기반 확산 구조로 변경.\"\n\n거리-시간 기반 감쇠 함수 적용 및 저주파수 노이즈 블렌딩 추가." },
                { id: "v4", url: "/water", prompt: "\"모바일 스케일 문제 보정. 파동 후반부 자연스럽게 처리.\"\n\n단말기 aspect ratio 좌표 보정 및 smoothstep을 활용한 파동 소멸 구간(timeFade) 페이드아웃 적용." },
                { id: "v5", url: "/water/5", prompt: "\"기본 배경을 화이트로 유지. 파동 영역에 한해 옅은 회색 음영 적용.\"\n\n완전한 형태의 화이트 캔버스(White Backgrond) 베이스로 쉐이더를 다시 짜고, 빛의 반사각(Normals)이 크게 틀어지는 파동(Wave) 부분에 한해 은은한 회색 그림자(Gray Shadow)와 흰색 스펙큘러로 깔끔하게 떨어지는 미니멀한 반사 효과를 부여." },
                { id: "v6", url: "/water/6", prompt: "\"파동 색감을 전체적으로 약화. 완전 무채색 처리.\"\n\n파동이 일 때 생기는 빛 반사 그림자의 강도(Intensity)와 대비(Contrast)를 대폭 줄이고, 블루/그레이 톤이 섞여 있던 기존 음영에서 채도를 완벽하게 0으로 제거하여 매우 옅고 깨끗한 퓨어 모노톤 아키텍처(Pure Achromatic) 음영으로 다듬음." },
            ],
        },
        {
            title: "03 rgb drops",
            versions: [
                { id: "v1", url: "/rgb/1", prompt: "\"화이트 배경 위 물방울 렌즈 효과 적용. RGB 확대 굴절 표현. 드래그 기반 인터랙션 구현.\"\n\n임시 캔버스(Canvas API)를 활용하여 마우스 궤적에 따라 물방울(반경과 그라데이션)을 텍스처로 그리고, 단편 쉐이더(Fragment Shader)에서 이 높이 맵(Height map)의 편미분을 통해 물방울의 노멀과 피사계 심도를 계산하여 하단에 깔린 LCD 서브픽셀 패턴(RGB Strip)을 굴절 및 확대(Magnification)시킴." },
                { id: "v2", url: "/rgb/2", prompt: "\"노이즈 제거. 모래 질감 제거. 매끄러운 투명 물방울 형태로 수정.\"\n\n캔버스 텍스처에서 발생하던 노이즈(모래알 현상)를 없애기 위해 수학적으로 완벽한 형태의 3D 반구(Hemisphere) 방정식을 사용해 표면 장력을 모사하고 투명하고 매끄러운 굴절을 구현. RGB 서브픽셀 또한 Sine 파형으로 대체해 안티에일리어싱(Anti-aliasing) 처리 완료." },
                { id: "v3", url: "/rgb/3", prompt: "\"gooey 결합 효과 적용. 물방울 개수 제한 제거. 증발 유지.\"\n\n임시 캔버스(FBO)를 다시 도입하여 무제한 갯수의 물방울 생성을 지원하고, 캔버스의 Additive Blending(lighter)과 쉐이더의 smoothstep을 결합해 가까이 있는 물방울끼리 스르륵 합쳐지는 메타볼(Gooey) 표면 장력 효과를 구현." },
                { id: "v4", url: "/rgb/4", prompt: "\"RGB 표현을 가장자리 중심으로 제한. 작은 물방울은 전체 적용. 압력 기반 크기 변화 추가.\"\n\n물방울의 곡률(Slope, 편미분 벡터의 길이)을 계산하여 곡률이 가파른 가장자리나 작은 물방울에서만 RGB가 굴절되게 보이도록 visibility를 조절. 사용자가 마우스를 누르고 있는 시간(Pressure / Hold Time)을 추적해 requestAnimationFrame 내에서 브러시 크기를 키워 거대한 물방울 웅덩이가 만들어지도록 인터랙션 고도화." },
                { id: "v5", url: "/rgb/5", prompt: "\"비정형 물방울 형태 적용. 균일 패턴 제거. 불규칙 RGB 덩어리 구조 적용.\"\n\n정원형 물방울 텍스처를 읽어올 때 2D Simplex 노이즈로 UV를 뒤틀어(Warping) 매우 불규칙적인 비정형 물방울 형태 생성. 렌즈 굴절 시 RGB 채널별로 오프셋을 다르게 주는 색수차(Chromatic Aberration)와 패치 노이즈(Patch Noise) 마스킹을 결합해 일정하지 않고 덩어리진 픽셀 무지개 반사가 나타나도록 고도화." },
                { id: "v6", url: "/rgb/6", prompt: "\"자체 이동 제거. 중앙 RGB 과도 노출 억제.\"\n\n물방울이 끓잡듯이 스스로 움직이던 애니메이션(u_time)을 제거하고 고정된 비정형 형태(Static Noise)로 안정화. 큰 물웅덩이의 중앙(가장 깊고 평평한 곳)을 높이값(height > 0.8)으로 감지하여 강제로 RGB 굴절을 없앰으로써, 큰 웅덩이는 가운데가 깨끗하고 가장자리만 무지개빛이 맺히도록 구조를 개선." },
                { id: "v7", url: "/rgb/7", prompt: "\"드래그 페인팅 제거. 클릭 기반 스플래터 생성 방식으로 변경.\"\n\n드래그 시 펜처럼 물이 칠해지던 인터랙션(PointerMove)을 폐기. 대신 한 번 클릭(PointerDown)할 때마다 클릭한 지점을 중심으로 거대한 중심 물방울과 사방으로 튀어오르는 수십 개의 작은 물방울 스플래터(Splatter)들이 방사형으로 동시에 튀겨지도록 로직 전면 개편." },
                { id: "v8", url: "/rgb/8", prompt: "\"물방울 확산 범위 축소. RGB 확대 비율 증가.\"\n\n스플래터(튀기는 물방울)들의 산포 반경(Scatter radius)을 대폭 줄여 깔끔하게 밀집된 웅덩이를 형성. 현실적 재현보다는 인터랙션의 시각적 명확성을 높이기 위해, RGB 서브픽셀의 시각적 크기를 두 배 이상 확대하고 굴절 강도(Refraction Offset) 또한 공격적으로 높여 매우 도드라지고 강렬한 색수차 렌즈 효과를 연출." },
                { id: "v9", url: "/rgb/9", prompt: "\"RGB 크기 소폭 확대. 색감 강화.\"\n\nRGB 픽셀 스케일 배수를 줄여(`0.020`) 입자를 이전보다 더 큼지막하게 확대하고, 색수차 굴절값을 극한으로 밀어붙여(`distR = 0.4`, `distB = 0.1`) 가장자리에 강렬한 빨/초/파 무지개 띠가 생성되도록 조정. 또한 그림자/명암 대비를 낮추고 색상 채도(Saturation)를 대폭 끌어올려 전체적으로 물방울 안이 무지개빛으로 꽉 찬 알록달록한 커스텀 렌즈 이펙트 구현." },
                { id: "v10", url: "/rgb/10", prompt: "\"중앙 대형 물방울 + 주변 스플래터 구조 적용. RGB 확대 강화.\"\n\n스플래터(Splatter) 로직 중앙에 반경이 압도적으로 큰 커다란 메인 물방울(Blob) 하나를 무조건 생성하도록 구조를 개편하고, 쉐이더의 RGB 서브픽셀 확대 스케일을 `0.010`으로 극한값까지 키워 작은 픽셀도 돋보기처럼 큼지막하게 굴절되어 보이게끔 렌즈 효과를 고도화." },
                { id: "v11", url: "/rgb/11", prompt: "\"물방울 색상 탁도 복원. 퍼지는 애니메이션 자연스럽게 개선.\"\n\n물방울이 생성될 때 캔버스 상에서 목표 반경(target radius)까지 점진적으로 뻗어나가는 선형 보간(Lerp) 기반의 동적 팽창 애니메이션을 구현하여, 클릭 직후 액체가 촥! 퍼져나가는 물리적 느낌을 제공. 물방울 렌즈 중앙은 맑은 순백색 대신 vec3(0.86, 0.88, 0.90)의 탁한 블루/그레이 톤으로 블렌딩하여 주변 하얀 배경과 대비되는 물방울 특유의 톤다운된 탁한 질감 복구." },
                { id: "v12", url: "/rgb/12", prompt: "\"반사광 추가. 증발 및 수축 효과 적용.\"\n\n환경광을 모사하는 보조 스팟라이트와 프레넬 반사광(Fresnel Glint)을 추가하여 표면의 매끄러운 찰랑거림을 극대화. 캔버스의 증발 로직과 그라데이션 알파 값을 조절하여(Opacity fade), 웅덩이 가장자리가 빠르게 마르며 점점 안쪽으로 쪼그라드는 물리적인 증발 효과(Shrinking)를 완벽하게 모사." },
                { id: "v13", url: "/rgb/13", prompt: "\"v9 상태로 롤백. 순차적 수축 기반 증발 적용.\"\n\nv9의 알록달록하고 극단적인 색수차, 고정형 스플래터 로직으로 완전히 롤백(Rollback)한 뒤, 물파장 캔버스의 감쇠(Fade) 로직과 방사형 알파 그라데이션(Radial gradient) 구조를 선형적으로 튜닝. 이를 통해 캔버스의 픽셀이 증발할 때 외곽에서 중앙으로 서서히 알파가 제거되며 오래된 물방울일수록 순차적으로 크기가 줄어들다 소멸하는(Sequential Shrinking) 완벽한 증발 효과를 재수립." },
                { id: "v14", url: "/rgb/14", prompt: "\"v9 코드 완전 복원. 일정 시간 후 증발 트리거 적용.\"\n\nv9의 스타일뿐만 아니라 코드를 100% 동일하게 복원한 후, 캔버스 그리기 로직을 완전히 재설계. 물방울 객체의 생성 시간(birth)을 추적하여 일정 시간(1.5초) 동안은 온전한 전성기를 유지하고, 그 이후에만 크기가 물리적으로 쪼그라들면서(shrink) 증발하는 타이머 애니메이션을 구현." },
                { id: "v15", url: "/rgb/15", prompt: "\"증발 지연 시간 증가. 소멸 곡선 부드럽게 조정.\"\n\n물방울이 온전한 형태를 유지하는 대기 시간(Delay)을 1.5초에서 2.5초로 넉넉하게 늘려주어 감상할 시간을 확보. 또한 증발 애니메이션에 딱딱한 거듭제곱 감쇠 대신 부드러운 곡선(Ease-Out 곡선)을 추가 도입하여, 서서히 쪼그라들며 투명해지는 형태 왜곡이 훨씬 자연스럽게 이루어지도록 튜닝." },
                { id: "v16", url: "/rgb/16", prompt: "\"RGB 표현 규모 확대. 가장자리 중심 색수차 표현 유지.\"\n\n제공된 이미지를 철저히 분석하여 색수차와 빛의 굴절 매커니즘을 새롭게 짰습니다. 캔버스에 닿는 물방울의 수직 단면을 완벽한 평면 고원(Plateau)으로 깎아내 중앙부에는 전혀 왜곡 없이 투명한 순백색 코어가 유지되도록 하고, 가장자리의 급격한 경사에만 방사형 빛 연산을 구해서 RGB 서브픽셀 굴절이 맺히도록 구조를 완전히 분리했습니다." },
                { id: "v17", url: "/rgb/17", prompt: "\"그림자 대비 감소. RGB 입자 크기 확대. 물방울 색상 연회색으로 조정.\"\n\n레퍼런스 이미지의 미묘한 톤 앤 매너를 완벽하게 모사하기 위해 다음과 같이 튜닝했습니다: 픽셀 덩어리 확대, 그림자 대비 감소, 물방울 코어를 옅은 회색으로 조정하여 배경과 구분되는 체적 구현." },
                { id: "v18", url: "/rgb/18", prompt: "\"RGB 두께 증가. 가장자리 영역 확장.\"\n\n경사면의 너비와 캔버스의 Gradient 알파값을 넓게 분산시켜 RGB 블록이 올라탈 수 있는 모서리 두께를 확장하고, 색수차 채널 간 간격을 확대하여 두껍고 강한 RGB 띠를 형성." },
                { id: "v19", url: "/rgb/19", prompt: "\"RGB 입자 크기 확대. 랜덤 위치 기반 가장자리 분포 적용.\"\n\nRGB 픽셀 연산 스케일을 극단적으로 줄여 입자 크기를 키우고, 3D 노이즈를 활용하여 특정 방향이 아닌 랜덤한 가장자리에 RGB가 분포되도록 변경." },
            ],
        },
        {
            title: "04 frosted glass",
            versions: [
                { id: "v1", url: "/frost/1", prompt: "\"성에 낀 거울 표현. 마우스 드래그로 제거 인터랙션 구현.\"\n\n웹캠 피드(Webcam Feed) 위에 하얗게 얼어붙은 성에(Frost) 레이어를 덮고 9-tap 노이즈 블러(Noise Blur)로 시야를 흐림. 사용자가 드래그한 궤적에 따라 임시 캔버스에 지워진 영역이 기록되며, 이 가장자리의 편미분(Derivative)을 계산해 물기가 맺힌 듯한 물방울 굴절(Refraction)과 스펙큘러 엣지(Specular Edge)를 구현. 지워진 성에는 시간이 지남에 따라 천천히 다시 복원(Healing)." },
                { id: "v2", url: "/frost/2", prompt: "\"손가락 인식 기반 제거 인터랙션 적용. 성에 복원 로직 안정화.\"\n\nGoogle MediaPipe의 HandLandmarker AI 모델을 씬(Scene)에 결합하여 카메라 피드 내 손가락 랜드마크(Index Finger)를 실시간으로 추적. 거울 모드에 맞게 좌표를 반전(Mirroring)하여 실제 손가락을 움직이면 성에가 물리적으로 닦이는 직관적 AR 인터랙션을 구현. 또한 닦인 캔버스가 다시 서서히 얼어붙는 복원 알고리즘을 추가하여 지속적인 상호작용 유도." },
            ],
        },
        {
            title: "06 cd iridescence",
            versions: [
                { id: "v4", url: "/cd/4", prompt: "\"중앙 및 외곽 그림자 적용. 반응형 크기 조정. 모바일 자이로 인터랙션 추가.\"\n\nCD의 중앙 홀(Hole)과 외곽 테두리에 각각 독립적인 이중 그림자(Dual Shadow) 시스템을 적용하여 디테일을 살렸습니다. `viewport.width`에 대응하는 반응형 스케일 로직을 통해 어떤 기기에서도 최적의 크기로 노출되며, 모바일 환경에서는 DeviceOrientation API 권한 획득 오버레이를 통해 실제 기기의 물리적 기울임과 1:1 동기화되는 실감 나는 물성 상호작용을 구현했습니다." },
            ],
        },
        {
            title: "07 shattered glass",
            versions: [
                { id: "v1", url: "/shattered/1", prompt: "\"깨진 유리 레이어 구성. 다중 시점 반사 인터랙션 적용.\"\n\nfloat shardID = hash(cid);\nvec2 cubistUv = (vUv - 0.5) * shardZoom + shift * (shardID * 2.0 - 1.0);" },
                { id: "v2", url: "/shattered/2", prompt: "\"중앙 집중형 거울 파편 구성. 각도별 반사 차이 강조.\"\n\nfloat mask = smoothstep(0.5, 0.2, length(centeredP));\nif (shardID > mask * 1.5) discard;" },
                { id: "v3", url: "/shattered/3", prompt: "\"현실적인 파편 분산 구조 적용. 화이트 배경 기반 구성.\"\n\nfloat radial = smoothstep(0.01, 0.0, abs(angle - rAngle));\nfloat concentric = smoothstep(0.02, 0.0, abs(dist - cDist));" },
            ],
        },
        {
            title: "08 soap bubbles",
            versions: [
                { id: "v1", url: "/bubbles/1", prompt: "\"마우스 기반 생성형 비눗방울 인터랙션 구현.\"\n\nconst iris = iridescence(dot(vNormal, vViewDir) * thickness);" },
                { id: "v2", url: "/bubbles/2", prompt: "\"레퍼런스 기반 드림형 비눗방울 질감 적용.\"\n\nvec3 highlights = vec3(1.0) * (spec1 * 1.2 + spec2 * 0.4);\nfloat wobble = sin(position.x * 4.0 + u_time * 2.0);" },
            ],
        },
        {
            title: "09 white vinyl",
            versions: [
                { id: "v1", url: "/vinyl/1", prompt: "\"흰색 비닐 질감 구현. 바스락거림 표현.\"\n\nfolds = pow(1.0 - folds, 3.0);\ninteractScale.current += (speed * 5.0 - interactScale.current) * 0.1;" },
                { id: "v2", url: "/vinyl/2", prompt: "\"인터랙션 기반 변형 추가. 실제 비닐 거동 반영.\"\n\nfloat grab = smoothstep(0.4, 0.0, distToMouse) * u_interact;\nvec2 displacedUv = uv + (uv - u_mouse) * grab * 0.15;" },
            ],
        },
        {
            title: "10 frosted glassmorphism",
            versions: [
                { id: "v1", url: "/frosted-glassmorphism/1", prompt: "\"반투명 유리 질감 적용. glassmorphism 스타일 인터랙션 구현.\"\n\nfloat blurRadius = smoothstep(0.1, 0.4, dist) * 3.5;\ncolor = blur(u_videoTexture, uv, 1.0 + blurRadius);" },
            ],
        },
    ];

    const [activeMaterialTitle, setActiveMaterialTitle] = useState<string>(materials[0].title);
    const [previewMaterialTitle, setPreviewMaterialTitle] = useState<string | null>(null);
    const [activeVersionIndex, setActiveVersionIndex] = useState<number>(materials[0].versions.length - 1);
    const [isInitialized, setIsInitialized] = useState(false);

    const wheelRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Save state to sessionStorage
    useEffect(() => {
        if (!isInitialized) return;
        const state = {
            title: activeMaterialTitle,
            version: activeVersionIndex,
        };
        sessionStorage.setItem('texture_archive_state', JSON.stringify(state));
    }, [activeMaterialTitle, activeVersionIndex, isInitialized]);

    // State restoration and saving is handled by separate effects and the unified handleScroll later in the component.

    // Restore state from sessionStorage
    useEffect(() => {
        const savedState = sessionStorage.getItem('texture_archive_state');
        const savedScroll = sessionStorage.getItem('texture_archive_scroll');
        
        if (savedState) {
            try {
                const { title, version } = JSON.parse(savedState);
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

        if (savedScroll && wheelRef.current) {
            const scrollTop = parseInt(savedScroll, 10);
            if (!isNaN(scrollTop)) {
                requestAnimationFrame(() => {
                    if (wheelRef.current) {
                        wheelRef.current.scrollTop = scrollTop;
                    }
                });
            }
        }
        
        setIsInitialized(true);
    }, []);

    const displayMaterialTitle = previewMaterialTitle || activeMaterialTitle;
    const activeMat = materials.find(m => m.title === displayMaterialTitle) || materials[0];
    const activeVersion = activeMat.versions[activeVersionIndex] || activeMat.versions[0];

    useEffect(() => {
        if (wheelRef.current && itemRefs.current[0] && !isInitialized) {
            const container = wheelRef.current;
            container.scrollTop = 0;
        }
    }, [activeMaterialTitle, isInitialized]);

    const handleScroll = (e?: React.UIEvent<HTMLDivElement>) => {
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
            setActiveVersionIndex(materials[closestIdx].versions.length - 1);
        }
    };

    return (
        <main className="h-screen w-screen bg-white flex flex-col md:flex-row overflow-hidden lowercase md:p-6 lg:p-10 gap-0 md:gap-24 lg:gap-40">
            <div className="flex-none md:w-[22%] h-[180px] md:h-full px-4 md:px-0 bg-white relative flex flex-col overflow-hidden">
                <div className="w-full py-1 text-black select-none flex-none bg-white z-30 text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.1] indent-[1.8em] font-medium">
                    textures
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
                    <div className="w-full py-1 text-black select-none flex-none bg-white z-40 text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.1] font-medium flex items-center">
                        <span className="indent-[1.8em]">prompt </span>
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
                                                <div key={i} className={`indent-0 ${i === 0 ? "opacity-100" : "opacity-30"} whitespace-pre-wrap break-keep`}>
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


            </div>
        </main>
    );
}
