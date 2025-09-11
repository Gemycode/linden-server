Chime SDK Local Backend (Express)

This project provides a local Express.js backend that integrates with AWS Chime SDK and a simple frontend page under `public/` to join meetings.

Prerequisites
- Node.js 18+
- AWS account with permissions to use Chime SDK Meetings

Install
```bash
npm install
```

Environment
Create a `.env` at the project root (you can start from the provided template):
```bash
cp env.example .env
```
Then edit `.env` and fill your values:
```env
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
AWS_REGION=us-east-1
AWS_CHIME_INSTANCE_ARN=
AWS_CHIME_INSTANCE_USER=
PORT=3000
```
You can also rely on standard `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`. The server prefers the `AWS_CHIME_*` variables when present.

Run
```bash
npm run dev
# or
npm start
```
Open `http://localhost:3000`.

API
- POST `/meeting`
  - Body: `{ room?: string, mediaRegion?: string, externalMeetingId?: string, maxAttendees?: number }`
  - Returns: `{ Meeting, meetingId, room }`

- POST `/attendee`
  - Body: `{ meetingId: string, externalUserId?: string }`
  - Returns: `{ Attendee, meetingId, room }`

Additional helper routes exist (GET `/meeting`, `/join/:id`, etc.), but the POST routes above are the canonical API for the frontend.

Frontend test

Method A — One-click (recommended)
1) Get an auto-link that includes `meetingInfo`:
   - Windows PowerShell:
   ```powershell
   $resp = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/meeting"
   Start-Process $resp.url
   ```
2) In the opened page:
   - Type your name in the "Enter your name" field
   - Click "Request Cam/Mic" and allow permissions if prompted
   - Click "Start". The Meeting ID should appear in the page and the session begins

Method B — Using the POST API
1) Create a meeting and capture the returned `Meeting`:
   ```powershell
   $m = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/meeting" -ContentType "application/json" -Body '{"room":"demo-room"}'
   $m
   ```
2) Create an attendee for that meeting and capture `Attendee`:
   ```powershell
   $a = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/attendee" -ContentType "application/json" -Body ("{\"meetingId\":\"{0}\",\"externalUserId\":\"user-1\"}" -f $m.meetingId)
   $a
   ```
3) Build the `meetingInfo` query param and open the page:
   ```powershell
   $payload = @{ Meeting = $m.Meeting; Attendee = $a.Attendee } | ConvertTo-Json -Compress
   $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($payload))
   Start-Process ("http://localhost:3000/chime-sdk.html?meetingInfo={0}" -f [uri]::EscapeDataString($b64))
   ```
4) Enter your name and click "Start".

Tip: You can also open `http://localhost:3000/chime-sdk.html` directly and paste the full URL (that contains `?meetingInfo=...`) into the input labeled "paste ?meetingInfo=… or full meeting URL", then click Start.

Screenshot
Place your screenshot proof at `public/screenshot.png` showing the Meeting ID rendered in the page input/label. If you cannot yet provide a real screenshot, use a placeholder path: `public/screenshot.png`.

Notes
- CORS and JSON body parsing are enabled.
- Credentials are read from environment variables; ensure your AWS user has Chime SDK permissions.

