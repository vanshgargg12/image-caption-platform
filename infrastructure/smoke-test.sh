#!/usr/bin/env bg
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
INFERENCE_URL="${INFERENCE_URL:-http://localhost:3001}"

echo "========================================="
echo "   Image Caption Platform Smoke Test     "
echo "========================================="

# 1. Health Endpoints Check
echo "[1/7] Verifying health and readiness endpoints..."

HEALTH_RESP=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/v1/health")
HEALTH_CODE=$(echo "$HEALTH_RESP" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESP" | head -n -1)

if [ "$HEALTH_CODE" -ne 200 ]; then
  echo "❌ Backend health check failed with status $HEALTH_CODE: $HEALTH_BODY"
  exit 1
fi
echo "✅ Backend Liveness: OK ($HEALTH_BODY)"

if curl -s "${INFERENCE_URL}/internal/health" > /dev/null 2>&1; then
  INFER_HEALTH=$(curl -s "${INFERENCE_URL}/internal/health")
  echo "✅ Inference Liveness: OK ($INFER_HEALTH)"
else
  echo "ℹ️ Inference service internal port not exposed to host (expected in production)."
fi

# 2. Upload Valid Sample Image
echo "[2/7] Uploading sample JPEG image to POST /api/v1/captions..."

TMP_IMAGE=$(mktemp /tmp/smoke_test_XXXXXX.jpg)
# Write valid JPEG magic header 0xFF 0xD8 0xFF 0xE0
printf '\xFF\xD8\xFF\xE0\x00\x10\x4A\x46\x49\x46\x00\x01\x01\x01\x00\x48\x00\x48\x00\x00\xFF\xDB\x00\x43' > "$TMP_IMAGE"

UPLOAD_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/v1/captions" \
  -F "image=@${TMP_IMAGE}" \
  -F "captionMode=SHORT")

rm -f "$TMP_IMAGE"

UPLOAD_CODE=$(echo "$UPLOAD_RESP" | tail -n1)
UPLOAD_BODY=$(echo "$UPLOAD_RESP" | head -n -1)

if [ "$UPLOAD_CODE" -ne 201 ]; then
  echo "❌ Image upload failed with status $UPLOAD_CODE: $UPLOAD_BODY"
  exit 1
fi

CAPTION_ID=$(echo "$UPLOAD_BODY" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
GENERATED_CAPTION=$(echo "$UPLOAD_BODY" | grep -o '"generatedCaption":"[^"]*' | cut -d'"' -f4)

echo "✅ Caption Upload: Success (ID: $CAPTION_ID)"
echo "   Generated Caption: \"$GENERATED_CAPTION\""

# 3. Retrieve Caption Request Metadata
echo "[3/7] Retrieving metadata via GET /api/v1/captions/${CAPTION_ID}..."

GET_RESP=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/v1/captions/${CAPTION_ID}")
GET_CODE=$(echo "$GET_RESP" | tail -n1)
GET_BODY=$(echo "$GET_RESP" | head -n -1)

if [ "$GET_CODE" -ne 200 ]; then
  echo "❌ Metadata retrieval failed with status $GET_CODE: $GET_BODY"
  exit 1
fi
echo "✅ Metadata Retrieval: Success"

# 4. Submit Feedback
echo "[4/7] Submitting feedback via POST /api/v1/captions/${CAPTION_ID}/feedback..."

FEEDBACK_PAYLOAD='{"rating":"POSITIVE","userComment":"Smoke test automated feedback"}'
FEEDBACK_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/v1/captions/${CAPTION_ID}/feedback" \
  -H "Content-Type: application/json" \
  -d "$FEEDBACK_PAYLOAD")

FEEDBACK_CODE=$(echo "$FEEDBACK_RESP" | tail -n1)
FEEDBACK_BODY=$(echo "$FEEDBACK_RESP" | head -n -1)

if [ "$FEEDBACK_CODE" -ne 201 ]; then
  echo "❌ Feedback submission failed with status $FEEDBACK_CODE: $FEEDBACK_BODY"
  exit 1
fi
echo "✅ Feedback Submission: Success"

# 5. Confirm Invalid Image Handling
echo "[5/7] Testing controlled error response for invalid image upload..."

TMP_BAD_FILE=$(mktemp /tmp/smoke_bad_XXXXXX.txt)
echo "invalid non-image content" > "$TMP_BAD_FILE"

BAD_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/v1/captions" \
  -F "image=@${TMP_BAD_FILE}")

rm -f "$TMP_BAD_FILE"

BAD_CODE=$(echo "$BAD_RESP" | tail -n1)
BAD_BODY=$(echo "$BAD_RESP" | head -n -1)

if [ "$BAD_CODE" -ne 400 ]; then
  echo "❌ Expected HTTP 400 for invalid image, got $BAD_CODE: $BAD_BODY"
  exit 1
fi

ERROR_CODE=$(echo "$BAD_BODY" | grep -o '"code":"[^"]*' | cut -d'"' -f4)
echo "✅ Controlled Error Response: Success (HTTP $BAD_CODE, Code: $ERROR_CODE)"

# 6. Summary
echo "========================================="
echo "🎉 ALL SMOKE TESTS PASSED SUCCESSFULLY!  "
echo "========================================="
