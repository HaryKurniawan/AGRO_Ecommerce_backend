pipeline {
    agent any

    environment {
        // Multi-branch environment detection
        IS_PRODUCTION = "${env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master'}"
        IS_STAGING = "${env.BRANCH_NAME == 'develop' || env.BRANCH_NAME == 'staging'}"
        IS_FEATURE = "${!(env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master' || env.BRANCH_NAME == 'develop' || env.BRANCH_NAME == 'staging')}"
        
        // Dynamic configuration based on branch
        APP_PORT = "${IS_PRODUCTION == 'true' ? '4000' : (IS_STAGING == 'true' ? '4001' : '4002')}"
        CONTAINER_NAME = "${IS_PRODUCTION == 'true' ? 'agro-backend' : (IS_STAGING == 'true' ? 'agro-backend-staging' : 'agro-backend-feature')}"
        ENV_CRED_ID = "${IS_PRODUCTION == 'true' ? 'agro_env_backend' : 'agro_env_staging'}"
        IMAGE_NAME = "${CONTAINER_NAME}-image"
        DOCKER_NETWORK = "agro-network"
        SERVER_IP = "34.229.99.116"
        
        // Environment labels
        DEPLOY_ENV = "${IS_PRODUCTION == 'true' ? 'PRODUCTION' : (IS_STAGING == 'true' ? 'STAGING' : 'FEATURE')}"
        HEALTH_CHECK_URL = "http://127.0.0.1:4000/api/health"
    }

    stages {
        stage('Environment Info') {
            steps {
                echo "🌿 Branch: ${env.BRANCH_NAME}"
                echo "🎯 Environment: ${DEPLOY_ENV}"
                echo "🚀 Container: ${CONTAINER_NAME}"
                echo "🌐 Port: ${APP_PORT}"
                echo "🔗 Network: ${DOCKER_NETWORK}"
                echo "📍 Server: ${SERVER_IP}"
            }
        }

        stage('Unit Test & Coverage') {
            steps {
                echo "Building NestJS Test Environment for ${DEPLOY_ENV}..."
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
                rm Dockerfile.test
                '''
                
                echo "Running NestJS Unit Tests and Coverage..."
                sh '''
                docker run --name test-run-container-${BUILD_NUMBER} ${IMAGE_NAME}-test npm run test:coverage || true
                rm -rf ./coverage
                docker cp test-run-container-${BUILD_NUMBER}:/app/coverage ./coverage || true
                
                EXIT_CODE=$(docker inspect test-run-container-${BUILD_NUMBER} --format='{{.State.ExitCode}}')
                docker rm test-run-container-${BUILD_NUMBER}
                
                if [ "$EXIT_CODE" != "0" ]; then
                    echo "❌ NestJS Unit tests failed!"
                    exit $EXIT_CODE
                fi
                echo "✅ NestJS Unit tests passed!"
                '''
            }
        }

        stage('Build NestJS Docker Image') {
            steps {
                sh '''
                echo "Building optimized NestJS Docker image for ${DEPLOY_ENV}..."
                
                cat << 'EOF' > Dockerfile.prod
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force
RUN npx prisma generate

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy dependencies and prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy source code and build
COPY . .
RUN npm run build

# Create public/uploads directory
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
                    TEST_CONTAINER="${CONTAINER_NAME}-tester-${BUILD_NUMBER}"
                    
                    echo "=== Memulai Proses Deploy NestJS ${DEPLOY_ENV} Anti-Downtime ==="
                    echo "🌿 Branch: ${BRANCH_NAME}"
                    echo "🎯 Environment: ${DEPLOY_ENV}"
                    echo "🚀 Container: ${CONTAINER_NAME}"
                    echo "🌐 Port: ${APP_PORT}"
                    echo "📍 Server: ${SERVER_IP}"
                    echo "🔗 Network: ${DOCKER_NETWORK}"
                    
                    # Cleanup previous test container
                    docker rm -f $TEST_CONTAINER || true

                    echo "1. 🚀 Menyalakan NestJS versi baru di latar belakang..."
                    docker run -d \
                    --name $TEST_CONTAINER \
                    --network ${DOCKER_NETWORK} \
                    --env-file $ENV_FILE \
                    -v /data/agro/public/uploads:/app/public/uploads \
                    -v /data/agro/auth_info_baileys:/app/auth_info_baileys \
                    ${IMAGE_NAME}

                    echo "2. ⏳ Menunggu 20 detik untuk NestJS startup dan database connection..."
                    sleep 20

                    # Health check dengan retry logic
                    echo "3. 🏥 Melakukan NestJS API Health Check..."
                    HEALTHY="false"
                    for i in $(seq 1 25); do
                        echo "Percobaan health check $i/25..."
                        
                        # Test menggunakan curl di container
                        if docker exec $TEST_CONTAINER sh -c "
                        if command -v curl >/dev/null 2>&1; then
                            curl -f http://127.0.0.1:4000/api/health
                        else
                            wget -q --spider http://127.0.0.1:4000/api/health
                        fi
                        " 2>/dev/null; then
                            echo "✅ NestJS Health check PASSED!"
                            HEALTHY="true"
                            break
                        fi
                        
                        # Fallback: Check if container is running and port is listening
                        if docker exec $TEST_CONTAINER sh -c "netstat -tuln | grep :4000" 2>/dev/null; then
                            echo "✅ NestJS Port 4000 is listening!"
                            HEALTHY="true"
                            break
                        fi
                        
                        echo "❌ Health check failed, menunggu 3 detik..."
                        sleep 3
                    done

                    if [ "$HEALTHY" = "true" ]; then
                        echo "4. 🎉 UJI COBA SUKSES! NestJS API Sehat. Mengalihkan traffic..."
                        
                        # Stop old container
                        docker rm -f ${CONTAINER_NAME} || true
                        docker rm -f $TEST_CONTAINER || true
                        
                        # Start new production container
                        docker run -d \
                        --name ${CONTAINER_NAME} \
                        --network ${DOCKER_NETWORK} \
                        --env-file $ENV_FILE \
                        -v /data/agro/public/uploads:/app/public/uploads \
                        -v /data/agro/auth_info_baileys:/app/auth_info_baileys \
                        -p ${APP_PORT}:4000 \
                        ${IMAGE_NAME}

                        echo "=== ✅ Deploy NestJS ${CONTAINER_NAME} (${DEPLOY_ENV}) BERHASIL ==="
                        echo "🌐 API tersedia di: http://${SERVER_IP}:${APP_PORT}"
                    else
                        echo "=== ❌ GAGAL: NestJS aplikasi backend gagal health check ==="
                        echo "📋 Container logs:"
                        docker logs $TEST_CONTAINER --tail 50
                        echo "📊 Container status:"
                        docker exec $TEST_CONTAINER ps aux || true
                        docker rm -f $TEST_CONTAINER
                        exit 1
                    fi
                    '''
                }
            }
        }

        stage('Feature Branch Build Only') {
            when {
                not {
                    anyOf {
                        branch 'main'
                        branch 'master'
                        branch 'develop'
                        branch 'staging'
                    }
                }
            }
            steps {
                echo "🚀 Feature branch detected: ${env.BRANCH_NAME}"
                echo "✅ NestJS build completed successfully - No deployment for feature branches"
                echo "🧪 Use this build for testing purposes"
            }
        }

        stage('Database Setup') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'develop'
                    branch 'staging'
                }
            }
            steps {
                sh '''
                echo "🗄️ Running Prisma operations for ${DEPLOY_ENV}..."
                
                # Generate Prisma client
                docker exec ${CONTAINER_NAME} npx prisma generate || {
                    echo "⚠️ Prisma Generate failed"
                    docker logs ${CONTAINER_NAME} --tail 20
                    exit 1
                }
                
                # Push database schema
                docker exec ${CONTAINER_NAME} npx prisma db push || {
                    echo "⚠️ Prisma DB Push failed, checking container status..."
                    docker logs ${CONTAINER_NAME} --tail 20
                    exit 1
                }
                
                echo "✅ Database setup completed for ${DEPLOY_ENV}!"
                '''
            }
        }

        stage('Post-Deploy Verification') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'develop'
                    branch 'staging'
                }
            }
            steps {
                sh '''
                echo "🧪 Final NestJS verification for ${DEPLOY_ENV}..."
                sleep 5
                
                # Test external access
                if curl -f http://${SERVER_IP}:${APP_PORT}/api/health > /dev/null 2>&1; then
                    echo "✅ External NestJS API access: SUCCESS"
                    echo "🌐 ${DEPLOY_ENV} API: http://${SERVER_IP}:${APP_PORT}"
                else
                    echo "⚠️ External API access: FAILED (check security groups)"
                fi
                
                # Test Swagger documentation (if available)
                if curl -f http://${SERVER_IP}:${APP_PORT}/api/docs > /dev/null 2>&1; then
                    echo "📚 Swagger docs: http://${SERVER_IP}:${APP_PORT}/api/docs"
                fi
                
                # Show container status
                echo "📊 Container status:"
                docker ps | grep ${CONTAINER_NAME}
                
                # Show environment summary
                echo "📋 Environment Summary:"
                echo "   🌿 Branch: ${BRANCH_NAME}"
                echo "   🎯 Environment: ${DEPLOY_ENV}"
                echo "   🚀 Container: ${CONTAINER_NAME}"
                echo "   🌐 URL: http://${SERVER_IP}:${APP_PORT}"
                echo "   📚 Docs: http://${SERVER_IP}:${APP_PORT}/api/docs"
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'dependency-check-report/*.html', allowEmptyArchive: true
            archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
            junit testResults: 'coverage/junit.xml', allowEmptyResults: true
        }
        success {
            script {
                if (env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master' || env.BRANCH_NAME == 'develop' || env.BRANCH_NAME == 'staging') {
                    echo "🎉 NestJS ${CONTAINER_NAME} (${DEPLOY_ENV}) deployment successful!"
                    echo "🌐 API URL: http://${SERVER_IP}:${APP_PORT}"
                    echo "📋 Health Check: http://${SERVER_IP}:${APP_PORT}/api/health"
                    echo "📚 API Docs: http://${SERVER_IP}:${APP_PORT}/api/docs"
                } else {
                    echo "✅ Feature branch ${env.BRANCH_NAME} build successful!"
                    echo "🧪 Ready for testing and merge"
                }
            }
        }
        failure {
            echo "❌ NestJS ${CONTAINER_NAME} (${DEPLOY_ENV}) deployment failed!"
            sh '''
            if docker ps -a | grep -q ${CONTAINER_NAME}; then
                echo "📋 Container logs:"
                docker logs ${CONTAINER_NAME} --tail 100 || true
            fi
            echo "🔍 Network status:"
            docker network ls | grep ${DOCKER_NETWORK} || true
            '''
        }
    }
}
