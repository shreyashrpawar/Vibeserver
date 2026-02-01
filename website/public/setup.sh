#!/bin/bash

# Ilusion VPS Setup Script
# Run this on your VPS to allow Ilusion to connect.

set -e

# The Public Key for Ilusion Managed Logic
PUBLIC_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDBOHC8EMdI5huHxMslTA+P28W7w1sFjLfvLJMramtm+hIkwd88zrb3GtUgogRuxdR4cUs5n3jg9owPLIKSEaiDzXQKd9l13OI5F0ygZzOkDzsnUMaMBwrXKbP2zVU4fG+Tmiu3wQfMZd7U8Vc1X37CvXdsZiw8xw2BEogO2uImGckoccER6EWy+Ay7PPpucjO1tPUTzqtC2T426kLcPuNbOawNF8QkHXjcTxWBPf7gvz4Crs30OUw/3y7OcNfEv2toLUHQNFZpMAWTktZnZaCCH99a/reTozGg7w6teQ4h4UMXakK0wmtCGBVOWaWH9U30LqFmub/sUMtASxOdX8FppmFHdZu/Pkr/bICOnc9fECZlalcro/f4uNmRcsX4PTOkDHh4RZ57g827dxEeOF3nPVKTAifDWO5cAQ0PlIIsU2BdDaTwpWkqZkrrMlsLZfApCn3hsT2UmNxV2b6zD8TxEk7C1as1LdiGY6ptSxj+G6X6ktPRnwYIgR0ILdGvmwp/7vG1eTIroq1yNGRgpvEHzE/BIocYHdgqS/n73IM117lL6+eRGwPRcK8jcXVtbHEoPN7HSjOqARtxk1eZT9jxAfdoz7DJ7SVb0aPFyIcDAR5JMTzrTjQKEzMQpMCbyRrjDepaqw9h039v1E3p0WPeAoKXseI/QBC4AZKXOp7aIQ== ilusion-managed-key"

echo "--------------------------------------------------"
echo "  Ilusion VPS Setup"
echo "--------------------------------------------------"

# Ensure .ssh directory exists
if [ ! -d ~/.ssh ]; then
    echo "Creating ~/.ssh directory..."
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
fi

# Check if key already exists
if grep -q "ilusion-managed-key" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "Key already exists in authorized_keys. Skipping."
else
    echo "Adding Public Key to authorized_keys..."
    echo "$PUBLIC_KEY" >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
fi

echo ""
echo "Success! Your server is now ready for Ilusion."
echo "Please return to the dashboard and complete the connection."
echo "--------------------------------------------------"
