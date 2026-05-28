#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_DIR"

set_env_value() {
  key="$1"
  value="$2"
  tmp_file=".env.tmp"

  if grep -Eq "^${key}=" .env; then
    awk -v key="$key" -v value="$value" '
      BEGIN { prefix = key "=" }
      index($0, prefix) == 1 { print prefix value; next }
      { print }
    ' .env > "$tmp_file"
    mv "$tmp_file" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

get_env_value() {
  key="$1"
  grep -E "^${key}=" .env | tail -n 1 | cut -d= -f2-
}

if ! command -v uv >/dev/null 2>&1; then
  echo "uv가 없습니다. uv를 설치합니다..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
fi

if [ ! -f ".env" ]; then
  echo ".env가 없어 .env.example을 복사합니다."
  cp .env.example .env
fi

mkdir -p logs

api_key=$(get_env_value "NEXON_OPEN_API_KEY" || true)
if [ -z "$api_key" ] || [ "$api_key" = "YOUR_NEXON_OPEN_API_KEY" ]; then
  echo ""
  echo "NEXON_OPEN_API_KEY가 비어 있습니다."
  printf "넥슨 Open API 키를 입력하세요: "
  IFS= read -r api_key
  echo ""

  if [ -z "$api_key" ]; then
    echo "API 키가 입력되지 않아 서버 실행을 중단합니다."
    exit 1
  fi

  set_env_value "NEXON_OPEN_API_KEY" "$api_key"
  echo ".env에 API 키를 저장했습니다."
fi

admin_password=$(get_env_value "DB_ADMIN_PASSWORD" || true)
if [ -z "$admin_password" ] || [ "$admin_password" = "YOUR_DB_ADMIN_PASSWORD" ]; then
  echo ""
  echo "DB_ADMIN_PASSWORD가 비어 있습니다."
  printf "DB 정리 버튼에 사용할 관리 비밀번호를 입력하세요: "
  IFS= read -r admin_password
  echo ""

  if [ -z "$admin_password" ]; then
    echo "관리 비밀번호가 입력되지 않아 서버 실행을 중단합니다."
    exit 1
  fi

  set_env_value "DB_ADMIN_PASSWORD" "$admin_password"
  echo ".env에 관리 비밀번호를 저장했습니다."
fi

app_host=$(get_env_value "APP_HOST" || true)
app_port=$(get_env_value "APP_PORT" || true)
if [ -z "$app_host" ]; then
  app_host="127.0.0.1"
fi
if [ -z "$app_port" ]; then
  app_port="1939"
fi
echo "서버를 실행합니다: http://${app_host}:${app_port}"
if [ "$app_host" = "0.0.0.0" ] || [ "$app_host" = "::" ]; then
  echo "로컬 접속 주소: http://127.0.0.1:${app_port}"
fi
echo "DB 변경 로그: ${PROJECT_DIR}/logs/db_changes.log"
uv run python app.py
