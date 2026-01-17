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

map.on('load', () => {
    map.addSource('senkyoku', {
        type: 'geojson',
        data: 'assets/senkyoku2022_0.8.geojson'
    });

    map.addLayer({
        id: 'senkyoku-fill',
        type: 'fill',
        source: 'senkyoku',
        paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.8
        }
    });

    map.addLayer({
        id: 'senkyoku-line',
        type: 'line',
        source: 'senkyoku',
        paint: {
            'line-color': '#ffffff',
            'line-width': 0.5
        }
    });

    map.addLayer({
        id: 'senkyoku-label',
        type: 'symbol',
        source: 'senkyoku',
        layout: {
            'text-field': ['get', 'kuname'],
            'text-font': ['Noto Sans CJK JP Regular'], // 利用可能なフォントスタックを指定
            'text-size': 12,
            'text-variable-anchor': ['center'],
            'text-justify': 'center'
        },
        paint: {
            'text-color': '#000000',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1
        }
    });

    // ホバー効果（簡易実装: デスクトップのみ）
    let hoveredStateId = null;

    // MapLibreではfeature stateを使うのが一般的だが、geojsonソースにidが必要。
    // 今回のgeojsonにidプロパティがない場合は単純なfill-colorの変更は難しいが、
    // ズームイン・アウトのUIが主目的なので一旦基本的な描画とズームを優先。

    // ナビゲーションコントロール（ズームイン・アウトボタン）を追加
    map.addControl(new maplibregl.NavigationControl());
});
