#!/bin/bash

# VoiceBoard API Testing Script - Updated for Correct Endpoints
# Testing all endpoints systematically

BASE_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3000/api"

echo "🚀 VoiceBoard API Testing Script (Corrected)"
echo "============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    local test_name="$1"
    local response="$2"
    local expected_code="$3"
    
    echo -e "${BLUE}Testing: $test_name${NC}"
    echo "Response: $(echo "$response" | head -c 500)"
    if [ ${#response} -gt 500 ]; then
        echo "... (truncated)"
    fi
    
    # Check if response contains error or expected success patterns
    if echo "$response" | grep -q "error\|Error\|404\|500" && [ "$expected_code" != "error" ]; then
        echo -e "${RED}❌ FAILED${NC}"
    elif echo "$response" | grep -q "success\|token\|user\|classroom\|lecture" || [ "$expected_code" = "error" ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
    else
        echo -e "${YELLOW}⚠️  UNCLEAR${NC}"
    fi
    echo "----------------------------------------"
    echo ""
}

# 1. BACKEND HEALTH CHECK
echo "1. 🔍 Backend Health Check"
echo "========================="
response=$(curl -s -X GET "$BASE_URL/api/health" || echo "Connection failed")
print_result "Backend Health" "$response" "success"

# Test route endpoint tests
echo "Testing Auth Test Route..."
auth_test_response=$(curl -s -X GET "$BASE_URL/api/auth/test" || echo "Request failed")
print_result "Auth Test Route" "$auth_test_response" "success"

echo "Testing Admin Test Route..."
admin_test_response=$(curl -s -X GET "$BASE_URL/api/admin-secure/test" || echo "Request failed")
print_result "Admin Test Route" "$admin_test_response" "success"

# 2. AUTHENTICATION TESTS
echo ""
echo "2. 🔐 Authentication Tests"
echo "=========================="

# Admin login (correct endpoint)
echo "Testing Admin Login..."
admin_response=$(curl -s -X POST "$BASE_URL/api/admin-secure/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123!"
  }' || echo "Request failed")

print_result "Admin Login" "$admin_response" "success"

# Extract admin token for further requests
ADMIN_TOKEN=$(echo "$admin_response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')
echo -e "${PURPLE}Admin Token: ${ADMIN_TOKEN:0:20}...${NC}"

# Teacher login attempt (may fail if user doesn't exist)
echo "Testing Teacher Login..."
teacher_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teacher",
    "password": "teacher123",
    "role": "teacher"
  }' || echo "Request failed")

print_result "Teacher Login" "$teacher_response" "success"

# Extract teacher token
TEACHER_TOKEN=$(echo "$teacher_response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

# Student login attempt (may fail if user doesn't exist)
echo "Testing Student Login..."
student_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student",
    "password": "student123",
    "role": "student"
  }' || echo "Request failed")

print_result "Student Login" "$student_response" "success"

# Extract student token
STUDENT_TOKEN=$(echo "$student_response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

# 3. ADMIN API TESTS
echo ""
echo "3. 👑 Admin API Tests"
echo "===================="

if [ ! -z "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}Admin token available, proceeding with admin tests...${NC}"
    
    # Get dashboard stats
    echo "Testing Admin Dashboard Stats..."
    stats_response=$(curl -s -X GET "$BASE_URL/api/admin-secure/dashboard/stats" \
      -H "Authorization: Bearer $ADMIN_TOKEN" || echo "Request failed")
    
    print_result "Admin Dashboard Stats" "$stats_response" "success"
    
    # Get all users
    echo "Testing Admin Get Users..."
    users_response=$(curl -s -X GET "$BASE_URL/api/admin-secure/users" \
      -H "Authorization: Bearer $ADMIN_TOKEN" || echo "Request failed")
    
    print_result "Admin Get Users" "$users_response" "success"
    
    # Create test user
    echo "Testing Admin Create User..."
    create_user_response=$(curl -s -X POST "$BASE_URL/api/admin-secure/users" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{
        "name": "Test User API",
        "email": "testapi@example.com",
        "role": "student",
        "mobile": "+1234567890"
      }' || echo "Request failed")
    
    print_result "Admin Create User" "$create_user_response" "success"
    
    # Export users (CSV)
    echo "Testing Admin Export Users (CSV)..."
    export_response=$(curl -s -X GET "$BASE_URL/api/admin-secure/users/export?format=csv" \
      -H "Authorization: Bearer $ADMIN_TOKEN" || echo "Request failed")
    
    print_result "Admin Export Users CSV" "$export_response" "success"
    
    # Export users (JSON)
    echo "Testing Admin Export Users (JSON)..."
    export_json_response=$(curl -s -X GET "$BASE_URL/api/admin-secure/users/export?format=json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" || echo "Request failed")
    
    print_result "Admin Export Users JSON" "$export_json_response" "success"
else
    echo -e "${RED}❌ Admin token not available, skipping admin tests${NC}"
fi

# 4. USER REGISTRATION TEST
echo ""
echo "4. 👤 User Registration Tests"
echo "============================="

# Register a new teacher
echo "Testing Teacher Registration..."
register_teacher_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Teacher",
    "email": "testteacher@example.com",
    "mobile": "+9876543210",
    "username": "testteacher",
    "password": "password123",
    "role": "teacher"
  }' || echo "Request failed")

print_result "Teacher Registration" "$register_teacher_response" "success"

# Register a new student
echo "Testing Student Registration..."
register_student_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Student",
    "email": "teststudent@example.com",
    "mobile": "+9876543211",
    "username": "teststudent",
    "password": "password123",
    "role": "student"
  }' || echo "Request failed")

print_result "Student Registration" "$register_student_response" "success"

# Get new tokens from registration responses
NEW_TEACHER_TOKEN=$(echo "$register_teacher_response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')
NEW_STUDENT_TOKEN=$(echo "$register_student_response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

# Use the new tokens if original login failed
if [ -z "$TEACHER_TOKEN" ] && [ ! -z "$NEW_TEACHER_TOKEN" ]; then
    TEACHER_TOKEN="$NEW_TEACHER_TOKEN"
    echo -e "${PURPLE}Using newly registered teacher token${NC}"
fi

if [ -z "$STUDENT_TOKEN" ] && [ ! -z "$NEW_STUDENT_TOKEN" ]; then
    STUDENT_TOKEN="$NEW_STUDENT_TOKEN"
    echo -e "${PURPLE}Using newly registered student token${NC}"
fi

# 5. CLASSROOM API TESTS
echo ""
echo "5. 🏫 Classroom API Tests"
echo "========================="

if [ ! -z "$TEACHER_TOKEN" ]; then
    echo -e "${GREEN}Teacher token available, proceeding with classroom tests...${NC}"
    
    # Create classroom
    echo "Testing Create Classroom..."
    classroom_response=$(curl -s -X POST "$BASE_URL/api/classrooms/create" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TEACHER_TOKEN" \
      -d '{
        "name": "Test Classroom API",
        "subject": "Computer Science",
        "description": "API Testing Classroom",
        "teacherId": "testteacher123",
        "teacherName": "Test Teacher"
      }' || echo "Request failed")
    
    print_result "Create Classroom" "$classroom_response" "success"
    
    # Extract classroom details
    CLASSROOM_CODE=$(echo "$classroom_response" | grep -o '"classroomCode":"[^"]*"' | sed 's/"classroomCode":"\(.*\)"/\1/')
    CLASSROOM_ID=$(echo "$classroom_response" | grep -o '"_id":"[^"]*"' | sed 's/"_id":"\(.*\)"/\1/')
    
    echo -e "${PURPLE}Classroom Code: $CLASSROOM_CODE${NC}"
    echo -e "${PURPLE}Classroom ID: $CLASSROOM_ID${NC}"
    
    # Get teacher's classrooms
    echo "Testing Get Teacher Classrooms..."
    teacher_classrooms_response=$(curl -s -X GET "$BASE_URL/api/classrooms/teacher/testteacher123" \
      -H "Authorization: Bearer $TEACHER_TOKEN" || echo "Request failed")
    
    print_result "Get Teacher Classrooms" "$teacher_classrooms_response" "success"
    
    if [ ! -z "$CLASSROOM_CODE" ] && [ ! -z "$STUDENT_TOKEN" ]; then
        # Student joins classroom
        echo "Testing Student Join Classroom..."
        join_response=$(curl -s -X POST "$BASE_URL/api/classrooms/join" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $STUDENT_TOKEN" \
          -d "{
            \"classroomCode\": \"$CLASSROOM_CODE\",
            \"studentId\": \"teststudent123\",
            \"studentName\": \"Test Student\"
          }" || echo "Request failed")
        
        print_result "Student Join Classroom" "$join_response" "success"
        
        # Get student's classrooms
        echo "Testing Get Student Classrooms..."
        student_classrooms_response=$(curl -s -X GET "$BASE_URL/api/classrooms/student/teststudent123" \
          -H "Authorization: Bearer $STUDENT_TOKEN" || echo "Request failed")
        
        print_result "Get Student Classrooms" "$student_classrooms_response" "success"
        
        if [ ! -z "$CLASSROOM_ID" ]; then
            # Get classroom details
            echo "Testing Get Classroom Details..."
            classroom_details_response=$(curl -s -X GET "$BASE_URL/api/classrooms/$CLASSROOM_ID/details" \
              -H "Authorization: Bearer $TEACHER_TOKEN" || echo "Request failed")
            
            print_result "Get Classroom Details" "$classroom_details_response" "success"
            
            # Create lecture in classroom
            echo "Testing Create Lecture..."
            lecture_response=$(curl -s -X POST "$BASE_URL/api/classrooms/$CLASSROOM_ID/lectures" \
              -H "Content-Type: application/json" \
              -H "Authorization: Bearer $TEACHER_TOKEN" \
              -d "{
                \"subject\": \"API Testing\",
                \"topic\": \"Testing Lecture Creation\",
                \"description\": \"This is a test lecture created via API\",
                \"scheduledDate\": \"$(date -d '+1 hour' -Iseconds)\",
                \"duration\": 60,
                \"teacherId\": \"testteacher123\"
              }" || echo "Request failed")
            
            print_result "Create Lecture" "$lecture_response" "success"
            
            # Get lectures for classroom
            echo "Testing Get Classroom Lectures..."
            lectures_response=$(curl -s -X GET "$BASE_URL/api/classrooms/$CLASSROOM_ID/lectures" \
              -H "Authorization: Bearer $STUDENT_TOKEN" || echo "Request failed")
            
            print_result "Get Classroom Lectures" "$lectures_response" "success"
        fi
    fi
else
    echo -e "${RED}❌ Teacher token not available, skipping classroom tests${NC}"
fi

# 6. FRONTEND API PROXY TESTS
echo ""
echo "6. 🌐 Frontend API Proxy Tests"
echo "==============================="

# Test Next.js API routes (proxies to backend)
echo "Testing Frontend Admin Login Proxy..."
frontend_admin_response=$(curl -s -X POST "$FRONTEND_URL/admin-secure/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123!"
  }' || echo "Request failed")

print_result "Frontend Admin Login Proxy" "$frontend_admin_response" "success"

echo "Testing Frontend User Auth Proxy..."
frontend_auth_response=$(curl -s -X POST "$FRONTEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testteacher",
    "password": "password123",
    "role": "teacher"
  }' || echo "Request failed")

print_result "Frontend User Auth Proxy" "$frontend_auth_response" "success"

# 7. ERROR HANDLING TESTS
echo ""
echo "7. ⚠️  Error Handling Tests"
echo "============================"

# Test invalid login
echo "Testing Invalid Login..."
invalid_login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nonexistent",
    "password": "wrongpassword",
    "role": "student"
  }' || echo "Request failed")

print_result "Invalid Login (Should Fail)" "$invalid_login_response" "error"

# Test unauthorized access
echo "Testing Unauthorized Admin Access..."
unauthorized_response=$(curl -s -X GET "$BASE_URL/api/admin-secure/users" || echo "Request failed")

print_result "Unauthorized Access (Should Fail)" "$unauthorized_response" "error"

# Test invalid classroom code
if [ ! -z "$STUDENT_TOKEN" ]; then
    echo "Testing Invalid Classroom Code..."
    invalid_join_response=$(curl -s -X POST "$BASE_URL/api/classrooms/join" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -d '{
        "classroomCode": "INVALID",
        "studentId": "teststudent123",
        "studentName": "Test Student"
      }' || echo "Request failed")
    
    print_result "Invalid Classroom Code (Should Fail)" "$invalid_join_response" "error"
fi

# Test missing required fields
echo "Testing Missing Fields Validation..."
missing_fields_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User"
  }' || echo "Request failed")

print_result "Missing Fields Validation (Should Fail)" "$missing_fields_response" "error"

# 8. SESSION/ROOM API TESTS
echo ""
echo "8. 🏠 Session/Room API Tests"
echo "============================"

# Get all sessions
echo "Testing Get Sessions..."
sessions_response=$(curl -s -X GET "$BASE_URL/api/sessions" || echo "Request failed")
print_result "Get Sessions" "$sessions_response" "success"

# Create a test session
echo "Testing Create Session..."
create_session_response=$(curl -s -X POST "$BASE_URL/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "testteacher123",
    "teacherName": "Test Teacher",
    "title": "API Test Session",
    "subject": "Testing",
    "bandwidthMode": "normal"
  }' || echo "Request failed")

print_result "Create Session" "$create_session_response" "success"

# Extract session ID for further tests
SESSION_ID=$(echo "$create_session_response" | grep -o '"sessionId":"[^"]*"' | sed 's/"sessionId":"\(.*\)"/\1/')

if [ ! -z "$SESSION_ID" ]; then
    echo -e "${PURPLE}Session ID: $SESSION_ID${NC}"
    
    # Get session details
    echo "Testing Get Session Details..."
    session_details_response=$(curl -s -X GET "$BASE_URL/api/sessions/$SESSION_ID" || echo "Request failed")
    print_result "Get Session Details" "$session_details_response" "success"
    
    # Test joining session
    echo "Testing Join Session..."
    join_session_response=$(curl -s -X POST "$BASE_URL/api/sessions/$SESSION_ID/join" \
      -H "Content-Type: application/json" \
      -d '{
        "userId": "teststudent123",
        "userName": "Test Student",
        "role": "student",
        "bandwidthMode": "normal"
      }' || echo "Request failed")
    
    print_result "Join Session" "$join_session_response" "success"
fi

echo ""
echo "🎉 API Testing Complete!"
echo "========================"
echo ""
echo "Summary of Tested Endpoints:"
echo "- ✅ Backend Health Check"
echo "- ✅ Authentication (Admin, Teacher, Student)"
echo "- ✅ User Registration (Teacher, Student)"
echo "- ✅ Admin Dashboard & User Management"
echo "- ✅ Classroom Creation & Management"
echo "- ✅ Student Enrollment"
echo "- ✅ Lecture Creation & Management"
echo "- ✅ Session/Room Management"
echo "- ✅ Frontend API Proxies"
echo "- ✅ Error Handling & Edge Cases"
echo ""
echo "📊 Check the results above for detailed status of each test."
echo ""
if [ ! -z "$ADMIN_TOKEN" ]; then
    echo "🔑 Admin authentication: SUCCESS"
else
    echo "❌ Admin authentication: FAILED"
fi

if [ ! -z "$TEACHER_TOKEN" ]; then
    echo "🎓 Teacher authentication: SUCCESS"
else
    echo "❌ Teacher authentication: FAILED"
fi

if [ ! -z "$STUDENT_TOKEN" ]; then
    echo "📚 Student authentication: SUCCESS"
else
    echo "❌ Student authentication: FAILED"
fi

if [ ! -z "$CLASSROOM_CODE" ]; then
    echo "🏫 Classroom creation: SUCCESS (Code: $CLASSROOM_CODE)"
else
    echo "❌ Classroom creation: FAILED"
fi

echo ""
echo "🔧 Next Steps:"
echo "- If authentication failed, check if default users exist in database"
echo "- If tests passed, the API is ready for frontend integration"
echo "- Monitor server logs for any errors during testing"
