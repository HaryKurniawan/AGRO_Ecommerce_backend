pipeline {
    agent any

    stages {

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

                for i in $(seq 1 30)
                do
                  if curl -sf https://api.agro-ecommerce.web.id/api/health > /dev/null; then
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
                docker exec agro-backend npx prisma db push --accept-data-loss
                
                echo "Running Prisma Database Seed..."
                docker exec agro-backend npx prisma db seed
                '''
            }
        }
    }

    post {
        success {
            echo 'Deployment successful!'
        }

        failure {
            echo 'Deployment failed!'
            sh 'docker logs agro-backend --tail 100 || true'
        }
    }
}