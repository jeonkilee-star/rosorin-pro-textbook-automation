# 교재개발 자동화 (MVP 완료)

레슨 콘텐츠(JSON) → 디자인 3종(A·NCS형/B·메이커형/C·하이브리드형) 자동 렌더링 → 트랙별(대학/대학교) PDF 자동 생성 파이프라인. MVP 단계 검증 완료.

## 구조
```
lessons/   레슨 콘텐츠 JSON (디자인과 무관한 순수 데이터) — 20개
styles/    디자인 3종 CSS (rosorin_textbook_designs.html에서 그대로 추출, 재디자인 안 함)
assets/    사진 등 리소스
render.js  JSON → 디자인별 HTML 렌더러 (renderLessonA/B/C)
export_pdf.js  headless Chrome로 HTML → PDF
build/     렌더링 중간 산출물(HTML)
output/    최종 PDF (디자인 3종 × 트랙 2종 = 6개)
```

## 사용법
```bash
node render.js --design a|b|c --track jeondae|daehak   # build/build_{design}_{track}.html 생성
node export_pdf.js --all                                 # build/*.html → output/*.pdf 전체 변환
```

## 현재 상태
- [x] 3개 디자인 CSS 추출 (`styles/all-designs.css`)
- [x] 레슨 콘텐츠 추출 스크립트 작성 (`extract_lessons.py`) — Design A 원문에서 6개 파일럿 레슨을 JSON 스키마로 역변환
- [x] JSON 실행 및 검증
- [x] render.js (디자인별 렌더러) — 정적 출력물이므로 원본 프로토타입의 `.mockup` 페이드인 애니메이션은 꺼서 PDF 캡처 시 텍스트가 저opacity로 찍히는 문제를 해결함
- [x] export_pdf.js
- [x] 트랙 필터링 검증 — 임시 daehak 전용 테스트 레슨으로 필터가 정확히 동작함을 확인 후 제거
- [x] 화면 전용 플로팅 목차 버튼 — 우하단에 항상 떠 있는 "목차" 버튼(스크롤해도 고정), 클릭 시 레슨 목록 패널이 열리고 각 항목을 누르면 요약(훈련시간·선수학습·첫 학습목표) + "바로가기" 버튼이 아코디언으로 펼쳐짐(한 번에 하나만 열림). 바로가기를 누르면 해당 레슨으로 스크롤 이동 후 패널만 닫히고 버튼은 계속 화면에 남음. `@media print`로 인쇄 시에는 완전히 숨김 — 브라우저에서 실제 클릭·이동 동작까지 검증 완료
- [x] 트랙 콘텐츠 차등화 1단계 — 스키마에 `theoryDeepDive` 필드 추가, render.js가 daehak 트랙에서만 "심화 이론" 섹션을 렌더링(본문은 두 트랙 동일). 03-2(메카넘 역기구학)·08-1(PID 제어이론)·12-1(프롬프트 엔지니어링+eval() 보안)·14-1(좌표변환·동차좌표) 4개 레슨에 적용
- [x] 한글화된 `src_ros2` 소스코드를 근거로 신규 레슨 11개 추가 작성: `07-1_tracking.json`(object_tracking.py), `08-1_lidar.json`(lidar_controller.py), `10-1_yolo.json`(yolo_node.py), `11-1_voice.json`(voice_control_move.py + awake_node.py), `12-1_llm_move.json`(llm_control_move.py), `13-1_waste.json`(waste_classification.py + pick_and_place.py), `14-1_object_sorting.json`(object_sorting.py), `15-1_hand_gesture.json`(hand_trajectory_node.py + hand_gesture_control_node.py), `16-1_self_driving.json`(self_driving.py — 06-1·10-1의 알고리즘을 통합한 캡스톤), `17-1_function_calling.json`(llm_control.py — OpenAI 스타일 tool calling, 12-1과 대비), `18-1_llm_visual_patrol.json`(llm_visual_patrol.py — 세 번째 LLM 출력 처리 방식), `19-1_fall_detect.json`(fall_down_detect.py — MediaPipe Pose 기반 낙상 감지), `20-1_body_track.json`(body_track.py — 뎁스카메라 기반 사람 추적, 07-1과 대비), `21-1_body_rgb_control.json`(body_and_rgb_control.py — 몸짓 캘리브레이션 + 옷 색상 기반 인물 고정 + Ackermann 저수준 모터 제어) — 모두 실제 소스 file:line 인용 포함
- [x] `17-1_function_calling.json` 작성 중 벤더 소스 자체의 실제 불일치 발견: robot_move_control 도구 설명의 영어("90도 회전에 8초")와 한글 번역("90° 회전에 걸리는 시간은 4초") 숫자가 서로 다름
- [x] `14-1_object_sorting.json` 작성 중 벤더 소스 자체의 실제 버그 발견: `go_home()`의 "bule"(→"blue") 오타 + 절대 도달하지 않는 elif 분기(다만 계산된 값을 어디에도 안 써서 죽은 코드라 실제 동작엔 영향 없음)
- [x] `12-1_llm_move.json` 작성 중 발견: ASR_LANGUAGE 분기가 'Chinese'/그 외(영어) 둘뿐이라, 이번 세션의 한글화 작업은 'Chinese' 분기 프롬프트의 "텍스트 내용"만 한국어로 바꿨을 뿐 분기 조건 자체는 그대로임 — 실제 배포판에서 어떤 프롬프트가 쓰이는지는 ASR_LANGUAGE 값을 직접 확인해야 함
- [x] `11-1_voice.json` 작성 중 벤더 소스 자체의 내부 불일치 발견: `voice_control_move.py`의 영어 로그("hello hiwonder")와 한글 설명("샤오환샤오환")·`awake_node.py`의 실제 파라미터 기본값이 서로 다름 — 이전 인수인계 문서의 "Hello, Hiwonder" 웨이크워드 기록이 어디서 나왔는지 설명됨 (자세한 내용은 프로젝트 메모리 참고)

