pipeline {
    agent any

    environment {
        APP_PORT = "4000"
        CONTAINER_NAME = "agro-backend"
        IMAGE_NAME = "agro-backend-image"
        DOCKER_NETWORK = "agro-network"
        ENV_CRED_ID = "agro_env_backend"
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
                    curl -sS -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
                        -d "chat_id=${TG_CHAT}" \
                        -d "parse_mode=Markdown" \
                        --data-urlencode "text=🚀 *MEMULAI DEPLOY*
📦 Service: Backend (agro-backend)
🔢 Build: #${BUILD_NUMBER}
🔗 [Lihat Build](${BUILD_URL})"
                    '''
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout scm

                sh '''
                echo "========== GIT INFO =========="
                git branch
                git rev-parse HEAD
                git log --oneline -1
                echo "=============================="
                '''
            }
        }

        stage('Build Production Image') {
            steps {
                sh '''
                echo "Menghapus container lama..."
                docker rm -f ${CONTAINER_NAME} || true

                echo "Menghapus image lama..."
                docker rmi ${IMAGE_NAME} || true

                cat << 'EOF' > Dockerfile.prod
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY . .

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig*.json ./

# Hilangkan prepare agar Husky tidak dijalankan
RUN npm pkg delete scripts.prepare

RUN npm ci --omit=dev
RUN npm cache clean --force

RUN npx prisma generate

COPY --from=builder /app/dist ./dist

RUN addgroup -S nodejs
RUN adduser -S nestjs

RUN mkdir -p /app/public/uploads
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

CMD ["node","dist/main.js"]
EOF

                echo "Build image terbaru..."

                docker build \
                    --pull \
                    --no-cache \
                    -f Dockerfile.prod \
                    -t ${IMAGE_NAME} .

                rm Dockerfile.prod
                '''
            }
        }

        stage('Deploy') {
            steps {

                withCredentials([
                    file(credentialsId: "${ENV_CRED_ID}", variable: 'ENV_FILE')
                ]) {

                    sh '''
                    echo "========== DEPLOY =========="

                    echo "Menghapus container lama..."
                    docker rm -f ${CONTAINER_NAME} || true

                    echo "Menjalankan container..."
                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        --restart always \
                        --network ${DOCKER_NETWORK} \
                        --env-file "$ENV_FILE" \
                        -v /data/agro/public/uploads:/app/public/uploads \
                        -p ${APP_PORT}:4000 \
                        ${IMAGE_NAME}

                    echo "Menunggu aplikasi..."
                    sleep 10

                    echo "Container berjalan:"
                    docker ps

                    echo "Push Database..."
                    docker exec ${CONTAINER_NAME} \
                        npx prisma db push --accept-data-loss --skip-generate \
                        || echo "⚠️ Prisma db push gagal, deploy tetap dilanjutkan."

                    echo "Seed Database..."
                    docker exec ${CONTAINER_NAME} \
                        npx -p ts-node -p typescript ts-node prisma/seed.ts \
                        || echo "⚠️ Prisma seed gagal, deploy tetap dilanjutkan."

                    echo "Log backend:"
                    docker logs --tail 30 ${CONTAINER_NAME} || true

                    echo "========== DEPLOY SELESAI =========="
                    '''
                }
            }
        }
    }

    post {

        always {
            sh '''
            echo "Membersihkan cache..."
            docker image prune -f || true
            docker builder prune -f || true
            '''
        }

        success {
            withCredentials([
                string(credentialsId: 'telegram-bot-token', variable: 'TG_TOKEN'),
                string(credentialsId: 'telegram-chat-id', variable: 'TG_CHAT')
            ]) {
                sh '''
                curl -sS -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
                    -d "chat_id=${TG_CHAT}" \
                    -d "parse_mode=Markdown" \
                    --data-urlencode "text=✅ *DEPLOY BERHASIL*
📦 Service: Backend (agro-backend)
🔢 Build: #${BUILD_NUMBER}
🌐 Port: 4000
🔗 [Lihat Build](${BUILD_URL})"
                '''
            }
        }

        failure {
            withCredentials([
                string(credentialsId: 'telegram-bot-token', variable: 'TG_TOKEN'),
                string(credentialsId: 'telegram-chat-id', variable: 'TG_CHAT')
            ]) {
                sh '''
                curl -sS -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
                    -d "chat_id=${TG_CHAT}" \
                    -d "parse_mode=Markdown" \
                    --data-urlencode "text=❌ *DEPLOY GAGAL*
📦 Service: Backend (agro-backend)
🔢 Build: #${BUILD_NUMBER}
🔗 [Cek Log Build](${BUILD_URL}console)"
                '''
            }
        }
    }
}
