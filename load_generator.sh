#!/bin/bash

echo "🚀 Starting Load Generator for Boostr Application..."
echo "Press Ctrl+C to stop."
echo "---------------------------------------------------"

BASE_URL="http://localhost/api"

# Array of standard GET endpoints
ENDPOINTS=(
  "/employees"
  "/products"
  "/orders"
  "/stats"
  "/departments"
  "/health"
)

while true; do
  # 1. Hit a random GET endpoint
  RANDOM_INDEX=$((RANDOM % ${#ENDPOINTS[@]}))
  ENDPOINT=${ENDPOINTS[$RANDOM_INDEX]}
  
  echo "[GET] $ENDPOINT"
  curl -s -o /dev/null -w "%{http_code}\n" "$BASE_URL$ENDPOINT"

  # 2. 20% chance to simulate placing a new order (POST)
  if [ $((RANDOM % 5)) -eq 0 ]; then
    echo "[POST] /orders (Simulating checkout)"
    curl -s -X POST "$BASE_URL/orders" -o /dev/null -w "%{http_code}\n"
  fi

  # 3. 5% chance to simulate a heavy CPU spike
  if [ $((RANDOM % 20)) -eq 0 ]; then
    echo "[GET] /heavy (Simulating CPU spike)"
    curl -s -o /dev/null -w "%{http_code}\n" "$BASE_URL/heavy"
  fi
  
  # 4. Sleep for a random duration between 0.5 and 2 seconds
  SLEEP_TIME=$(awk -v min=0.5 -v max=2.0 'BEGIN{srand(); print min+rand()*(max-min)}')
  sleep $SLEEP_TIME
done
