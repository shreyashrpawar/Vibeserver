#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

BINARY_URL="https://github.com/shreyashrpawar/Vibeserver/releases/download/v1.0.0/vibeserver"
INSTALL_PATH="/usr/local/bin/vibeserver"

echo -e "${GREEN}Starting Vibeserver Installation...${NC}"

# Ensure running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (sudo ./install.sh)${NC}"
  exit 1
fi

echo -e "${GREEN}Downloading Vibeserver binary...${NC}"
if command -v curl &> /dev/null; then
    curl -L -o vibeserver "$BINARY_URL"
elif command -v wget &> /dev/null; then
    wget -O vibeserver "$BINARY_URL"
else
    echo -e "${RED}Error: neither curl nor wget found.${NC}"
    exit 1
fi

echo -e "${GREEN}Installing Service...${NC}"

# Move binary
mv vibeserver "$INSTALL_PATH"
chmod +x "$INSTALL_PATH"

# Create Service File
cat > /etc/systemd/system/vibeserver.service <<EOF
[Unit]
Description=Vibeserver Infrastructure Manager
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/usr/local/bin
ExecStart=/usr/local/bin/vibeserver
Restart=always
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
EOF

# Reload and Start
systemctl daemon-reload
systemctl enable vibeserver
systemctl restart vibeserver

echo -e "${GREEN}-------------------------------------${NC}"
echo -e "${GREEN} Installation Complete! ${NC}"
echo -e "${GREEN} Access Vibeserver at: http://localhost:8080 ${NC}"
echo -e "${GREEN}-------------------------------------${NC}"
