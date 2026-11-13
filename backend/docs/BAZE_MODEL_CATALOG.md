# 학교 BAZE API 모델 목록

사용자가 2026-11-13에 학교 API 사이트에서 확인하여 제공한 목록이다.
이 프로젝트의 모델 ID와 경로를 확인할 때 참고한다. 모델 이름과 ID는 제공된 표기를 보존했다.

- 초기 로컬 설정의 미검증 게이트웨이 주소: `https://api.baze.co/v1/gateway`. 학교 API 안내의 Base URL과 대조해야 한다. 공식 일반 문서의 예시는 `https://factchat-cloud.mindlogic.ai/v1/gateway`이며 학교별 안내를 우선한다.
- 아래 경로는 제공된 상대 경로다. 기본 주소와의 실제 결합 방식, 인증 헤더, 요청·응답 필드는 호출 예제로 확인해야 한다.
- 모델 등재 여부는 사용자 제공 목록으로 확인했다. 개별 모델 호출 성공, 한국어 음성 품질, 지연 시간, 이용 한도 및 데이터 보관 정책은 아직 검증하지 않았다.
- API 키는 `backend/.env`에서 관리한다.

## SAFE-PATH 음성 상담에서 참고할 항목

| 처리 단계 | 목록에 있는 모델 | 관련 제공 경로 |
| --- | --- | --- |
| 음성 전사(STT) | Soniox `stt-async-v6`, `stt-async-v5` | `POST /audio/transcriptions/` |
| 텍스트 상담 | 아래 대화·범용 모델 목록 | 대화 API 경로는 이번 자료에 미제공 |
| 답변 음성 합성(TTS) | Gemini `gemini-3.8-flash-tts`, `gemini-3.1-flash-tts-preview`, `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts` | `POST /audio/speech/` |
| 실시간 음성 대화 검토 | GPT Realtime 2.1 계열, Gemini 3.8 Live 계열 | `POST /realtime/sessions/` |

실시간 세션 생성 이후의 연결 방식, STT 응답의 동기·비동기 여부와 결과 수신 방식은 호출 문서로 확인한다. 모델 이름만으로 WebSocket·WebRTC 지원이나 한국어 품질을 확정하지 않는다.

## 대화·범용 모델

이 구간의 API 경로는 사용자 제공 자료에 포함되지 않았다.

