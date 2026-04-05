# NoDupDownload (Chrome Extension)

중복 파일 다운로드 가능성을 감지해 다운로드를 차단하고, `계속`/`취소`를 선택하게 하는 크롬 확장 프로그램입니다.

## 디렉토리 구조

```text
NoDupDownload/
├─ manifest.json
├─ README.md
├─ icons/
│  └─ icon-128.png
├─ src/
│  ├─ background.js
│  └─ content.js
├─ ui/
│  ├─ alert.html
│  ├─ alert.css
│  └─ alert.js
└─ docs/
   ├─ WEBSTORE_REVIEW_CONTENT.md
   ├─ PRIVACY_POLICY.md
   ├─ privacy-policy.html
   └─ PRIVACY_POLICY_URL_SETUP.md
```

## 동작 방식

- 다운로드 파일명에서 자동 번호 접미사(예: ` (1)`)를 제거해 비교합니다.
- 동일한 파일명(정규화 기준) 또는 동일한 URL 경로로 이전 다운로드 이력이 있으면 중복으로 판단합니다.
- 중복으로 판단되면 해당 다운로드를 즉시 차단(`cancel`)합니다.
- 가능한 경우 다운로드가 발생한 탭 위에 오버레이 모달(`계속`/`취소`)을 표시합니다.
- 탭 오버레이를 띄울 수 없는 페이지(예: 일부 브라우저 내부 페이지)에서는 팝업 창으로 폴백합니다.
- `계속` 선택 시 다운로드를 다시 시작하고, `취소` 선택 시 중단 상태를 유지합니다.
- 크롬 UI 언어를 감지해 경고 문구를 한국어/영어로 자동 전환합니다.
- 중복 경고창에 이전 다운로드 일자를 함께 표시합니다.

## 중복 관리 로직

1. 초기 히스토리 캐시

- 확장 시작 시 최근 완료 다운로드(최대 5000개)를 읽어 파일 키/URL 키별 통계(count, lastTimestamp)를 메모리에 저장합니다.

2. 키 정규화

- 파일 키: 파일명 소문자화 + 마지막 자동 번호 접미사 ` (n)` 제거 (`foo (1).pdf` -> `foo.pdf`)
- URL 키: `host + path` 소문자화 + path 끝 `/` 제거
- 시그니처: `fileKey::urlKey`

3. 중복 판정 (`downloads.onDeterminingFilename`)

- `allowOnceSignatures`에 같은 시그니처가 있으면 1회 소비하고 통과시킵니다.
- 아니면 아래 조건 중 하나라도 참이면 중복으로 판정합니다.
- 완료 히스토리 캐시에 같은 파일 키 또는 URL 키가 존재
- 현재 진행 중(active) 키 카운트가 2 이상

4. 차단 및 사용자 선택

- 중복이면 현재 다운로드를 즉시 `cancel` 합니다.
- 결정 토큰과 함께 탭 오버레이를 우선 시도하고, 실패 시 팝업으로 폴백합니다.
- `계속`: 시그니처를 1회 허용 등록 후 `chrome.downloads.download(...)` 재시작
- 재시작 시 파일명은 절대 경로가 아니라 basename만 사용하고, filename 오류면 filename 없이 1회 재시도
- `취소`: 아무 동작 없이 종료

5. 상태 정리 (`downloads.onChanged`)

- `filename`, `url/finalUrl` 변경 이벤트가 오면 active 키를 갱신합니다.
- `complete`가 되면 완료 통계에 반영하고 active/alert 상태를 정리합니다.
- `interrupted`면 active/alert 상태만 정리합니다.

## 이번 리팩토링 요약

- 구조 정리: 백그라운드/콘텐츠 로직은 `src/`, 팝업 UI는 `ui/`로 분리
- UI 정리: 인라인 CSS 제거, `alert.css` 분리
- 성능 개선: 진행 중 다운로드 중복 판정을 O(n) 순회에서 O(1) 키 카운트 기반으로 변경
- 데이터 구조 단순화: 완료 이력 count/timestamp를 단일 통계 객체로 통합
- 안정성 개선: 결정 토큰 만료(TTL) 처리 및 버튼 중복 클릭 방지

## 설치 방법 (개발자 모드)

1. 크롬에서 `chrome://extensions`로 이동합니다.
2. 우측 상단 `개발자 모드`를 켭니다.
3. `압축해제된 확장 프로그램을 로드합니다`를 누르고 이 폴더를 선택합니다.
4. 다운로드를 진행하면 중복 감지 시 경고가 표시됩니다.

## 파일 구성

- `manifest.json`: 확장 메타데이터 및 권한 설정
- `icons/icon-128.png`: 확장 아이콘 (128x128)
- `src/background.js`: 다운로드 감지/중복 판정/차단/재시작 로직
- `src/content.js`: 현재 탭 오버레이 UI 렌더링 및 선택 처리
- `ui/alert.html`, `ui/alert.css`, `ui/alert.js`: 탭 오버레이 불가 시 폴백 팝업 UI

## 개인정보처리방침 (웹스토어 제출용)

- `docs/PRIVACY_POLICY.md`: 정책 원문 (KO/EN)
- `docs/privacy-policy.html`: 공개 URL 게시용 HTML
- `docs/PRIVACY_POLICY_URL_SETUP.md`: Privacy Policy URL 생성/등록 가이드
