# Developer Guide — Lending Library (Full Stack)

A step-by-step guide for running, testing, and understanding the complete application locally. Aimed at developers learning Java backend development.

---

## Architecture Overview

```
lending-library-react-ts/
├── backend/          Java 21 + Spring Boot 3.3 REST API (port 8080)
└── src/              React 18 + TypeScript frontend (port 3000, SSR via server.js)
```

The frontend calls the backend over HTTP. Both run as separate processes in local dev.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Java | 21+ | https://adoptium.net (Temurin 21 LTS) |
| Maven | 3.9+ | https://maven.apache.org/install.html (see Windows note below) |
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Bundled with Node |
| Git | any | https://git-scm.com |

Verify installs:

```bash
java -version        # openjdk 21.x.x
mvn -version         # Apache Maven 3.9.x
node -version        # v18.x.x or v20.x.x
npm -version         # 9.x.x or 10.x.x
```

> **Windows — Maven is not in winget.** Download the binary zip from https://maven.apache.org/download.cgi, extract it (e.g. to `C:\tools\apache-maven-3.9.x`), and add `C:\tools\apache-maven-3.9.x\bin` to your user `PATH` environment variable. Then open a new terminal and run `mvn -version` to confirm.

---

## 1. Clone and set up

```bash
git clone https://github.com/raghupa88/lending-library-react-ts.git
cd lending-library-react-ts
```

Copy the environment file (required before starting the frontend):

```bash
cp .env.example .env
```

---

## 2. Start the Backend

```bash
cd backend
mvn spring-boot:run
```

First run downloads dependencies (~200 MB). Subsequent runs are fast.

You should see:
```
Started LendingLibraryApplication in 3.x seconds
```

**What just happened:**
- Spring Boot started an embedded Tomcat on port **8080**
- An **H2 in-memory database** was created (data lives only while the process runs)
- `data.sql` seeded: 2 users, 2 subscriptions, 6 books, 1 active loan

**Verify the backend is healthy:**

```bash
curl http://localhost:8080/actuator/health
# {"status":"UP"}
```

---

## 3. Start the Frontend

Open a **new terminal tab** (backend must keep running):

```bash
# from repo root
npm install      # first time only
npm run dev
```

Frontend starts on **http://localhost:3000** (served by `server.js` with SSR — not the Vite default port 5173)

---

## 4. Seed Credentials

| Role | Email | Password |
|------|-------|----------|
| Member | member@example.com | password123 |
| Admin | admin@example.com | password123 |

---

## 5. Explore the API

### Swagger UI (interactive docs)

Open in browser: **http://localhost:8080/api/v1/swagger-ui.html**

Every endpoint is documented with request/response schemas. You can call endpoints directly from the UI after clicking **Authorize** and pasting a JWT token.

### H2 Database Console

Open: **http://localhost:8080/h2-console**

| Field | Value |
|-------|-------|
| JDBC URL | `jdbc:h2:mem:lendinglibrary` |
| Username | `sa` |
| Password | *(leave blank)* |

Use this to inspect tables (`USERS`, `BOOKS`, `LOANS`, `SUBSCRIPTIONS`, `ORDERS`) with SQL.

---

## 6. Manual API Testing with curl

### Login

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"member@example.com","password":"password123"}' | jq .
```

Copy the `accessToken` from the response for authenticated calls.

### List books (public)

```bash
curl -s http://localhost:8080/api/v1/books | jq '.data.content[].title'
```

### Filter books

```bash
# By genre
curl -s "http://localhost:8080/api/v1/books?genre=Fiction" | jq '.data.totalElements'

# By search term
curl -s "http://localhost:8080/api/v1/books?search=alchemist" | jq '.data.content[0].title'

# Available only
curl -s "http://localhost:8080/api/v1/books?available=true" | jq '.data.content | length'
```

### Get your profile (JWT required)

```bash
TOKEN="paste-access-token-here"

curl -s http://localhost:8080/api/v1/users/<your-user-id> \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Borrow a book

```bash
TOKEN="paste-access-token-here"
BOOK_ID="paste-book-uuid-here"

curl -s -X POST http://localhost:8080/api/v1/loans \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"bookId\":\"$BOOK_ID\"}" | jq .
```

### Return a book

```bash
LOAN_ID="paste-loan-uuid-here"

curl -s -X PUT http://localhost:8080/api/v1/loans/$LOAN_ID/return \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Register a new user

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "password": "secret123"
  }' | jq .
```

---

## 7. Run Backend Tests

```bash
cd backend
mvn test
```

All 15 tests run against H2 in-memory — no external dependencies needed.

