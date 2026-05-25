# 사자가 메이플 할 때!
> 2026 Rachios - 2026.05.28. ~ 2026.05.29.

![HYU](static/background.png)

## How to Run?

1. `uv`가 없다면 설치해주세요.

- Windows

```powershell
# 방법 1
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

- Mac
```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. `.env.example`을 복사, 이름을 `.env`로 바꾸세요. 그리고, API 키를 입력하세요.

```env
NEXON_OPEN_API_KEY=여기에_내_API_키
APP_PORT=1939
QUIET_SERVER=1
FLASK_DEBUG=0
```

3. 서버를 실행합니다.

```sh
uv run python app.py
```

기본 주소는 `http://127.0.0.1:1939`입니다.

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
