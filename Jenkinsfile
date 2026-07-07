pipeline {
    agent any

    environment {
        IS_PRODUCTION = "${env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master' || env.BRANCH_NAME == null}"
        
        APP_PORT = "${IS_PRODUCTION == 'true' ? '4000' : '4001'}"
        CONTAINER_NAME = "${IS_PRODUCTION == 'true' ? 'agro-backend' : 'agro-backend-staging'}"
        ENV_CRED_ID = "${IS_PRODUCTION == 'true' ? 'agro_env_backend' : 'agro-env-staging'}"
        IMAGE_NAME = "${CONTAINER_NAME}-image"
    }

    stages {
        // stage('OWASP Dependency-Check') { ... }

        stage('Unit Test & Coverage') {
            steps {
                echo "Building Test Environment..."
                sh '''
                cat << 'EOF' > Dockerfile.test
                FROM node:22-alpine
                WORKDIR /app
                COPY package*.json ./
                RUN npm install
                COPY . .
                EOF
                docker build -t ${IMAGE_NAME}-test -f Dockerfile.test .
                rm Dockerfile.test
                '''
                
                echo "Running Unit Tests and Extracting Reports..."
                sh '''
                docker run --name test-run-container ${IMAGE_NAME}-test npm run test:coverage || true
                rm -rf ./coverage
                docker cp test-run-container:/app/coverage ./coverage || true
                
                EXIT_CODE=$(docker inspect test-run-container --format='{{.State.ExitCode}}')
                docker rm test-run-container
                
                if [ "$EXIT_CODE" != "0" ]; then
                    echo "Unit tests failed!"
                    exit $EXIT_CODE
                fi
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                docker build -t ${IMAGE_NAME} .
                '''
            }
        }

        stage('Deploy (Safe Restart)') {
            steps {
                withCredentials([
                    file(credentialsId: "${ENV_CRED_ID}", variable: 'ENV_FILE')
                ]) {
                    sh '''
                    TEST_CONTAINER="${CONTAINER_NAME}-tester"
                    
                    echo "=== Memulai Proses Deploy Anti-Downtime ==="
                    docker rm -f $TEST_CONTAINER || true

                    echo "1. Menyalakan versi baru di latar belakang..."
                    docker run -d \
                    --name $TEST_CONTAINER \
                    --network 1panel-network \
                    --env-file $ENV_FILE \
                    -v /data/agro/public/uploads:/app/public/uploads \
                    ${IMAGE_NAME}

                    echo "2. Menunggu 10 detik startup database..."
                    sleep 10

                    # Health check specific for Backend API
                    echo "3. Melakukan API Health Check..."
                    HEALTHY="false"
                    for i in $(seq 1 15); do
                        # We use docker exec to run curl inside the tester container since it has no mapped host port yet
                        if docker exec $TEST_CONTAINER wget -qO- http://127.0.0.1:4000/api/health > /dev/null; then
                            HEALTHY="true"
                            break
                        fi
                        echo "Menunggu Backend API siap (percobaan $i/15)..."
                        sleep 3
                    done

                    if [ "$HEALTHY" = "true" ]; then
                        echo "4. UJI COBA SUKSES! API Sehat. Mengalihkan traffic..."
                        docker rm -f ${CONTAINER_NAME} || true
                        docker rm -f $TEST_CONTAINER || true
                        
                        docker run -d \
                        --name ${CONTAINER_NAME} \
                        --network 1panel-network \
                        --env-file $ENV_FILE \
                        -v /data/agro/public/uploads:/app/public/uploads \
                        -p ${APP_PORT}:4000 \
                        ${IMAGE_NAME}

                        echo "=== Deploy ${CONTAINER_NAME} BERHASIL ==="
                    else
                        echo "=== GAGAL: Aplikasi backend gagal health check ==="
                        docker logs $TEST_CONTAINER --tail 100
                        docker rm -f $TEST_CONTAINER
                        exit 1
                    fi
                    '''
                }
            }
        }

        stage('Database Setup') {
            steps {
                sh '''
                echo "Running Prisma DB Push..."
                docker exec ${CONTAINER_NAME} npx prisma db push
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
            echo "${CONTAINER_NAME} deployment successful!"
        }
        failure {
            echo "${CONTAINER_NAME} deployment failed!"
            sh 'docker logs ${CONTAINER_NAME} --tail 100 || true'
        }
    }
}