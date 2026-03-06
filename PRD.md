# PRD: 달토끼의 당근 모으기

> Product Requirements Document — 최종 갱신: 2026-03-06

---

## 1. 개요

밤하늘 배경의 터치 기반 캐주얼 수집 게임.
아기 유저(유아)를 대상으로, 당근을 터치해 토끼에게 모아주면 친구 캐릭터가 하나씩 등장하고, 15개를 모으면 모두 함께 달로 날아가는 엔딩이 재생된다.

### 핵심 목표
- 유아가 직관적으로 즐길 수 있는 단순한 터치 인터랙션
- 귀여운 캐릭터 애니메이션과 사운드 피드백
- 외부 의존성 없이 순수 HTML5 Canvas + Web Audio API만 사용

---

## 2. 기술 스택

| 항목 | 선택 | 비고 |
|------|------|------|
| 렌더링 | Canvas 2D API | 프레임워크 없음, 순수 JS |
| 오디오 | Web Audio API (OscillatorNode) | 에셋 파일 없이 절차적 생성 |
| 빌드 | 없음 | 정적 파일 3개로 구성 |
| 호스팅 | 로컬 또는 정적 서버 | `index.html` 직접 열기 가능 |

---

## 3. 파일 구조

```
game/
├── index.html      # 진입점, canvas 엘리먼트
├── style.css       # 전체화면 레이아웃, 터치 설정
├── game.js         # 게임 전체 로직 (1,367줄, IIFE)
└── PDR.md          # 본 문서
```

---

## 4. 아키텍처

### 4.1 전체 구조

단일 IIFE 내에 모든 코드 포함. 전역 오염 없음.

```
┌─ Color Palette (C)
├─ Audio (Web Audio 절차적 사운드)
├─ Game State (G) — 단일 상태 객체
├─ Layout — 반응형 좌표 계산
├─ Draw Helpers — ellipse, circle 등
├─ Background — sky, stars, moon, ground
├─ Characters — rabbit, turtle, squid (각각 drawXxxAt + drawXxx)
├─ Items — carrot, flyingCarrot, particles
├─ UI — score, start/end text
├─ Game Logic — spawn, collect, ending sequence
└─ Main Loop — requestAnimationFrame(update → draw)
```

### 4.2 게임 상태 (G 객체)

| 필드 | 타입 | 설명 |
|------|------|------|
| `score` | number | 수집한 당근 수 (0~15) |
| `time` | number | 경과 시간 (초) |
| `started` | bool | 첫 터치 여부 |
| `carrots[]` | array | 화면에 표시 중인 당근 |
| `flyingCarrots[]` | array | 토끼로 날아가는 중인 당근 |
| `particles[]` | array | 하트/별 파티클 |
| `stars[]` | array | 배경 별 (70개, 고정) |
| `rabbit` | object | x, y, size, bounce, happy, eating |
| `turtle` | object | visible, x, y, size, enter, targetX |
| `squid` | object | visible, x, y, size, enter, targetY |
| `ending` | bool | 엔딩 시퀀스 진행 중 |
| `endingPhase` | string | `'flying'` → `'celebrating'` → `'done'` |
| `flightXxx` | object | 엔딩 비행 중 캐릭터별 보간 좌표 |

### 4.3 렌더링 파이프라인 (매 프레임)

```
loop(now)
 ├─ update(now)
 │   ├─ dt 계산 (최대 50ms 클램프)
 │   ├─ 캐릭터 상태 감쇠 (bounce, happy, eating)
 │   ├─ 캐릭터 이동 보간 (turtle.x → targetX 등)
 │   ├─ 당근 스폰 타이밍 체크
 │   ├─ flyingCarrot 진행도 갱신
 │   └─ 파티클 물리 갱신
 └─ draw()
     ├─ drawSky → drawStarsBackground → drawMoon → drawGround
     ├─ drawCarrots (glow + shape)
     ├─ drawTurtle → drawRabbit → drawSquid (Z-order)
     ├─ drawFlyingCarrots → drawParticles
     └─ drawScore / drawStartText / drawEndingText
```

---

## 5. 게임 플레이

### 5.1 흐름

```
[시작 화면] ──터치──▶ [게임 플레이] ──15개──▶ [달 비행 엔딩] ──터치──▶ [리셋]
```

### 5.2 캐릭터 등장 조건

