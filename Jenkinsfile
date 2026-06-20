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