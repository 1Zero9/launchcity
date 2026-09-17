# LaunchCity

A public website that lists and tracks space launches from commercial launch companies, national space agencies, and other launch organisations worldwide.

## Goal

Make it easy to understand, for any given launch:

- what is launching
- when it is launching
- who is responsible for the launch
- which rocket/vehicle is being used
- where it is launching from
- what payload is being carried
- the purpose of the mission
- expected mission/launch duration, where meaningful
- current launch status
- historical launch outcomes

## Status

v0.1 is live: Next.js on Cloudflare Workers (OpenNext), with Launch Library 2 data cached in Workers KV. See `PROJECT-OS.md` for decisions and history. Local development uses Node 22.

## Local review

```sh
npm ci
npm run review   # http://localhost:3007 — committed demonstration data, see review/README.md
```

`npm run dev` runs against the real (local, emulated) cache instead.

## Audience

Initially general space enthusiasts who want a clear view of upcoming and historical launches. Researchers, journalists, educators, and specialist enthusiasts may be considered as future audiences.
