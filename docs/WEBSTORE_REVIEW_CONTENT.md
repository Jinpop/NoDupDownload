# NoDupDownload - Chrome Web Store 심사 제출용 문구

이 문서는 Chrome Web Store 심사 입력란에 붙여 넣을 수 있는 실사용 문구를 정리한 문서입니다.

## 1) Store Listing 문구

### 1-1. 요약 설명 (Korean)

중복 파일 다운로드를 감지해 즉시 차단하고, 현재 탭에서 계속/취소를 선택할 수 있게 도와주는 확장 프로그램입니다.

### 1-2. 상세 설명 (Korean)

NoDupDownload는 중복 다운로드를 줄이기 위한 브라우저 확장 프로그램입니다.

주요 기능:

- 다운로드 시 파일명/URL 기준으로 중복 가능성을 감지합니다.
- 중복 가능성이 있으면 다운로드를 일시 차단합니다.
- 현재 탭 위 오버레이에서 `계속` 또는 `취소`를 선택할 수 있습니다.
- 오버레이를 띄울 수 없는 페이지에서는 팝업 창으로 안내합니다.
- Chrome UI 언어를 감지해 한국어/영어로 안내 문구를 표시합니다.
- 중복 알림에 이전 다운로드 일자를 함께 보여줍니다.

사용 목적:

- 같은 파일을 반복 다운로드하는 실수를 줄이고 저장공간/정리 비용을 줄입니다.

### 1-3. Summary (English)

Detects likely duplicate downloads, blocks them first, and lets users choose Continue or Cancel from an in-page prompt.

### 1-4. Detailed Description (English)

NoDupDownload helps reduce accidental duplicate file downloads.

Key features:

- Detects possible duplicates using normalized filename and download URL.
- Blocks the duplicate attempt first.
- Shows an in-page decision overlay with Continue/Cancel.
- Falls back to a popup window when overlay cannot be injected.
- Automatically localizes UI to Korean or English.
- Shows previous download date in duplicate warning.

Purpose:

- Prevent repeated downloads of the same file and reduce storage clutter.

## 2) Privacy 탭 - Single Purpose

### Single Purpose (Korean)

이 확장 프로그램의 단일 목적은 사용자의 다운로드 과정에서 중복 가능성이 있는 파일을 감지하고, 사용자 확인(계속/취소)을 통해 중복 다운로드를 방지하는 것입니다.

### Single Purpose (English)

The single purpose of this extension is to detect likely duplicate downloads and prevent accidental duplicates by requiring a user decision (Continue or Cancel).

## 3) Privacy 탭 - Permission Justification

### `downloads` 권한 사유 (Korean)

중복 다운로드 판정을 위해 다운로드 항목의 파일명, URL, 상태, 시각 정보를 조회하고, 중복으로 판단된 다운로드를 차단하거나 사용자의 `계속` 선택 시 재시작하기 위해 필요합니다.

### `downloads` justification (English)

Required to read download metadata (filename, URL, state, timestamp) for duplicate detection, cancel a duplicate attempt, and restart it when the user chooses Continue.

### `tabs` 권한 사유 (Korean)

다운로드가 발생한 탭을 식별하고, 해당 탭에 중복 경고 오버레이를 표시하기 위해 필요합니다.

### `tabs` justification (English)

Required to identify the tab related to the download and show the duplicate decision overlay in that tab.

### `<all_urls>` (content script match) 사유 (Korean)

다운로드는 다양한 도메인에서 발생하므로, 중복 경고 오버레이를 "현재 다운로드가 발생한 페이지"에 표시하려면 모든 URL 범위에서 콘텐츠 스크립트를 로드할 수 있어야 합니다.

### `<all_urls>` justification (English)

Downloads can be initiated from any website. The content script must be available on all URLs to show the in-page duplicate prompt on the originating page.

## 4) Privacy 탭 - Remote Code

### Remote Code Use

No. This extension does not load or execute remotely hosted JavaScript or other remote executable code.

## 5) Privacy 탭 - Data Usage Disclosure

### 데이터 처리 고지 (Korean)

- 수집/처리 항목: 다운로드 파일명, 다운로드 URL(호스트/경로), 다운로드 상태, 시작/완료 시각, 관련 탭 ID
- 사용 목적: 중복 다운로드 감지 및 사용자 확인 UI 표시
- 전송 여부: 외부 서버로 전송하지 않음
- 공유/판매 여부: 제3자 제공/판매 없음
- 저장 방식: 확장 프로그램 내부 메모리에서 일시 처리(다운로드 이력 원본은 Chrome의 기본 다운로드 기록 사용)

### Data usage disclosure (English)

- Data processed: download filename, download URL (host/path), download state, start/end timestamp, related tab ID
- Purpose: duplicate detection and user confirmation prompt
- Transmission: no data is sent to external servers
- Sharing/Sale: no sharing or sale to third parties
- Storage: processed temporarily in extension memory (source history comes from Chrome's own download history)

## 6) Test Instructions (심사자용)

아래 텍스트를 `Test instructions` 탭에 그대로 사용하세요.

### Test Instructions (Korean)

1. 확장 프로그램을 설치/활성화합니다.
2. 새 탭에서 아래 URL을 열어 파일을 1회 다운로드합니다.
   - https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
3. 동일 URL을 다시 다운로드합니다.
4. 중복 감지 오버레이(또는 팝업)가 표시되고, 파일명/중복 사유/이전 다운로드 일자가 노출되는지 확인합니다.
5. `취소`를 누르면 추가 다운로드가 진행되지 않아야 합니다.
6. 다시 동일 URL을 다운로드하여 이번에는 `계속`을 누릅니다.
7. 다운로드가 재시작되고 파일이 저장되는지 확인합니다.

비고:

- 일부 페이지(예: 브라우저 내부 페이지)에서는 오버레이 대신 팝업 폴백 UI가 표시될 수 있습니다.
- 테스트에 별도 계정/로그인은 필요하지 않습니다.

### Test Instructions (English)

1. Install and enable the extension.
2. Open the URL below in a new tab and download the file once:
   - https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
3. Download the same URL again.
4. Confirm that a duplicate warning overlay (or popup fallback) appears and shows file name, reason, and previous download date.
5. Click `Cancel` and verify no additional download proceeds.
6. Try the same URL again and click `Continue`.
7. Verify the download restarts and the file is saved.

Notes:

- On restricted pages (for example, browser internal pages), a popup fallback may be shown instead of in-page overlay.
- No login or test account is required.

## 7) Reviewer Notes (선택 입력)

### Korean

이 확장 프로그램은 다운로드 중복 방지 목적 외 기능이 없으며, 사용자 데이터는 외부로 전송하지 않습니다. 원격 코드 실행을 사용하지 않습니다.

### English

This extension has no purpose other than duplicate-download prevention. It does not transmit user data externally and does not use remote code execution.

## 8) Privacy Policy URL

Chrome Web Store의 `Privacy policy URL`에는 아래 공개 URL을 입력하세요.

- Recommended: `https://<github-username>.github.io/<repo-name>/privacy-policy.html`

관련 파일:

- `docs/privacy-policy.html`
- `docs/PRIVACY_POLICY.md`
- `docs/PRIVACY_POLICY_URL_SETUP.md`
