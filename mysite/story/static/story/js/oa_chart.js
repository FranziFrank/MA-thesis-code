import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

console.log("D3 script is running");


document.addEventListener("DOMContentLoaded", () => {
  console.log("[oa_chart.js] Script loaded and DOM fully parsed.");
  // ----------------------------
  // AUTO-HIDE FLOATING PANELS
  // ----------------------------
  const chartArea = document.getElementById("chart-placeholder");
  const legendPanel = document.getElementById("legend-panel");
  const sherpaPanel = document.getElementById("sherpa-panel");
   

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];

      if (entry.isIntersecting) {
        // Chart is visible → show panels
        legendPanel?.classList.remove("hidden");
        sherpaPanel?.classList.remove("hidden");
      } else {
        // Chart not visible → hide panels
        legendPanel?.classList.add("hidden");
        sherpaPanel?.classList.add("hidden");
      }
    },
    { threshold: 0.1 }
  );

  observer.observe(chartArea);


  // Submit form on person change (server will send new chartData)
document.getElementById("person-select").addEventListener("change", (e) => {
  e.target.form.submit();
});

// Hide legend when the pie chart is not visible

const chartDataEl = document.getElementById("chart-data");
if (chartDataEl) {
  window.chartData = JSON.parse(chartDataEl.textContent);
}

const svg = d3.select("svg"),
      width = +svg.attr("width"),
      height = +svg.attr("height");

const tooltip = d3.select("#tooltip");
// Track pinned tooltip
let pinned = null;

const pieGroup = svg.append("g")
  .attr("transform", `translate(${width / 2}, ${height * 0.18})`);

const scatterGroup = svg.append("g")
  .attr("transform", `translate(60, ${height * 0.70 + 30})`);

const pieRadius = Math.min(width * 0.5, height * 0.4) / 3 - 10;

const pie = d3.pie().sort(null).value(d => d.value);
const arc = d3.arc().innerRadius(0).outerRadius(pieRadius);

// Load and visualize data if available
try {
  window.chartData = JSON.parse(chartDataEl.textContent);
  console.log("Parsed chartData:", window.chartData);
} catch (err) {
  console.error("Error parsing chartData:", err, chartDataEl.textContent);
}

let chartData;
  try {
    chartData = JSON.parse(chartDataEl.textContent);
    console.log("[oa_chart.js] Parsed chart data:", chartData);
  } catch (e) {
    console.error("[oa_chart.js] Failed to parse chart data:", e);
    return;
  }

  // Add additional sanity checks
  if (!Array.isArray(chartData.results)) {
    console.warn("[oa_chart.js] Expected 'results' array in chart data, got:", chartData);
    return;
  }else {
    console.log("[oa_chart.js] Calling drawVisualization with results...");
    drawVisualization(chartData.results);  // <-- CALL IT HERE!
  }

  // Check chart placeholder
  const chartContainer = document.querySelector("#chart-placeholder svg");
  if (!chartContainer) {
    console.error("[oa_chart.js] No SVG container found inside #chart-placeholder.");
    return;
  }

  console.log("[oa_chart.js] Found SVG container, ready to draw chart.");



