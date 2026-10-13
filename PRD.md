# PRD: 달토끼의 당근 모으기

> Product Requirements Document — 최종 갱신: 2026-10-13, 현재 `game.js` 구현 기준

---

## 1. 개요

밤하늘 배경의 터치 기반 캐주얼 수집 게임.
아기 유저(유아)를 대상으로, 당근과 오이를 터치해 안경 토끼에게 모아주면 친구 캐릭터가 무작위 순서로 등장하고, 채소 14개가 토끼에게 도착하면 모두 함께 달로 날아가는 엔딩이 재생된다.

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
├── game.js         # 게임 전체 로직 (단일 IIFE)
├── README.md       # 실행 방법과 현재 기능
├── PRD.md          # 본 문서
├── AGENTS.md       # 저장소 작업 지침
├── .continue-here.md # 인수인계와 후속 수정 후보
└── .gitignore      # 개인 도구 권한과 OS 메타데이터 제외
```

---

## 4. 아키텍처

### 4.1 전체 구조

단일 IIFE 내에 모든 코드 포함. 전역 오염 없음.

```
┌─ Color Palette (C)
├─ Audio (Web Audio 절차적 효과음 + 자장가 BGM 스케줄링)
├─ Game State (G) — 단일 상태 객체
├─ Layout — 반응형 좌표 계산
├─ Draw Helpers — ellipse, circle 등
├─ Background — sky, stars, moon, ground
├─ Characters — rabbit, turtle, squid, cat, duck, chick, penguin
│                (각각 drawXxxAt + drawXxx, 달 위 토끼는 별도 렌더링)
├─ Items — carrot/cucumber, flyingCarrot, particles
├─ UI — score, start/end text
├─ Game Logic — spawn, collect, ending sequence
└─ Main Loop — requestAnimationFrame(update → draw)
```

### 4.2 게임 상태 (G 객체)

| 필드 | 타입 | 설명 |
|------|------|------|
| `score` | number | 토끼에게 도착한 채소 수, 14에서 엔딩 예약 |
| `time` | number | 경과 시간 (초) |
| `started` | bool | 첫 터치 여부 |
| `carrots[]` | array | 화면에 표시 중인 채소, `type`은 `carrot` 또는 `cucumber` |
| `flyingCarrots[]` | array | 토끼로 날아가는 중인 채소, `type` 유지 |
| `particles[]` | array | 하트/별 파티클 |
| `stars[]` | array | 배경 별 (70개, 고정) |
| `rabbit` | object | x, y, size, bounce, happy, eating |
| `turtle` | object | visible, x, y, size, enter, targetX |
| `squid` | object | visible, x, y, size, enter, targetY |
| `cat`, `duck`, `chick`, `penguin` | object | visible, x, y, size, enter, targetX |
| `characterOrder[]` | array | 게임 시작 및 리셋 시 섞는 친구 6종 등장 순서 |
| `carrotDelay` | number | 채소 기본 스폰 대기 시간, 600ms |
| `endingType` | string/null | `arc`, `spiral`, `bounce`, `float` 중 선택 |
| `ending` | bool | 엔딩 시퀀스 진행 중 |
| `endingPhase` | string | `'flying'` → `'celebrating'` → `'done'` |
| `flightXxx` | object | 엔딩 비행 중 캐릭터별 보간 좌표 |
| `dimming` | number | 달 터치 후 어두워짐 강도, 시간에 따라 감쇠 |

### 4.3 렌더링 파이프라인 (매 프레임)

```
loop(now)
 ├─ update(now)
 │   ├─ dt 계산 (최대 50ms 클램프)
 │   ├─ 캐릭터 상태 감쇠 (bounce, happy, eating)
 │   ├─ 캐릭터 이동 보간 (turtle.x → targetX 등)
 │   ├─ BGM 예약, 어두워짐 감쇠, 엔딩 진행 시 updateEnding
 │   ├─ 채소 스폰 타이밍 체크
 │   ├─ flyingCarrot 진행도 갱신 → 도착 시 점수 증가
 │   └─ 파티클 물리 갱신
 └─ draw()
     ├─ drawSky → drawStarsBackground → drawMoon → drawGround
     ├─ 채소 렌더링 (glow + drawVeggieShape)
     ├─ drawTurtle → drawDuck → drawPenguin → drawChick
     │   → drawRabbit → drawCat → drawSquid (Z-order)
     ├─ drawFlyingCarrots → drawParticles
     └─ drawScore / drawStartText / drawEndingText

