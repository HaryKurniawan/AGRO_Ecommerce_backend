pipeline {
    agent any

    environment {
        // Configuration
        APP_PORT = "4000"
        CONTAINER_NAME = "agro-backend"
        IMAGE_NAME = "${CONTAINER_NAME}-image"
        DOCKER_NETWORK = "agro-network"
        ENV_CRED_ID = "agro_env_backend"
    }

    stages {
        stage('Unit Test') {
            steps {
                sh '''
                cat << 'EOF' > Dockerfile.test
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build
EOF
                docker build -t ${IMAGE_NAME}-test -f Dockerfile.test .
                docker run --rm ${IMAGE_NAME}-test npm run test:coverage
                rm Dockerfile.test
                '''
            }
        }

        stage('Build Image') {
            steps {
                sh '''
                cat << 'EOF' > Dockerfile.prod
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --ignore-scripts
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production --ignore-scripts && npm cache clean --force
RUN npx prisma generate

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN mkdir -p /app/public/uploads
RUN chown -R nestjs:nodejs /app
USER nestjs
EXPOSE 4000
CMD ["npm", "run", "start:prod"]
EOF
                docker build -f Dockerfile.prod -t ${IMAGE_NAME} .
                rm Dockerfile.prod
                '''
            }
        }

        stage('Deploy') {
            when {
                anyOf { branch 'main'; branch 'master'; branch 'develop'; branch 'staging' }
            }
            steps {
                withCredentials([
                    file(credentialsId: "${ENV_CRED_ID}", variable: 'ENV_FILE')
                ]) {
                    sh '''
                    echo "🚀 Menghentikan versi lama..."
                    docker rm -f ${CONTAINER_NAME} || true
                    
                    echo "🌟 Menyalakan versi baru..."
                    docker run -d \
                    --name ${CONTAINER_NAME} \
                    --network ${DOCKER_NETWORK} \
                    --env-file "$ENV_FILE" \
                    --restart always \
                    -v /data/agro/public/uploads:/app/public/uploads \
                    -v /data/agro/auth_info_baileys:/app/auth_info_baileys \
                    -p ${APP_PORT}:4000 \
                    ${IMAGE_NAME}
                    
                    echo "🗄️ Menyiapkan Database Schema..."
                    sleep 5
                    # docker exec ${CONTAINER_NAME} npx prisma db push
                    
                    echo "✅ Deploy Berhasil di Port ${APP_PORT}!"
                    '''
                }
            }
        }
    }
}