## 알려진 한계 (다음 단계로 미룸)
- render.js의 Design B/C는 Design A에서 추출한 콘텐츠를 각 디자인의 시각 문법(hero+step, card 등)으로 기계적으로 재배치한 것으로, 손으로 만든 프로토타입의 디자인별 맞춤 문구(감탄사·톤)와는 표현이 다를 수 있음
- 트랙 차등화는 "심화 이론 섹션 추가" 1단계만 적용됨(13개 중 4개 레슨) — 나머지 레슨에도 적용할지, 평가·과제 차등화(2단계)까지 할지는 미정
- 53개 레슨 전체 콘텐츠 작성, 웹 UI는 이번 범위 밖

## 수정된 버그
- Design B의 코드블록이 `.b-step`(2열 그리드: 44px+1fr) 안에 자식 1개만 넣은 채로 삽입되어, 그리드 자동배치로 44px 칸에 눌려 들어가 코드가 한 글자씩 세로로 줄바꿈되던 버그 — Design B의 PDF 페이지 수가 A/C의 약 2배였던 원인이 바로 이것이었음(당초 `break-inside:avoid` 규칙 때문으로 잘못 추정했었음). 코드블록을 `.b-step` 밖의 일반 블록으로 옮겨 해결 — 수정 후 Design B 페이지 수가 오히려 A/C보다 적어짐
- `.code-block`의 font-family가 'IBM Plex Mono'/'JetBrains Mono'로만 지정되어 있었는데, 이 폰트들을 실제로 불러오는 `<link>`나 `@font-face`가 어디에도 없어서(원본 프로토타입 포함) 브라우저가 OS 기본 monospace 폰트로 대체됨 — 이 PC의 한국어 로캘 환경에서는 그 대체 폰트가 백슬래시(`\`)를 원화 기호(₩)로 그려서, 정규식·Windows 경로·bash 줄바꿈(`\`)이 들어간 모든 코드블록(6개 레슨 확인)에서 글자가 깨져 나오고 있었음. `font-family`에 `'Consolas','Courier New'`를 앞에 추가해 해결

상세 설계는 프로젝트 채팅 세션의 승인된 계획 참고.

## 참고 저장소
- 콘텐츠 원본(디자인 시안): https://github.com/jeonkilee-star/rosorin-pro-textbook-design