loop의 마지막에 drawDimOverlay로 어두워짐 효과 표시
```

---

## 5. 게임 플레이

### 5.1 흐름

```
[시작 화면] ──터치──▶ [게임 플레이] ──채소 14개 도착──▶ [달 비행 엔딩] ──터치──▶ [리셋]
```

### 5.2 캐릭터 등장 조건

| 채소 수 | 이벤트 |
|---------|--------|
| 0 | 깡총이(토끼)만 대기, "터치해서 시작!" |
| **2·4·6·8·10·12** | 섞인 친구 순서에 따라 한 명씩 등장 + 팡파레 |
| 3 이상 | 기본 스폰 외 40% 확률로 200ms 후 채소 추가 생성 |
| 7 이상 | 위 조건에 더해 30% 확률로 400ms 후 채소 추가 생성 |
| **14** | 무작위 엔딩 선택, 0.8초 후 달 비행 시작 |

친구 순서는 Fisher–Yates 방식으로 섞는다. 당근과 오이는 각각 50% 확률로 생성되며 같은 점수로 계산한다. 수집 애니메이션이 끝나야 점수가 증가한다.

### 5.3 캐릭터 특징

| 캐릭터 | 위치 | 고유 애니메이션 |
|--------|------|----------------|
| **깡총이** (안경 토끼) | 중앙 하단 | 자동 깡총깡총 점프 (높이 s×0.25), squash & stretch, 귀 흔들림, 둥근 안경 |
| **거북이** | 좌측 하단 | 다리 번갈아 움직이는 크롤링, 머리 까딱, 꼬리 흔들림, 몸통 좌우 흔들 |
| **오징어** | 우측 공중 | 리듬 바운스+스웨이+틸트 댄스, 지느러미 펄럭, 반짝 이펙트 |
| **빨간 고양이** | 우측 하단 | 오른쪽에서 진입, 귀·꼬리 움직임 |
| **빨간 오리** | 좌측 하단 | 왼쪽에서 진입, 뒤뚱 걷기와 날개 움직임 |
| **노랑 병아리** | 중앙 우측 하단 | 오른쪽에서 진입, 쪼기와 날개 펄럭임 |
| **파란 펭귄** | 좌측 하단 | 왼쪽에서 진입, 고글, 뒤뚱 걷기와 지느러미 움직임 |
| **달토끼** | 달 위 | 팔 흔들기, 엔딩 시 신나게 뜀 |

### 5.4 인터랙션

| 터치 대상 | 반응 |
|-----------|------|
| 당근 / 오이 | pop+sparkle 사운드, 별 파티클, 채소 종류를 유지하며 토끼로 포물선 비행 |
| 토끼 | sparkle 사운드, 하트 파티클, 바운스+행복 표정 |
| 거북이 | sparkle 사운드, 별 파티클 |
| 오징어 | sparkle 사운드, 하트 파티클 |
| 고양이 / 병아리 | sparkle 사운드, 하트 파티클 |
| 오리 / 펭귄 | sparkle 사운드, 별 파티클 |
| 달 / 달토끼 | sparkle 사운드, 별 파티클, 화면 어두워짐 후 서서히 복원 |

채소 히트 테스트가 달·캐릭터 히트 테스트보다 먼저 수행된다. 엔딩 중에는 터치를 무시하고, `done` 단계에서만 재시작한다.

### 5.5 엔딩 시퀀스

1. **Flying** (`arc`/`spiral`/`bounce`는 4초, `float`는 5초): 캐릭터별 오프셋으로 달 근처까지 비행, 달 1.6배 확대, 별/하트 트레일. 확대된 달의 원 밖으로 착륙 좌표를 배치한다.
2. **Celebrating** (5초): 엔딩 종류에 따라 폭발·나선·분수·눈처럼 내리는 파티클, 달토끼 신나서 뜀.
3. **Done**: "한번 더!" 텍스트 표시. 터치 시 점수와 친구 상태를 리셋하고, 등장 순서를 다시 섞어 채소를 생성한다.

엔딩 궤적은 `arc`(포물선), `spiral`(나선), `bounce`(통통 튀기), `float`(부유) 중 무작위로 선택한다. 착륙 좌표의 화면 경계와 캐릭터 진입 완료 여부는 후속 검증 대상이다.

---

## 6. 오디오 설계

모든 사운드는 `OscillatorNode`로 절차적 생성. 에셋 파일 없음.

| 사운드 | 트리거 | 구현 |
|--------|--------|------|
| `playPop` | 채소 터치 | sine 800→250Hz, 0.12s |
| `playMunch` | 채소 도착 (먹기) | sine 3연타 350/430/510Hz |
| `playSparkle` | 캐릭터 터치 | sine 1400→900Hz, 0.15s |
| `playFanfare` | 친구 등장 | triangle C5-E5-G5-C6 아르페지오 |
| `playFlyToMoonSong` | 엔딩 비행 | triangle 멜로디 + 긴 음의 sine 하모니 |
| `startBGM` / `scheduleBGM` | 첫 터치 이후 | triangle 자장가 루프, 0.5초 앞까지 음표 예약 |

첫 터치에서 AudioContext를 생성·재개한다. 별도 음원 다운로드 없이 효과음과 배경음악을 생성한다.

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
| 2026-03-10 | 빨간 고양이·빨간 오리 추가, 랜덤 멀티엔딩, 달토끼 강화, 당근 클릭 수정 (기존 커밋 이력 기준) |
| 2026-10-13 | 로컬 발전분 동기화: 병아리·펭귄, 친구 6종 무작위 등장, 당근/오이, 안경 토끼, 14개 목표, 착륙 좌표 조정. 실제 개발 시점은 이전 세션이며, 이 날짜는 동기화일 |

---

## 9. 향후 고려사항

- 난이도 조절 (당근 스폰 속도, 동시 개수)
- 추가 캐릭터 / 스테이지
- 터치 히트박스 개선 (유아 손가락 크기 고려)
- PWA 지원 (오프라인 플레이)
- 빠른 수집 시 친구 진입과 엔딩 시작의 경합, 스폰 영역과 진입 중 캐릭터 겹침 검증
- 목표 점수 상수화, 착륙 좌표 및 캐릭터 명세 테이블화 (기존 인수인계의 제안이며 미구현)

우선순위와 과거 audit 메모는 `.continue-here.md`를 참고한다.
