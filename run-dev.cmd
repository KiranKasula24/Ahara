@echo off
rem Stop any prior server with Ctrl+C before using this launcher.
rem .next is disposable. A clean rebuild avoids stale chunks in synced folders.
if exist .next rmdir /s /q .next
call npm.cmd run dev -- -p 3010
