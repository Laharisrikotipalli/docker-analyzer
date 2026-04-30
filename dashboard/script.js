let chart;
let imageData = {};

async function analyze() {
  let name = document.getElementById("image").value.trim();
  if (!name) return alert("Enter image name");

  let res = await fetch("http://localhost:8000/api/analyze", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({image_name:name})
  });

  let data = await res.json();

  imageData[name] = data.total_size_mb;

  document.getElementById("output").innerText =
    JSON.stringify(data, null, 2);

  updateAllUI();
  showLayers(data.layers);
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
      imageData[v] = data.total_size_mb;
    } catch {}
  }

  document.getElementById("output").innerText = "Comparison completed";
  updateAllUI();
}

function updateAllUI() {
  updateChart();
  updateMetrics();
  calculateReduction();
  highlightBest();
}

function updateMetrics() {
  let count = Object.keys(imageData).length;
  document.getElementById("totalImages").innerText = count;
}

function updateChart() {
  const canvas = document.getElementById("sizeChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(imageData),
      datasets: [{
        label: "Size (MB)",
        data: Object.values(imageData),
        backgroundColor: "#3b82f6"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function calculateReduction() {
  let vals = Object.values(imageData);
  let text = document.getElementById("reductionText");

  if (vals.length < 2) {
    text.innerText = "Add more images to compare";

    let bar = document.getElementById("progressFill");
    if (bar) bar.style.width = "0%";

    return;
  }

  let max = Math.max(...vals);
  let min = Math.min(...vals);

  let r = ((max - min) / max * 100).toFixed(2);

  text.innerText = r + "%";

  let bar = document.getElementById("progressFill");
  if (bar) bar.style.width = r + "%";
}

function highlightBest() {
  let entries = Object.entries(imageData);

  if (entries.length === 0) {
    document.getElementById("bestVersion").innerText = "-";
    return;
  }

  let best = entries.reduce((a,b)=> a[1]<b[1]?a:b);

  document.getElementById("bestVersion").innerText =
    best[0] + " (" + best[1] + " MB)";
}

function resetData() {
  imageData = {};

  if (chart) chart.destroy();

  document.getElementById("output").innerText = "";
  document.getElementById("layerCards").innerHTML = "";
  document.getElementById("reductionText").innerText = "-";
  document.getElementById("bestVersion").innerText = "-";
  document.getElementById("totalImages").innerText = "0";

  let bar = document.getElementById("progressFill");
  if (bar) bar.style.width = "0%";
}

function showLayers(layers) {
  let container = document.getElementById("layerCards");
  container.innerHTML = "";

  layers.slice(0,8).forEach(l=>{
    let size = (l.Size/1024/1024).toFixed(2);

    let cmd = (l.CreatedBy || "")
      .replace("/bin/sh -c ","")
      .replace("# buildkit","");

    if (cmd.length > 80)
      cmd = cmd.substring(0,80) + "...";

    container.innerHTML += `
      <div class="layer-card">
        <div class="layer-command">${cmd}</div>
        <div class="layer-size">${size} MB</div>
      </div>`;
  });
}

function generateSuggestions(data) {
  let list = document.getElementById("aiSuggestions");
  list.innerHTML = "";

  if (data.total_size_mb > 200)
    list.innerHTML += "<li>Use smaller base image</li>";

  if (data.num_layers > 10)
    list.innerHTML += "<li>Reduce layers</li>";
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

function toggleTheme() {
  document.body.classList.toggle("light");

  let btn = document.getElementById("themeToggle");
  btn.innerText =
    document.body.classList.contains("light") ? "🌞" : "🌙";
}