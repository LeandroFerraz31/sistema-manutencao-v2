// static/js/map.js

// Este módulo depende de Leaflet e Leaflet.markercluster,
// que devem ser incluídos no HTML.

let map;
let markersLayer;
let allMarkers = [];

/**
 * Inicializa o mapa Leaflet, definindo a visualização inicial e a camada de tiles.
 */
const initMap = () => {
    if (document.getElementById('mapa-container')) {
        map = L.map('mapa-container').setView([-15.7801, -47.9292], 4); // Centralizado no Brasil

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Inicializa a camada de agrupamento de marcadores
        markersLayer = L.markerClusterGroup();
        map.addLayer(markersLayer);
    }
};

/**
 * Busca os locais da API e adiciona os marcadores ao mapa.
 */
const loadMarkers = async () => {
    const loader = document.getElementById('loader-overlay');
    if (!map) return;

    try {
        loader.classList.add('show');
        const response = await axios.get('/api/locais');
        const locations = response.data;

        markersLayer.clearLayers();
        allMarkers = [];

        if (locations.length === 0) {
            console.warn("Nenhum local com coordenadas encontrado para exibir no mapa.");
            return;
        }

        locations.forEach(loc => {
            const popupContent = `
                <div style="font-family: 'Segoe UI', sans-serif;">
                    <h4 style="margin-bottom: 8px; color: #0078d4;">${loc.local}</h4>
                    <p style="margin: 4px 0;"><strong>Total de Manutenções:</strong> ${loc.total_manutencoes}</p>
                    <p style="margin: 4px 0;"><strong>Serviços:</strong> ${loc.tipos_servicos.split(',').join(', ')}</p>
                </div>
            `;

            const marker = L.marker([loc.latitude, loc.longitude])
                .bindPopup(popupContent);

            // Armazena os dados no marcador para facilitar a filtragem
            marker.locationData = loc;
            allMarkers.push(marker);
        });

        markersLayer.addLayers(allMarkers);

    } catch (error) {
        console.error('Erro ao carregar locais para o mapa:', error);
        // Aqui você pode usar sua função de notificação, se tiver uma
        // showNotification('Erro ao carregar dados do mapa.', 'error');
    } finally {
        loader.classList.remove('show');
    }
};

/**
 * Filtra os marcadores visíveis no mapa com base em um termo de busca.
 * @param {string} searchTerm O texto a ser buscado no nome do local.
 */
const filterMarkers = (searchTerm) => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    markersLayer.clearLayers();

    const filteredMarkers = allMarkers.filter(marker => {
        const locationName = marker.locationData.local.toLowerCase();
        return locationName.includes(lowerCaseSearchTerm);
    });

    markersLayer.addLayers(filteredMarkers);
};

/**
 * Configura os ouvintes de eventos para a seção do mapa.
 */
const setupEventListeners = () => {
    const filtroInput = document.getElementById('filtro-mapa');
    if (filtroInput) {
        filtroInput.addEventListener('input', (e) => {
            filterMarkers(e.target.value);
        });
    }
};

/**
 * Ponto de entrada para inicializar a funcionalidade do mapa.
 * Esta função deve ser chamada quando a seção do mapa se tornar ativa.
 */
export const initMapModule = () => {
    if (!map) { // Inicializa apenas uma vez
        initMap();
        loadMarkers();
        setupEventListeners();
    }
};