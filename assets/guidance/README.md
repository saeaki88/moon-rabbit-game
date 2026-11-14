# 토끼의 한국어 안내 음원

이 폴더에는 Supertonic 3의 기본 화자 `F3`로 만든 **AI 합성 음성** 22개가 있다. 부탁 6개, 남은 수량 찾기 6개, 추가로 찾기 6개, 수 세기 3개, 감사 1개다. 문장은 `game.js`의 `GUIDANCE_AUDIO`에서 읽으며 개인 이름이나 다른 개인 입력을 포함하지 않는다. 실제 사람이나 가족의 목소리를 복제하지 않았다.

- 모델: [Supertone/supertonic-3](https://huggingface.co/Supertone/supertonic-3), revision `724fb5abbf5502583fb520898d45929e62f02c0b`.
- 모델 라이선스: [BigScience Open RAIL-M](https://huggingface.co/Supertone/supertonic-3/blob/724fb5abbf5502583fb520898d45929e62f02c0b/LICENSE). 생성물에도 관련 사용 제한이 적용되며 AI 합성 음성임을 알린다. 모델 가중치는 이 폴더에 포함하지 않는다.
- 제작 SDK: [Supertonic Python](https://github.com/supertone-oss-archive/supertonic-py), `supertonic==1.3.1`, MIT, Copyright © 2025 Supertone Inc. SDK는 게임 실행이나 배포에 포함하지 않는다.
- 한국어 `ko`, 속도 0.96, 10단계, CPU 4스레드로 제작한다. 추가 음높이 변조는 없다.
- 동물 음원과 동일하게 20ms 단위 RMS -50dB 기준으로 앞뒤 무음을 다듬고 100ms 여유를 남긴다. peak 0.7을 목표로 하되 증폭은 최대 2배로 제한한다.
- macOS `afconvert`로 모노 64kbps AAC-LC/M4A를 만들고 모든 파일을 PCM으로 다시 디코딩해 길이·신호·음량·클리핑·긴 무음을 확인한다. 한 음절 수 세기를 허용하도록 검증 최소 길이는 0.15초다.
- `manifest.json`에는 문장·화자·속도·모델 출처·파일 SHA-256·길이·처리 및 검증 수치를 기록한다. `file`은 이 폴더 기준 상대 경로다.

자동 수치 검사는 발음이나 실제 자연스러움을 보장하지 않는다. 전체 음원 청취 검증은 별도로 필요하다.

미리 내려받은 모델과 Python 3.9 이상, `supertonic==1.3.1`, macOS `afconvert`가 있는 제작 환경에서 다음 명령으로 다시 만든다. 모델 자동 다운로드와 온라인 음성 API는 사용하지 않는다.

```sh
python scripts/generate-guidance-voices.py --model /path/to/supertonic-3 --work-dir /path/to/temporary-audio
```

`scripts/generate-friend-voices.py`의 정적 객체 파서와 음원 처리 도구를 재사용한다. `--repo`, `--output`, `--cache-dir`로 제작 경로를 지정할 수 있고 원본·검증 WAV는 임시 작업 폴더에만 둔다. 게임은 완성된 M4A 파일만 재생하며 제작 모델이나 Python 의존성을 요구하지 않는다.