function drawVisualization(results) {
  console.log("[oa_chart.js] drawVisualization called with results:", results);

  console.log("Results for visualization:", results);

      // Count OA / Non-OA
      const oaEntries = results.filter(d => d.open_access?.is_oa);
      const nonOaEntries = results.filter(d => !d.open_access?.is_oa);
      const countOA = oaEntries.length;
      const countNonOA = nonOaEntries.length;
      const total = countOA + countNonOA;
      const excludedPublications = new Set();

      // Pie-Daten
      const pieData = [
        { label: "Non Open Access",    value: countNonOA, color: "violet" },
        { label: "Open Access", value: countOA, color: "green" }
        
      ];

      // Zeichne Pie
      const pieArcs = pie(pieData);
      const colorScale = d3.scaleOrdinal()
        .domain(pieData.map(d => d.label))
        .range(pieData.map(d => d.color));

      pieGroup.selectAll(".slice")
        .data(pieArcs)
        .enter()
        .append("path")
        .attr("class", "slice")
        .attr("d", arc)
        .attr("fill", d => colorScale(d.data.label))
        .attr("stroke", "#fff")
        .on("click", (event, d) => {
          if (d.data.label === "Non Open Access") {
            updateScatter(nonOaEntries);
            // Sobald Scatter gezeichnet wird, Box ausblenden
              d3.select("#pie100-message").style("display", "none");
          } else {
            updateScatter(oaEntries);
          }
        })
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(150).style("opacity", 0.9);
          const pct = ((d.data.value / total) * 100).toFixed(1);
          tooltip
            .html(`${d.data.label}<br>${d.data.value} publications<br>${pct}%`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mousemove", event => {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", () => {
          tooltip.transition().duration(200).style("opacity", 0);
        });

      // Prozent-Beschriftung im Pie
      pieGroup.selectAll(".pie-label")
        .data(pieArcs)
        .enter()
        .append("text")
        .attr("class", "axis-label")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("dy", "0.35em")
        .style("fill", "#fff")
        .text(d => {
          if (d.data.value === 0) return "";
          return ((d.data.value / total) * 100).toFixed(1) + "%";
        });

      // Überschrift unter dem Pie
      pieGroup.append("text")
        .attr("y", pieRadius + 30)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Open Access vs Non Open Access");

      // ==================== SECOND PIE CHART (Filtered for publications since 2020) ====================

      const description = [
        "For Green Open Access, publications since 2020 are of particular interest,",
        "because publishing policies may allow a second publication.",
      ];

      const textBlock = svg.append("text")
        .attr("x", width / 2)
        .attr("y", height * 0.38)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("fill", "#333");

      description.forEach((line, i) => {
        textBlock.append("tspan")
          .attr("x", width / 2)
          .attr("dy", i === 0 ? "0" : "1.4em") // line spacing
          .text(line);
      });

      // Filter results for publications since 2020
      const recentResults = results.filter(d => {
        const year = +d.publication_year;
        return !isNaN(year) && year >= 2020;
      });

      if (recentResults.length > 0) {
        const pieGroupRecent = svg.append("g")
          .attr("transform", `translate(${width / 2}, ${height * 0.55})`);

        const oaRecent = recentResults.filter(d => d.open_access?.is_oa);
        const nonOaRecent = recentResults.filter(d => !d.open_access?.is_oa);
        const countOA_recent = oaRecent.length;
        const countNonOA_recent = nonOaRecent.length;
        const totalRecent = countOA_recent + countNonOA_recent;

        // Check for 100% OA in filtered pie chart
        if (totalRecent > 0 && countNonOA_recent === 0) {
          d3.select("#pie100-message").style("display", "block");
        } else {
          d3.select("#pie100-message").style("display", "none");
        }

        const pieDataRecent = [
          { label: "Non Open Access", value: countNonOA_recent, color: "violet" },
          { label: "Open Access", value: countOA_recent, color: "green" } 
        ];

        const pieArcsRecent = pie(pieDataRecent);
        const colorScaleRecent = d3.scaleOrdinal()
          .domain(pieDataRecent.map(d => d.label))
          .range(pieDataRecent.map(d => d.color));

        // Draw filtered pie chart
        pieGroupRecent.selectAll(".slice")
          .data(pieArcsRecent)
          .enter()
          .append("path")
          .attr("class", "slice")
          .attr("d", arc)
          .attr("fill", d => colorScaleRecent(d.data.label))
          .attr("stroke", "#fff")
          .on("click", (event, d) => {
            if (d.data.label === "Non Open Access") {
              updateScatter(nonOaRecent);
            } else {
              clearScatter();
            }
          })
          .on("mouseover", (event, d) => {
            tooltip.transition().duration(150).style("opacity", 0.9);
            const pct = ((d.data.value / totalRecent) * 100).toFixed(1);
            tooltip
              .html(`${d.data.label}<br>${d.data.value} publications<br>${pct}%`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 30) + "px");
          })
          .on("mousemove", event => {
            tooltip
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 30) + "px");
          })
          .on("mouseout", () => {
            tooltip.transition().duration(200).style("opacity", 0);
          });

        // Percent labels for filtered pie
        pieGroupRecent.selectAll(".pie-label")
          .data(pieArcsRecent)
          .enter()
          .append("text")
          .attr("class", "axis-label")
          .attr("transform", d => `translate(${arc.centroid(d)})`)
          .attr("dy", "0.35em")
          .style("fill", "#fff")
          .text(d => {
            if (d.data.value === 0) return "";
            return ((d.data.value / totalRecent) * 100).toFixed(1) + "%";
          });

        // Subtitle under filtered pie
        pieGroupRecent.append("text")
          .attr("y", pieRadius + 30)
          .attr("text-anchor", "middle")
          .style("font-size", "14px")
          .text("Publications 2020 and newer");

      } else {
        // Check for 100% OA in filtered pie chart
        if (totalRecent > 0 && countNonOA_recent === 0) {
          d3.select("#pie100-message").style("display", "block");
        } else {
          d3.select("#pie100-message").style("display", "none");
        }
      }
      

      
      function updateScatter(entries) {
        scatterGroup.selectAll("*").remove();

        const filteredEntries = entries.filter(d => !excludedPublications.has(d.title));
        console.log("Drawing scatter with filtered entries:", filteredEntries);

        drawScatter(filteredEntries); // reuse your existing drawScatter

        const greenEntries = filteredEntries.filter(d => d.green_oa);

        // Update recommendations for the currently displayed entries
        const recs = getRecommendationsFromDataPoints(greenEntries);
        renderRecommendationText(recs);
        
        // Show recommendations when scatter is visible
        d3.select("#recommendations-panel").style("display", "flex");
        d3.select("#most-cited-header").on("click", () => highlightPublications(recs.mostCited));
        d3.select("#least-cited-header").on("click", () => highlightPublications(recs.leastCited));
        d3.select("#recent-header").on("click", () => highlightPublications(recs.recent));

        // Collect all recommended publications (mostCited, recent, etc.)
        const allRecommended = [
          ...(recs.mostCited || []),
          ...(recs.leastCited || []),
          ...(recs.recent || [])
        ];

        const subjectList = Array.from(
          new Set(
            entries
              .map(d => d.primary_topic?.display_name)
              .filter(Boolean)
          )
        );

        // Run BISON using only abstract
        runBisonAbstractOnly(allRecommended, subjectList);
      }

      // Funktion zum Zeichnen des Scatter-Plots
      function drawScatter(entries) {
        scatterGroup.selectAll("*").remove();

        if (entries.length === 0) {
          scatterGroup.append("text")
            .attr("x", (width - 120) / 2)
            .attr("y", 50)
            .attr("text-anchor", "middle")
            .text("No Non-Open-Access publications available.")
            .style("font-size", "14px");
          return;
        }
        if (entries.length === 0) { /* ... */ return; }

        const dataPoints = entries.map(d => ({
          title: d.title || "(no title)",
          year: +d.publication_year,
          cited: +d["cited_by_count"] || 0,
          type: d.type || "unknown",
          topic: d.primary_topic?.display_name || "unknown",
          green_oa: d.green_oa || null,
          sherpa: d.sherpa || null
        }));

        const years = dataPoints.map(d => d.year);
        const citedVals = dataPoints.map(d => d.cited);
        const xExtent = d3.extent(years);
        const yExtent = [0, d3.max(citedVals)];

        const xScale = d3.scaleLinear()
          .domain([xExtent[0] - 1, xExtent[1] + 1])
          .range([0, width - 120]);

        const yScale = d3.scaleLinear()
          .domain(yExtent)
          .range([height * 0.5, 0]);

        const xAxis = d3.axisBottom(xScale)
          .ticks(xExtent[1] - xExtent[0] + 1)
          .tickFormat(d3.format("d"));
        scatterGroup.append("g")
          .attr("transform", `translate(0, ${height * 0.5})`)
          .call(xAxis);

        scatterGroup.append("text")
          .attr("class", "axis-label")
          .attr("x", (width - 120) / 2)
          .attr("y", height * 0.5 + 40)
          .attr("text-anchor", "middle")
          .text("publication year");

        const yAxis = d3.axisLeft(yScale).ticks(6);
        scatterGroup.append("g").call(yAxis);
        scatterGroup.append("text")
          .attr("class", "axis-label")
          .attr("transform", "rotate(-90)")
          .attr("x", -(height * 0.25))
          .attr("y", -50)
          .attr("text-anchor", "middle")
          .text("citation count");

        const types = Array.from(new Set(dataPoints.map(d => d.type)));
        const shapeScale = d3.scaleOrdinal()
          .domain(types)
          .range([
            d3.symbolCircle,
            d3.symbolSquare,
            d3.symbolTriangle,
            d3.symbolDiamond,
            d3.symbolCross,
            d3.symbolStar
          ].slice(0, types.length));

        

        scatterGroup.selectAll(".dot")
          .data(dataPoints)
          .enter()
          .append("path")
          .attr("class", "dot")
          .attr("data-title", d => d.title)
          .attr("d", d3.symbol().size(64).type(d => shapeScale(d.type)))
          .attr("transform", d => `translate(${xScale(d.year)}, ${yScale(d.cited)})`)
          
          // Hover only if not pinned
          .on("mouseover", (event, d) => {
            if (pinned) return;
            showTooltip(event, d, entries, false);
          })
          .on("mousemove", (event, d) => {
            if (pinned) return;
            moveTooltip(event);
          })
          .on("mouseout", () => {
            if (!pinned) hideTooltip();
          })

          // Click pins tooltip
          .on("click", (event, d) => {
            event.stopPropagation(); // prevent svg click from firing
            pinned = d;
            showTooltip(event, d, entries, true);
          });

        // Click outside unpins
        svg.on("click", (event) => {
          if (event.target.tagName !== "path") {
            pinned = null;
            hideTooltip();
          }
        });

        // Tooltip helpers
        function showTooltip(event, d, entries, pinnedMode = false) {
           if (pinnedMode) {
              pinned = d;
            }
          
          tooltip.transition().duration(150).style("opacity", 0.95);
          
          // Build green OA links if available
          let greenOAHtml = "";
          if (d.green_oa) {
            greenOAHtml = `<br><a href="#" class="sherpa-link" 
                            data-issn="${d.sherpa?.issn || ''}" 
                            style="color: green; font-weight: bold;">
                            Green Open Access possible
                          </a>`;
          }

          tooltip
            .classed("pinned", pinnedMode)
            .transition()
            .duration(150)
            .style("opacity", 0.95);
          
          tooltip
            .html(`
              <strong>${d.title}</strong><br>
              Type: ${d.type}<br>
              Subject: ${d.topic}<br>
              Year: ${d.year}<br>
              Cited-by: ${d.cited}<br>
              <a href="#" id="exclude-btn">❌ This is not my publication</a>
              ${greenOAHtml}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 30) + "px");

          document.getElementById("exclude-btn").onclick = (e) => {
            e.preventDefault();
            excludedPublications.add(d.title);
            console.log("Excluded:", d.title);
            updateScatter(entries); // redraw
            pinned = null;
            hideTooltip();
          };
        }

        function moveTooltip(event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 30) + "px");
        }

        function hideTooltip() {
          tooltip.transition().duration(200).style("opacity", 0);
        }

        // === LEGEND SECTION (right-hand side, shapes + topics + Green OA filter) ===

        // --- Populate Legend Panel ---
        const legendPanel = d3.select("#legend-panel");
        legendPanel.style("display", "block")
          .style("margin-left", "12px");

        // Section 1: Types
        const type = Array.from(new Set(entries.map(d => d.type || "Unknown")));
        const legendTypes = legendPanel.select("#legend-types");
        legendTypes.html("<strong>Types:</strong>");
        type.forEach(t => {
          const symbolType = shapeScale(t);
          legendTypes.append("p")
            .text(t)
            //.style("margin-left", "8px")
            .style("cursor", "pointer")
            .on("click", () => {
              scatterGroup.selectAll(".dot")
                .attr("opacity", d => d.type === t ? 1 : 0.2);
            });
        });

        // Section 2: Subjects
        const topics = Array.from(new Set(entries.map(d => d.primary_topic?.display_name)));
        const legendSubjects = legendPanel.select("#legend-subjects");
        legendSubjects.html("<strong>Subjects:</strong>");
        topics.forEach(topicVal => {
          legendSubjects.append("p")
            .text(topicVal)
            .on("click", function() {
              scatterGroup.selectAll(".dot")
                .attr("opacity", d => d.primary_topic?.display_name === topicVal ? 1 : 0.2);
              legendSubjects.selectAll("p").style("color", "#333");
              d3.select(this).style("color", "black");
            });
        });

        // --- Open Access legend (HTML-driven) ---
        d3.select("#legend-green-oa")
          .style("cursor", "pointer")
          .on("click", () => {
            scatterGroup.selectAll(".dot")
              .attr("opacity", d => d.green_oa ? 1 : 0.2);
          });

        d3.select("#legend-all")
          .style("cursor", "pointer")
          .on("click", () => {
            scatterGroup.selectAll(".dot").attr("opacity", 1);

            // Reset legend styles
            d3.selectAll(".legend-clickable").style("color", "#333");
            d3.select("#legend-all").style("color", "black");
          });
        // Close button
        document.getElementById("legend-close").addEventListener("click", () => {
          document.getElementById("legend-panel").classList.add("hidden");
        });

        window.showTooltip = showTooltip;
        window.hideTooltip = hideTooltip;
      }

      // Build a global lookup issn -> sherpa object (from the currently loaded results)
      window.sherpaLookup = {};
      results.forEach(w => {
        if (w.sherpa && w.sherpa.issn) {
          window.sherpaLookup[w.sherpa.issn] = w.sherpa;
        }
      });

      // Delegated click handler (anywhere on page)
      document.addEventListener("click", function(e) {
        const target = e.target;
        if (!target) return;

        // Sherpa link inside tooltip
        if (target.classList && target.classList.contains("sherpa-link")) {
          e.preventDefault();

          const issn = target.dataset.issn;
          const sherpa = window.sherpaLookup[issn];
          if (!sherpa) return;

          const firstVersionKey = Object.keys(sherpa.green_oa)[0];
          const journalTitle = sherpa.green_oa[firstVersionKey].journal;
          const publisher = sherpa.green_oa[firstVersionKey].publisher;
          const link = sherpa.green_oa[firstVersionKey].opf_link;

          // Build panel HTML from sherpa.result + all green_oa versions
          let html = `<h4>${journalTitle}</h4><p>ISSN: ${issn}</p><p>Publisher: ${publisher}</p><p><i><a href="${link}" target="_blank">Open Policy Finder</a></i></p> `;
          
          if (sherpa.green_oa && Object.keys(sherpa.green_oa).length > 0) {
            html += `<p><strong>Green Open Access options:</strong></p>`;
            html += `<ul>`;
            for (const info of sherpa.green_oa) {
              html += `<li><strong>Version: ${info.article_version}</strong>`;
              if (info.embargo) html += ` <br> <i>Embargo:</i> ${info.embargo?.amount ? info.embargo.amount + " months" : "-"}`;
              if (info.allowed) html += ` <br> <i>Allowed:</i> ${info.allowed}`;
              if (info.conditions) html += ` <br> <i>Conditions:</i> ${info.conditions}`;
              if (info.oa_fee) html += ` <br> <i>Fees:</i> ${info.oa_fee}`;
              if (info.licences) html += ` <br> <i>Licences:</i> ${info.licences}`;
              if (info.url) html += ` – <a href="${info.url}" target="_blank" rel="noopener">Publisher policy</a>`;
              html += `</li>`;
            }
            html += `</ul>`;
          } else {
            html += `<p>No detailed Sherpa green OA info available.</p>`;
          }

          document.getElementById("sherpa-content").innerHTML = html;
          document.getElementById("sherpa-panel").style.display = "block";
          document.getElementById("sherpa-panel").setAttribute("aria-hidden", "false");
          //scroll panel into view, focus it
          document.getElementById("sherpa-panel").focus?.();
        }

        // Close button
        if (target.id === "sherpa-close") {
          document.getElementById("sherpa-panel").style.display = "none";
          document.getElementById("sherpa-panel").setAttribute("aria-hidden", "true");
        }

      // Show recommendations panel when scatter appears
      d3.select("#recommendations-panel").style("display", "flex");
});


}
function getRecommendationsFromDataPoints(dataPoints) {
  if (!dataPoints || !dataPoints.length) return {};

  const sortedByCited = [...dataPoints].sort((a, b) => b.cited - a.cited);
  const sortedByYear = [...dataPoints].sort((a, b) => b.year - a.year);

  return {
    mostCited: sortedByCited.slice(0, 3),
    leastCited: sortedByCited.slice(-1),
    recent: sortedByYear.slice(0, 3)
  };
}

function highlightPublications(entries, headerId) {
  const titlesToHighlight = new Set(entries.map(d => d.title));

  // Highlight dots
  scatterGroup.selectAll(".dot")
    .attr("stroke", d => titlesToHighlight.has(d.title) ? "#00a3ccff" : null)
    .attr("stroke-width", d => titlesToHighlight.has(d.title) ? 3 : 0);

  // Info panel
  const infoDiv = d3.select("#recommendation-info");
  infoDiv.selectAll("*").remove();

  entries.forEach(d => {
    infoDiv.append("div")
      .html(`<span class="rec-title" data-title="${d.title}">
               <strong>${d.title}</strong>
             </span> - ${d.cited} citations, ${d.year}`);
  });

  // Active tab styling
  d3.selectAll("#recommendations-panel h3").classed("active", false);
  d3.select(`#${headerId}`).classed("active", true);

  // Hover interactions for titles
  d3.selectAll(".rec-title")
    .on("mouseover", function(event) {
      const title = this.getAttribute("data-title");
      const dot = scatterGroup.select(`.dot[data-title="${CSS.escape(title)}"]`);
      if (!dot.empty()) {
        dot
          .attr("stroke", "#00cc4eff")
          .attr("stroke-width", 4);

        const datum = dot.datum();
        if (datum) {
          showTooltip(event, datum, [datum], false);
        }
      }
    })
    .on("mouseout", function() {
      const title = this.getAttribute("data-title");
      const dot = scatterGroup.select(`.dot[data-title="${CSS.escape(title)}"]`);
      if (!dot.empty()) {
        dot
          .attr("stroke", "#2dbe65ff")
          .attr("stroke-width", 3);
      }
      hideTooltip();
    });
}

function renderRecommendationText(recs) {
  const infoDiv = d3.select("#recommendation-info");
  const intro = d3.select('#rec-intro')
  
  // Clear previous content
  infoDiv.html("");

  const categories = [
    { label: "mostCited", text: "Your most cited publications are", data: recs.mostCited },
    { label: "leastCited", text: "One of your least cited publications is", data: recs.leastCited },
    { label: "recent", text: "Your latest publications are", data: recs.recent }
  ];

  // CHECK: are there any recommendations at all?
  const hasAnyRecommendations = categories.some(
    cat => Array.isArray(cat.data) && cat.data.length > 0
  );

  // If none → show general sentence and stop
  if (!hasAnyRecommendations) {
    intro.html("");
    intro.append("p")
      .text(
        "Based on your currently visible data, no Green Open Access recommendations can be made at this time. Have you already tried the other pie chart's Non Open Access slice?"
      );
    return;
  }

  categories.forEach(cat => {
    if (!cat.data || cat.data.length === 0) 
      return;

    // Paragraph for category
    const para = infoDiv.append("p").html(`${cat.text} `);

    cat.data.forEach((d, i) => {
      para.append("span")
        .attr("class", "rec-title")
        .attr("data-title", d.title)
        .text(d.title)
        .style("cursor", "pointer")
        // Hover highlights dot(s) and shows tooltip temporarily
        .on("mouseover", function(event) {
          scatterGroup.selectAll(".dot")
            .filter(dot => dot.title === d.title)
            .attr("stroke", "#00cc4eff")
            .attr("stroke-width", 4);

          const dot = scatterGroup.select(`.dot[data-title="${CSS.escape(d.title)}"]`);
          if (!dot.empty()) showTooltip(event, dot.datum(), [dot.datum()], false);
        })
        .on("mouseout", function(event) {
          scatterGroup.selectAll(".dot")
            .filter(dot => dot.title === d.title)
            .attr("stroke", "#2dbe65ff")
            .attr("stroke-width", 3);

          if (!pinned) {
            hideTooltip();
          }
        })
        // Click pins the tooltip exactly as if clicking the scatter dot
        .on("click", function(event) {
          event.stopPropagation(); // prevent svg click from closing tooltip

          const dot = scatterGroup.select(`.dot[data-title="${CSS.escape(d.title)}"]`);
          if (!dot.empty()) {
            const datum = dot.datum();
            pinned = datum;
            // Trigger the same tooltip function as clicking the dot
            showTooltip(event, datum, [datum], true);

            // Highlight the dot
            dot.attr("stroke", "##00a3ccff").attr("stroke-width", 4);
          }
        });

      // Add comma between titles
      if (i < cat.data.length - 1) para.append("span").text(", ");
    });
  });
}


});