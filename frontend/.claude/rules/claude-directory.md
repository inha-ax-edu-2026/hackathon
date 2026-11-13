---
paths:
  - ".claude/**"
  - "CLAUDE.md"
  - "CLAUDE.local.md"
  - ".mcp.json"
  - ".worktreeinclude"
---

# `.claude/` 디렉토리 규칙

사람이든 에이전트든 따른다. 근거는 공식 문서 [`.claude` 디렉토리 탐색](https://code.claude.com/docs/ko/claude-directory)이다. CI의 `Repository structure` step이 커밋된 `.claude/` 최상위 경로를 아래 표 첫 칸과 대조하고, `rules/`·`agents/`·`output-styles/`에 `.md`만 있는지 본다.

## `.claude/` 최상위에는 아래만 둔다

| 경로 | 무엇 | 커밋 |
| - | - | - |
| `settings.json` | 권한, hooks, 환경 변수 | ✓ |
| `settings.local.json` | 개인 재정의 | gitignore |
| `rules/*.md` | 주제별 지침 | ✓ |
| `skills/<name>/SKILL.md` | `/name`으로 부르는 프롬프트 | ✓ |
| `agents/*.md` | subagent 정의 | ✓ |
| `output-styles/*.md` | 출력 스타일 | ✓ |
| `workflows/*.js` | 동적 워크플로우 | ✓ |
| `agent-memory/<name>/` | subagent 메모리 | ✓ |
| `hooks/` | `settings.json`이 실행하는 hook 스크립트. 그 밖의 스크립트는 넣지 않는다 | ✓ |

- `commands/`는 쓰지 않는다. skill과 같은 메커니즘이니 새 프롬프트는 `skills/`로 만든다.
- `skills/<name>/` 안의 보조 파일(`reference.md`, `scripts/` 등)은 자유다.
- `rules/`, `agents/`, `output-styles/`에는 `.md` 파일만 둔다.
- 앱이 만들고 gitignore한 `worktrees/`는 손으로 쓰는 파일이 아니라 이 표 밖이다.

## 루트에 둘 것은 `.claude/`에 넣지 않는다

`CLAUDE.md`, `CLAUDE.local.md`(gitignore), `.mcp.json`, `.worktreeinclude`는 저장소 루트에 둔다. `.claude/` 안에 두면 읽히지 않는다.

## 표에 없는 것을 만들려면 문서부터 본다

위 문서를 열어 확인한다. 문서에 있으면 이 표를 고치고 진행한다. 없으면 만들지 않는다. 표와 문서가 어긋나면 문서가 맞다.
