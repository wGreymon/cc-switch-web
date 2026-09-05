#!/usr/bin/env bash
# CC-Switch Web 服务器启动脚本

cd "$(dirname "$0")/.."
HOST="${HOST:-127.0.0.1}" PORT="${PORT:-3000}" ./src-tauri/target/release/examples/server
