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

                docker build \
                    --pull \
                    --no-cache \
                    -f Dockerfile.test \
                    -t ${IMAGE_NAME}-test .

                docker run --rm ${IMAGE_NAME}-test npm run test:coverage

                rm Dockerfile.test
                '''
            }
        }

        stage('Build Production Image') {
            steps {
                sh '''

                docker rm -f ${CONTAINER_NAME} || true
                docker rmi ${IMAGE_NAME} || true

                cat << 'EOF' > Dockerfile.prod

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --ignore-scripts
RUN npx prisma generate

COPY . .

RUN npm run build


FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev --ignore-scripts
RUN npm cache clean --force
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

RUN addgroup -S nodejs
RUN adduser -S nestjs

RUN mkdir -p /app/public/uploads

RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

CMD ["node","dist/src/main.js"]

EOF

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

            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'develop'
                    branch 'staging'
                }
            }

            steps {

                withCredentials([
                    file(credentialsId: "${ENV_CRED_ID}", variable: 'ENV_FILE')
                ]) {

                    sh '''

                    docker rm -f ${CONTAINER_NAME} || true

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

                    docker exec ${CONTAINER_NAME} npx prisma db push --accept-data-loss

                    docker exec ${CONTAINER_NAME} sh -c "npm install ts-node typescript && npx prisma db seed"

                    docker ps

                    '''
                }
            }
        }
    }

    post {

        always {

            sh '''
            docker image prune -f || true
            docker builder prune -f || true
            '''

        }

        success {
            echo "Deploy berhasil."
        }

        failure {
            echo "Deploy gagal."
        }
    }
}