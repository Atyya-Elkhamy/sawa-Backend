# LiveKit Server Deployment Package

This package contains all the necessary configuration files and scripts to deploy a LiveKit server with ingress capabilities, Caddy reverse proxy, and Redis.

## 📋 Package Contents

### Core Configuration Files
- `docker-compose.yaml` - Main Docker Compose configuration
- `livekit.yaml` - LiveKit server configuration
- `ingress.yaml` - LiveKit ingress configuration
- `caddy.yaml` - Caddy reverse proxy configuration
- `redis.conf` - Redis configuration

### Scripts
- `fast_restart.sh` - Optimized restart script for services
- `monitor_services.sh` - Service monitoring script
- `monitor_ingress.sh` - Ingress-specific monitoring
- `restart_services.sh` - General restart script
- `test_and_restart.sh` - Test and restart if needed
- `test_performance.sh` - Performance testing script
- `update_ip.sh` - IP update utility

### Documentation
- `TROUBLESHOOTING.md` - Troubleshooting guide
- `readme.md` - Basic usage instructions

## 🚀 Quick Deployment Guide

### Prerequisites
- Linux server (required for host networking)
- Docker and Docker Compose installed
- Ports 443, 5349, 7880, 7881, 6379, 1935, 8080, 50000-60000 open
- Domain names configured for:
  - `realtime.rootmatrix.cloud	` (LiveKit server)
  - `turn.rootmatrix.cloud	` (TURN server)
  - `app.rootmatrix.cloud	` (Application)

### Installation Steps

1. **Copy all files to your target server:**
   ```bash
   # Create directory
   mkdir -p /opt/livekit
   cd /opt/livekit
   
   # Copy all configuration files and scripts
   # (Copy the entire contents of this directory)
   ```

2. **Make scripts executable:**
   ```bash
   chmod +x *.sh
   ```

3. **Update domain configurations:**
   
   **Before deployment, update these files with your domain names:**
   
   - In `caddy.yaml`: Replace `rootmatrix.cloud	` domains with your domains
   - In `livekit.yaml`: Update TURN domain and ingress URLs
   - In `ingress.yaml`: Update `ws_url` with your domain

4. **Start the services:**
   ```bash
   docker-compose up -d
   ```

5. **Verify deployment:**
   ```bash
   ./monitor_services.sh
   ```

## 🔧 Configuration Customization

### Domains to Update
Replace `rootmatrix.cloud	` with your domain in these files:

**caddy.yaml:**
- `realtime.rootmatrix.cloud	` → `realtime.yourdomain.com`
- `turn.rootmatrix.cloud	` → `turn.yourdomain.com`
- `app.rootmatrix.cloud	` → `app.yourdomain.com`

**livekit.yaml:**
- `turn.rootmatrix.cloud	` → `turn.yourdomain.com`
- `realtime.rootmatrix.cloud	` → `realtime.yourdomain.com`
- Webhook URL: Update to your application's webhook endpoint

**ingress.yaml:**
- `wss://realtime.rootmatrix.cloud	` → `wss://realtime.yourdomain.com`

### Security Configuration
- **API Keys**: Generate new API keys for production
- **Redis**: Configure password if needed
- **Firewall**: Ensure proper port configuration

### Performance Tuning
- Adjust `GOMAXPROCS` and `GOMEMLIMIT` in docker-compose.yaml based on server specs
- Modify port ranges in livekit.yaml if needed
- Update Redis configuration for your use case

## 📊 Monitoring and Management

### Health Checks
```bash
# Check all services
./monitor_services.sh

# Check ingress specifically
./monitor_ingress.sh

# Performance test
./test_performance.sh
```

### Service Management
```bash
# Fast restart (optimized)
./fast_restart.sh

# Regular restart
./restart_services.sh

# Test and restart if needed
./test_and_restart.sh
```

## 🔍 Port Configuration

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Caddy | 443 | TCP | HTTPS/TLS termination |
| LiveKit | 7880 | TCP | WebSocket connections |
| LiveKit RTC | 7881 | TCP | RTC signaling |
| LiveKit RTC | 50000-60000 | UDP | Media streams |
| TURN | 5349 | TCP | TURN over TLS |
| TURN | 3478 | UDP | TURN |
| Redis | 6379 | TCP | Internal only |
| RTMP Ingress | 1935 | TCP | RTMP streaming |
| WHIP Ingress | 8080 | TCP | WHIP protocol |

## 🛠️ Troubleshooting

For detailed troubleshooting information, see `TROUBLESHOOTING.md`.

Common issues:
1. **Domain resolution**: Ensure DNS is properly configured
2. **SSL certificates**: Caddy will auto-generate Let's Encrypt certificates
3. **Firewall**: Verify all required ports are open
4. **Host networking**: Only works on Linux hosts

## 📝 Environment-Specific Notes

- This configuration uses host networking mode for optimal performance
- SSL certificates are automatically managed by Caddy
- Redis runs without authentication (suitable for single-server deployments)
- All services restart automatically unless stopped manually

## 🔄 Migration Checklist

- [ ] Copy all configuration files
- [ ] Update domain names in configuration files
- [ ] Generate new API keys for production
- [ ] Configure firewall rules
- [ ] Set up DNS records
- [ ] Test deployment with monitoring scripts
- [ ] Verify SSL certificates are issued
- [ ] Test streaming functionality

---

*Last updated: August 1, 2025*
