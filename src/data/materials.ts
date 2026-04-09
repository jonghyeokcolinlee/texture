import { Material } from "../app/page";

export const materials: Material[] = [
    {
        title: "01 brushed steel",
        versions: [
            { id: "v1", url: "/steel/1", prompt: "\"줄눈이 있는 스테인리스 스틸로 줘. 금속이 너무 파래, 무채색 계열이었으면 좋겠고. 특정 빛 반사 물체만 아주 하얗게 비치게 끔.\"\n\nx축 1.0, y축 800.0 비율의 수평 고주파 노이즈로 텍스처를 조정하고, 루미넌스(luminance) 변환 및 국소적 스팟라이트 마스킹으로 극대비 반사 구현." },
            { id: "v2", url: "/steel/2", prompt: "\"너무 세로 빛만 살지 않고, 둥근 실린더 형태의 컵에 비친 왜곡된 모습이 빛과 함께 표시되었으면 좋겠어.\"\n\n스팟 마스크 제약을 해제하여 전면 실린더 곡률에 따른 환경 맵 풀 렌더링 유지 및 블러(blur) 감쇠 효과 추가." },
            { id: "v3", url: "/curved-metal/1", prompt: "\"브러시드 스테인리스 스틸(brushed stainless steel)의 기본 방향성 하이라이트를 구현해봐.\"\n\nuv 좌표계에 고주파 노이즈를 입혀 단일 스펙큘러 로브를 통한 선형 반사율을 구현." },
            { id: "v4", url: "/curved-metal/2", prompt: "\"조금 더 파도 같은 굴곡과 거칠고 높은 대비 형태의 질감으로 개선해.\"\n\n프랙탈 브라운 운동(fbm) 노이즈와 이중 스펙큘러를 합성하여 고대비 메탈릭 단면 도출." },
            { id: "v5", url: "/curved-metal/3", prompt: "\"카메라를 활용해서, 가장자리가 둥근 스테인리스 컵에 주변 환경 색이 비치는 걸 표현하고 싶어.\"\n\n평면 스크린 xy좌표를 원기둥(cylinder) 노멀 지오메트리로 역산하고 webrtc 비디오 텍스처를 웹캠 반사 벡터로 매핑." },
        ],
    },
    {
        title: "02 scattered puddle",
        versions: [
            { id: "v1", url: "/water/1", prompt: "\"가장 기본적인 water ripple surface 상호작용 형태를 구현해.\"\n\n2d 평면상 마우스 클릭 좌표와 시간 동기화 기반 둔감형 감쇠 삼각함수(sin)를 노멀에 맵핑." },
            { id: "v2", url: "/water/2", prompt: "\"하쉬한 조명과 매우 거칠고 대비가 센 반사율이 필요해.\"\n\n스무스스텝(smoothstep) 임계치를 높이고 fbm 텍스처를 곱해 높은 스펙큘러 글린트를 유도." },
            { id: "v3", url: "/water/3", prompt: "\"링이 튀는 외곽 형태를 없애고 주파수를 낮춰서 유기적으로 확산되도록.\"\n\n거리-시간 기반 감쇠 함수 적용 및 저주파수 노이즈 블렌딩 추가." },
            { id: "v4", url: "/water", prompt: "\"모바일 환경에서 너무 크게 보이는 문제를 해결하고, 파동의 끝이 어색하지 않게 잔잔하게 사라지게끔 수정.\"\n\n단말기 aspect ratio 좌표 보정 및 smoothstep을 활용한 파동 소멸 구간(timeFade) 페이드아웃 적용." },
            { id: "v5", url: "/water/5", prompt: "\"scattered puddle은 평소에 배경이 하얀색이다가, 물결 치는 부분이 조금 회색으로 바뀌는 걸로 수정되어야할 것 같아.\"\n\n완전한 형태의 화이트 캔버스(White Backgrond) 베이스로 쉐이더를 다시 짜고, 빛의 반사각(Normals)이 크게 틀어지는 파동(Wave) 부분에 한해 은은한 회색 그림자(Gray Shadow)와 흰색 스펙큘러로 깔끔하게 떨어지는 미니멀한 반사 효과를 부여." },
            { id: "v6", url: "/water/6", prompt: "\"scattered puddle 퍼져나갈 때 파동의 색감이 조금 더 옅었으면 좋겠고, 그리고 무채색으로 해서 채도를 0으로.\"\n\n파동이 일 때 생기는 빛 반사 그림자의 강도(Intensity)와 대비(Contrast)를 대폭 줄이고, 블루/그레이 톤이 섞여 있던 기존 음영에서 채도를 완벽하게 0으로 제거하여 매우 옅고 깨끗한 퓨어 모노톤 아키텍처(Pure Achromatic) 음영으로 다듬음." },
        ],
    },
    {
        title: "03 rgb drops",
        versions: [
            { id: "v1", url: "/rgb/1", prompt: "\"흰색 배경 위 물방울 렌즈 효과 적용. RGB 확대 굴절 표현. 드래그 기반 인터랙션 구현.\"\n\n임시 캔버스(Canvas API)를 활용하여 마우스 궤적에 따라 물방울(반경과 그라데이션)을 텍스처로 그리고, 단편 쉐이더(Fragment Shader)에서 이 높이 맵(Height map)의 편미분을 통해 물방울의 노멀과 피사계 심도를 계산하여 하단에 깔린 LCD 서브픽셀 패턴(RGB Strip)을 굴절 및 확대(Magnification)시킴." },
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
            { id: "v19", url: "/rgb/19", prompt: "\"RGB 입자 크기 확대. 랜덤 위치 기반 가장자리 분포 적용.\"\n\nRGB 픽셀 연산 스케일이라도 극단적으로 줄여 입자 크기를 키우고, 3D 노이즈를 활용하여 특정 방향이 아닌 랜덤한 가장자리에 RGB가 분포되도록 변경." },
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
        title: "05 glass brick",
        versions: [
            { id: "v1", url: "/glass-brick/1", prompt: "\"웹캠 화면 위에 투명한 사각 유리 블록들이 쌓여있는 효과. 마우스를 올리면 블록이 볼록렌즈처럼 왜곡되고, 꾹 누르면 오목하게 눌리는 느낌을 줘.\"\n\n웹캠 스트림 비디오 텍스처를 15겹의 모자이크 타일로 분할(Segmentation)한 뒤, 타일별로 무작위 오프셋(Refraction), 색수차(CA), 다중 탭 방식의 흐림 효과(Blur)를 주어 유리 블록을 모사한 쉐이더. 호버/클릭 시 물리적으로 타일이 확대(Zoom)/축소되며 빛의 굴절이 즉각적으로 변하는 상호작용 구현." },
            { id: "v2", url: "/glass-brick/2", prompt: "\"유리 블록의 굴절을 더 강하게 하고, 타일 사이의 경계선을 더 명확하게 표현해줘.\"\n\n타일 경계면에 미세한 노멀 오프셋을 추가하여 빛이 더 복잡하게 굴절되도록 하고, 가장자리 어두운 음영(Groove) 색상을 강조하여 그리드 패턴의 가독성을 향상." },
            { id: "v3", url: "/glass-brick/3", prompt: "\"전체적인 색감을 차갑고 투명하게 조정하고, 웹캠 화면이 유리 블록의 질감에 더 어우러지게끔 블렌딩해줘.\"\n\n블루 톤의 틴트(Tint)를 추가하고 루미넌스 기반의 마스킹을 통해 밝은 영역의 투명도를 높여 청량하고 투명한 유리 질감 완성." },
        ],
    },
    {
        title: "06 cd iridescence",
        versions: [
            { id: "v1", url: "/cd/1", prompt: "\"Create an interactive web-based visual that simulates CD-like iridescence using light diffraction and interference. Use surface normal + view/light direction to compute angle and map to wavelength RGB.\"\n\n광학적 회절 간섭(Diffraction Interference) 이론 기반의 이방성 쉐이더(Anisotropic Shader)로 CD 뒷면의 무지갯빛 반사광을 시뮬레이션." },
            { id: "v2", url: "/cd/2", prompt: "\"The CD must have visible thickness (not a flat plane). Model it as a thin cylinder (disc with depth). Maintain correct aspect ratio regardless of screen size.\"\n\nThree.js의 `ExtrudeGeometry`를 활용해 실제 CD와 동일하게 구멍이 뚫린 입체 원판(Solid Disc)을 물리적으로 압출하여 모델링." },
            { id: "v3", url: "/cd/3", prompt: "\"CD 크기를 조금 줄여주고, 좌우로도 움직였을 때 기울어지고 색 바뀌는 인터랙션 추가 + 배경흰색으로 변경, 그대신 CD 그림자 추가.\"\n\nCD의 전체적인 스케일을 콤팩트하게 조정하고, 마우스/자이로 X축 입력에 따른 Y축 회전 관성을 추가하여 좌우 기울기에서도 다이내믹한 무지갯빛 변화를 유도." },
            { id: "v4", url: "/cd/4", prompt: "\"속에 있는 원에도 그림자 주고, 가장자리 원도 그림자 적용, 그리고 화면 가로 크기에 따라 반응형으로 크기 변하도록.\"\n\nCD의 중앙 홀(Hole)과 외곽 테두리에 각각 독립적인 이중 그림자(Dual Shadow) 시스템을 적용하고 반응형 스케일 로직을 구현." },
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
