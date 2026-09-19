"""JNAP client for a local Uponor Smatrix Pulse (X-265/X-245) R-208 gateway.

Same protocol as the uponorx265 Home Assistant integration
(https://github.com/dave-code-ruiz/uponorx265): a plain HTTP POST to
http://<host>/JNAP/ with an x-jnap-action header, no auth on the LAN.
Standard library only, so the app needs no pythonPackages.
"""

from __future__ import annotations

import asyncio
import json
import re
import urllib.request

REQUEST_TIMEOUT_S = 10
THERMOSTAT_RE = re.compile(r"^C(\d+)_T(\d+)_room_temperature$")


def _post_jnap(host: str, action: str, payload: dict | None = None) -> dict:
    req = urllib.request.Request(
        f"http://{host}/JNAP/",
        data=json.dumps(payload or {}).encode(),
        headers={
            "Content-Type": "application/json",
            "x-jnap-action": f"http://phyn.com/jnap/{action}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_S) as resp:
        return json.loads(resp.read())


async def get_vars(host: str) -> dict[str, str]:
    res = await asyncio.to_thread(_post_jnap, host, "uponorsky/GetAttributes")
    output = res.get("output")
    vars_list = output.get("vars") if isinstance(output, dict) else None
    if not isinstance(vars_list, list):
        raise ValueError("Unexpected JNAP response: output.vars missing")
    return {
        item["waspVarName"]: item["waspVarValue"]
        for item in vars_list
        if isinstance(item, dict) and "waspVarName" in item and "waspVarValue" in item
    }


def raw_to_celsius(raw: str | None) -> float | None:
    """Device temps are tenths of degF, offset by 320 (i.e. (raw/10 - 32) * 5/9)."""
    if raw is None:
        return None
    try:
        return round((int(raw) - 320) / 18, 1)
    except ValueError:
        return None


def to_int(raw: str | None) -> int | None:
    if raw is None:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def parse_thermostats(v: dict[str, str]) -> list[dict]:
    """Group the flat variable dict into one row per thermostat (C<n>_T<n>_*)."""
    rooms = []
    for key in v:
        m = THERMOSTAT_RE.match(key)
        if not m:
            continue
        controller, thermostat = m.groups()
        prefix = f"C{controller}_T{thermostat}"
        rooms.append(
            {
                "controller": controller,
                "thermostat": thermostat,
                "prefix": prefix,
                "name": v.get(f"cust_{prefix}_name") or None,
                # 0 means "no sensor", same as the HA integration treats it
                "humidity": to_int(v.get(f"{prefix}_rh")) or None,
            }
        )
    rooms.sort(key=lambda r: (int(r["controller"]), int(r["thermostat"])))
    return rooms
