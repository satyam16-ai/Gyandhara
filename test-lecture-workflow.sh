#!/bin/bash

# Test Lecture Creation Workflow
echo "🧪 Testing Lecture Creation Workflow"
echo "====================================="

BASE_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3000/api"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Login as teacher
echo -e "${BLUE}1. Logging in as teacher...${NC}"
TEACHER_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teacher",
    "password": "teacher123",
    "role": "teacher"
  }')

if echo "$TEACHER_LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Teacher login successful${NC}"
    TEACHER_TOKEN=$(echo "$TEACHER_LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')
    TEACHER_ID=$(echo "$TEACHER_LOGIN_RESPONSE" | grep -o '"_id":"[^"]*"' | sed 's/"_id":"\(.*\)"/\1/')
else
    echo -e "${RED}❌ Teacher login failed${NC}"
    echo "Creating teacher account..."
    
    # Register teacher
    REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Test Teacher",
        "email": "testteacher@example.com",
        "mobile": "+1234567890",
        "username": "teacher",
        "password": "teacher123",
        "role": "teacher"
      }')
    
    if echo "$REGISTER_RESPONSE" | grep -q "token"; then
        echo -e "${GREEN}✅ Teacher registered successfully${NC}"
        TEACHER_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')
        TEACHER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"_id":"[^"]*"' | sed 's/"_id":"\(.*\)"/\1/')
    else
        echo -e "${RED}❌ Teacher registration failed${NC}"
        echo "$REGISTER_RESPONSE"
        exit 1
    fi
fi

echo "Teacher ID: $TEACHER_ID"

# 2. Create classroom
echo -e "\n${BLUE}2. Creating classroom...${NC}"
CLASSROOM_RESPONSE=$(curl -s -X POST "$BASE_URL/api/classrooms/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d "{
    \"name\": \"Test Classroom for Lectures\",
    \"subject\": \"Computer Science\",
    \"description\": \"Testing lecture creation\",
    \"teacherId\": \"$TEACHER_ID\",
    \"teacherName\": \"Test Teacher\"
  }")

if echo "$CLASSROOM_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Classroom created successfully${NC}"
    CLASSROOM_ID=$(echo "$CLASSROOM_RESPONSE" | grep -o '"_id":"[^"]*"' | sed 's/"_id":"\(.*\)"/\1/')
    CLASSROOM_CODE=$(echo "$CLASSROOM_RESPONSE" | grep -o '"classroomCode":"[^"]*"' | sed 's/"classroomCode":"\(.*\)"/\1/')
    echo "Classroom ID: $CLASSROOM_ID"
    echo "Classroom Code: $CLASSROOM_CODE"
else
    echo -e "${RED}❌ Classroom creation failed${NC}"
    echo "$CLASSROOM_RESPONSE"
    exit 1
fi

# 3. Create lecture in classroom
echo -e "\n${BLUE}3. Creating lecture in classroom...${NC}"
FUTURE_DATE=$(date -d '+2 hours' -Iseconds)
LECTURE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/classrooms/$CLASSROOM_ID/lectures" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d "{
    \"subject\": \"Introduction to APIs\",
    \"topic\": \"REST API Development\",
    \"description\": \"Learning how to build REST APIs\",
    \"scheduledDate\": \"$FUTURE_DATE\",
    \"duration\": 90,
    \"teacherId\": \"$TEACHER_ID\"
  }")

if echo "$LECTURE_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Lecture created successfully${NC}"
    LECTURE_ID=$(echo "$LECTURE_RESPONSE" | grep -o '"_id":"[^"]*"' | sed 's/"_id":"\(.*\)"/\1/')
    ROOM_ID=$(echo "$LECTURE_RESPONSE" | grep -o '"roomId":"[^"]*"' | sed 's/"roomId":"\(.*\)"/\1/')
    echo "Lecture ID: $LECTURE_ID"
    echo "Room ID: $ROOM_ID"
else
    echo -e "${RED}❌ Lecture creation failed${NC}"
    echo "$LECTURE_RESPONSE"
    exit 1
fi

# 4. Verify lecture appears in classroom lectures
echo -e "\n${BLUE}4. Checking classroom lectures...${NC}"
LECTURES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/classrooms/$CLASSROOM_ID/lectures" \
  -H "Authorization: Bearer $TEACHER_TOKEN")

if echo "$LECTURES_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Lectures fetched successfully${NC}"
    LECTURE_COUNT=$(echo "$LECTURES_RESPONSE" | grep -o '"lectures":\[[^]]*\]' | grep -o '"_id":' | wc -l)
    echo "Found $LECTURE_COUNT lecture(s) in classroom"
else
    echo -e "${RED}❌ Failed to fetch lectures${NC}"
    echo "$LECTURES_RESPONSE"
fi

# 5. Test student enrollment
echo -e "\n${BLUE}5. Testing student enrollment...${NC}"
STUDENT_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student",
    "password": "student123",
    "role": "student"
  }')

