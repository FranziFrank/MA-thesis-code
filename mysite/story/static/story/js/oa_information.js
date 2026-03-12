import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

function drawOAPieChart(apiData) {
  const data = apiData.group_by.map(d => ({
    label: d.key_display_name === "false" ? "Non Open Access" : "Open Access",
    value: +d.count,
    color: d.key_display_name === "false" ? "violet" : "green"
  }));

  const width = 300, height = 300;
  const radius = Math.min(width, height) / 2 - 10;

  d3.select("#oa-pie").selectAll("*").remove();

  const svg = d3.select("#oa-pie")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const pie = d3.pie().sort(null).value(d => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  const arcs = pie(data);

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  svg.selectAll("path")
    .data(arcs)
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", d => d.data.color)
    .attr("stroke", "#fff")
    .style("stroke-width", "2px")
    .on("mouseover", function (event, d) {
      d3.select(this).style("opacity", 0.8);
      tooltip.style("opacity", 1)
        .html(`<strong>${d.data.label}</strong><br>${d.data.value} publications<br>${(d.data.value / d3.sum(data, d => d.value) * 100).toFixed(1)}%`)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 30}px`);
    })
    .on("mousemove", event => {
      tooltip.style("left", `${event.pageX + 10}px`)
             .style("top", `${event.pageY - 30}px`);
    })
    .on("mouseout", function () {
      d3.select(this).style("opacity", 1);
      tooltip.style("opacity", 0);
    });

  svg.selectAll("text")
    .data(arcs)
    .enter()
    .append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .style("fill", "#fff")
    .text(d => `${(d.data.value / d3.sum(data, d => d.value) * 100).toFixed(1)}%`);
}

const apiUrl = "https://api.openalex.org/works?group_by=open_access.is_oa&per_page=200&filter=authorships.institutions.lineage:i94626330";

async function fetchAndDraw() {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    drawOAPieChart(data);
  } catch (err) {
    console.error("Failed to load OA data:", err);
  }
}

document.addEventListener("DOMContentLoaded", fetchAndDraw);
