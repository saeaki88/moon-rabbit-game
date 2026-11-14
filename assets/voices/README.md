# 동물 친구의 한국어 음원

이 폴더의 동물 목소리는 **AI로 합성한 음성**이다. Supertonic 3의 기본 화자 10종을 사용했으며, 실제 사람이나 가족의 목소리를 복제하지 않았다. 일반 음원은 “친구야”라는 공용 호칭이나 호칭 없는 본문만 포함한다. 주요 사용자용 `featured` 음원에는 **실제 이름을 부르는 소리가 들어 있으며, 사용자가 승인한 공개 배포 대상이다.** 이름 텍스트는 공유 코드·문서·파일명·manifest에 기록하지 않으며, 생성할 때 별도의 비공개 입력 파일에서만 읽는다.

## 출처와 사용 조건

- 모델: [Supertone/supertonic-3](https://huggingface.co/Supertone/supertonic-3)
- 모델 revision: `724fb5abbf5502583fb520898d45929e62f02c0b`
- 모델 라이선스: [BigScience Open RAIL-M](https://huggingface.co/Supertone/supertonic-3/blob/724fb5abbf5502583fb520898d45929e62f02c0b/LICENSE)
- 제작 SDK: [Supertonic Python](https://github.com/supertone-oss-archive/supertonic-py), `supertonic==1.3.1`, MIT, Copyright © 2025 Supertone Inc.

모델 라이선스의 출력 조항은 생성물에 대한 제공자의 권리 주장을 하지 않으며, 사용 제한은 출력에도 적용된다. AI 생성임을 명확히 알리는 조건에 따라 게임에도 합성 음성 안내를 표시한다. 이 폴더는 생성한 음원만 배포하며, 모델 가중치·SDK·다른 사람의 참조 음성을 포함하지 않는다. 모델이나 SDK를 별도로 재배포할 때는 해당 라이선스와 저작권 고지를 보존해야 한다. 공식 SDK 저장소의 개발·지원은 종료되어 있다.

## 구성과 제작

- 친구 12종 × 기본 대사 12개와 상황 대사 3개 = 서로 다른 대사 180개. 일반 완성 문장 180개, 호칭 없는 본문 72개, 주요 사용자용 완성 문장 72개를 합쳐 총 324개 파일이다.
- `game.js`의 `FRIEND_DIALOGUE`, `FRIEND_CONTEXT_DIALOGUE`를 읽는다. `variant: full`은 `address: true`인 문장 앞에 “친구야, ”를 붙인다.
- `address: true`인 72개 대사는 `-body.m4a`, `variant: body`도 제공한다. 이 파일은 같은 동물 화자로 본문만 말한다. 게임에서 이름을 기기의 로컬 음성으로 짧게 부른 다음 본문을 이어 재생할 수 있으며, 이름별 음원 제작이나 기기 간 파일 이동이 필요하지 않다. `address`는 원래 대사의 호칭 여부를 표시하므로 본문 음원에서도 `true`를 유지한다.
- 주요 사용자용 `-featured.m4a`, `variant: featured` 72개는 이름의 받침에 맞는 호칭과 본문을 한 문장으로 합성해 화자가 중간에 바뀌지 않는다. manifest의 `spokenText`는 `<preset>` 표시로 대체하며 실제 이름을 기록하지 않는다.
- `nameHash`는 설정한 이름과 미리 만든 음원을 연결하는 고정 조회 키다. **비밀을 보호하거나 익명화하는 장치가 아니며, 실제 이름은 공개 음원을 들으면 알 수 있다.**
- 동물별 기본 화자와 속도, 문장, 파일 SHA-256, 길이 및 수치 검증은 `manifest.json`에 기록한다. `file`은 이 폴더를 기준으로 한 상대 경로다.
- CPU 4스레드, 한국어 `ko`, 10단계 추론. 속도는 `FRIEND_VOICE_PROFILES.rate`와 같다. 음높이 변조를 추가하지 않는다.
- 20ms 단위 RMS가 -50dB를 넘는 구간을 찾고 앞뒤 100ms 여유를 남긴다. peak 0.7을 목표로 하되 증폭은 최대 2배로 제한한다.
- macOS 기본 `afconvert`로 44.1kHz, 모노, 64kbps AAC-LC/M4A를 만든다. 모든 파일을 다시 PCM으로 디코딩해 유한한 신호·길이·음량·클리핑·긴 무음을 확인한다.
- 자동 수치 검사는 발음의 정확성이나 목소리의 자연스러움을 보장하지 않는다. **전체 음원의 청취 검증은 수행하지 않았다.**

게임 실행에는 제작 환경·모델·네트워크 음성 API가 필요하지 않다. 음원 제작에는 미리 내려받은 공식 모델과 Python 3.9 이상, `supertonic==1.3.1`, macOS `afconvert`가 필요하다. 재생성 스크립트는 모델 자동 다운로드를 끄고 실행한다.

```sh
python scripts/generate-friend-voices.py --model /path/to/supertonic-3 --work-dir /path/to/temporary-audio
```

`--repo`, `--output`, `--cache-dir`로 소스·음원·임시 캐시 경로를 별도로 지정할 수 있다. 원본 WAV와 검증용 WAV는 임시 작업 폴더에만 저장한다.

`--preset-name-file /path/to/private-input.txt`를 지정하면 주요 사용자용 음원도 만든다. 이 옵션은 이름을 포함한 공개 음원 제작을 위해 명시적으로 사용하는 옵션이며, 입력 파일이나 이름 텍스트를 저장소에 복사하지 않는다. 미지정 시 일반 음원 252개만 제작한다. 주요 사용자용 음원이 이미 있는 출력 폴더에서는 같은 입력 파일을 지정해야 한다.

`--only-featured`는 기존 일반 음원 252개를 검사해 보존하고 주요 사용자용 72개만 추가한다. `--only-body`는 본문 72개만 다시 만든다. 두 경우 모두 선택하지 않은 음원의 대사·화자·속도·SHA-256을 검사해 보존하고 manifest를 합친다.
