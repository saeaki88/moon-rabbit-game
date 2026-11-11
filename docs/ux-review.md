# 유아용 놀이 UX 검토

검토일: 2026-11-11

목표는 기존의 다정한 친구와 채소 수집 놀이를 유지하면서, 글을 아직 읽지 않는 아이도 같은 그림을 찾고 하나씩 전달하며 자기 속도로 수량·이름을 살펴볼 수 있게 하는 것이다. 실패·벌점·시간제한을 추가하지 않는다. 아래는 외부 자료와 코드 검토를 바탕으로 적용한 설계와 후속 관찰 항목이다. 실제 적용 상태는 `game.js`와 `PRD.md`, 실행 검증 결과는 `.continue-here.md`를 기준으로 확인한다.

## 개선 전 코드에서 확인한 문제

- 점수는 작은 숫자와 당근 아이콘만으로 표시되어, 오이를 포함한 실제 수집물과 수량의 관계가 충분히 드러나지 않는다.
- 시작 안내는 글자 한 줄에 의존한다. 시작·종료 문구가 계속 밝아졌다 어두워지며, 엔딩 뒤에는 화면 어디를 눌러도 재시작한다.
- 채소 수집음·먹는 소리·친구 등장 음악이 겹친다. 엔딩의 다수 캐릭터가 매 프레임 파티클을 생성하여 화면 주사율에 따라 효과 밀도도 달라진다.
- 동물이나 채소를 살펴보는 이름 안내와 놀이를 멈추는 조작이 없다.

바구니의 5·5·4 구분은 목적이 명확하지 않다는 피드백에 따라 제거했다. “어떤 채소를 몇 개 줄까?”를 직접 보여 주는 구체적인 부탁으로 바꾸었다.

이어 검토한 부탁 UI는 작은 글·숫자와 흐린 목표 그림에 의존했다. 글을 읽지 않아도 비교할 수 있도록 밝은 그림판에 토끼와 필요한 채소 그림을 크게 표시하고, 전달된 그림마다 체크를 붙였다. 작은 화면에서는 보조 글을 생략한다. 첫 선택·다른 채소 선택·부탁 그림판 터치에는 제자리에서 누르는 손가락 시범을 짧게 보여 준다. 시작 화면의 누르기 → 토끼 그림과 주요 버튼의 큰 아이콘도 같은 목적이다. 이 세부 시각 설계는 아래 자료의 일반 원칙을 게임에 적용한 판단이며, 특정 배치의 학습효과가 검증되었다는 뜻은 아니다.

토끼와 달 속 토끼를 누르면 남은 채소를 “오이 두 개 찾아 줄래?”, 일부 전달 뒤에는 “오이 한 개 더 찾아 줄래?”처럼 부탁한다. 완료 직후에는 짧게 “고마워”라고 반응한다. 자동 부탁도 “당근 한 개 줄래?”로 표현하며, 자동 도착 음성은 “하나·둘·셋”으로 유지하여 수량 안내와 직접 대화를 구분한다. 음성을 사용할 수 없어도 목표 그림의 2.8초 시범을 유지하며, 완료 직후 토끼를 누르면 완성 그림과 감사 반응을 살펴볼 시간을 다시 준다. 이 대화가 그림·수량 이해에 도움이 되는지는 실제 놀이에서 확인할 항목이다.

## 근거와 적용

