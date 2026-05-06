import docker, json
import typer
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = typer.Typer()
api = FastAPI()

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    image_name: str

class LintRequest(BaseModel):
    dockerfile_content: str

def get_client():
    return docker.from_env()

def analyze_image_logic(image_name):
    client = get_client()
    image = client.images.get(image_name)

    history = image.history()
    layers = [layer for layer in history if not layer.get('Tags')]
    total_size = image.attrs['Size']

    return {
        "image_id": image.id,
        "tags": image.tags,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "num_layers": len(layers),
        "layers": layers,
        "largest_layers": sorted(layers, key=lambda x: x['Size'], reverse=True)[:3]
    }

@app.command()
def analyze(image_name: str):
    print(json.dumps(analyze_image_logic(image_name), indent=2))

def lint_dockerfile_logic(content):
    issues = []
    lines = content.split("\n")

    has_user_directive = False
    has_healthcheck = False
    run_commands = []
    from_count = 0

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Skip empty lines and comments
        if not stripped or stripped.startswith("#"):
            continue

        instruction = stripped.split()[0].upper() if stripped.split() else ""

        # Rule 1: Use COPY instead of ADD (unless URL or tar extraction needed)
        if instruction == "ADD":
            args = stripped[4:].strip()
            # ADD is acceptable for URLs or tar archives
            if not args.startswith("http") and not any(args.endswith(ext) for ext in [".tar", ".tar.gz", ".tgz", ".tar.bz2", ".tar.xz"]):
                issues.append({
                    "line": i + 1,
                    "severity": "warning",
                    "message": "Use COPY instead of ADD unless you need URL downloads or automatic tar extraction"
                })

        # Rule 2: apt-get install without cleanup
        if "apt-get install" in line and "rm -rf /var/lib/apt/lists" not in line:
            # Check if cleanup is on a chained command on the same line
            if "rm -rf /var/lib/apt/lists" not in line:
                issues.append({
                    "line": i + 1,
                    "severity": "warning",
                    "message": "apt-get install without 'rm -rf /var/lib/apt/lists/*' increases image size; chain the cleanup in the same RUN"
                })

        # Rule 3: Pinning versions — avoid :latest tag
        if instruction == "FROM" and ":latest" in stripped:
            issues.append({
                "line": i + 1,
                "severity": "warning",
                "message": "Avoid the ':latest' tag — pin to a specific version for reproducible builds"
            })

        # Rule 4: FROM without pinned digest or version (bare image name, no tag at all)
        if instruction == "FROM" and "AS" not in stripped.upper():
            image_ref = stripped.split()[1] if len(stripped.split()) > 1 else ""
            if ":" not in image_ref and "@" not in image_ref and image_ref not in ("scratch",):
                issues.append({
                    "line": i + 1,
                    "severity": "warning",
                    "message": f"No version tag specified for '{image_ref}' — this implicitly uses :latest"
                })
            from_count += 1
        elif instruction == "FROM":
            from_count += 1

        # Rule 5: Multiple consecutive RUN commands (could be merged)
        if instruction == "RUN":
            run_commands.append(i + 1)

        # Rule 6: pip install without --no-cache-dir
        if "pip install" in line and "--no-cache-dir" not in line:
            issues.append({
                "line": i + 1,
                "severity": "warning",
                "message": "Use 'pip install --no-cache-dir' to avoid storing pip cache in the image layer"
            })

        # Rule 7: npm install without --production or NODE_ENV check
        if "npm install" in line and "--production" not in line and "--omit=dev" not in line:
            issues.append({
                "line": i + 1,
                "severity": "info",
                "message": "Consider 'npm install --production' or '--omit=dev' to exclude devDependencies in production images"
            })

        # Rule 8: USER directive presence
        if instruction == "USER":
            has_user_directive = True

        # Rule 9: HEALTHCHECK presence
        if instruction == "HEALTHCHECK":
            has_healthcheck = True

        # Rule 10: Secrets in ENV or ARG
        for secret_keyword in ["PASSWORD", "SECRET", "TOKEN", "API_KEY", "PRIVATE_KEY"]:
            if instruction in ("ENV", "ARG") and secret_keyword in stripped.upper():
                issues.append({
                    "line": i + 1,
                    "severity": "error",
                    "message": f"Potential secret detected in {instruction} instruction — use Docker secrets or build-time ARGs instead of baking credentials into the image"
                })

    # Rule 11: No USER directive (container runs as root)
    if not has_user_directive and from_count > 0:
        issues.append({
            "line": 0,
            "severity": "warning",
            "message": "No USER directive found — container will run as root, which is a security risk"
        })

    # Rule 12: Multiple consecutive RUN instructions (suggest chaining)
    if len(run_commands) >= 3:
        # Find sequences of consecutive RUN lines
        consecutive = []
        for idx in range(len(run_commands) - 1):
            if run_commands[idx + 1] - run_commands[idx] <= 2:
                consecutive.append(run_commands[idx])
        if consecutive:
            issues.append({
                "line": consecutive[0],
                "severity": "info",
                "message": "Multiple consecutive RUN instructions create extra layers — chain them with '&&' and '\\' to reduce layer count"
            })

    return issues

@app.command()
def lint(file: str):
    with open(file) as f:
        print(json.dumps(lint_dockerfile_logic(f.read()), indent=2))

@api.post("/api/analyze")
def analyze_api(req: AnalyzeRequest):
    return analyze_image_logic(req.image_name)

@api.post("/api/lint")
def lint_api(req: LintRequest):
    return lint_dockerfile_logic(req.dockerfile_content)

if __name__ == "__main__":
    app()