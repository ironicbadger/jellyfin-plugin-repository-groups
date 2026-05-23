#!/usr/bin/env python3
"""Create or update a Jellyfin plugin repository manifest."""

from __future__ import annotations

import json
import os
from pathlib import Path


MANIFEST_PATH = Path("manifest.json")


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def normalize_guid(value: str) -> str:
    return value.replace("-", "").lower()


def version_key(version: str) -> tuple[int, ...]:
    try:
        return tuple(int(part) for part in version.split("."))
    except ValueError:
        return (0,)


def load_manifest() -> list[dict]:
    if not MANIFEST_PATH.exists():
        return []

    with MANIFEST_PATH.open("r", encoding="utf-8") as manifest_file:
        data = json.load(manifest_file)

    if not isinstance(data, list):
        raise RuntimeError("manifest.json must contain a JSON array")

    return data


def write_manifest(data: list[dict]) -> None:
    with MANIFEST_PATH.open("w", encoding="utf-8") as manifest_file:
        json.dump(data, manifest_file, indent=4)
        manifest_file.write("\n")


def main() -> None:
    guid = required_env("PLUGIN_GUID")
    version = required_env("VERSION")
    target_abi = required_env("TARGET_ABI")

    package = {
        "guid": guid,
        "name": required_env("PLUGIN_NAME"),
        "description": required_env("PLUGIN_DESCRIPTION"),
        "overview": required_env("PLUGIN_OVERVIEW"),
        "owner": required_env("PLUGIN_OWNER"),
        "category": required_env("PLUGIN_CATEGORY"),
        "versions": [],
    }

    version_info = {
        "version": version,
        "targetAbi": target_abi,
        "sourceUrl": required_env("SOURCE_URL"),
        "checksum": required_env("CHECKSUM"),
        "timestamp": required_env("TIMESTAMP"),
    }

    manifest = load_manifest()
    package_guid = normalize_guid(guid)
    current_package = next(
        (item for item in manifest if normalize_guid(str(item.get("guid", ""))) == package_guid),
        None,
    )

    if current_package is None:
        current_package = package
        manifest.append(current_package)
    else:
        current_package.update({key: value for key, value in package.items() if key != "versions"})
        current_package.setdefault("versions", [])

    versions = [
        item
        for item in current_package["versions"]
        if not (item.get("version") == version and item.get("targetAbi") == target_abi)
    ]
    versions.append(version_info)
    versions.sort(key=lambda item: version_key(str(item.get("version", "0"))), reverse=True)
    current_package["versions"] = versions

    manifest.sort(key=lambda item: str(item.get("name", "")).lower())
    write_manifest(manifest)


if __name__ == "__main__":
    main()

