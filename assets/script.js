const map = new maplibregl.Map({
    container: 'map-container',
    style: {
        version: 8,
        sources: {},
        glyphs: "https://glyphs.geolonia.com/{fontstack}/{range}.pbf",
        layers: [
            {
                id: 'background',
                type: 'background',
                paint: {
                    'background-color': '#f0f0f0'
                }
            }
        ]
    },
    center: [138, 38], // 日本の中心付近
    zoom: 5,
    hash: true
});

map.on('load', async () => {
    // Determine party colors mapping in code
    const partyColors = {
        "自由民主党": "#d70035",
        "立憲民主党": "#004098",
        "日本維新の会": "#88c900",
        "公明党": "#f55883",
        "日本共産党": "#5a2e87",
        "国民民主党": "#fdbd02",
        "れいわ新選組": "#e954a4",
        "社民党": "#1ca9e9",
        "無所属": "#999999"
    };

    // 1. Generate a white square icon for symbols
    const size = 20;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    map.addImage('square', imageData, { sdf: true }); // SDF enabled for coloring

    // 2. Load Data
    const [geojson, csvData] = await Promise.all([
        d3.json('assets/senkyoku2022_0.8.geojson'),
        d3.csv('assets/dummy_candidates.csv')
    ]);

    const candidatesByKu = d3.group(csvData, d => d.kuname);

    // Function to generate candidate features based on current zoom
    function generateCandidateFeatures() {
        const candidateFeatures = [];
        const currentZoom = map.getZoom();

        // Zoom-dependent sizing
        const minSize = 0.008;  // Minimum size at high zoom levels
        const maxSize = 0.05;   // Maximum size at low zoom levels
        const zoomThreshold = 7;

        let sizeDegrees;
        if (currentZoom < zoomThreshold) {
            sizeDegrees = maxSize;
        } else {
            const zoomRange = 12 - zoomThreshold;
            const progress = Math.min((currentZoom - zoomThreshold) / zoomRange, 1);
            sizeDegrees = maxSize - (progress * (maxSize - minSize));
        }

        geojson.features.forEach(feature => {
            const kuname = feature.properties.kuname;
            const candidates = candidatesByKu.get(kuname) || [];
            const count = candidates.length;

            if (count === 0) return;

            // Calculate Centroid using Turf
            const centroid = turf.centroid(feature);
            const centerCoords = centroid.geometry.coordinates;

            const spacing = sizeDegrees; // Tightly packed
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);

            candidates.forEach((candidate, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);

                // Calculate offset from centroid (centered grid)
                const startX = centerCoords[0] - (cols * spacing) / 2;
                const startY = centerCoords[1] + (rows * spacing) / 2;

                const x = startX + col * spacing;
                const y = startY - row * spacing;

                // Generate Polygon coordinates
                const p1 = [x, y - spacing];
                const p2 = [x + spacing, y - spacing];
                const p3 = [x + spacing, y];
                const p4 = [x, y];

                const polygon = {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[p1, p2, p3, p4, p1]]
                    },
                    properties: {
                        kuname: kuname,
                        candidate_name: candidate.candidate_name,
                        party: candidate.party,
                        color: partyColors[candidate.party] || '#999999'
                    }
                };
                candidateFeatures.push(polygon);
            });
        });

        return {
            type: 'FeatureCollection',
            features: candidateFeatures
        };
    }

    // 4. Add Sources and Layers

    // Polygones (Boundaries)
    map.addSource('senkyoku', {
        type: 'geojson',
        data: geojson
    });

    map.addLayer({
        id: 'senkyoku-fill',
        type: 'fill',
        source: 'senkyoku',
        paint: {
            'fill-color': '#ffffff',
            'fill-opacity': 0.1
        }
    });

    map.addLayer({
        id: 'senkyoku-line',
        type: 'line',
        source: 'senkyoku',
        paint: {
            'line-color': '#cccccc',
            'line-width': 1
        }
    });

    // Candidates (Squares as Polygons)
    map.addSource('candidates', {
        type: 'geojson',
        data: generateCandidateFeatures()
    });

    // Use FILL layer instead of Symbol to scale with map
    map.addLayer({
        id: 'candidates-fill',
        type: 'fill',
        source: 'candidates',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 1
        }
    });

    // Add white border to separate squares visually
    map.addLayer({
        id: 'candidates-border',
        type: 'line',
        source: 'candidates',
        paint: {
            'line-color': '#ffffff',
            'line-width': 1
        }
    });

    // Label Layer (District Name)
    map.addLayer({
        id: 'senkyoku-label',
        type: 'symbol',
        source: 'senkyoku',
        layout: {
            'text-field': ['get', 'kuname'],
            'text-font': ['Noto Sans CJK JP Regular'],
            'text-size': 10,
            'text-offset': [0, 2],
            'text-variable-anchor': ['top', 'bottom'],
            'text-justify': 'center'
        },
        paint: {
            'text-color': '#666666',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1
        }
    });

    // Update candidate squares on zoom
    map.on('zoomend', () => {
        const source = map.getSource('candidates');
        if (source) {
            source.setData(generateCandidateFeatures());
        }
    });

    map.addControl(new maplibregl.NavigationControl());
});
