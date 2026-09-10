#!/bin/bash

BASE_URL="${BASE_URL:-http://localhost/api}"

echo "🚀 Starting Continuous Load Generator for Boostr Application..."
echo "Target: $BASE_URL"
echo "Generating continuous transactions & logs for ELK & Elastic APM"
echo "Press Ctrl+C to stop."
echo "-----------------------------------------------------------------"

# Array of standard GET endpoints
ENDPOINTS=(
  "/employees"
  "/products"
  "/products/random"
  "/orders"
  "/stats"
  "/departments"
  "/health"
)

DEPARTMENTS=("Engineering" "Marketing" "Sales" "HR" "Design" "Product")
ROLES=("Developer" "Analyst" "Specialist" "Manager" "Consultant")

while true; do
  TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

  # 1. Hit a random GET endpoint
  RANDOM_INDEX=$((RANDOM % ${#ENDPOINTS[@]}))
  ENDPOINT=${ENDPOINTS[$RANDOM_INDEX]}
  
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$ENDPOINT" || echo "ERR")
  echo "[$TIMESTAMP] [GET] $ENDPOINT -> HTTP $HTTP_CODE"

  # 2. 25% chance to simulate placing a new order (POST)
  # This triggers distributed trace across: order-service -> employee-service -> product-service -> notification-service
  if [ $((RANDOM % 4)) -eq 0 ]; then
    ORDER_CODE=$(curl -s -X POST "$BASE_URL/orders" -o /dev/null -w "%{http_code}" || echo "ERR")
    echo "[$TIMESTAMP] [POST] /orders (Multi-service transaction) -> HTTP $ORDER_CODE"
  fi

  # 3. 10% chance to simulate adding a new employee
  if [ $((RANDOM % 10)) -eq 0 ]; then
    RAND_DEP=${DEPARTMENTS[$((RANDOM % ${#DEPARTMENTS[@]}))]}
    RAND_ROLE=${ROLES[$((RANDOM % ${#ROLES[@]}))]}
    RAND_ID=$((RANDOM % 9000 + 1000))
    EMP_DATA="{\"name\":\"SimUser_$RAND_ID\",\"department\":\"$RAND_DEP\",\"role\":\"$RAND_ROLE\",\"salary\":$((RANDOM % 50000 + 60000))}"
    EMP_CODE=$(curl -s -X POST -H "Content-Type: application/json" -d "$EMP_DATA" "$BASE_URL/employees" -o /dev/null -w "%{http_code}" || echo "ERR")
    echo "[$TIMESTAMP] [POST] /employees (Create employee) -> HTTP $EMP_CODE"
  fi

  # 4. 5% chance to simulate CPU spike
  if [ $((RANDOM % 20)) -eq 0 ]; then
    HEAVY_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/heavy" || echo "ERR")
    echo "[$TIMESTAMP] [GET] /heavy (CPU spike simulation) -> HTTP $HEAVY_CODE"
  fi
  
  # 5. Sleep for a short duration between 0.3 and 1.2 seconds for steady continuous flow
  SLEEP_TIME=$(awk -v min=0.3 -v max=1.2 'BEGIN{srand(); print min+rand()*(max-min)}')
  sleep $SLEEP_TIME
done