| 당근 수 | 이벤트 |
|---------|--------|
| 0 | 깡총이(토끼)만 대기, "터치해서 시작!" |
| 1~4 | 당근 수집 |
| **5** | 거북이 왼쪽에서 엉금엉금 등장 + 팡파레 |
| 6~9 | 당근 수집, 간헐적 2개 동시 스폰 |
| **10** | 오징어 위에서 내려와 춤추며 등장 + 팡파레 |
| 11~14 | 당근 수집, 간헐적 3개 동시 스폰 |
| **15** | 0.8초 후 달 비행 엔딩 시작 |

### 5.3 캐릭터 특징

| 캐릭터 | 위치 | 고유 애니메이션 |
|--------|------|----------------|
| **깡총이** (토끼) | 중앙 하단 | 자동 깡총깡총 점프 (높이 s×0.25), squash & stretch, 귀 흔들림 |
| **거북이** | 좌측 하단 | 다리 번갈아 움직이는 크롤링, 머리 까딱, 꼬리 흔들림, 몸통 좌우 흔들 |
| **오징어** | 우측 공중 | 리듬 바운스+스웨이+틸트 댄스, 지느러미 펄럭, 반짝 이펙트 |
| **달토끼** | 달 위 | 팔 흔들기, 엔딩 시 신나게 뜀 |

### 5.4 인터랙션

| 터치 대상 | 반응 |
|-----------|------|
| 당근 | pop+sparkle 사운드, 별 파티클, 토끼로 포물선 비행 |
| 토끼 | sparkle 사운드, 하트 파티클, 바운스+행복 표정 |
| 거북이 | sparkle 사운드, 별 파티클 |
| 오징어 | sparkle 사운드, 하트 파티클 |

### 5.5 엔딩 시퀀스

1. **Flying** (4초): 모든 캐릭터가 포물선으로 달까지 비행, 달 1.6배 확대, 별/하트 트레일
2. **Celebrating** (4초): 달 근처에서 파티클 폭발, 달토끼 신나서 뜀
3. **Done**: "한번 더!" 텍스트 표시, 터치 시 리셋

---

## 6. 오디오 설계

모든 사운드는 `OscillatorNode`로 절차적 생성. 에셋 파일 없음.

| 사운드 | 트리거 | 구현 |
|--------|--------|------|
| `playPop` | 당근 터치 | sine 800→250Hz, 0.12s |
| `playMunch` | 당근 도착 (먹기) | sine 3연타 350/430/510Hz |
| `playSparkle` | 캐릭터 터치 | sine 1400→900Hz, 0.15s |
| `playFanfare` | 거북이/오징어 등장 | triangle C5-E5-G5-C6 아르페지오 |
| `playFlyToMoonSong` | 엔딩 비행 | triangle 21음 멜로디 + 하모니 |

---

## 7. 시각 설계

### 7.1 배경
- 3단 그라데이션 밤하늘 (`skyTop` → `skyMid` → `skyBot`)
- 70개 별: 개별 twinkle 속도/위상
- 달: 글로우 3레이어 + 크레이터 3개 + 달토끼
- 지면: 사인파 언덕 + 풀 점

### 7.2 파티클 시스템
- 타입: `star` (별 모양, 금색) / `heart` (하트, 분홍)
- 물리: 속도 + 중력(0.06) + 감쇠(0.99) + life decay
- 용도: 수집 피드백, 캐릭터 터치, 비행 트레일, 엔딩 축하

### 7.3 반응형
- `window.resize` 이벤트로 canvas 크기 갱신
- `layout()` 함수에서 모든 좌표를 `canvas.width/height` 비례로 재계산
- 캐릭터 크기 = `Math.min(w, h) * 0.13` 기반

---

## 8. 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-06 | 초기 버전: 토끼, 거북이, 오징어, 당근 수집, 달 비행 엔딩 |
| 2026-03-06 | 깡총이 자동 깡총 점프 추가 (squash & stretch) |
| 2026-03-06 | 거북이 크기 확대 (0.85→1.1), 엉금엉금 크롤링 애니메이션 |
| 2026-03-06 | 오징어 댄스 애니메이션 (바운스+스웨이+틸트+펄스) |
| 2026-03-06 | 달 크기 확대 (0.08→0.13), 달토끼 크기 확대 (0.35→0.55) + 팔/발 추가 |
| 2026-03-06 | 고양이 캐릭터 추가 후 제거 (아기 유저 요청) |
| 2026-03-06 | 깡총이 점프 높이 강화 (0.12→0.25) |

---

## 9. 향후 고려사항

- 난이도 조절 (당근 스폰 속도, 동시 개수)
- 배경음악 (Web Audio 절차적 루프)
- 추가 캐릭터 / 스테이지
- 터치 히트박스 개선 (유아 손가락 크기 고려)
- PWA 지원 (오프라인 플레이)
