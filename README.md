# 사자가 메이플 할 때!
> 2026 Rachios - 2026.05.28. ~ 2026.05.29.

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
`static/platforms.json`에서 캐릭터가 존재할 수 있는 위치를 지정할 수 있습니다. 좌표는 캐릭터의 좌우 정중앙, 위아래 최하단 좌표 기준입니다.
자세한 파라미터는 넥슨 API, 또는 [queryparam](queryparam.md)를 참고하세요.


## SQL Query

- `query/CLEAN_QUEUE.sql`: 화면에 올라온 캐릭터 대기열만 비웁니다. `chars` 테이블의 캐릭터 정보와 랭킹 데이터는 유지됩니다.
- `query/CLEAN_DB.sql`: `chars`, `char_queue`를 모두 비웁니다. 캐릭터 정보와 랭킹 데이터까지 삭제됩니다.

UI의 `대기열 비우기`, `DB 비우기` 버튼도 같은 작업을 수행합니다. 버튼을 누르면 관리 비밀번호를 입력해야 하며, 이 값은 `.env`의 `DB_ADMIN_PASSWORD`와 비교됩니다.
