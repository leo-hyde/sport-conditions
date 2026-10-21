// Drawing a site's wind directions as a ring of 16 coloured wedges.
// Used big (with labels) in the site form, and small on cards and the map.

// { N: "no", NNE: "ok", … } for a site.
function directionRatings(site) {
  const ratings = {};
  for (const point of COMPASS) {
    if (site.goodDirections.includes(point)) ratings[point] = "good";
    else if (site.okDirections.includes(point)) ratings[point] = "ok";
    else ratings[point] = "no";
  }
  return ratings;
}

// Returns an SVG (a drawing made of shapes) as a string of HTML.
// Angles are measured clockwise from north, like a compass.
function compassSvg(ratings, { labels = false, size = 260 } = {}) {
  const centre = 130;
  const outer = 120;
  const inner = labels ? 44 : 30;

  // The x, y position at a given angle and distance from the centre.
  const point = (angle, radius) => {
    const radians = angle * Math.PI / 180;
    return [centre + radius * Math.sin(radians), centre - radius * Math.cos(radians)];
  };

  const wedges = COMPASS.map((name, i) => {
    const start = i * 22.5 - 11.25;
    const end = i * 22.5 + 11.25;
    const [x1, y1] = point(start, inner);
    const [x2, y2] = point(start, outer);
    const [x3, y3] = point(end, outer);
    const [x4, y4] = point(end, inner);
    const [labelX, labelY] = point(i * 22.5, (inner + outer) / 2);
    const label = labels
      ? `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="central">${name}</text>`
      : "";
    return `<g class="wedge ${ratings[name]}" data-dir="${name}">
      <path d="M${x1},${y1} L${x2},${y2} A${outer},${outer} 0 0 1 ${x3},${y3} L${x4},${y4} A${inner},${inner} 0 0 0 ${x1},${y1} Z"/>${label}
    </g>`;
  }).join("");

  // Small compasses get an "N" in the middle so you can tell which way is up.
  const middle = labels
    ? `<text class="compass-centre" x="${centre}" y="${centre}" text-anchor="middle" dominant-baseline="central">Tap to set</text>`
    : `<text class="compass-north" x="${centre}" y="${centre}" text-anchor="middle" dominant-baseline="central">N</text>`;

  const title = labels ? "" : `<title>Good: ${COMPASS.filter(p => ratings[p] === "good").join(", ") || "none"}. OK: ${COMPASS.filter(p => ratings[p] === "ok").join(", ") || "none"}</title>`;
  return `<svg class="${labels ? "" : "mini-compass"}" viewBox="0 0 260 260" width="${size}" height="${size}" role="img">${title}${wedges}${middle}</svg>`;
}
