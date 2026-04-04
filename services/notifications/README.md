# Notifications / Reminders Service

Lightweight notifications microservice for the todo app. It periodically scans the Todo API for due items and issues simple notifications.

Quick start (development):

```bash
cd services/notifications
npm install    # or yarn install
# run in dev (ts-node)
npm run dev
```

Environment variables (see `.env.example`):
- `PORT` - HTTP port for the service
- `TODO_API_URL` - base URL for the main todo API
- `POLL_CRON` - cron schedule for scanning due todos

Endpoints:
- `GET /health` - health check
- `POST /notify` - internal notification delivery endpoint (simple placeholder)

Next steps:
- Integrate real delivery channels (email, push, websocket)
- Add authentication between services (API key / JWT)
- Add Docker-compose entry and secrets management
