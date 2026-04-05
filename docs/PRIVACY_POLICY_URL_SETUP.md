# Privacy Policy URL 설정 가이드 (Chrome Web Store)

Chrome Web Store 등록 시 `Privacy policy URL` 항목에 공개 URL이 필요합니다.

## 빠른 방법: GitHub Pages

1. 이 저장소를 GitHub 원격 저장소로 push 합니다.
2. GitHub 저장소의 `Settings > Pages`로 이동합니다.
3. `Build and deployment`에서 아래처럼 설정합니다.

- Source: `Deploy from a branch`
- Branch: `main` (또는 사용 브랜치)
- Folder: `/docs`

4. 저장 후 배포가 완료되면 아래 형식의 URL이 생성됩니다.

- `https://<github-username>.github.io/<repo-name>/privacy-policy.html`

5. 해당 URL을 Chrome Web Store의 `Privacy policy URL` 입력란에 넣습니다.

## 포함된 파일

- `docs/privacy-policy.html`: 웹 게시용 정적 페이지
- `docs/PRIVACY_POLICY.md`: 문서 원본(편집용)
