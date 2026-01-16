#!/bin/bash

# ============================================================================
# FineFlow Uptime Monitoring Setup Script
# ============================================================================
#
# This script configures uptime monitoring using UptimeRobot API.
# Run this script once to set up monitoring for production endpoints.
#
# Prerequisites:
# - UptimeRobot account (https://uptimerobot.com)
# - API key from UptimeRobot dashboard
#
# Usage:
#   UPTIMEROBOT_API_KEY=your_api_key ./scripts/setup-uptime-monitoring.sh
#
# ============================================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for API key
if [ -z "$UPTIMEROBOT_API_KEY" ]; then
  echo -e "${RED}Error: UPTIMEROBOT_API_KEY environment variable is not set${NC}"
  echo ""
  echo "Usage: UPTIMEROBOT_API_KEY=your_api_key ./scripts/setup-uptime-monitoring.sh"
  exit 1
fi

# Configuration
PRODUCTION_URL="https://fineflow.lovable.app"
STAGING_URL="https://id-preview--6f92e18b-3be5-4605-afd5-ab54c40eead1.lovable.app"
SUPABASE_URL="https://jkibxapuxnrbxpjefjdn.supabase.co"
CHECK_INTERVAL=300  # 5 minutes

echo ""
echo "============================================"
echo "  FineFlow Uptime Monitoring Setup"
echo "============================================"
echo ""

# Function to create a monitor
create_monitor() {
  local NAME=$1
  local URL=$2
  local TYPE=$3  # 1=HTTP(S), 2=Keyword, 3=Ping, 4=Port
  local KEYWORD=$4  # Optional keyword for type 2
  
  echo -e "${YELLOW}Creating monitor: $NAME${NC}"
  echo "  URL: $URL"
  echo "  Type: $TYPE"
  
  local PARAMS="api_key=$UPTIMEROBOT_API_KEY&friendly_name=$NAME&url=$URL&type=$TYPE&interval=$CHECK_INTERVAL"
  
  if [ -n "$KEYWORD" ]; then
    PARAMS="$PARAMS&keyword_type=1&keyword_value=$KEYWORD"
  fi
  
  RESPONSE=$(curl -s -X POST https://api.uptimerobot.com/v2/newMonitor \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "$PARAMS")
  
  # Check response
  STATUS=$(echo $RESPONSE | grep -o '"stat":"[^"]*"' | cut -d'"' -f4)
  
  if [ "$STATUS" = "ok" ]; then
    echo -e "${GREEN}  ✅ Monitor created successfully${NC}"
  else
    ERROR=$(echo $RESPONSE | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    if [[ "$ERROR" == *"already exists"* ]]; then
      echo -e "${YELLOW}  ⚠️ Monitor already exists${NC}"
    else
      echo -e "${RED}  ❌ Failed: $ERROR${NC}"
    fi
  fi
  echo ""
}

# Create monitors for different endpoints

echo "Setting up production monitors..."
echo ""

# Production App Monitor
create_monitor "FineFlow Production" "$PRODUCTION_URL" 1

# Production Health Check Monitor
create_monitor "FineFlow Health API" "$SUPABASE_URL/functions/v1/health" 1

# Database Health (using keyword check)
create_monitor "FineFlow DB Health" "$SUPABASE_URL/functions/v1/health?detailed=true" 2 "healthy"

# API Endpoint Monitor
create_monitor "FineFlow API Status" "$SUPABASE_URL/functions/v1/health" 2 "status"

# Staging Monitor
create_monitor "FineFlow Staging" "$STAGING_URL" 1

echo ""
echo "============================================"
echo -e "${GREEN}  Setup Complete!${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Log in to UptimeRobot dashboard to configure alerts"
echo "2. Set up alert contacts (email, Slack, webhook)"
echo "3. Configure alert thresholds"
echo ""
echo "Dashboard: https://uptimerobot.com/dashboard"
echo ""

# Get current monitors status
echo "Fetching current monitors..."
MONITORS=$(curl -s -X POST https://api.uptimerobot.com/v2/getMonitors \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_key=$UPTIMEROBOT_API_KEY&format=json")

MONITOR_COUNT=$(echo $MONITORS | grep -o '"total":"[0-9]*"' | cut -d'"' -f4)
echo ""
echo "Total monitors configured: $MONITOR_COUNT"
echo ""
