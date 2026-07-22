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
TOKEN=$(echo "$TG_TOKEN" | tr -d '\r\n ')
CHAT=$(echo "$TG_CHAT" | tr -d '\r\n ')

curl -sS -X POST \
https://api.telegram.org/bot${TOKEN}/sendMessage \
-H "Content-Type: application/json" \
-d @- <<EOF
{
"chat_id":"${CHAT}",
"parse_mode":"Markdown",
"text":"🚀 *Deploy Backend Dimulai*\\nBuild #${BUILD_NUMBER}"
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

        stage('Deploy') {

            steps {

                sh '''

                docker compose up -d --force-recreate

                '''

            }

        }

        stage('Database Migration') {

            steps {

                sh '''

                docker exec ${CONTAINER_NAME} \
                npx prisma migrate deploy

                '''

            }

        }

        stage('Database Seed') {

            steps {

                sh '''

                docker exec ${CONTAINER_NAME} \
                npm run prisma:seed || true

                '''

            }

        }

        stage('Container Status') {

            steps {

                sh '''

                docker ps

                docker logs --tail 30 ${CONTAINER_NAME}

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
TOKEN=$(echo "$TG_TOKEN" | tr -d '\r\n ')
CHAT=$(echo "$TG_CHAT" | tr -d '\r\n ')

curl -sS -X POST \
https://api.telegram.org/bot${TOKEN}/sendMessage \
-H "Content-Type: application/json" \
-d @- <<EOF
{
"chat_id":"${CHAT}",
"parse_mode":"Markdown",
"text":"✅ *Deploy Backend Berhasil*\\nBuild #${BUILD_NUMBER}"
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
TOKEN=$(echo "$TG_TOKEN" | tr -d '\r\n ')
CHAT=$(echo "$TG_CHAT" | tr -d '\r\n ')

curl -sS -X POST \
https://api.telegram.org/bot${TOKEN}/sendMessage \
-H "Content-Type: application/json" \
-d @- <<EOF
{
"chat_id":"${CHAT}",
"parse_mode":"Markdown",
"text":"❌ *Deploy Backend Gagal*\\nBuild #${BUILD_NUMBER}\\n${BUILD_URL}console"
}
EOF
'''
            }

        }

        always {

            sh '''

            rm -f .env || true

            docker builder prune -f

            '''

        }

    }

}