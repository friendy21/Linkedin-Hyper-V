# LinkedIn Automation Worker

Self-hosted LinkedIn automation worker that replaces Unipile's LinkedIn feature.

## Prerequisites
- Ubuntu 20.04
- Docker & Docker Compose
- Chrome Stable and Xvfb

## Quick Start
1. Clone the repository
2. `cp .env.example .env` and fill in the values
3. Run `docker-compose up -d`

## Importing a LinkedIn Session
Make a POST request to `/accounts/{accountId}/session` with an array of Playwright cookie objects:
```json
{
  "cookies": [
    {
      "name": "li_at",
      "value": "...",
      "domain": ".linkedin.com",
      "path": "/"
    }
  ]
}
```

## API Endpoint Reference
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/health` | Health check | No |
| POST | `/messages/send` | Send a message | Yes |
| POST | `/messages/read` | Read messages | Yes |
| GET | `/messages/job/:jobId` | Get job status | Yes |
| POST | `/accounts/:accountId/session` | Import session cookies | Yes |
| GET | `/accounts/:accountId/limits` | Get current rate limits | Yes |
| DELETE | `/accounts/:accountId/session` | Delete a session | Yes |

## Rate Limits
- Profile Views: 80/day
- Messages Sent: 30/day
- Connection Requests: 20/day
- Search Queries: 50/day

## Troubleshooting
- **Black screen / xrdp**: Ensure Xvfb is running on `:99`.
- **Chrome shm crash**: Ensure `shm_size: "2gb"` is set in docker-compose.yml.