| 표시 이름 | 모델 ID |
| --- | --- |
| GPT-6.1 Sol | `gpt-6.1-sol` |
| GPT-6.1 Terra | `gpt-6.1-terra` |
| GPT-6 Sol | `gpt-6-sol` |
| GPT-6 Luna | `gpt-6-luna` |
| GPT-5.6 Luna | `gpt-5.6-luna` |
| GPT-5.4 Pro | `gpt-5.4-pro` |
| GPT-5.6 Terra | `gpt-5.6-terra` |
| GPT-5.2 Pro | `gpt-5.2-pro` |
| GPT-5.6 Sol | `gpt-5.6-sol` |
| GPT-5.5 | `gpt-5.5` |
| GPT-5.4 | `gpt-5.4` |
| GPT-5.4 mini | `gpt-5.4-mini` |
| GPT-5.4 nano | `gpt-5.4-nano` |
| GPT-5.2 | `gpt-5.2` |
| GPT-5.1 | `gpt-5.1` |
| GPT Audio 1.5 | `gpt-audio-1.5` |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` |
| Claude Haiku 5.5 | `claude-haiku-5-5` |
| Claude Opus 5.5 | `claude-opus-5-5` |
| Claude 4.6 Sonnet | `claude-sonnet-4-6` |
| Claude Sonnet 5 | `claude-sonnet-5` |
| Claude Opus 5 | `claude-opus-5` |
| Claude 4.6 Opus | `claude-opus-4-6` |
| Claude 4.7 Opus | `claude-opus-4-7` |
| Claude 4.8 Opus | `claude-opus-4-8` |
| Claude 4.5 Haiku | `claude-haiku-4-5-20251001` |
| Gemini 4 Carbon | `gemini-4-carbon` |
| Gemini 4 Hydrogen | `gemini-4-hydrogen` |
| Gemini 4 Argon | `gemini-4-argon` |
| Gemini 3.8 Flash | `gemini-3.8-flash` |
| Gemini 3.7 Flash | `gemini-3.7-flash` |
| Gemini 3.6 Flash | `gemini-3.6-flash` |
| Gemini 3.5 Flash | `gemini-3.5-flash` |
| Gemini 3.5 Flash-Lite | `gemini-3.5-flash-lite` |
| Gemini 3.1 Pro | `gemini-3.1-pro-preview` |
| Gemini 3.1 Flash Lite | `gemini-3.1-flash-lite` |
| Grok 4.7 | `grok-4.7` |
| Grok 4.6 | `grok-4.6` |
| Grok 4.5 | `grok-4.5` |
| Grok 4.1 Fast | `grok-4-1-fast` |
| Gemma 4 | `google/gemma-4-31B-it` |
| Gemma 3 | `google/gemma-3-27b-it` |
| Muse Spark 1.3 | `muse-spark-1.3` |
| Sonar Pro | `sonar-pro` |
| Sonar Reasoning Pro | `sonar-reasoning-pro` |
| Solar Pro 3 | `solar-pro3` |
| Seed 2.0 Pro | `seed-2-0-pro-260328` |
| Seed 2.0 Lite | `seed-2-0-lite-260428` |

## 이미지

제공 경로: `POST /images/generate/`

| 표시 이름 | 모델 ID |
| --- | --- |
| GPT Image 2.6 Sunburst | `gpt-image-2.6-sunburst` |
| Nano Banana 2.1 | `gemini-nano-banana-2.1` |
| Nano Banana 2 | `gemini-3.1-flash-image-preview` |
| Nano Banana 2 Lite | `gemini-3.1-flash-lite-image` |
| Nano Banana Pro | `gemini-3-pro-image-preview` |
| Nano Banana | `gemini-2.5-flash-image` |
| GPT Image 2.6 Flare | `gpt-image-2.6-flare` |
| GPT Image 2.5 Sunburst | `gpt-image-2.5-sunburst` |
| GPT Image 2.5 Flare | `gpt-image-2.5-flare` |
| GPT Image 2 | `gpt-image-2` |
| FLUX 2 [pro] | `fal-ai/flux-2-pro` |
| FLUX 1.1 [pro] | `fal-ai/flux-pro/v1.1` |
| Grok Imagine 2.0 | `xai/grok-imagine-image/v2.0/text-to-image` |
| Seedream 5.0 Pro | `bytedance/seedream-5-pro` |
| Seedream 5.0 Lite | `fal-ai/bytedance/seedream/v5/lite` |
| Seedream 4.5 | `fal-ai/bytedance/seedream/v4.5` |
| Seedream 4.0 | `bytedance/seedream-4` |
| Seedream 5.0 Pro Layerize | `bytedance/seedream/v5/pro/layerize` |
| SDXL | `fal-ai/fast-sdxl` |
| Ideogram V4 [fast] | `ideogram/v4/fast` |
| Ideogram V3 | `fal-ai/ideogram/v3` |
| Recraft V4 | `fal-ai/recraft/v4/text-to-image` |
| Qwen Image 3 Pro | `qwen-image-3.0-pro` |

## 영상

제공 경로: `POST /video/generation/`

| 표시 이름 | 모델 ID |
| --- | --- |
| MiniMax H3 Max Turbo | `minimax/h3-max-turbo` |
| Gemini Omni Flash 1.2 | `google/gemini-omni-flash/v1.2` |
| Gemini Omni Flash 1.1 | `google/gemini-omni-flash/v1.1` |
| Kling 4.0 | `kling/v4` |
| Kling 3.0 | `fal-ai/kling-video/v3` |
| Kling O3 | `fal-ai/kling-video/o3` |
| Kling v2.5 Turbo Pro | `fal-ai/kling-video/v2.5-turbo/pro` |
| Grok Imagine Video | `xai/grok-imagine-video` |
| Seedance 2.5 | `bytedance/seedance-2.5` |
| Seedance 2.0 | `bytedance/seedance-2.0` |
| Seedance 2.0 Fast | `bytedance/seedance-2.0/fast` |
| Seedance 1.5 Pro | `bytedance/seedance-1.5-pro` |
| Seedance 1.0 Pro | `bytedance/seedance-1-pro` |
| Seedance 1.0 Pro Fast | `bytedance/seedance-1.0-pro/fast` |
| Pixverse V5 | `fal-ai/pixverse/v5` |
| Hailuo 02 | `fal-ai/minimax/hailuo-02` |
| MiniMax H3 Max | `minimax/h3-max` |
| Luma Ray 2 | `fal-ai/luma-dream-machine/ray-2` |
| Vidu Q3 | `fal-ai/vidu/q3` |
| LTX-2.5 Fast | `lightricks/ltx-2.5/fast` |
| LTX-2.5 Pro | `lightricks/ltx-2.5/pro` |
| Wan 3.0 | `wan3.0-video` |

## 오디오

제공 경로: `POST /audio/speech/`, `POST /audio/music/`, `POST /audio/transcriptions/`

| 표시 이름 | 모델 ID |
| --- | --- |
| Gemini 2.5 Flash TTS | `gemini-2.5-flash-preview-tts` |
| Gemini 2.5 Pro TTS | `gemini-2.5-pro-preview-tts` |
| Gemini 3.1 Flash TTS | `gemini-3.1-flash-tts-preview` |
| Gemini 3.8 Flash TTS | `gemini-3.8-flash-tts` |
| Lyria 3 Pro | `lyria-3-pro-preview` |
| Lyria 3 Clip | `lyria-3-clip-preview` |
| ElevenLabs Music | `elevenlabs-music` |
| ElevenLabs SFX | `elevenlabs-sfx` |
| Soniox STT | `stt-async-v6` |
| Soniox STT | `stt-async-v5` |

## 임베딩

제공 경로: `POST /embeddings/`

| 표시 이름 | 모델 ID |
| --- | --- |
| Text Embedding 3 Small | `text-embedding-3-small` |
| Text Embedding 3 Large | `text-embedding-3-large` |
| Gemini Embedding 2 | `gemini-embedding-2` |
| Qwen Text Embedding v4 | `text-embedding-v4` |
| Qwen3.7 Text Embedding | `qwen3.7-text-embedding` |
| Tongyi Embedding Vision Plus | `tongyi-embedding-vision-plus` |

## 의사결정

제공 경로: `POST /decisions/`

| 표시 이름 | 모델 ID |
| --- | --- |
| Jev 1.14 | `jev-1.14.0` |
| Jev 1.13 | `jev-1.13.0` |
| GPT-6 Luna Decisions | `gpt-6-luna-decisions` |

## 실시간

제공 경로: `POST /realtime/sessions/`

| 표시 이름 | 모델 ID |
| --- | --- |
| GPT Realtime 2.1 | `gpt-realtime-2.1` |
| GPT Realtime 2.1 Mini | `gpt-realtime-2.1-mini` |
| Gemini 3.8 Live | `gemini-3.8-live` |
| Gemini 3.8 Live (Extended Thinking) | `gemini-3.8-live-extended-thinking` |