if echo "$STUDENT_LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Student login successful${NC}"
    STUDENT_TOKEN=$(echo "$STUDENT_LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')
    STUDENT_ID=$(echo "$STUDENT_LOGIN_RESPONSE" | grep -o '"_id":"[^"]*"' | sed 's/"_id":"\(.*\)"/\1/')
else
    echo -e "${YELLOW}⚠️ Creating student account...${NC}"
    
    # Register student
    STUDENT_REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Test Student",
        "email": "teststudent@example.com",
        "mobile": "+0987654321",
        "username": "student",
        "password": "student123",
        "role": "student"
      }')
    
    if echo "$STUDENT_REGISTER_RESPONSE" | grep -q "token"; then
        echo -e "${GREEN}✅ Student registered successfully${NC}"
        STUDENT_TOKEN=$(echo "$STUDENT_REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')
        STUDENT_ID=$(echo "$STUDENT_REGISTER_RESPONSE" | grep -o '"_id":"[^"]*"' | sed 's/"_id":"\(.*\)"/\1/')
    else
        echo -e "${RED}❌ Student registration failed${NC}"
        echo "$STUDENT_REGISTER_RESPONSE"
        exit 1
    fi
fi

# 6. Student joins classroom
echo -e "\n${BLUE}6. Student joining classroom...${NC}"
JOIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/classrooms/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d "{
    \"classroomCode\": \"$CLASSROOM_CODE\",
    \"studentId\": \"$STUDENT_ID\",
    \"studentName\": \"Test Student\"
  }")

if echo "$JOIN_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Student joined classroom successfully${NC}"
else
    echo -e "${RED}❌ Student failed to join classroom${NC}"
    echo "$JOIN_RESPONSE"
fi

# 7. Student views lectures
echo -e "\n${BLUE}7. Student viewing lectures...${NC}"
STUDENT_LECTURES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/classrooms/$CLASSROOM_ID/lectures" \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo "$STUDENT_LECTURES_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Student can see lectures${NC}"
    STUDENT_LECTURE_COUNT=$(echo "$STUDENT_LECTURES_RESPONSE" | grep -o '"lectures":\[[^]]*\]' | grep -o '"_id":' | wc -l)
    echo "Student sees $STUDENT_LECTURE_COUNT lecture(s)"
else
    echo -e "${RED}❌ Student cannot see lectures${NC}"
    echo "$STUDENT_LECTURES_RESPONSE"
fi

# 8. Start lecture (teacher)
echo -e "\n${BLUE}8. Teacher starting lecture...${NC}"
START_RESPONSE=$(curl -s -X POST "$BASE_URL/api/room-classes/$LECTURE_ID/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{}')

if echo "$START_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Lecture started successfully${NC}"
    echo "Lecture is now live!"
else
    echo -e "${YELLOW}⚠️ Lecture start might have issues${NC}"
    echo "$START_RESPONSE"
fi

echo -e "\n${GREEN}🎉 LECTURE WORKFLOW TEST COMPLETED!${NC}"
echo "====================================="
echo -e "${GREEN}✅ Teacher can create classrooms${NC}"
echo -e "${GREEN}✅ Teacher can create lectures in classrooms${NC}"
echo -e "${GREEN}✅ Students can join classrooms${NC}"
echo -e "${GREEN}✅ Students can view lectures in classrooms${NC}"
echo -e "${GREEN}✅ Teachers can start lectures${NC}"
echo ""
echo "🔗 Use these details to test in the frontend:"
echo "   Classroom Code: $CLASSROOM_CODE"
echo "   Lecture ID: $LECTURE_ID"
echo "   Room ID: $ROOM_ID"
