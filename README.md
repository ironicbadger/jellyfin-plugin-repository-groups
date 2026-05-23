# Jellyfin Plugin Repository Groups

Adds a Jellyfin dashboard page that groups plugins by the repository that provides them.

The page uses Jellyfin's existing `Plugins`, `Packages`, and `Repositories` API endpoints from the browser. It does not modify Jellyfin Web's built-in Plugins page.

## Build

Install the .NET 9 SDK, then run:

```sh
dotnet build Jellyfin.Plugin.RepositoryGroups.sln -c Release
```

The plugin targets Jellyfin `10.11.8` and uses matching `Jellyfin.Controller` and `Jellyfin.Model` package references.

GitHub Actions also builds every push and pull request with `.github/workflows/build.yml`.

## Publish

The release workflow builds the plugin, zips the DLL, computes the Jellyfin manifest checksum, updates `manifest.json`, pushes that manifest back to the default branch, and uploads both the zip and manifest to the GitHub Release.

You can publish either way:

```sh
git tag v0.1.0.0
git push origin v0.1.0.0
```

or run the `Release Plugin` workflow manually and provide a four-part version such as `0.1.0.0`.

After the first release finishes, add this repository URL to Jellyfin:

```text
https://raw.githubusercontent.com/ironicbadger/jellyfin-plugin-repository-groups/main/manifest.json
```

For GitHub-hosted releases, the workflow requires repository Actions permissions that allow writing contents so it can create releases and commit `manifest.json`.

## Install

Once the manifest URL is configured in Jellyfin, install it like any other plugin from Dashboard, Plugins, Catalog.

For local testing without a manifest, you can still copy `Jellyfin.Plugin.RepositoryGroups.dll` from `Jellyfin.Plugin.RepositoryGroups/bin/Release/net9.0/` into a Jellyfin plugin folder and restart Jellyfin.

## Repository Metadata

Installed plugins are matched to package catalog entries by assembly GUID. If the installed version is still present in an enabled repository manifest, that exact version's `repositoryName` and `repositoryUrl` are used. If not, the page falls back to the package's latest known repository. Bundled plugins and plugins not found in enabled repositories are grouped separately.
