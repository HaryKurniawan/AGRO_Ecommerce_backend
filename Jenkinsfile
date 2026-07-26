pipeline {
    agent any

    environment {
        IMAGE_NAME = "agro-backend-image"
        CONTAINER_NAME = "agro-backend"
        ENV_CRED_ID = "agro-backend-env"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Notify Start') {
            steps {
                withCredentials([
                    string(credentialsId: 'telegram-bot-token', variable: 'TG_TOKEN'),
                    string(credentialsId: 'telegram-chat-id', variable: 'TG_CHAT')
                ]) {
                    sh '''
TOKEN=$(echo "$TG_TOKEN" | tr -d '\\r\\n ')
CHAT=$(echo "$TG_CHAT" | tr -d '\\r\\n ')

curl -sS -X POST \
  https://api.telegram.org/bot${TOKEN}/sendMessage \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "chat_id": "${CHAT}",
  "parse_mode": "Markdown",
  "text": "🚀 *Deploy Backend Dimulai*\\nBuild #${BUILD_NUMBER}"
}
EOF
'''
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Inject Environment') {
            steps {
                withCredentials([
                    file(credentialsId: "${ENV_CRED_ID}", variable: 'ENV_FILE')
                ]) {
                    sh '''
cp "$ENV_FILE" .env
'''
                }
            }
        }

        stage('Build Image') {
            steps {
                sh '''
docker compose build --pull
'''
            }
        }

        stage('Prepare Database') {
            steps {
                sh '''
docker rm -f ${CONTAINER_NAME}-db-prep || true

docker run -d \
  --name ${CONTAINER_NAME}-db-prep \
  --network agro-network \
  --env-file .env \
  --entrypoint sh \
  ${IMAGE_NAME} \
  -c "sleep infinity"

sleep 5

docker exec ${CONTAINER_NAME}-db-prep \
  npx prisma db push --accept-data-loss --skip-generate

docker exec ${CONTAINER_NAME}-db-prep \
  node dist/prisma/seed.js

docker rm -f ${CONTAINER_NAME}-db-prep
'''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
set -e

TEST_CONTAINER="${CONTAINER_NAME}-tester"

echo "======================================="
echo "Removing old tester container..."
echo "======================================="
docker rm -f $TEST_CONTAINER || true

echo "======================================="
echo "Starting tester container..."
echo "======================================="
docker run -d \
  --name $TEST_CONTAINER \
  --network agro-network \
  --env-file .env \
  ${IMAGE_NAME}

echo "Waiting application..."
sleep 5

echo "======================================="
echo "Running Health Check..."
echo "======================================="
SUCCESS=false
for i in $(seq 1 30); do
    # Try both /api/health and /health endpoints
    if docker exec $TEST_CONTAINER wget -qO- http://127.0.0.1:4000/api/health >/dev/null 2>&1 || \
       docker exec $TEST_CONTAINER wget -qO- http://127.0.0.1:4000/health >/dev/null 2>&1; then
        echo "Health Check Passed"
        SUCCESS=true
        break
    fi

    echo "Waiting application... ($i/30)"
    sleep 2
done

if [ "$SUCCESS" = "false" ]; then
    echo "Health Check Failed"
    echo "========== TEST CONTAINER LOG =========="
    docker logs $TEST_CONTAINER || true
    docker rm -f $TEST_CONTAINER || true
    exit 1
fi

echo "======================================="
echo "Deploying to production..."
echo "======================================="
docker compose up -d --force-recreate

echo "======================================="
echo "Removing tester container..."
echo "======================================="
docker rm -f $TEST_CONTAINER || true

echo "======================================="
echo "Deploy Success"
echo "======================================="
'''
            }
        }

        stage('Container Status') {
            steps {
                sh '''
docker ps

docker logs --tail 100 ${CONTAINER_NAME}
'''
            }
        }
    }

    post {
        success {
            withCredentials([
                string(credentialsId: 'telegram-bot-token', variable: 'TG_TOKEN'),
                string(credentialsId: 'telegram-chat-id', variable: 'TG_CHAT')
            ]) {
                sh '''
TOKEN=$(echo "$TG_TOKEN" | tr -d '\\r\\n ')
CHAT=$(echo "$TG_CHAT" | tr -d '\\r\\n ')

curl -sS -X POST \
  https://api.telegram.org/bot${TOKEN}/sendMessage \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "chat_id": "${CHAT}",
  "parse_mode": "Markdown",
  "text": "✅ *Deploy Backend Berhasil*\\nBuild #${BUILD_NUMBER}"
}
EOF
'''
            }
        }

        failure {
            withCredentials([
                string(credentialsId: 'telegram-bot-token', variable: 'TG_TOKEN'),
                string(credentialsId: 'telegram-chat-id', variable: 'TG_CHAT')
            ]) {
                sh '''
TOKEN=$(echo "$TG_TOKEN" | tr -d '\\r\\n ')
CHAT=$(echo "$TG_CHAT" | tr -d '\\r\\n ')

curl -sS -X POST \
  https://api.telegram.org/bot${TOKEN}/sendMessage \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "chat_id": "${CHAT}",
  "parse_mode": "Markdown",
  "text": "❌ *Deploy Backend Gagal*\\nBuild #${BUILD_NUMBER}\\n${BUILD_URL}console"
}
EOF
'''
            }
        }

        always {
            sh '''
rm -f .env || true
docker rm -f ${CONTAINER_NAME}-tester || true
docker rm -f ${CONTAINER_NAME}-db-prep || true
docker builder prune -f || true
'''
        }
    }
}