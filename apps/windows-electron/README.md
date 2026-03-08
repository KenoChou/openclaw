# OpenClaw Windows Electron app

This package is the native Windows companion app based on Electron.

## Goals

- Keep the desktop app thin and reuse OpenClaw WebChat from the Gateway.
- Start and monitor a local `openclaw gateway run` process.
- Keep auth/session files in the normal OpenClaw CLI paths.

## Run locally

```bash
pnpm --dir apps/windows-electron install
pnpm --dir apps/windows-electron dev
```

The app attempts to start:

```bash
openclaw gateway run --bind loopback --port 18789 --force
```

Then opens `http://127.0.0.1:18789/webchat`.

## Build Windows artifacts

Use a Windows host for best results.

```bash
pnpm --dir apps/windows-electron install
pnpm --dir apps/windows-electron dist:win
```

Output artifacts are written to `apps/windows-electron/dist/`.

From the repo root you can also run:

```bash
pnpm win:dist
```

## Interactive onboarding inside the app

If the app cannot connect to the local Gateway, it shows a setup page with buttons to:

- run `openclaw onboard --install-daemon` in a terminal window
- run `openclaw gateway run --bind loopback --port 18789 --force` in a terminal window
- retry connection and jump to WebChat once the Gateway is healthy