| 확인한 자료 | 자료가 설명하는 원칙 | 적용 내용 또는 후속 관찰 |
|---|---|---|
| [NAEYC: 유아 수 개념 놀이](https://www.naeyc.org/resources/pubs/tyc/spring2022/number-composition) | 작은 수 1~5, 구체물, 물체 하나와 수 하나의 대응을 이용한다. 발달 속도는 아이마다 다르다. | 1~3개의 구체적인 부탁을 같은 종류의 큰 그림으로 제시한다. 목표 그림은 원래 색을 유지하고, 하나가 도착할 때마다 체크 하나를 붙인다. 가능한 환경에서는 “하나·둘·셋”을 읽어 준다. 부탁 완료 후에만 다음 대상으로 전환하여 전달한 물체와 채워진 그림을 비교할 시간을 둔다. |
| [PBS KIDS: Guided Play](https://www.pbs.org/parents/thrive/guided-play-maximizing-kids-learning-and-fun) | 아이가 놀이를 이끌고, 어른은 질문·설명·비교로 탐색을 돕는다. | 목표 그림과 같은 채소를 찾아 주며 보호자가 이름과 수량을 함께 이야기할 수 있게 한다. 다른 채소를 고르면 벌점·경고음 없이 올바른 그림의 테두리와 짧은 누르기 시범을 제공한다. 부탁 그림판을 누르면 안내를 다시 확인할 수 있다. 동물 반응 중에도 목표 그림은 유지한다. |
| [NAEYC·Fred Rogers 공동 입장문](https://www.naeyc.org/sites/default/files/globally-shared/downloads/PDFs/resources/topics/ps_technology.pdf) | 매체는 의도적으로 선택하며 공동 참여, 실제 경험, 관계를 지원해야 한다. 화면 활동이 다른 놀이를 대체해서는 안 된다. | 일시정지와 명시적인 이제 쉬기·다시 놀기를 제공한다. 엔딩에는 주변의 초록색을 찾는 화면 밖 놀이를 제안한다. 아무 곳이나 눌러 다음 판이 시작되지는 않는다. |
| [W3C: Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | 작은 표적은 정밀한 터치를 어렵게 한다. 44×44 CSS px 이상의 표적을 설명하며, 더 큰 영역도 권장한다. | 시작·쉬기·계속·다시 놀기를 큰 DOM 버튼으로 제공한다. 시작은 채소를 누르는 손가락과 토끼 그림으로 설명하고, 주요 버튼은 큰 아이콘과 짧은 문구를 함께 사용한다. 버튼 간격, 초점 표시와 접근 가능한 이름을 유지한다. |
| [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) 및 [Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | 불필요한 움직임을 끌 수 있게 하고, 지속되는 자동 움직임을 제어할 수 있게 한다. | 시작·종료 문구의 지속적인 깜박임을 없애고 시스템의 `prefers-reduced-motion`을 반영한다. 손가락 시범은 2.8초로 제한하며 움직임 줄이기에서는 정지 그림으로 표시한다. 파티클은 최대 48개로 제한하고, 쉬는 동안 게임 시간·움직임·오디오를 함께 멈춘다. 음량과 중복 효과음 축소는 코드 검토와 차분한 경험이라는 목표에 따른 추가 설계 판단이다. |
| [MDN: voice](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/voice), [localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), [voiceschanged](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event), [cancel()](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/cancel) | `voice`를 지정하지 않으면 `lang`에 맞는 기본 목소리를 선택한다. `localService`는 로컬·원격 목소리를 구분하며 음성 지원 여부 자체를 뜻하지 않는다. 목록 변경은 `voiceschanged`로 알 수 있고, `cancel()`은 대기·현재 발화를 멈춘다. | 한국어 목소리의 품질 표시가 같으면 로컬을 우선하되 다른 한국어 목소리도 허용한다. 목록이 없으면 `ko-KR`로 요청하고 브라우저에 선택을 맡긴다. 늦은 목록이 이미 시작한 안내를 반복하거나 지난 부탁을 읽게 하지 않는다. 쉬기·음소거·화면 숨김·판 전환 시 발화를 취소한다. 이는 음성 구현의 기술 근거이며 교육 효과에 대한 근거는 아니다. |
| [Apple: AVSpeechSynthesisVoiceQuality](https://developer.apple.com/documentation/avfaudio/avspeechsynthesisvoicequality), [MDN: SpeechSynthesisVoice](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice), [voiceURI](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/voiceURI), [rate](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/rate) | Apple 네이티브 API는 기본·enhanced·premium 품질을 구분하며 뒤의 두 품질은 다운로드가 필요하다. 웹의 음성 속성은 이름·언어·URI 등을 제공하며 같은 품질 필드를 제공하지 않는다. `voiceURI`는 음성 서비스의 식별 정보이며 `rate`의 기본값 1은 해당 목소리의 기본 속도다. | 이름·URI의 `premium`, 다음으로 `enhanced`·`natural`·`neural` 표시를 선택 단서로 삼는다. 이는 앱의 휴리스틱으로 표준 품질 판정이 아니며, 설치·브라우저 노출에 따라 효과가 달라진다. 속도는 0.88에서 0.96으로 조정하고 높낮이 1을 유지한다. 실제 청취 품질 향상은 별도로 확인해야 한다. |
| [WebKit: SpeechSynthesis::speak 구현](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/speech/SpeechSynthesis.cpp) | iOS 계열에서 사용자 동작 중의 음성 시작 호출은 시작 제한을 해제하고, 제한이 남은 상태의 호출은 반환한다. 이는 확인한 소스의 동작이며 모든 기기·버전의 실측 결과는 아니다. | 첫 부탁을 목소리 목록 갱신 이벤트까지 미루지 않고 시작 버튼의 터치 처리 안에서 바로 요청한다. 실패 뒤에는 토끼나 부탁 그림을 다시 누르면 즉시 재시도할 수 있게 한다. iPhone Safari의 실제 청취 확인은 데스크톱 검사와 별도로 필요하다. |
| [PBS KIDS 공식 플레이테스트](https://www.pbs.org/parents/playtesting) | 아이와 보호자의 반응을 통해 경험을 개선하며, 첫 플레이를 스스로 이해하는지도 관찰한다. | 후속 관찰: 글·음성 없이 첫 시작과 첫 채소 누르기를 이해하는지, 목표 그림·체크를 수량과 연결하는지, 부탁 그림판 재안내와 쉬기를 사용하는지 실제 놀이에서 살펴본다. 보호자는 가까이에서 돕되 처음부터 모든 조작을 대신 설명하지 않는다. 이 사용자 관찰은 아직 실시하지 않았다. |

## 적용과 검증의 범위

큰 목표 그림·개별 체크의 대응, 짧은 누르기 시범, 이름 안내, 큰 조작 아이콘, 차분한 효과, 공동 놀이 제안과 시스템의 움직임 줄이기 설정 반영을 구현했다. 부탁한 채소 찾기와 1~3개 수량 확인을 학습 행동으로 명시했다. 읽어 주기는 소리 설정을 따르는 추가 안내이며 음성 없이도 그림 흐름은 유지한다. 읽는 동안 음악·효과음을 낮추고 발화를 누적하지 않는다. 브라우저 제공 목소리 중 일부는 네트워크가 필요할 수 있으며, 앱에서 별도 API 키·유료 음성 서비스·마이크를 사용하지 않는다. 실행한 범위와 한계는 `.continue-here.md`에 기록한다. 자동·데스크톱 브라우저 검사, iPhone Safari 실기기 청취, 실제 아이의 놀이 관찰은 각각 구분한다.

쉬기는 아이와 보호자가 놀이를 잠시 멈출 수 있는 기능이다. 자동 사용시간 제한이나 보호자 인증 기능을 뜻하지 않는다. 큰 버튼과 움직임 제어도 전체 게임의 WCAG 적합성을 인증하는 것은 아니다.

수 개념·어휘 학습을 돕는 설계 근거와 이 게임의 학습 효과 입증은 구분한다. 글 없는 안내의 실제 이해도, 학습 효과, 선호도, 실기기 손가락 조작, 실제 음량의 편안함은 아직 검증하지 않았다. 한국어 목소리의 제공 여부·발음·속도와 선택 규칙 변경에 따른 청취 품질은 실제 운영체제와 브라우저에서도 확인해야 한다. 주요 문장을 고품질 녹음 음원으로 제공하는 방식은 향후 대안이며 현재 음원 교체는 하지 않았다. NAEYC·Fred Rogers의 2012년 입장문은 공동 놀이와 의도적 사용의 일반 원칙에 참고했으며, 그 문서의 오래된 화면시간 수치를 현재 건강 권고로 적용하지 않는다.
