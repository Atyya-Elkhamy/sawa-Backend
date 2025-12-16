# Troubleshooting

- Ensure ports are not in use by other services: 443, 5349, 7880, 7881, 6379, 1935, 8080, 50000-60000/UDP.
- This stack needs Linux host networking. It won't work on macOS/Windows as-is.
- If Caddy can't get certificates, check DNS A records and port 80/443 reachability.
- If clients can't connect, check firewall rules for UDP 50000-60000 and TCP 7880/7881/5349.
- Verify domains in caddy.yaml, livekit.yaml, ingress.yaml match your DNS.
- Redis is unauthenticated by default here; restrict access to localhost or add a password.
