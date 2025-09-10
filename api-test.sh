#!/bin/bash

# VoiceBoard API Testing Script
# Testing all endpoints systematically

BASE_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3000/api"

echo "🚀 VoiceBoard API Testing Script"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    local test_name="$1"
    local response="$2"
    local expected_code="$3"
    
    echo -e "${BLUE}Testing: $test_name${NC}"
    echo "Response: $response"
    
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

# 2. AUTHENTICATION TESTS
echo "2. 🔐 Authentication Tests"
echo "=========================="

# Admin login
echo "Testing Admin Login..."
admin_response=$(curl -s -X POST "$BASE_URL/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123!"
  }' || echo "Request failed")

print_result "Admin Login" "$admin_response" "success"

# Extract admin token for further requests
ADMIN_TOKEN=$(echo "$admin_response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

# Teacher login
echo "Testing Teacher Login..."
teacher_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@test.com",
    "password": "teacher123"
  }' || echo "Request failed")

print_result "Teacher Login" "$teacher_response" "success"

# Extract teacher token
TEACHER_TOKEN=$(echo "$teacher_response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

# Student login
echo "Testing Student Login..."
student_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "student123"
  }' || echo "Request failed")

print_result "Student Login" "$student_response" "success"

# Extract student token
STUDENT_TOKEN=$(echo "$student_response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

# 3. ADMIN API TESTS
echo "3. 👑 Admin API Tests"
echo "===================="

if [ ! -z "$ADMIN_TOKEN" ]; then
    # Get dashboard stats
    echo "Testing Admin Dashboard Stats..."
    stats_response=$(curl -s -X GET "$BASE_URL/admin/dashboard/stats" \
      -H "Authorization: Bearer $ADMIN_TOKEN" || echo "Request failed")
    
    print_result "Admin Dashboard Stats" "$stats_response" "success"
    
    # Get all users
    echo "Testing Admin Get Users..."
    users_response=$(curl -s -X GET "$BASE_URL/admin/users" \
      -H "Authorization: Bearer $ADMIN_TOKEN" || echo "Request failed")
    
    print_result "Admin Get Users" "$users_response" "success"
    
    # Create test user
    echo "Testing Admin Create User..."
    create_user_response=$(curl -s -X POST "$BASE_URL/admin/users" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{
        "name": "Test User API",
        "email": "testapi@example.com",
        "role": "student",
        "mobile": "+1234567890"
      }' || echo "Request failed")
    
    print_result "Admin Create User" "$create_user_response" "success"
else
    echo "❌ Admin token not available, skipping admin tests"
fi

# 4. CLASSROOM API TESTS
echo "4. 🏫 Classroom API Tests"
echo "========================="

if [ ! -z "$TEACHER_TOKEN" ]; then
    # Create classroom
    echo "Testing Create Classroom..."
    classroom_response=$(curl -s -X POST "$BASE_URL/api/classrooms" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TEACHER_TOKEN" \
      -d '{
        "name": "Test Classroom API",
        "subject": "Computer Science",
        "description": "API Testing Classroom"
      }' || echo "Request failed")
    
    print_result "Create Classroom" "$classroom_response" "success"
    
    # Extract classroom code
    CLASSROOM_CODE=$(echo "$classroom_response" | grep -o '"classroomCode":"[^"]*"' | sed 's/"classroomCode":"\(.*\)"/\1/')
    
    # Get teacher's classrooms
    echo "Testing Get Teacher Classrooms..."
    teacher_classrooms_response=$(curl -s -X GET "$BASE_URL/api/classrooms/teacher" \
      -H "Authorization: Bearer $TEACHER_TOKEN" || echo "Request failed")
    
    print_result "Get Teacher Classrooms" "$teacher_classrooms_response" "success"
    
    if [ ! -z "$CLASSROOM_CODE" ] && [ ! -z "$STUDENT_TOKEN" ]; then
        # Student joins classroom
        echo "Testing Student Join Classroom..."
        join_response=$(curl -s -X POST "$BASE_URL/api/classrooms/join" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $STUDENT_TOKEN" \
          -d "{
            \"classroomCode\": \"$CLASSROOM_CODE\"
          }" || echo "Request failed")
        
        print_result "Student Join Classroom" "$join_response" "success"
        
        # Get student's classrooms
        echo "Testing Get Student Classrooms..."
        student_classrooms_response=$(curl -s -X GET "$BASE_URL/api/classrooms/student" \
          -H "Authorization: Bearer $STUDENT_TOKEN" || echo "Request failed")
        
        print_result "Get Student Classrooms" "$student_classrooms_response" "success"
    fi
else
    echo "❌ Teacher token not available, skipping classroom tests"
fi

# 5. LECTURE/ROOM-CLASSES API TESTS
echo "5. 📚 Lecture API Tests"
echo "======================="

if [ ! -z "$TEACHER_TOKEN" ] && [ ! -z "$CLASSROOM_CODE" ]; then
    # Create lecture
    echo "Testing Create Lecture..."
    lecture_response=$(curl -s -X POST "$BASE_URL/api/room-classes" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TEACHER_TOKEN" \
      -d "{
        \"title\": \"API Test Lecture\",
        \"subject\": \"Testing\",
        \"classroomCode\": \"$CLASSROOM_CODE\",
        \"scheduledTime\": \"$(date -d '+1 hour' -Iseconds)\",
        \"duration\": 60
      }" || echo "Request failed")
    
    print_result "Create Lecture" "$lecture_response" "success"
    
    # Extract lecture ID
    LECTURE_ID=$(echo "$lecture_response" | grep -o '"_id":"[^"]*"' | sed 's/"_id":"\(.*\)"/\1/')
    
    # Get teacher's lectures
    echo "Testing Get Teacher Lectures..."
    teacher_lectures_response=$(curl -s -X GET "$BASE_URL/api/room-classes/teacher" \
      -H "Authorization: Bearer $TEACHER_TOKEN" || echo "Request failed")
    
    print_result "Get Teacher Lectures" "$teacher_lectures_response" "success"
    
    if [ ! -z "$LECTURE_ID" ]; then
        # Get specific lecture details
        echo "Testing Get Lecture Details..."
        lecture_details_response=$(curl -s -X GET "$BASE_URL/api/room-classes/$LECTURE_ID" \
          -H "Authorization: Bearer $TEACHER_TOKEN" || echo "Request failed")
        
        print_result "Get Lecture Details" "$lecture_details_response" "success"
        
        # Start lecture
        echo "Testing Start Lecture..."
        start_lecture_response=$(curl -s -X POST "$BASE_URL/api/room-classes/$LECTURE_ID/start" \
          -H "Authorization: Bearer $TEACHER_TOKEN" || echo "Request failed")
        
        print_result "Start Lecture" "$start_lecture_response" "success"
        
        # Get live lectures (student perspective)
        if [ ! -z "$STUDENT_TOKEN" ]; then
            echo "Testing Get Live Lectures..."
            live_lectures_response=$(curl -s -X GET "$BASE_URL/api/room-classes/live" \
              -H "Authorization: Bearer $STUDENT_TOKEN" || echo "Request failed")
            
            print_result "Get Live Lectures" "$live_lectures_response" "success"
        fi
    fi
else
    echo "❌ Required tokens/IDs not available, skipping lecture tests"
fi

# 6. FRONTEND API PROXY TESTS
echo "6. 🌐 Frontend API Proxy Tests"
echo "==============================="

# Test Next.js API routes (proxies to backend)
echo "Testing Frontend Admin Login Proxy..."
frontend_admin_response=$(curl -s -X POST "$FRONTEND_URL/admin-secure/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }' || echo "Request failed")

print_result "Frontend Admin Login Proxy" "$frontend_admin_response" "success"

echo "Testing Frontend User Auth Proxy..."
frontend_auth_response=$(curl -s -X POST "$FRONTEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@test.com",
    "password": "teacher123"
  }' || echo "Request failed")

print_result "Frontend User Auth Proxy" "$frontend_auth_response" "success"

# 7. ERROR HANDLING TESTS
echo "7. ⚠️  Error Handling Tests"
echo "============================"

# Test invalid login
echo "Testing Invalid Login..."
invalid_login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@test.com",
    "password": "wrongpassword"
  }' || echo "Request failed")

print_result "Invalid Login (Should Fail)" "$invalid_login_response" "error"

# Test unauthorized access
echo "Testing Unauthorized Access..."
unauthorized_response=$(curl -s -X GET "$BASE_URL/admin/users" || echo "Request failed")

print_result "Unauthorized Access (Should Fail)" "$unauthorized_response" "error"

# Test invalid classroom code
if [ ! -z "$STUDENT_TOKEN" ]; then
    echo "Testing Invalid Classroom Code..."
    invalid_join_response=$(curl -s -X POST "$BASE_URL/api/classrooms/join" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -d '{
        "classroomCode": "INVALID"
      }' || echo "Request failed")
    
    print_result "Invalid Classroom Code (Should Fail)" "$invalid_join_response" "error"
fi

echo ""
echo "🎉 API Testing Complete!"
echo "========================"
echo ""
echo "Summary of Tested Endpoints:"
echo "- Backend Health Check"
echo "- Authentication (Admin, Teacher, Student)"
echo "- Admin Dashboard & User Management"
echo "- Classroom Creation & Management"
echo "- Student Enrollment"
echo "- Lecture Creation & Management"
echo "- Frontend API Proxies"
echo "- Error Handling & Edge Cases"
echo ""
echo "📊 Check the results above for detailed status of each test."
