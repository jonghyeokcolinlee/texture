import * as THREE from 'three';

export interface Ray {
  id: number;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  color: THREE.Color;
  bounces: number;
  alive: boolean;
  history: THREE.Vector3[]; // 궤적 기록
}

export interface Surface {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  roughness: number;      // 0~1 (0=거울, 1=완전산란)
  reflectivity: number;   // 0~1 (에너지 유지)
  transparency: number;   // 0~1 (투과율)
  ior: number;           // 굴절률 (투과 시)
}

export interface SimulationState {
  rays: Ray[];
  surfaceHits: THREE.Vector3[];
  screenHits: Array<{ position: THREE.Vector3; color: THREE.Color }>;
  statistics: {
    totalBounces: number;
    totalReflections: number;
    totalTransmissions: number;
    totalAbsorptions: number;
  };
}

// ===== 반사 벡터 계산 (핵심) =====
export function calculateReflection(
  rayDirection: THREE.Vector3,
  surfaceNormal: THREE.Vector3,
  roughness: number
): THREE.Vector3 {
  // 1. 완벽한 거울 반사 (Snell 법칙)
  const perfectReflection = rayDirection
    .clone()
    .sub(surfaceNormal.clone().multiplyScalar(2 * rayDirection.dot(surfaceNormal)));

  if (roughness < 0.001) return perfectReflection.normalize();

  // 2. 거칠기 = 법선 perturbation
  // 반구 내의 랜덤 벡터
  const randomDir = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() * 0.5 + 0.5
  ).normalize();

  // 표면 법선을 보간 (거칠기에 따라)
  const perturbedNormal = surfaceNormal
    .clone()
    .lerp(randomDir, roughness)
    .normalize();

  // 3. Perturbed 법선 기반 재계산
  const roughReflection = rayDirection
    .clone()
    .sub(perturbedNormal.multiplyScalar(2 * rayDirection.dot(perturbedNormal)));

  return roughReflection.normalize();
}

// ===== 굴절 벡터 계산 (Snell 법칙) =====
export function calculateRefraction(
  rayDirection: THREE.Vector3,
  surfaceNormal: THREE.Vector3,
  ior: number
): THREE.Vector3 | null {
  const cosI = -rayDirection.dot(surfaceNormal);
  const sinT = (1.0 / ior) * Math.sqrt(Math.max(0.0, 1.0 - cosI * cosI));

  if (sinT > 1.0) return null; // 전반사 (Total Internal Reflection)

  const cosT = Math.sqrt(Math.max(0.0, 1.0 - sinT * sinT));
  return rayDirection
    .clone()
    .multiplyScalar(1.0 / ior)
    .add(
      surfaceNormal
        .clone()
        .multiplyScalar((1.0 / ior) * cosI - cosT)
    )
    .normalize();
}

// ===== 광선-표면 교차점 계산 =====
export function raycastToPlane(
  ray: Ray,
  surface: Surface,
  maxDistance: number = 1000
): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
  const denom = surface.normal.dot(ray.direction);

  // 평행한 경우
  if (Math.abs(denom) < 0.0001) return null;

  const t = surface.position
    .clone()
    .sub(ray.origin)
    .dot(surface.normal) / denom;

  // 뒤쪽 또는 너무 먼 경우
  if (t < 0.001 || t > maxDistance) return null;

  return {
    point: ray.origin.clone().addScaledVector(ray.direction, t),
    normal: surface.normal.clone(),
  };
}

// ===== 에너지 업데이트 =====
export function updateRayColor(ray: Ray, reflectivity: number): void {
  const currentBrightness = ray.color.getHSL({}).l;
  const newBrightness = currentBrightness * reflectivity;
  ray.color.setHSL(0, 0, newBrightness);
}

