const API = "http://localhost:8000";

/* THEME */
function toggleTheme() {
  document.body.classList.toggle("dark");
  const t = document.getElementById("themeToggle");
  t.innerHTML = document.body.classList.contains("dark") ? "🌙" : "☀";
}

/* ANALYZE */
async function analyzeImage() {
  const name = document.getElementById("imageInput").value;

  const res = await fetch(`${API}/api/analyze`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({image_name:name})
  });

  const data = await res.json();

  document.getElementById("metricSize").innerText = data.total_size_mb + " MB";
  document.getElementById("metricLayers").innerText = data.num_layers;

  fillTable(data.layers);
  drawChart(data.layers);
}

/* TABLE */
function fillTable(layers){
  let html="";
  layers.forEach((l,i)=>{
    html+=`
      <tr>
        <td>${i+1}</td>
        <td>${(l.Size/1024/1024).toFixed(2)}</td>
        <td>${l.CreatedBy || ""}</td>
      </tr>`;
  });
  document.getElementById("layerTable").innerHTML = html;
}

/* ANALYZE CHART */
function drawChart(layers){
  const ctx = document.getElementById("chart").getContext("2d");

  if(window.chart) window.chart.destroy();

  window.chart = new Chart(ctx,{
    type:"bar",
    data:{
      labels:layers.map((_,i)=>"Layer "+(i+1)),
      datasets:[{
        label:"Size (MB)",
        data:layers.map(l=>l.Size/1024/1024),
        backgroundColor:"#6366f1"
      }]
    },
    options:{responsive:true,maintainAspectRatio:false}
  });
}

/* COMPARE */
async function compareImages(){
  const img1 = document.getElementById("img1").value;
  const img2 = document.getElementById("img2").value;

  const r1=await fetch(`${API}/api/analyze`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({image_name:img1})
  });

  const r2=await fetch(`${API}/api/analyze`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({image_name:img2})
  });

  const d1=await r1.json();
  const d2=await r2.json();

  const reduction=((d1.total_size_mb-d2.total_size_mb)/d1.total_size_mb*100).toFixed(2);

  document.getElementById("compareResult").innerHTML = `
    <b>${img1}</b>: ${d1.total_size_mb} MB<br>
    <b>${img2}</b>: ${d2.total_size_mb} MB<br>
    <b>Reduction:</b> ${reduction}%
  `;

  document.getElementById("progressBar").style.width = reduction + "%";

  drawCompareChart(d1.total_size_mb, d2.total_size_mb, img1, img2);
}

/* COMPARE CHART (FINAL FIX) */
function drawCompareChart(v1,v2,l1,l2){
  const ctx = document.getElementById("compareChart").getContext("2d");

  if(window.compareChart) window.compareChart.destroy();

  window.compareChart = new Chart(ctx,{
    type:"bar",
    data:{
      labels:[l1,l2],
      datasets:[{
        label:"Image Size (MB)",
        data:[v1,v2],
        backgroundColor:["#6366f1","#22c55e"]
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false
    }
  });
}

/* LINT */
async function lintDockerfile(){
  const content=document.getElementById("dockerfileInput").value;

  const res=await fetch(`${API}/api/lint`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({dockerfile_content:content})
  });

  const data=await res.json();

  document.getElementById("lintResult").innerHTML =
    data.map(w=>`Line ${w.line}: ${w.message}`).join("<br>");
}