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
        "total_size_mb": round(total_size/(1024*1024),2),
        "num_layers": len(layers),
        "layers": layers,
        "largest_layers": sorted(layers, key=lambda x:x['Size'], reverse=True)[:3]
    }

@app.command()
def analyze(image_name: str):
    print(json.dumps(analyze_image_logic(image_name), indent=2))

def lint_dockerfile_logic(content):
    warnings=[]
    lines=content.split("\n")

    for i,line in enumerate(lines):
        if "ADD" in line:
            warnings.append({"line":i+1,"severity":"warning","message":"Use COPY instead"})
        if "apt-get install" in line:
            warnings.append({"line":i+1,"severity":"warning","message":"Missing cleanup"})
    return warnings

@app.command()
def lint(file: str):
    with open(file) as f:
        print(json.dumps(lint_dockerfile_logic(f.read()),indent=2))

@api.post("/api/analyze")
def analyze_api(req: AnalyzeRequest):
    return analyze_image_logic(req.image_name)

@api.post("/api/lint")
def lint_api(req: LintRequest):
    return lint_dockerfile_logic(req.dockerfile_content)

if __name__ == "__main__":
    app()