// ===== 메인 시뮬레이션 스텝 =====
export function simulationStep(
  state: SimulationState,
  surface: Surface,
  screenPosition: number, // z값
  maxBounces: number = 5
): void {
  state.rays.forEach((ray) => {
    if (!ray.alive || ray.bounces >= maxBounces) {
      // 화면에 기록
      if (ray.direction.z > 0.1) {
        const screenHitZ = screenPosition;
        const t = (screenHitZ - ray.origin.z) / ray.direction.z;
        if (t > 0.001) {
          const hitPoint = ray.origin.clone().addScaledVector(ray.direction, t);
          state.screenHits.push({
            position: hitPoint,
            color: ray.color.clone(),
          });
        }
      }
      ray.alive = false;
      return;
    }

    // 표면과의 교차점 계산
    const intersection = raycastToPlane(ray, surface);

    if (!intersection) {
      // 교차 실패 = 화면에 도달
      if (ray.direction.z > 0.1) {
        const screenHitZ = screenPosition;
        const t = (screenHitZ - ray.origin.z) / ray.direction.z;
        if (t > 0.001) {
          const hitPoint = ray.origin
            .clone()
            .addScaledVector(ray.direction, t);
          state.screenHits.push({
            position: hitPoint,
            color: ray.color.clone(),
          });
        }
      }
      ray.alive = false;
      return;
    }

    const { point, normal } = intersection;

    // 충돌점 기록
    state.surfaceHits.push(point.clone());
    ray.history.push(point.clone());

    // ===== 반사 vs 투과 결정 =====
    const reflectionThreshold = surface.reflectivity;

    if (Math.random() < reflectionThreshold) {
      // 반사
      const newDirection = calculateReflection(
        ray.direction,
        normal,
        surface.roughness
      );

      ray.origin = point.clone().addScaledVector(normal, 0.001);
      ray.direction = newDirection;
      ray.bounces++;

      updateRayColor(ray, surface.reflectivity);
      state.statistics.totalReflections++;
    } else if (surface.transparency > 0 && Math.random() < surface.transparency) {
      // 투과
      const newDirection = calculateRefraction(
        ray.direction,
        normal,
        surface.ior
      );

      if (newDirection) {
        ray.origin = point.clone().addScaledVector(normal, -0.001);
        ray.direction = newDirection;
        ray.bounces++;
        updateRayColor(ray, 1.0 - surface.transparency * 0.5);
        state.statistics.totalTransmissions++;
      } else {
        // 전반사 = 반사처리
        const newDirection = calculateReflection(
          ray.direction,
          normal,
          surface.roughness
        );
        ray.origin = point.clone().addScaledVector(normal, 0.001);
        ray.direction = newDirection;
        ray.bounces++;
        state.statistics.totalReflections++;
      }
    } else {
      // 흡수
      state.screenHits.push({
        position: point.clone(),
        color: ray.color.clone(),
      });
      ray.alive = false;
      state.statistics.totalAbsorptions++;
    }

    state.statistics.totalBounces++;
  });
}

// ===== 초기 평행 광선 생성 =====
export function generateParallelRays(
  count: number,
  spacing: number,
  sourceHeight: number,
  direction: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
): Ray[] {
  const rays: Ray[] = [];
  let id = 0;

  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const x = (i - count / 2) * spacing;
      const y = (j - count / 2) * spacing;

      rays.push({
        id: id++,
        origin: new THREE.Vector3(x, y, sourceHeight),
        direction: direction.clone().normalize(),
        color: new THREE.Color(1, 1, 1),
        bounces: 0,
        alive: true,
        history: [],
      });
    }
  }

  return rays;
}

// ===== 화면 누적 =====
export interface ProjectionData {
  canvas: HTMLCanvasElement;
  imageData: ImageData;
  width: number;
  height: number;
  minCoord: number;
  maxCoord: number;
}

export function createProjectionScreen(
  width: number = 512,
  height: number = 512,
  minCoord: number = -10,
  maxCoord: number = 10
): ProjectionData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);

  return {
    canvas,
    imageData,
    width,
    height,
    minCoord,
    maxCoord,
  };
}

export function recordScreenHit(
  projectionData: ProjectionData,
  hit: { position: THREE.Vector3; color: THREE.Color }
): void {
  const { position, color } = hit;
  const { width, height, minCoord, maxCoord } = projectionData;

  // 월드 좌표 → 스크린 좌표 (x, y만 사용)
  const screenX = Math.floor(
    ((position.x - minCoord) / (maxCoord - minCoord)) * width
  );
  const screenY = Math.floor(
    ((position.y - minCoord) / (maxCoord - minCoord)) * height
  );

  if (screenX < 0 || screenX >= width || screenY < 0 || screenY >= height)
    return;

  const brightness = color.getHSL({}).l;
  const value = Math.floor(brightness * 255);

  // ===== Gaussian blur를 위해 근처 픽셀도 함께 기록 =====
  const radius = 2;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = screenX + dx;
      const ny = screenY + dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const falloff = Math.exp(-(dist * dist) / 2);
      const pixelIndex = (ny * width + nx) * 4;
      const contribution = Math.floor(value * falloff * 0.5);

      projectionData.imageData.data[pixelIndex] += contribution; // R
      projectionData.imageData.data[pixelIndex + 1] += contribution; // G
      projectionData.imageData.data[pixelIndex + 2] += contribution; // B
      projectionData.imageData.data[pixelIndex + 3] = 255; // A
    }
  }
}

export function finalizeProjection(
  projectionData: ProjectionData
): THREE.CanvasTexture {
  const ctx = projectionData.canvas.getContext('2d')!;

  // ===== 동적 정규화 (gamma correction 포함) =====
  const data = projectionData.imageData.data;
  let maxValue = 0;

  for (let i = 0; i < data.length; i += 4) {
    maxValue = Math.max(maxValue, data[i]);
  }

  const gamma = 0.7; // 밝기 증폭

  if (maxValue > 0) {
    for (let i = 0; i < data.length; i += 4) {
      // 정규화 + gamma correction
      const normalized = Math.pow(data[i] / (maxValue * 1.5), gamma) * 255;
      const clamped = Math.min(255, Math.max(0, normalized));

      data[i] = clamped;      // R
      data[i + 1] = clamped;  // G
      data[i + 2] = clamped;  // B
      // Alpha는 이미 255로 설정됨
    }
  }

  ctx.putImageData(projectionData.imageData, 0, 0);

  return new THREE.CanvasTexture(projectionData.canvas);
}
