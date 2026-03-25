# Desktop Distribution

## Build Outputs

Run the desktop production build from the workspace root:

```bash
npm run desktop:build
```

That command now produces these Windows release artifacts in `desktop-dist/`:

- `Invendex-Setup-<version>.exe`: the NSIS installer you share with users
- `Invendex-Setup-<version>.exe.blockmap`: differential update metadata for the installer
- `latest.yml`: the update manifest consumed by `electron-updater`
- `win-unpacked/`: the unpacked desktop app for local verification

## Auto-Update Hosting

Invendex now supports two desktop update sources:

- GitHub Releases by default, using the packaged `app-update.yml`
- A custom `generic` HTTPS host when you set `autoUpdateUrl`

### GitHub Releases

This repository already packages GitHub update metadata for `Noah-Prinzy/Invendex`, so installed builds can use GitHub Releases without any extra desktop config.

The workflow at `.github/workflows/desktop-release.yml` builds the Windows installer on GitHub Actions and uploads these release assets:

- `Invendex-Setup-<version>.exe`
- `Invendex-Setup-<version>.exe.blockmap`
- `latest.yml`

Release flow:

1. Bump the root app version in `package.json`.
2. Commit and push that version change.
3. Push a matching git tag such as `v1.0.1`, or run the `Desktop Release` workflow manually after pushing the commit.
4. GitHub Releases becomes the update feed for installed desktop copies.

When a newer release is published, the installed app checks GitHub Releases, downloads the newer installer in the background, and prompts the user to restart once the update is ready.

### Custom Host

If you prefer not to use GitHub Releases, host the installer, its `.blockmap`, and `latest.yml` together at a stable HTTPS URL such as:

```text
https://downloads.example.com/invendex/
```

Then set `autoUpdateUrl` in the desktop config. That switches the app from GitHub-based updates to the generic provider.

## Desktop Config

The desktop shell creates a config file on first launch at Electron's user data path:

- Windows: `%APPDATA%\\Invendex\\desktop-config.json`

Add your update feed URL there:

```json
{
  "dbUrl": "mongodb://127.0.0.1:27017/invendex",
  "autoUpdateEnabled": true,
  "autoUpdateUrl": "",
  "autoUpdateChannel": "latest",
  "autoUpdateAllowPrerelease": false,
  "autoUpdateCheckIntervalMinutes": 360
}
```

Leave `autoUpdateUrl` empty to use GitHub Releases. Set it to a custom HTTPS folder only if you want to override the default GitHub feed.

The app keeps any existing JWT secrets already written into that file, so only add or edit the update-related fields you need.

## Environment Overrides

These optional environment variables override the desktop config at runtime:

- `INVENDEX_AUTO_UPDATE_ENABLED`
- `INVENDEX_AUTO_UPDATE_URL`
- `INVENDEX_AUTO_UPDATE_CHANNEL`
- `INVENDEX_AUTO_UPDATE_ALLOW_PRERELEASE`
- `INVENDEX_AUTO_UPDATE_CHECK_INTERVAL_MINUTES`

## Logs

If something goes wrong, the desktop shell writes logs under the same user data folder:

- `desktop.log`: installer/update shell logs
- `backend.log`: bundled API runtime logs
