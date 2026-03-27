let chart;
let imageData = {};

async function analyze() {
  let name = document.getElementById("image").value.trim();
  if (!name) return alert("Enter image name");

  setOutput("Analyzing...");

  let res = await fetch("http://localhost:8000/api/analyze", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({image_name:name})
  });

  let data = await res.json();

  if (data.error || data.detail) {
    setOutput(data.error || data.detail);
    return;
  }

  setOutput(JSON.stringify(data, null, 2));

  imageData[name] = data.total_size_mb;

  updateChart();
  showLayers(data.layers);
  calculateReduction();
  highlightBest();
  generateSuggestions(data);
}

async function compareAll() {
  let versions = ["go-app:v1","go-app:v2","go-app:v3","go-app:v4"];

  for (let v of versions) {
    try {
      let res = await fetch("http://localhost:8000/api/analyze", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({image_name:v})
      });

      let data = await res.json();
      if (!data.error) imageData[v] = data.total_size_mb;

    } catch {}
  }

  updateChart();
  calculateReduction();
  highlightBest();

  setOutput("Comparison completed");
}

async function lint() {
  let content = document.getElementById("dockerfile").value;

  let res = await fetch("http://localhost:8000/api/lint", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({dockerfile_content:content})
  });

  let data = await res.json();

  document.getElementById("lintOutput").innerText =
    JSON.stringify(data,null,2);
}

function updateChart() {
  let labels = Object.keys(imageData);
  let values = Object.values(imageData);

  document.getElementById("chartContainer").innerHTML =
    '<canvas id="sizeChart"></canvas>';

  const ctx = document.getElementById("sizeChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type:'bar',
    data:{
      labels:labels,
      datasets:[{
        label: "Image Size (MB)",
        data:values,
        backgroundColor:['#ef4444','#f59e0b','#10b981','#3b82f6']
      }]
    }
  });
}

function calculateReduction() {
  let vals = Object.values(imageData);
  if (vals.length < 2) return;

  let max = Math.max(...vals);
  let min = Math.min(...vals);

  let r = ((max-min)/max*100).toFixed(2);

  document.getElementById("reductionText").innerText =
    "Size reduced by " + r + "%";
}

function highlightBest() {
  let entries = Object.entries(imageData);
  if (!entries.length) return;

  let best = entries.reduce((a,b)=> a[1]<b[1]?a:b);

  document.getElementById("bestVersion").innerText =
    "Best: " + best[0] + " (" + best[1] + " MB)";
}

/* =========================
   CLEAN LAYER FILTER
========================= */
function showLayers(layers) {
  let container = document.getElementById("layerCards");
  container.innerHTML = "";

  layers
    .filter(l => {
      let cmd = l.CreatedBy?.toLowerCase() || "";

      return (
        (cmd.includes("run") ||
         cmd.includes("copy") ||
         cmd.includes("cmd") ||
         cmd.includes("workdir") ||
         cmd.includes("expose")) &&

        !cmd.includes("env") &&
        !cmd.includes("mkdir") &&
        !cmd.includes("#(nop)") &&
        !cmd.includes("set -eux")
      );
    })
    .slice(0, 10)
    .forEach(l => {

      let id = l.Id !== "<missing>" ? l.Id.substring(7,15) : "";
      let size = (l.Size/1024/1024).toFixed(2);

      let cmd = l.CreatedBy
        .replace("/bin/sh -c ", "")
        .replace("# buildkit","")
        .trim();

      // trim long commands
      if (cmd.length > 80) {
        cmd = cmd.substring(0,80) + "...";
      }

      container.innerHTML += `
        <div class="layer-card">
          <div>
            <div class="layer-id">${id}</div>
            <div class="layer-command">${cmd}</div>
          </div>
          <div class="layer-size">${size} MB</div>
        </div>
      `;
    });
}

/* =========================
   CLEAN AI SUGGESTIONS
========================= */
function generateSuggestions(data) {
  let list = document.getElementById("aiSuggestions");
  list.innerHTML = "";

  let suggestions = new Set();

  if (data.total_size_mb > 200) {
    suggestions.add("Use smaller base image (Alpine or Distroless)");
  }

  if (data.num_layers > 10) {
    suggestions.add("Reduce layers using multi-stage builds");
  }

  let copyLayer = data.layers.find(l =>
    l.CreatedBy && l.CreatedBy.includes("COPY .")
  );
  if (copyLayer) {
    suggestions.add("Avoid copying entire project early to improve caching");
  }

  let bigLayer = data.layers.find(l => l.Size > 50 * 1024 * 1024);
  if (bigLayer) {
    suggestions.add("Large dependency layer detected — optimize dependencies");
  }

  if (suggestions.size === 0) {
    suggestions.add("Image is well optimized");
  }

  suggestions.forEach(s => {
    list.innerHTML += `<li>${s}</li>`;
  });
}

/* ========================= */

function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById("themeToggle");

  body.classList.toggle("light");

  if (body.classList.contains("light")) {
    btn.innerText = "🌞";
    localStorage.setItem("theme","light");
  } else {
    btn.innerText = "🌙";
    localStorage.setItem("theme","dark");
  }
}

window.onload = function () {
  let theme = localStorage.getItem("theme");

  if (theme === "light") {
    document.body.classList.add("light");
    document.getElementById("themeToggle").innerText = "🌞";
  }
};

function resetData() {
  imageData = {};
  document.getElementById("chartContainer").innerHTML = "";
  document.getElementById("layerCards").innerHTML = "";
  document.getElementById("reductionText").innerText = "";
  document.getElementById("bestVersion").innerText = "";
  document.getElementById("aiSuggestions").innerHTML = "";
}

function setOutput(text) {
  document.getElementById("output").innerText = text;
}