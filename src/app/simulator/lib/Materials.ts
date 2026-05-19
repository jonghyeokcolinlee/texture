import { Surface } from './Physics';
import * as THREE from 'three';

export interface MaterialDefinition {
  name: string;
  description: string;
  roughness: number;
  reflectivity: number;
  transparency: number;
  ior: number;
  color: string;
}

// ===== 6가지 재료 정의 =====
// 각 재료는 실제 물리 성질을 바탕으로 함

export const MATERIALS: Record<string, MaterialDefinition> = {
  polishedMetal: {
    name: '01 polished metal',
    description: '거울처럼 반사하는 금속',
    roughness: 0.05,      // 매우 매끈함
    reflectivity: 0.95,   // 대부분 반사
    transparency: 0.0,
    ior: 2.0,
    color: '#b0b0b0',
  },

  brushedAluminum: {
    name: '02 brushed aluminum',
    description: '방향성 스트림이 있는 금속',
    roughness: 0.6,       // 상당히 거침
    reflectivity: 0.75,   // 중간 정도 반사
    transparency: 0.0,
    ior: 1.5,
    color: '#a8a8a8',
  },

  matte: {
    name: '03 matte plastic',
    description: '무광택의 확산 반사',
    roughness: 0.8,       // 매우 거침
    reflectivity: 0.5,    // 반사 약함
    transparency: 0.0,
    ior: 1.0,
    color: '#808080',
  },

  acrylic: {
    name: '04 acrylic',
    description: '투명한 플라스틱 (일부 투과)',
    roughness: 0.1,       // 표면은 매끈함
    reflectivity: 0.1,    // 투과 강조
    transparency: 0.85,   // 대부분 투과
    ior: 1.49,
    color: '#e8f4f8',
  },

  roughPaper: {
    name: '05 rough paper',
    description: '종이처럼 무작위 산란',
    roughness: 0.9,       // 극도로 거침
    reflectivity: 0.3,    // 약한 반사
    transparency: 0.05,   // 거의 투과 안 함
    ior: 1.0,
    color: '#d4d4c8',
  },

  fabric: {
    name: '06 fabric',
    description: '직물의 복합 산란',
    roughness: 0.95,      // 극도로 거침
    reflectivity: 0.2,    // 약한 반사
    transparency: 0.05,   // 거의 투과 안 함
    ior: 1.2,
    color: '#909080',
  },
};

// ===== Surface 객체 생성 =====
export function createSurface(
  material: MaterialDefinition,
  position: THREE.Vector3 = new THREE.Vector3(0, 0, -2),
  normal: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
): Surface {
  return {
    position,
    normal: normal.normalize(),
    roughness: material.roughness,
    reflectivity: material.reflectivity,
    transparency: material.transparency,
    ior: material.ior,
  };
}

// ===== 과학적 배경 설명 =====
export const MATERIAL_EXPLANATIONS: Record<string, string> = {
  polishedMetal: `
    Polished Metal (광택 금속)

    물리 원리:
    • Specular Reflection: 거울처럼 정방향 반사
    • Low roughness (σ = 0.05): 거의 모든 광선이 정확한 각도로 반사
    • High reflectivity (ρ = 0.95): 95%의 광선 에너지 유지

    시뮬레이션 결과:
    • 출력 텍스처: 정렬된 선명한 줄무늬
    • 광선 분포: 매우 대칭적, 집중된
    • 비유: Rutherford 실험의 정확한 산란 각도 (거울 방향)

    실제 응용:
    • 광학 거울
    • 금속 반사기
    • 카메라 렌즈 코팅
  `,

  brushedAluminum: `
    Brushed Aluminum (브러쉬드 알루미늄)

    물리 원리:
    • Anisotropic Reflection: 한 방향으로는 매끈함, 수직은 거침
    • Medium roughness (σ = 0.6): 방향성 스트림 패턴
    • Medium reflectivity (ρ = 0.75): 75% 에너지 유지

    시뮬레이션 결과:
    • 출력 텍스처: 방향성 줄무늬
    • 광선 분포: 한 방향으로 길쭉한 집중
    • 비유: Diffraction Experiment의 회절 무늬 (방향성)

    실제 응용:
    • 자동차 몸체
    • 스마트폰 뒷면
    • 건축 외장재
  `,

  matte: `
    Matte Plastic (무광택 플라스틱)

    물리 원리:
    • Diffuse Reflection: 모든 방향으로 산란
    • High roughness (σ = 0.8): 불규칙한 법선 방향
    • Low reflectivity (ρ = 0.5): 50% 에너지만 반사

    시뮬레이션 결과:
    • 출력 텍스처: 무작위 흐릿한 패턴
    • 광선 분포: 반구 방향으로 넓게 산란
    • 비유: Cloud Chamber의 무작위 입자 궤적

    실제 응용:
    • 플라스틱 제품
    • 인쇄 종이
    • 일반 건설 재료
  `,

  acrylic: `
    Acrylic (아크릴, 투명 플라스틱)

    물리 원리:
    • Partial Transmission: 반사 + 투과 혼합
    • Low roughness (σ = 0.1): 표면은 매끈함
    • High transparency (τ = 0.85): 85% 광선 투과
    • Refraction (n = 1.49): 굴절각 변화

    시뮬레이션 결과:
    • 출력 텍스처: 밝고 선명 (많은 광선이 투과)
    • 광선 분포: 투과 광선들의 집중
    • 비유: Snell의 법칙 시연 (굴절)

    실제 응용:
    • 플라스틱 렌즈
    • 투명 윈도우
    • 광학 소자
  `,

  roughPaper: `
    Rough Paper (거친 종이)

    물리 원리:
    • Maximum Diffuse Scattering: 극도의 산란
    • Very high roughness (σ = 0.9): 거의 모든 법선이 무작위
    • Low reflectivity (ρ = 0.3): 30% 에너지만 반사

    시뮬레이션 결과:
    • 출력 텍스처: 극도로 흐린 노이즈
    • 광선 분포: 반구 전체로 균등 산란
    • 비유: Young의 이중 슬릿 실험 (무작위 간섭)

    실제 응용:
    • 인쇄 종이
    • 목재 표면
    • 일반 표면
  `,

  fabric: `
    Fabric (직물)

    물리 원리:
    • Complex Scattering: 섬유 구조에 의한 복합 산란
    • Extreme roughness (σ = 0.95): 거의 모든 방향 산란
    • Very low reflectivity (ρ = 0.2): 대부분 흡수
    • Slight transparency (τ = 0.05): 거의 투과 안 함

    시뮬레이션 결과:
    • 출력 텍스처: 매우 어둡고 복잡한 무늬
    • 광선 분포: 극도로 산란, 일부 흡수
    • 비유: Cloud Chamber의 고밀도 입자 흔적

    실제 응용:
    • 의류 소재
    • 담요
    • 흡음재
  `,
};
