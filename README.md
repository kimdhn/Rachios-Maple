# 사자가 메이플 할 때!
> 2026 애한제 - 2026.05.28. ~ 2026.05.29.

![HYU](static/background.png)

## How to Run?

`scripts/` 아래의 파일을 아래와 같이 실행해주세요.

### macOS

```sh
sh scripts/run.sh
```

### Windows

파일 탐색기에서 `scripts\run.bat`을 더블클릭해서 실행해주세요. 또는, 아래의 커맨드로 실행합니다.

PowerShell:

```powershell
.\scripts\run.ps1
```

PowerShell 실행 정책 때문에 막히면 아래 명령을 사용하세요.

```powershell
powershell -ExecutionPolicy ByPass -File .\scripts\run.ps1
```

기본 주소는 `http://127.0.0.1:1939`입니다.

<details>
<summary>수동으로 환경 설정하고 실행하기</summary>

### Manual Setup

1. `uv`가 없다면 설치해주세요.

Windows PowerShell:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

macOS:

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. `.env.example`을 복사해서 `.env`를 만들고 값을 입력하세요.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS:

```sh
cp .env.example .env
```

`.env` 예시:

```env
NEXON_OPEN_API_KEY=여기에_내_API_키
DB_ADMIN_PASSWORD=여기에_관리_비밀번호
ADMIN_MODE=0
APP_PORT=1939
QUIET_SERVER=1
FLASK_DEBUG=0
```

3. 서버를 실행합니다.

```sh
uv run python app.py
```

기본 주소는 `http://127.0.0.1:1939`입니다.

</details>

## Manage Database

이 프로젝트는 `db.sqlite3` 파일을 사용합니다. SQL 파일을 DB에 바로 적용하려면 아래처럼 실행합니다.

### macOS

```sh
sqlite3 db.sqlite3 < query/CLEAN_QUEUE.sql
sqlite3 db.sqlite3 < query/CLEAN_DB.sql
```

### Windows PowerShell

Windows에서는 `sqlite3` CLI가 설치되어 있고 PATH에 등록되어 있어야 합니다.

```powershell
sqlite3 db.sqlite3 ".read query/CLEAN_QUEUE.sql"
sqlite3 db.sqlite3 ".read query/CLEAN_DB.sql"
```

## Platform
`static/platforms.js`에서 홈 화면 캐릭터가 존재할 수 있는 위치를 지정할 수 있습니다. `/fame` 화면의 배치는 `static/fame-platforms.js`에서 지정합니다. 좌표는 캐릭터의 좌우 정중앙, 위아래 최하단 좌표 기준입니다.
자세한 파라미터는 넥슨 API, 또는 [queryparam](queryparam.md)를 참고하세요.


## SQL Query

- `query/CLEAN_QUEUE.sql`: 화면에 올라온 캐릭터 대기열만 비웁니다. `chars` 테이블의 캐릭터 정보와 랭킹 데이터는 유지됩니다.
- `query/CLEAN_DB.sql`: `chars`, `char_queue`를 모두 비웁니다. 캐릭터 정보와 랭킹 데이터까지 삭제됩니다.

UI의 `집 보내기`, `DB 비우기` 버튼도 같은 작업을 수행합니다. 버튼을 누르면 관리 비밀번호를 입력해야 하며, 이 값은 `.env`의 `DB_ADMIN_PASSWORD`와 비교됩니다. `DB 비우기` 버튼은 `.env`에서 `ADMIN_MODE=1`로 실행한 경우에만 표시됩니다.

`/fame` 화면은 `fame_entries` 테이블을 사용합니다. 캐릭터명과 금액을 입력하면 금액 높은 순으로 표시되며, 추가/갱신/삭제는 모두 관리 비밀번호가 필요합니다.

`/octopus` 화면은 황금문어 키우기 게임입니다. 확률 판정은 서버에서 하며, 게임이 끝나면(9레벨, 도망, 먹이 100회 소진, 멈추기) `octopus_records` 테이블에 캐릭터별 최고 기록(레벨 높은 순 → 먹이 횟수 적은 순)만 남깁니다. 확률 로직 확인은 `uv run python test_octopus.py`로 할 수 있습니다.

홈 화면 관리 영역의 `방문 확인` 버튼으로 실제 부스에 방문한 캐릭터를 체크/해제할 수 있습니다. 체크 여부는 화면이나 랭킹 표시에 영향을 주지 않으며, 명예의 전당에 추가된 캐릭터는 자동으로 체크됩니다.

DB 변경 이력은 `logs/db_changes.log`에 남습니다. 실행 스크립트(`scripts/run.sh`, `scripts/run.ps1`)는 서버 시작 전에 `logs/` 폴더를 자동으로 만듭니다.
