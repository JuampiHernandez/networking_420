#!/usr/bin/env python3
"""One-off: send a meeting-confirmation email (with a hardcoded fake link) via Resend.

Mirrors what the agent *would* send after booking a call on a voice outreach.
The meeting link is intentionally fake/hardcoded for the demo.
"""
import json
import os
import sys
import urllib.request


def require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"missing required env var: {name}", file=sys.stderr)
        sys.exit(1)
    return value


KEY = require("RESEND_API_KEY")
FROM = os.environ.get("RESEND_FROM", "Networking Agent <onboarding@resend.dev>")
TO = require("DEMO_CONTACT_EMAIL")

# Hardcoded demo meeting details + fake link.
MEETING_LINK = "https://meet.task402.dev/j/abc-defg-hij"
CONTACT_NAME = "Alex"
WHEN = "Tuesday, June 10 at 3:00 PM ET (30 min)"

SUBJECT = f"Confirmed: our call on {WHEN.split(' at ')[0]}"

LINES = [
    f"Hi {CONTACT_NAME},",
    "",
    "Great talking just now — thanks for taking the call! As discussed, I've gone "
    "ahead and locked in a time for us to connect:",
    "",
    f"  When:   {WHEN}",
    f"  Where:  {MEETING_LINK}",
    "",
    "Just click the link above at the scheduled time to join — no download needed. "
    "If anything comes up and you need to reschedule, just reply to this email and "
    "I'll find another slot.",
    "",
    "Looking forward to it!",
    "",
    "— Your Networking Agent (on behalf of the founder)",
]
TEXT = "\n".join(LINES)
HTML = "".join(f"<p>{line or '&nbsp;'}</p>" for line in LINES).replace(
    MEETING_LINK, f'<a href="{MEETING_LINK}">{MEETING_LINK}</a>'
)

body = {"from": FROM, "to": [TO], "subject": SUBJECT, "html": HTML, "text": TEXT}

req = urllib.request.Request(
    "https://api.resend.com/emails",
    data=json.dumps(body).encode(),
    headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req) as resp:
        d = json.load(resp)
    print("sent:", json.dumps(d))
except urllib.error.HTTPError as e:
    print("failed:", e.code, e.read().decode())
    sys.exit(1)
