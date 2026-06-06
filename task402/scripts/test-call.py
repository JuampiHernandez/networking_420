#!/usr/bin/env python3
"""One-off: place a conversational test call via the ElevenLabs agent."""
import json
import os
import sys
import time
import urllib.request


def require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"missing required env var: {name}", file=sys.stderr)
        sys.exit(1)
    return value


KEY = require("ELEVENLABS_API_KEY")
AGENT = require("ELEVENLABS_AGENT_ID")
PHONE = require("ELEVENLABS_AGENT_PHONE_NUMBER_ID")
TO = require("DEMO_CONTACT_PHONE")

body = {
    "agent_id": AGENT,
    "agent_phone_number_id": PHONE,
    "to_number": TO,
    "conversation_initiation_client_data": {
        "dynamic_variables": {
            "contact_name": "Alex",
            "objective": "connecting founders building agentic payments on Base",
        }
    },
}

req = urllib.request.Request(
    "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
    data=json.dumps(body).encode(),
    headers={"xi-api-key": KEY, "Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as resp:
    d = json.load(resp)
print("placed:", json.dumps(d))
conv = d.get("conversation_id")
if not conv:
    sys.exit(0)

for i in range(1, 13):
    time.sleep(5)
    r = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/convai/conversations/{conv}",
        headers={"xi-api-key": KEY},
    )
    with urllib.request.urlopen(r) as resp:
        c = json.load(resp)
    m = c.get("metadata", {})
    print(
        f"t={i*5:3d}s status={c.get('status')} "
        f"accepted={m.get('accepted_time_unix_secs')} "
        f"dur={m.get('call_duration_secs')} turns={len(c.get('transcript') or [])}"
    )