```
Tests run: 15, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### What each test covers

| Test class | Location | What it tests |
|------------|----------|---------------|
| `AuthServiceTest` | `service/` | register, duplicate email, login, wrong password, JWT round-trip |
| `BookServiceTest` | `service/` | pagination, getById found/not found |
| `LoanServiceTest` | `service/` | borrow success, no copies available, BASIC plan limit exceeded |
| `AuthControllerTest` | `controller/` | POST /auth/login → 200, 401, 400 (MockMvc) |
| `BookControllerTest` | `controller/` | GET /books → 200 with paged response (MockMvc) |

### Run a single test class

```bash
mvn test -Dtest=AuthServiceTest
mvn test -Dtest=LoanServiceTest
```

### Run a single test method

```bash
mvn test -Dtest=LoanServiceTest#borrow_basicPlanLimit_exceeded
```

### View test coverage report

After `mvn test`, open in your browser:

```
backend/target/site/jacoco/index.html
```

---

## 8. Understanding the Backend Code

### Package structure

```
com.lendinglibrary/
├── api/
│   ├── controller/     HTTP layer — maps requests to service calls
│   ├── dto/            Request and response data classes (records)
│   ├── envelope/       ApiResponse<T> and PagedResponse<T> wrappers
│   ├── exception/      GlobalExceptionHandler (@RestControllerAdvice)
│   └── filter/         JwtAuthFilter, CorrelationIdFilter
├── application/
│   └── service/        Business logic (AuthService, BookService, LoanService, …)
├── domain/
│   ├── entity/         JPA entities (User, Book, Loan, Subscription, Order)
│   ├── enums/          Role, LoanStatus, SubscriptionPlan, …
│   └── exception/      Domain exceptions (ResourceNotFoundException, …)
└── infrastructure/
    ├── persistence/    Spring Data JPA repositories
    ├── security/       JwtProvider, SecurityConfig, JwtAuthFilter
    └── config/         OpenApiConfig
```

### Request lifecycle (example: GET /api/v1/books)

```
HTTP Request
    → JwtAuthFilter (validates Bearer token if present)
    → CorrelationIdFilter (attaches X-Correlation-Id to MDC for logging)
    → BookController.getBooks()
    → BookService.list()          (business logic, pagination)
    → BookRepository.findWithFilters()  (JPQL query)
    → Database
    → PagedResponse<BookResponse>
    → ApiResponse.ok(pagedResponse)
    → JSON response
```

### JWT flow

```
POST /auth/login
  → AuthService.login()
  → BCrypt.matches(rawPassword, storedHash)
  → JwtProvider.generateAccessToken()   (1h, HS256)
  → JwtProvider.generateRefreshToken()  (7 days)
  → AuthResponse { accessToken, refreshToken, … }

Subsequent requests:
  → Authorization: Bearer <accessToken>
  → JwtAuthFilter extracts email from token
  → UserDetailsServiceImpl.loadUserByUsername(email)
  → SecurityContextHolder.setAuthentication(…)
  → Controller receives @AuthenticationPrincipal UserDetails
```

### Subscription enforcement (LoanService)

```java
// BASIC plan: max 3 concurrent loans
int active = loanRepository.countByUserAndStatus(user, LoanStatus.BORROWED);
int limit = subscription.getPlan().maxConcurrentLoans();   // BASIC=3, PREMIUM/ADMIN=unlimited
if (limit > 0 && active >= limit) {
    throw new BusinessException("Loan limit reached for your plan");
}
```

---

## 9. Configuration

### Backend (`backend/src/main/resources/`)

| File | Purpose |
|------|---------|
| `application.yml` | Dev defaults (H2, logging, JWT secret placeholder) |
| `application-prod.yml` | Prod overrides (PostgreSQL from env vars) |

**Key env vars for production:**

```bash
SPRING_PROFILES_ACTIVE=prod
DATABASE_URL=jdbc:postgresql://host:5432/lendingdb
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=secret
JWT_SECRET=your-256-bit-secret-key-here
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

### Frontend (`.env` at repo root)

```
VITE_API_URL=http://localhost:8080/api/v1
```

---

## 10. Common Issues

### Port 8080 already in use

**Mac/Linux:**
```bash
lsof -i :8080
kill -9 <PID>
```

**Windows:**
```powershell
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### H2 data is gone after restart

This is expected — H2 is in-memory. The seed data in `data.sql` re-runs on every startup.

### Browser blocks API calls (Content Security Policy)

If the browser console shows a CSP error like `"connect-src" violated`, the frontend's `server.js` is missing a `connect-src` directive. Open `server.js` and ensure the CSP header includes:

```
connect-src 'self' http://localhost:8080;
```

### CORS error in browser

Make sure the frontend is running on `localhost:3000`. The backend whitelists both `localhost:3000` and `localhost:5173` in `SecurityConfig.java`.

### Token expired (401 after an hour)

Call `POST /api/v1/auth/refresh` with your `refreshToken` to get a new `accessToken`. The frontend handles this automatically.

### Maven build fails

```bash
# Clear Maven cache and retry
rm -rf ~/.m2/repository/com/lendinglibrary
mvn clean install
```

---

## 11. Full Reset (clean slate)

```bash
# Stop both servers (Ctrl+C in each terminal)

# Backend — wipes H2 data (it's in-memory, nothing to delete)
cd backend
mvn spring-boot:run     # seed data re-runs automatically

# Frontend
cd ..
npm run dev
```

---

## 12. Next Steps for Learning Java

- **Add a new endpoint**: Try adding `GET /api/v1/books/{id}/availability` that returns remaining copies
- **Write a new test**: Add `UserServiceTest` using `@ExtendWith(MockitoExtension.class)`
- **Try PostgreSQL**: Set env vars and run with `-Dspring.profiles.active=prod`
- **Read the JPA queries**: `BookRepository.findWithFilters()` shows how to write dynamic JPQL
- **Trace a request**: Add a breakpoint in `BookController.getBooks()` and step through in your IDE
