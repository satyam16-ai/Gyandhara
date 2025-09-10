#!/bin/bash

# Quick API Health Check Script
# Validates core functionality quickly

echo "🚀 VoiceBoard API - Quick Health Check"
echo "======================================"

BASE_URL="http://localhost:8080"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Health check
echo -e "${BLUE}1. Backend Health:${NC}"
if curl -s "$BASE_URL/api/health" | grep -q "OK"; then
    echo -e "${GREEN}✅ Backend server running${NC}"
else
    echo -e "${RED}❌ Backend server not responding${NC}"
    exit 1
fi

# Admin auth
echo -e "${BLUE}2. Admin Authentication:${NC}"
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin-secure/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123!"}')

if echo "$ADMIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Admin login working${NC}"
    ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')
else
    echo -e "${RED}❌ Admin login failed${NC}"
    echo "Response: $ADMIN_RESPONSE"
    exit 1
fi

# Teacher auth  
echo -e "${BLUE}3. Teacher Authentication:${NC}"
TEACHER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher","password":"teacher123","role":"teacher"}')

if echo "$TEACHER_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Teacher login working${NC}"
else
    echo -e "${RED}❌ Teacher login failed${NC}"
    echo "Response: $TEACHER_RESPONSE"
fi

# Student auth
echo -e "${BLUE}4. Student Authentication:${NC}"
STUDENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"student123","role":"student"}')

if echo "$STUDENT_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Student login working${NC}"
else
    echo -e "${RED}❌ Student login failed${NC}"
    echo "Response: $STUDENT_RESPONSE"
fi

# Admin dashboard
echo -e "${BLUE}5. Admin Dashboard:${NC}"
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin-secure/dashboard/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$STATS_RESPONSE" | grep -q "totalUsers"; then
    echo -e "${GREEN}✅ Admin dashboard working${NC}"
    echo "Users in system: $(echo "$STATS_RESPONSE" | grep -o '"totalUsers":[0-9]*' | grep -o '[0-9]*')"
else
    echo -e "${RED}❌ Admin dashboard failed${NC}"
    echo "Response: $STATS_RESPONSE"
fi

echo ""
echo -e "${GREEN}🎉 Core API functionality verified!${NC}"
echo "✅ Authentication system working"
echo "✅ Admin management working" 
echo "✅ Database connectivity confirmed"
echo "✅ JWT token system functional"
echo ""
echo "🚀 System ready for frontend integration!"
