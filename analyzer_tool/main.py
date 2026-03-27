import docker
import json
import typer
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


cli = typer.Typer()

def get_client():
    return docker.from_env()


def analyze_image_logic(image_name):
    try:
        client = get_client()
        image = client.images.get(image_name)

        history = image.history()

        layers = [{
            "Id": l.get("Id", ""),
            "CreatedBy": l.get("CreatedBy", ""),
            "Size": l.get("Size", 0)
        } for l in history]

        total_size = sum(l["Size"] for l in layers)

        return {
            "image_id": image.id,
            "tags": image.tags,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "num_layers": len(layers),
            "layers": layers,
            "largest_layers": sorted(
                layers, key=lambda x: x["Size"], reverse=True
            )[:3]
        }

    except Exception as e:
        raise Exception(f"Error analyzing image: {str(e)}")
@cli.command()
def analyze(image_name: str):
    """
    Analyze Docker image via CLI
    """
    try:
        result = analyze_image_logic(image_name)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))


@cli.command()
def lint(file_path: str):
    """
    Lint Dockerfile via CLI
    """
    warnings = []
    try:
        with open(file_path) as f:
            lines = f.readlines()

        for i, line in enumerate(lines):
            if "ADD" in line:
                warnings.append({
                    "line": i + 1,
                    "severity": "warning",
                    "message": "Use COPY instead of ADD"
                })

            if "latest" in line:
                warnings.append({
                    "line": i + 1,
                    "severity": "warning",
                    "message": "Avoid using 'latest' tag"
                })

        print(json.dumps(warnings, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}))


class AnalyzeRequest(BaseModel):
    image_name: str


class LintRequest(BaseModel):
    dockerfile_content: str

@app.post("/api/analyze")
def analyze_api(req: AnalyzeRequest):
    try:
        return analyze_image_logic(req.image_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/lint")
def lint_api(req: LintRequest):
    warnings = []
    try:
        lines = req.dockerfile_content.split("\n")

        for i, line in enumerate(lines):
            if "ADD" in line:
                warnings.append({
                    "line": i + 1,
                    "severity": "warning",
                    "message": "Use COPY instead of ADD"
                })

            if "latest" in line:
                warnings.append({
                    "line": i + 1,
                    "severity": "warning",
                    "message": "Avoid using 'latest' tag"
                })

        return warnings

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    cli()