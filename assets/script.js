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
    zoom: 5
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

    // 3. Process Data
    const candidateFeatures = [];
    const candidatesByKu = d3.group(csvData, d => d.kuname);

    geojson.features.forEach(feature => {
        const kuname = feature.properties.kuname;
        const candidates = candidatesByKu.get(kuname) || [];
        const count = candidates.length;

        if (count === 0) return;

        // Calculate Centroid using Turf
        const centroid = turf.centroid(feature);
        const centerCoords = centroid.geometry.coordinates;

        // Generate grid points centered at centroid
        // Grid spacing in degrees (approximate)
        // 0.05 degrees is roughly 5km, maybe too big. 
        // We need visual spacing that stays constant-ish or scales?
        // Actually, if we use fixed pixel offset in symbol layer, they might overlap or be too far.
        // Better to use actual geographic offsets for "map" feeling, or pixel offsets?
        // User asked for "squares", usually implied fixed size visualizing data density.
        // Let's calculate geographic offsets so they zoom with the map.

        const spacing = 0.04; // Roughly 4km spacing
        const cols = Math.ceil(Math.sqrt(count));

        candidates.forEach((candidate, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);

            // Center the grid
            const offsetX = (col - (cols - 1) / 2) * spacing;
            const offsetY = (row - (Math.ceil(count / cols) - 1) / 2) * spacing; // Invert Y (lat) if needed, but simple grid is fine.
            // Note: Latitude spacing decreases as we go north if we want square visual, but simple addition is okay for demo.

            const point = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [centerCoords[0] + offsetX, centerCoords[1] - offsetY] // -offsetY to go down
                },
                properties: {
                    kuname: kuname,
                    candidate_name: candidate.candidate_name,
                    party: candidate.party,
                    color: partyColors[candidate.party] || '#999999' // fallback color
                }
            };
            candidateFeatures.push(point);
        });
    });

    const candidatesGeoJSON = {
        type: 'FeatureCollection',
        features: candidateFeatures
    };

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

    // Candidates (Squares)
    map.addSource('candidates', {
        type: 'geojson',
        data: candidatesGeoJSON
    });

    // Label Layer (District Name) - Rendered nicely below or above squares
    // Re-adding this as requested previously, but maybe with less prominence to avoid clutter
    map.addLayer({
        id: 'senkyoku-label',
        type: 'symbol',
        source: 'senkyoku',
        layout: {
            'text-field': ['get', 'kuname'],
            'text-font': ['Noto Sans CJK JP Regular'],
            'text-size': 10,
            'text-offset': [0, -3], // Shift label up
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-justify': 'center'
        },
        paint: {
            'text-color': '#666666',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1
        }
    });

    map.addLayer({
        id: 'candidates-symbol',
        type: 'symbol',
        source: 'candidates',
        layout: {
            'icon-image': 'square',
            'icon-size': 0.8,
            'icon-allow-overlap': true
        },
        paint: {
            'icon-color': ['get', 'color']
        }
    });

    map.addControl(new maplibregl.NavigationControl());
});
