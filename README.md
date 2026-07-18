# AI Interview Preparation Platform (Prepped.AI)

Prepped.AI is a full-stack, AI-powered interview preparation platform where users can practice technical and behavioral interviews with a dynamic AI interviewer, receive detailed real-time evaluations, and track their analytics over time.

## Technology Stack
*   **Backend**: Java 24, Spring Boot 3.3.1, Spring Security (JWT), Spring Data JPA.
*   **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, Recharts (visualizations), Lucide React (icons).
*   **Database**: PostgreSQL (Production) / H2 in-memory (Local Dev Fallback).
*   **AI Engine**: Google Gemini 1.5 Flash API (Structured JSON Response Schema) with a built-in Mock fallback.
*   **Containerization**: Docker & Docker Compose.

---

## Getting Started

### Prerequisites
*   Java JDK 17 or higher (Java 24 fully supported)
*   Node.js v20+ and npm
*   Docker & Docker Compose (Optional, for containerized run)

### Option 1: Running Locally (Fastest for Dev / No DB required)
The platform is designed to run locally with zero-configuration using an in-memory H2 Database and a Mock AI service. You do not need to install PostgreSQL or have an AI key to test the application immediately.

#### 1. Start Backend
1.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Start the Spring Boot application (defaults to `dev` profile with H2 in-memory database):
    ```bash
    ./mvnw.cmd spring-boot:run
    ```
    *Note: The backend will run on `http://localhost:8080`. The H2 Console is accessible at `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:interviewdb`, User: `sa`, Password: `password`).*

#### 2. Start Frontend
1.  Navigate to the `frontend` folder:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite development server:
    ```bash
    npm run dev
    ```
    *Note: The frontend will run on `http://localhost:5173`.*

---

### Option 2: Running with Docker Compose (PostgreSQL + Dockerized Production Build)
Docker Compose will launch a local PostgreSQL container, build the Spring Boot application JAR, compile the React production bundle, and host the frontend inside an Nginx server running a reverse proxy.

1.  (Optional) Set your Google Gemini API key on your host system:
    *   **Windows (PowerShell)**:
        ```powershell
        $env:GEMINI_API_KEY="your-api-key-here"
        ```
    *   **Mac/Linux**:
        ```bash
        export GEMINI_API_KEY="your-api-key-here"
        ```
    *If no API key is specified, the application will automatically fall back to mock questions and feedback, allowing you to run the full flow without cost.*

2.  Run Docker Compose from the root workspace folder:
    ```bash
    docker-compose up --build
    ```
3.  Access the application at `http://localhost:5173`. Nginx will serve the frontend and automatically proxy requests to `/api/v1/` to the Spring Boot backend on port `8080` internally.

---

## Environment Variables

| Variable | Description | Profile | Default |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key | All | Optional (Falls back to Mock) |
| `JWT_SECRET` | Secret key used for signing JWTs | Prod | `defaultSecretKeyForAIPrepMustBeAtLeast32Bytes...` |
| `DB_HOST` | Database host address | Prod | `localhost` (in compose, set to `db`) |
| `DB_NAME` | Database schema name | Prod | `interviewdb` |
| `DB_USER` | Database user login | Prod | `postgres` |
| `DB_PASSWORD` | Database user password | Prod | `postgres` |

---

## REST API Documentation

All endpoints are prefixed with `/api/v1`.

### 1. Authentication
*   **`POST /auth/signup`**: Creates a new user profile.
    *   *Request Body*:
        ```json
        {
          "email": "candidate@gmail.com",
          "password": "securepassword",
          "name": "Jane Doe",
          "targetRole": "Backend Developer",
          "experienceLevel": "Mid-Level"
        }
        ```
    *   *Response*: Returns JWT token and profile details.
*   **`POST /auth/login`**: Authenticates credentials.
    *   *Request Body*:
        ```json
        {
          "email": "candidate@gmail.com",
          "password": "securepassword"
        }
        ```

### 2. Interviews & Session Engine
*   **`POST /interviews`**: Initializes a new interview session. Generates 3 tailored questions via Gemini AI.
    *   *Authorization*: `Bearer <token>`
    *   *Request Body*:
        ```json
        {
          "role": "Java Engineer",
          "type": "TECHNICAL",
          "difficulty": "MEDIUM"
        }
        ```
*   **`GET /interviews`**: Lists all past interview sessions for the authenticated user.
*   **`GET /interviews/{id}`**: Retrieves a specific session's transcripts, scores, and active questions.
*   **`POST /interviews/{id}/questions/{questionId}/answer`**: Submits a response to a question. Triggers an asynchronous AI evaluation in the background.
    *   *Request Body*:
        ```json
        {
          "answer": "HashMap operates on hashing. Under the hood, it maintains an array of buckets..."
        }
        ```
    *   *Response*: Immediately returns the current session structure (feedback fields show `null` while evaluation runs in background).

### 3. Dashboard Analytics
*   **`GET /dashboard/stats`**: Aggregates and returns user dashboard statistics (averages, streaks, category breakdowns).
    *   *Response*:
        ```json
        {
          "overallAverageScore": 81.2,
          "totalSessions": 5,
          "currentStreak": 3,
          "categoryAverages": {
            "TECHNICAL": 84.0,
            "BEHAVIORAL": 78.5
          },
          "recentSessions": [ ... ]
        }
        ```
