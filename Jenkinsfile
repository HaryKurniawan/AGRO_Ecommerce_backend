pipeline {
    agent any

    stages {

        // stage('OWASP Dependency-Check') {
        //     steps {
        //         withCredentials([
        //             string(credentialsId: 'nvd-api-key', variable: 'NVD_API_KEY')
        //         ]) {
        //             sh '''
        //             if [ -n "$NVD_API_KEY" ]; then
        //               echo "API Key ditemukan"
        //             else
        //               echo "API Key kosong"
        //               exit 1
        //             fi
                    
        //             echo "Running OWASP Dependency-Check for Backend..."
        //             docker run --rm \\
        //                 -u \$(id -u):\$(id -g) \\
        //                 -v "\$(pwd):/src" \\
        //                 -v "/var/jenkins_home/dependency-check-data:/usr/share/dependency-check/data" \\
        //                 owasp/dependency-check:latest \\
        //                 --project "Ecommerce Backend" \\
        //                 --scan /src \\
        //                 --exclude "**/node_modules/**" \\
        //                 --exclude "**/dist/**" \\
        //                 --exclude "**/coverage/**" \\
        //                 --nvdApiKey \$NVD_API_KEY \\
        //                 --format "HTML" \\
        //                 --format "JSON" \\
        //                 --out /src/dependency-check-report || true
        //             '''
        //         }
        //     }
        // }

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
                docker build -t agro-backend-test -f Dockerfile.test .
                rm Dockerfile.test
                '''
                
                echo "Running Unit Tests and Extracting Reports..."
                sh '''
                # Jalankan test di dalam container dan abaikan error sementara agar bisa extract report
                docker run --name test-run-container agro-backend-test npm run test:coverage || true
                
                # Tarik keluar folder coverage yang berisi laporan HTML, JUnit, dan Cobertura ke workspace Jenkins
                rm -rf ./coverage
                docker cp test-run-container:/app/coverage ./coverage || true
                
                # Ambil status exit code asli dari test
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
                docker build -t agro-backend .
                '''
            }
        }

        stage('Deploy') {
        steps {
            withCredentials([
                file(credentialsId: 'agro-env', variable: 'ENV_FILE')
            ]) {
                sh '''
                docker stop agro-backend || true
                docker rm agro-backend || true

               docker run -d \
                --name agro-backend \
                --network 1panel-network \
                --env-file $ENV_FILE \
                -v /data/agro/public/uploads:/app/public/uploads \
                -p 4000:4000 \
                agro-backend
                '''
            }
        }
    }

        stage('Health Check') {
            steps {
                sh '''
                echo "Waiting application startup..."

                for i in \$(seq 1 30)
                do
                  if curl -sf http://agro-backend:4000/api/health > /dev/null; then
                    echo "Application is healthy!"
                    exit 0
                  fi

                  echo "Attempt $i/30 - waiting..."
                  sleep 5
                done

                echo "Application failed to become healthy"
                docker logs agro-backend --tail 100

                exit 1
                '''
            }
        }

        stage('Database Setup') {
            steps {
                sh '''
                echo "Running Prisma DB Push..."
                docker exec agro-backend npx prisma db push
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
            echo 'Deployment successful!'
        }

        failure {
            echo 'Deployment failed!'
            sh 'docker logs agro-backend --tail 100 || true'
        }
    }
}