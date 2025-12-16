LiveKit deployment package for Linux hosts using host networking.

Quick start (from this directory):

1) Make scripts executable

```bash
chmod +x *.sh
```

2) Start all services

```bash
./restart_services.sh
```

3) Verify health

```bash
./monitor_services.sh
```

Notes
- Update domains in caddy.yaml, livekit.yaml, and ingress.yaml if you are not using sawalive.live.
- Requires Docker Engine and Compose v2 (docker compose). Scripts fallback to docker-compose if needed.
