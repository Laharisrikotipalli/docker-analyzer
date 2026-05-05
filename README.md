# 🐳 Docker Image Optimization Analyzer

A full-stack DevOps tool that analyzes Docker images, detects inefficiencies, and provides optimization recommendations through an interactive dashboard.

---

##  Project Overview

The **Docker Image Optimization Analyzer** helps developers:

- Understand Docker image structure  
- Identify large and inefficient layers  
- Compare multiple Docker image versions (V1 → V4)  
- Optimize image size using best practices  
- Visualize improvements through charts  

---

##  Architecture

<p align="center">
  <img src="docs/architecture.png" alt="Architecture Diagram" width="850"/>
</p>

### 🔹 Workflow

1. User enters image name in Dashboard  
2. Frontend sends request → FastAPI backend  
3. Backend uses Docker SDK to inspect image  
4. Docker Engine returns image metadata  
5. Backend processes:
   - Layers  
   - Sizes  
   - Basic optimization insights  
6. Frontend displays:
   - Charts  
   - Metrics  
   - Layer breakdown  
   - Suggestions  

---

##  Problem Statement

Docker images often become **large and inefficient** due to:

- Heavy base images (golang, node, etc.)  
- Poor Dockerfile practices  
- Too many layers  
- Missing cleanup steps  

###  Impact

- Slow deployments  
- High storage usage  
- Increased network transfer time  

---

##  Solution

This tool provides:

✔ Image analysis  
✔ Layer breakdown  
✔ Optimization suggestions  
✔ Version comparison  
✔ Visualization dashboard  

---

##  Features

###  Image Analysis

- Total image size  
- Number of layers  
- Largest layers  

---

###  Comparison Dashboard

- Compare multiple versions (V1 → V4)  
- Bar chart visualization  
- Displays:
  - Size reduction %  
  - Best optimized version  

---

###  Layer Breakdown

- Shows key layers such as:
  - RUN  
  - COPY  
  - WORKDIR  
- Displays size per layer  
- Helps identify heavy layers  

---

###  Optimization Suggestions

Rule-based suggestions based on:

- Large image size  
- High number of layers  

Examples:
- Use smaller base images  
- Reduce layers  

---

###  Dockerfile Linter

Detects basic issues like:

- Inefficient instructions  
- Missing optimizations  

---

###  Theme Support

- Light / Dark mode toggle  

---

##  Optimization Results

| Version | Size    |
|--------|--------|
| V1     | 365 MB |
| V2     | ~32 MB |
| V3     | ~4.5 MB |
| V4     | ~2.8 MB |

###  Final Reduction

**~99% image size reduction**

---

##  Project Structure

```
docker-analyzer/
│
├── analyzer_tool/
│   ├── main.py
│   ├── Dockerfile
│   ├── requirements.txt
│
├── dashboard/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│
├── apps/
│   ├── go-app/
│   │   ├── Dockerfile.v1
│   │   ├── Dockerfile.v2
│   │   ├── Dockerfile.v3
│   │   ├── Dockerfile.v4
│   │   └── main.go
│   │
│   ├── node-app/
│   ├── python-app/
│
├── docs/
│   └── architecture.png
│
├── docker-compose.yml
├── README.md
```

---

##  Setup & Run

### 1️ Clone Repository

```bash
git clone https://github.com/Laharisrikotipalli/docker-analyzer.git
cd docker-analyzer
```

---

### 2️ Start Services

```bash
docker-compose up --build
```

---

### 3️ Build Sample Images (IMPORTANT)

```bash
cd apps/go-app

docker build -t go-app:v1 -f Dockerfile.v1 .
docker build -t go-app:v2 -f Dockerfile.v2 .
docker build -t go-app:v3 -f Dockerfile.v3 .
docker build -t go-app:v4 -f Dockerfile.v4 .
```

---

##  Access

- Dashboard → http://localhost:3000  
- API Docs → http://localhost:8000/docs  

---

##  Usage

1. Enter image name (e.g., `go-app:v1`)  
2. Click **Analyze**  
3. Click **Compare All**  
4. View:
   - Chart comparison  
   - Reduction %  
   - Best version  
   - Layer breakdown  

---

##  Tech Stack

- Backend → FastAPI, Python Docker SDK  
- Frontend → HTML, CSS, JavaScript, Chart.js  
- DevOps → Docker, Docker Compose  

---

##  Optimization Techniques Used

- Multi-stage builds  
- Minimal base images (Alpine/slim)  
- Layer caching optimization  
- Dependency reduction  

---

##  Use Cases

- DevOps optimization  
- CI/CD pipelines  
- Docker debugging  
- Performance tuning  

---

## 👩‍💻 Author

**Lahari Sri**  
B.Tech CSE | DevOps & Cloud Enthusiast
