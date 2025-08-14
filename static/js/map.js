// map.js - Sistema Completo de Mapeamento com Cadastro

let mapa;
let markersLayer;
let routeControl;
let unidades = [];
let prestadores = [];
let geocoder;

// Mapeia os valores internos para nomes amigáveis
const tipoServicoNomes = {
  borracharia: 'Borracharia',
  oficina: 'Oficina Mecânica',
  eletrica: 'Elétrica',
  chapeacao: 'Chapeação',
  pintura: 'Pintura',
  lavagem: 'Lavagem',
  tacografo: 'Aferição de Tacógrafo',
  fornecedor: 'Fornecedor'
};

// Ícones personalizados para diferentes tipos
const icones = {
  unidade: L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background: #ff6b35; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🏢</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  }),
  borracharia: L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background: #2196F3; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🛞</div>',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  }),
  oficina: L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background: #4CAF50; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🔧</div>',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  }),
  eletrica: L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background: #FF9800; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">⚡</div>',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  }),
  chapeacao: L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background: #9C27B0; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🔨</div>',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  }),
  pintura: L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background: #E91E63; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🎨</div>',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  }),
  lavagem: L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background: #00BCD4; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🚿</div>',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  }),
  tacografo: L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background: #795548; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">⏱️</div>',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  }),
  fornecedor: L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background: #607D8B; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">📦</div>',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  })
};

/**
 * Inicializa o mapa com funcionalidades de cadastro
 */
export function inicializarMapa() {
  const mapaContainer = document.getElementById('mapa-container');
  if (!mapaContainer || mapa) return;
 
  // 1. Definir as camadas de mapa (Padrão e Satélite)
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  });

  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  });

  // Nova camada Híbrida (Satélite com Rodovias e Rótulos) do Google
  const googleHybridLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
      maxZoom: 20,
      subdomains:['mt0','mt1','mt2','mt3'],
      attribution: 'Map data &copy; Google'
  });

  // 2. Criar o objeto do mapa, definindo a camada padrão
  mapa = L.map('mapa-container', {
    center: [-14.2350, -51.9253], // Centro do Brasil
    zoom: 5,
    layers: [googleHybridLayer] // A camada Híbrida será a inicial
  });

  // 3. Adicionar o controle de camadas ao mapa
  const baseMaps = {
    "Híbrido (Satélite + Rodovias)": googleHybridLayer,
    "Padrão": osmLayer,
    "Satélite (Puro)": satelliteLayer
  };
  L.control.layers(baseMaps).addTo(mapa);

  // Cria layer para markers
  markersLayer = L.layerGroup().addTo(mapa);

  // Carrega dados do servidor
  carregarDadosDoServidor();
  
  // Configura interface de cadastro
  configurarInterfaceCadastro();
  
  // Configura controles de filtro
  configurarControlesFiltro();
  
  // Configura eventos do mapa
  configurarEventosMapa();
  
  // Adiciona controle de escala
  L.control.scale({ imperial: false, metric: true }).addTo(mapa);

  console.log('Mapa inicializado com sistema de cadastro');
}

/**
 * Configura a interface de cadastro
 */
function configurarInterfaceCadastro() {
  const filtroMapa = document.getElementById('filtro-mapa');
  
  if (filtroMapa) {
    // Adiciona controles de cadastro e filtro
    const interfaceHTML = `
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #dee2e6;">
        <!-- Seção de Cadastro -->
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; color: #495057;">📍 Cadastro no Mapa</h4>
          <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
            <button id="btn-cadastrar-base" style="background: #ff6b35; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
              🏢 Cadastrar Base
            </button>
            <button id="btn-cadastrar-prestador" style="background: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
              🔧 Cadastrar Prestador
            </button>
            <button id="btn-cancelar-cadastro" style="background: #6c757d; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; display: none;">
              ❌ Cancelar
            </button>
          </div>
          <p id="instrucoes-cadastro" style="margin: 5px 0; font-size: 14px; color: #6c757d; display: none;">
            📌 Clique no mapa para selecionar a localização
          </p>
        </div>

        <!-- Seção de Filtros -->
        <div style="border-top: 1px solid #dee2e6; padding-top: 15px;">
          <h4 style="margin: 0 0 10px 0; color: #495057;">🔍 Filtros</h4>
          <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
            <select id="filtro-base" style="padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
              <option value="">Todas as Bases</option>
            </select>
            <select id="filtro-tipo-servico" style="padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
              <option value="">Todos os Tipos</option>
              <option value="borracharia">Borracharia</option>
              <option value="oficina">Oficina Mecânica</option>
              <option value="eletrica">Elétrica</option>
              <option value="chapeacao">Chapeação</option>
              <option value="pintura">Pintura</option>
              <option value="lavagem">Lavagem</option>
              <option value="tacografo">Aferição de Tacógrafo</option>
              <option value="fornecedor">Fornecedor</option>
            </select>
            <select id="filtro-raio" style="padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
              <option value="">Raio (km)</option>
              <option value="50">50 km</option>
              <option value="100">100 km</option>
              <option value="200">200 km</option>
              <option value="500">500 km</option>
            </select>
            <button id="aplicar-filtro-mapa" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
              🔍 Aplicar
            </button>
            <button id="limpar-filtro-mapa" style="background: #6c757d; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
              🔄 Limpar
            </button>
          </div>
        </div>
      </div>
    `;
    
    filtroMapa.insertAdjacentHTML('beforebegin', interfaceHTML);
    
    // Adiciona event listeners
    configurarEventListenersCadastro();
    configurarEventListenersFiltro();
  }
}

/**
 * Configura event listeners para cadastro
 */
function configurarEventListenersCadastro() {
  document.getElementById('btn-cadastrar-base').addEventListener('click', () => {
    iniciarModoCadastro('base');
  });

  document.getElementById('btn-cadastrar-prestador').addEventListener('click', () => {
    iniciarModoCadastro('prestador');
  });

  document.getElementById('btn-cancelar-cadastro').addEventListener('click', () => {
    cancelarModoCadastro();
  });
}

/**
 * Configura event listeners para filtros
 */
function configurarEventListenersFiltro() {
  document.getElementById('aplicar-filtro-mapa').addEventListener('click', aplicarFiltros);
  document.getElementById('limpar-filtro-mapa').addEventListener('click', limparFiltros);
  document.getElementById('filtro-mapa').addEventListener('input', filtrarPorTexto);
}

/**
 * Inicia modo de cadastro
 */
function iniciarModoCadastro(tipo) {
  // Altera cursor do mapa
  document.getElementById('mapa-container').style.cursor = 'crosshair';
  
  // Mostra instruções e botão cancelar
  document.getElementById('instrucoes-cadastro').style.display = 'block';
  document.getElementById('btn-cancelar-cadastro').style.display = 'inline-block';
  
  // Desabilita botões de cadastro
  document.getElementById('btn-cadastrar-base').disabled = true;
  document.getElementById('btn-cadastrar-prestador').disabled = true;
  
  // Armazena tipo de cadastro
  window.modoCadastroAtivo = tipo;
  
  // Atualiza instruções
  const instrucoes = document.getElementById('instrucoes-cadastro');
  instrucoes.textContent = tipo === 'base' ? 
    '📌 Clique no mapa para cadastrar uma nova base' : 
    '📌 Clique no mapa para cadastrar um novo prestador de serviço';
}

/**
 * Cancela modo de cadastro
 */
function cancelarModoCadastro() {
  // Restaura cursor
  document.getElementById('mapa-container').style.cursor = '';
  
  // Esconde instruções e botão cancelar
  document.getElementById('instrucoes-cadastro').style.display = 'none';
  document.getElementById('btn-cancelar-cadastro').style.display = 'none';
  
  // Reabilita botões
  document.getElementById('btn-cadastrar-base').disabled = false;
  document.getElementById('btn-cadastrar-prestador').disabled = false;
  
  // Remove modo de cadastro
  window.modoCadastroAtivo = null;
}

/**
 * Configura eventos do mapa
 */
function configurarEventosMapa() {
  // Evento de clique no mapa para cadastro
  mapa.on('click', function(e) {
    if (window.modoCadastroAtivo) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      
      if (window.modoCadastroAtivo === 'base') {
        abrirModalCadastroBase(lat, lng);
      } else if (window.modoCadastroAtivo === 'prestador') {
        abrirModalCadastroPrestador(lat, lng);
      }
    }
  });
}

/**
 * Abre modal para cadastro de base
 */
function abrirModalCadastroBase(lat, lng) {
  // Busca endereço pelas coordenadas
  buscarEnderecoPorCoordenadas(lat, lng).then(endereco => {
    const modal = criarModalCadastro('base', {
      lat: lat,
      lng: lng,
      endereco: endereco
    });
    document.body.appendChild(modal);
  });
}

/**
 * Abre modal para cadastro de prestador
 */
function abrirModalCadastroPrestador(lat, lng) {
  // Busca endereço pelas coordenadas
  buscarEnderecoPorCoordenadas(lat, lng).then(endereco => {
    const modal = criarModalCadastro('prestador', {
      lat: lat,
      lng: lng,
      endereco: endereco
    });
    document.body.appendChild(modal);
  });
}

/**
 * Cria modal de cadastro
 */
function criarModalCadastro(tipo, coordenadas) {
  const modal = document.createElement('div');
  modal.className = 'modal-cadastro-mapa';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(0,0,0,0.5); z-index: 10000; display: flex; 
    align-items: center; justify-content: center;
  `;

  const isBase = tipo === 'base';
  const titulo = isBase ? '🏢 Cadastrar Nova Base' : '🔧 Cadastrar Novo Prestador';

  modal.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 12px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: ${isBase ? '#ff6b35' : '#28a745'};">${titulo}</h3>
        <button onclick="fecharModal(this)" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">✕</button>
      </div>
      
      <form id="form-cadastro-${tipo}">
        <input type="hidden" name="lat" value="${coordenadas.lat}">
        <input type="hidden" name="lng" value="${coordenadas.lng}">
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Nome *</label>
          <input type="text" name="nome" required 
                 style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                 placeholder="${isBase ? 'Nome da Base' : 'Nome do Prestador'}">
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Endereço *</label>
          <input type="text" name="endereco" required value="${coordenadas.endereco}"
                 style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <div style="flex: 1;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Cidade *</label>
            <input type="text" name="cidade" required 
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
          </div>
          <div style="width: 80px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Estado *</label>
            <input type="text" name="estado" required maxlength="2" 
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                   placeholder="UF">
          </div>
        </div>

        ${!isBase ? `
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Tipo de Serviço *</label>
          <select name="tipo" required 
                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
            <option value="">Selecione o tipo</option>
            <option value="borracharia">Borracharia</option>
            <option value="oficina">Oficina Mecânica</option>
            <option value="eletrica">Elétrica</option>
            <option value="chapeacao">Chapeação</option>
            <option value="pintura">Pintura</option>
            <option value="lavagem">Lavagem</option>
            <option value="tacografo">Aferição de Tacógrafo</option>
            <option value="fornecedor">Fornecedor</option>
          </select>
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Serviços Oferecidos</label>
          <input type="text" name="servicos" 
                 style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                 placeholder="Ex: Troca de pneus, alinhamento, balanceamento">
          <small style="color: #666;">Separe os serviços por vírgula</small>
        </div>
        ` : ''}

        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <div style="flex: 1;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Telefone</label>
            <input type="text" name="telefone" 
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                   placeholder="(00) 00000-0000">
          </div>
          ${!isBase ? `
          <div style="width: 150px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Nível de Preço</label>
            <select name="avaliacao" 
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                    title="Use as estrelas para classificar o preço. Mais estrelas = mais barato.">
              <option value="5">⭐⭐⭐⭐⭐ (Muito Barato)</option>
              <option value="4">⭐⭐⭐⭐ (Barato)</option>
              <option value="3" selected>⭐⭐⭐ (Normal)</option>
              <option value="2">⭐⭐ (Caro)</option>
              <option value="1">⭐ (Muito Caro)</option>
            </select>
          </div>
          ` : ''}
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Observações</label>
          <textarea name="observacoes" rows="3" 
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; resize: vertical;"
                    placeholder="Informações adicionais..."></textarea>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" onclick="fecharModal(this)" 
                  style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Cancelar
          </button>
          <button type="submit" 
                  style="padding: 10px 20px; background: ${isBase ? '#ff6b35' : '#28a745'}; color: white; border: none; border-radius: 4px; cursor: pointer;">
            💾 Salvar ${isBase ? 'Base' : 'Prestador'}
          </button>
        </div>
      </form>
    </div>
  `;

  // Adiciona event listener ao formulário
  modal.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault();
    salvarCadastro(tipo, this);
  });

  return modal;
}

/**
 * Fecha modal de cadastro
 */
window.fecharModal = function(elemento) {
  const modal = elemento.closest('.modal-cadastro-mapa');
  if (modal) {
    modal.remove();
  }
  cancelarModoCadastro();
};

/**
 * Salva cadastro (base ou prestador)
 */
async function salvarCadastro(tipo, form) {
  const formData = new FormData(form);
  const dados = {
    nome: formData.get('nome'),
    endereco: formData.get('endereco'),
    cidade: formData.get('cidade'),
    estado: formData.get('estado')?.toUpperCase(),
    latitude: parseFloat(formData.get('lat')),
    longitude: parseFloat(formData.get('lng')),
    telefone: formData.get('telefone') || '',
    observacoes: formData.get('observacoes') || ''
  };

  if (tipo === 'base') {
    dados.tipo = 'unidade';
  } else {
    dados.tipo = formData.get('tipo');
    dados.servicos = formData.get('servicos') ? 
      formData.get('servicos').split(',').map(s => s.trim()).filter(s => s) : [];
    dados.avaliacao = parseFloat(formData.get('avaliacao')) || 3; // Default para 3 (Normal)
  }

  try {
    const novoLocal = await axios.post('/api/mapa/locais', dados);
    console.log('Novo local salvo no servidor:', novoLocal.data);

    // Atualiza a interface recarregando os dados
    await carregarDadosDoServidor();

    // Fecha modal e cancela modo cadastro
    form.closest('.modal-cadastro-mapa').remove();
    cancelarModoCadastro();

    mostrarNotificacao(`${tipo === 'base' ? 'Base' : 'Prestador'} cadastrado com sucesso!`, 'success');

    // Centraliza no novo item cadastrado
    mapa.setView([novoLocal.data.latitude, novoLocal.data.longitude], 15);
  } catch (error) {
    console.error('Erro ao salvar local:', error);
    mostrarNotificacao(`Erro ao salvar: ${error.response?.data?.error || error.message}`, 'error');
  }
}

/**
 * Busca endereço por coordenadas usando API de geocoding reverso
 */
async function buscarEnderecoPorCoordenadas(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=pt-BR`
    );
    const data = await response.json();
    
    if (data && data.display_name) {
      return data.display_name;
    }
  } catch (error) {
    console.warn('Erro ao buscar endereço:', error);
  }
  
  return `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
}

/**
 * Carrega dados do servidor (substitui carregarDadosLocalStorage)
 */
async function carregarDadosDoServidor() {
  try {
    const response = await axios.get('/api/mapa/locais');
    const locais = response.data;
    console.log(`${locais.length} locais carregados do servidor.`);

    // Separa os locais em unidades e prestadores
    unidades = locais.filter(l => l.tipo === 'unidade');
    prestadores = locais.filter(l => l.tipo !== 'unidade');

    // Converte a string de serviços de volta para um array
    prestadores.forEach(p => {
      if (p.servicos && typeof p.servicos === 'string') {
        p.servicos = p.servicos.split(',').filter(s => s);
      }
    });

    adicionarMarcadores();
    popularFiltros();
  } catch (error) {
    console.error('Erro ao carregar dados do servidor:', error);
    mostrarNotificacao('Não foi possível carregar os dados do mapa.', 'error');
  }
}

/**
 * Adiciona todos os marcadores no mapa
 */
function adicionarMarcadores() {
  if (!markersLayer) return;
  
  markersLayer.clearLayers();

  // Adiciona marcadores das unidades
  unidades.forEach(unidade => {
    const marker = L.marker([unidade.latitude, unidade.longitude], { 
      icon: icones.unidade 
    }).addTo(markersLayer);

    const popupContent = criarPopupUnidade(unidade);
    marker.bindPopup(popupContent);
  });
  
  // Adiciona marcadores dos prestadores
  prestadores.forEach(prestador => {
    const icone = icones[prestador.tipo] || icones.fornecedor;
    const marker = L.marker([prestador.latitude, prestador.longitude], { 
      icon: icone 
    }).addTo(markersLayer);

    const popupContent = criarPopupPrestador(prestador);
    marker.bindPopup(popupContent);
  });
}

/**
 * Configura controles de filtro
 */
function configurarControlesFiltro() {
  popularFiltros();
}

/**
 * Popula os filtros com dados disponíveis
 */
function popularFiltros() {
  const filtroBase = document.getElementById('filtro-base');
  
  if (filtroBase) {
    // Limpa opções existentes (mantém a primeira)
    filtroBase.innerHTML = '<option value="">Todas as Bases</option>';
    
    unidades.forEach(unidade => {
      const option = document.createElement('option');
      option.value = unidade.id;
      option.textContent = `${unidade.nome} (${unidade.cidade})`;
      filtroBase.appendChild(option);
    });
  }
}

/**
 * Aplica filtros selecionados
 */
function aplicarFiltros() {
  const baseId = document.getElementById('filtro-base')?.value;
  const tipoServico = document.getElementById('filtro-tipo-servico')?.value;
  const raio = document.getElementById('filtro-raio')?.value;

  let prestadoresFiltrados = [...prestadores];
  let baseSelecionada = null;

  // Filtra por base (raio)
  if (baseId && raio) {
    baseSelecionada = unidades.find(u => u.id == baseId);
    if (baseSelecionada) {
      prestadoresFiltrados = prestadoresFiltrados.filter(prestador => {
        const distancia = calcularDistancia(
          baseSelecionada.latitude, 
          baseSelecionada.longitude,
          prestador.latitude, 
          prestador.longitude
        );
        return distancia <= parseInt(raio);
      });
    }
  }

  // Filtra por tipo de serviço
  if (tipoServico) {
    prestadoresFiltrados = prestadoresFiltrados.filter(p => p.tipo === tipoServico);
  }

  // Atualiza marcadores
  atualizarMarcadores(prestadoresFiltrados, baseSelecionada);

  // Ajusta visualização do mapa
  if (baseSelecionada && raio) {
    // Desenha círculo do raio
    desenharCirculoRaio(baseSelecionada, parseInt(raio));
    // Centraliza na base
    mapa.setView([baseSelecionada.latitude, baseSelecionada.longitude], 8);
  }

  console.log(`Filtros aplicados: ${prestadoresFiltrados.length} prestadores encontrados`);
}

/**
 * Atualiza marcadores no mapa conforme filtros
 */
function atualizarMarcadores(prestadoresFiltrados, baseSelecionada = null) {
  markersLayer.clearLayers();

  // Sempre mostra todas as unidades
  unidades.forEach(unidade => {
    const marker = L.marker([unidade.latitude, unidade.longitude], { 
      icon: icones.unidade 
    }).addTo(markersLayer);

    // Destaca base selecionada
    if (baseSelecionada && unidade.id === baseSelecionada.id) {
      marker.setIcon(L.divIcon({
        className: 'custom-div-icon',
        html: '<div style="background: #ff6b35; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid #fff; box-shadow: 0 0 10px rgba(255,107,53,0.8);">🏢</div>',
        iconSize: [35, 35],
        iconAnchor: [17, 17]
      }));
    }

    const popupContent = criarPopupUnidade(unidade);
    marker.bindPopup(popupContent);
  });

  // Mostra apenas prestadores filtrados
  prestadoresFiltrados.forEach(prestador => {
    const icone = icones[prestador.tipo] || icones.fornecedor;
    const marker = L.marker([prestador.latitude, prestador.longitude], { 
      icon: icone 
    }).addTo(markersLayer);

    const popupContent = criarPopupPrestador(prestador);
    marker.bindPopup(popupContent);
  });
}

/**
 * Limpa todos os filtros
 */
function limparFiltros() {
  // Limpa valores dos filtros
  if (document.getElementById('filtro-base')) document.getElementById('filtro-base').value = '';
  if (document.getElementById('filtro-tipo-servico')) document.getElementById('filtro-tipo-servico').value = '';
  if (document.getElementById('filtro-raio')) document.getElementById('filtro-raio').value = '';
  if (document.getElementById('filtro-mapa')) document.getElementById('filtro-mapa').value = '';

  // Remove círculo de raio se existir
  if (window.circuloRaio) {
    mapa.removeLayer(window.circuloRaio);
    window.circuloRaio = null;
  }

  // Remove rota se existir
  limparRota();

  // Restaura todos os marcadores
  adicionarMarcadores();

  // Volta para visualização geral do Brasil
  mapa.setView([-14.2350, -51.9253], 5);
}

/**
 * Filtra prestadores por texto digitado
 */
function filtrarPorTexto() {
  const texto = document.getElementById('filtro-mapa').value.toLowerCase();
  
  if (!texto) {
    adicionarMarcadores();
    return;
  }

  const prestadoresFiltrados = prestadores.filter(prestador => 
    prestador.nome.toLowerCase().includes(texto) ||
    prestador.cidade.toLowerCase().includes(texto) ||
    prestador.endereco.toLowerCase().includes(texto) ||
    prestador.tipo.toLowerCase().includes(texto) ||
    (prestador.servicos && prestador.servicos.some(s => s.toLowerCase().includes(texto)))
  );

  // Filtra unidades também
  const unidadesFiltradas = unidades.filter(unidade =>
    unidade.nome.toLowerCase().includes(texto) ||
    unidade.cidade.toLowerCase().includes(texto) ||
    unidade.endereco.toLowerCase().includes(texto)
  );

  atualizarMarcadoresComTexto(prestadoresFiltrados, unidadesFiltradas);
}

/**
 * Atualiza marcadores com filtro de texto
 */
function atualizarMarcadoresComTexto(prestadoresFiltrados, unidadesFiltradas) {
  markersLayer.clearLayers();

  // Adiciona unidades filtradas
  unidadesFiltradas.forEach(unidade => {
    const marker = L.marker([unidade.latitude, unidade.longitude], { 
      icon: icones.unidade 
    }).addTo(markersLayer);

    const popupContent = criarPopupUnidade(unidade);
    marker.bindPopup(popupContent);
  });

  // Adiciona prestadores filtrados
  prestadoresFiltrados.forEach(prestador => {
    const icone = icones[prestador.tipo] || icones.fornecedor;
    const marker = L.marker([prestador.latitude, prestador.longitude], { 
      icon: icone 
    }).addTo(markersLayer);

    const popupContent = criarPopupPrestador(prestador);
    marker.bindPopup(popupContent);
  });
}

/**
 * Cria conteúdo HTML do popup para unidades
 */
function criarPopupUnidade(unidade) {
  return `
    <div style="min-width: 280px;">
      <h4 style="margin: 0 0 10px 0; color: #ff6b35;">🏢 ${unidade.nome}</h4>
      <p style="margin: 5px 0;"><strong>📍 Endereço:</strong> ${unidade.endereco}</p>
      <p style="margin: 5px 0;"><strong>🌎 Cidade/Estado:</strong> ${unidade.cidade}/${unidade.estado}</p>
      ${unidade.telefone ? `<p style="margin: 5px 0;"><strong>📱 Telefone:</strong> ${unidade.telefone}</p>` : ''}
      ${unidade.observacoes ? `<p style="margin: 5px 0;"><strong>📝 Obs:</strong> ${unidade.observacoes}</p>` : ''}
      <div style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
        <button onclick="buscarPrestadoresProximos(${unidade.id})" 
                style="background: #ff6b35; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
          🔍 Ver Próximos
        </button>
        <button onclick="editarItem('unidade', ${unidade.id})" 
                style="background: #007bff; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
          ✏️ Editar
        </button>
        <button onclick="excluirItem('unidade', ${unidade.id})" 
                style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
          🗑️ Excluir
        </button>
      </div>
    </div>
  `;
}

/**
 * Cria conteúdo HTML do popup para prestadores
 */
function criarPopupPrestador(prestador) {
  const avaliacaoPadrao = 3; // Preço Normal 
  const avaliacao = prestador.avaliacao || avaliacaoPadrao;
  const estrelas = '⭐'.repeat(Math.floor(avaliacao));
  const nivelPrecoMap = {
    5: 'Muito Barato',
    4: 'Barato',
    3: 'Preço Normal',
    2: 'Caro',
    1: 'Muito Caro'
  };
  const descricaoPreco = nivelPrecoMap[avaliacao];
  const nomeTipo = tipoServicoNomes[prestador.tipo] || (prestador.tipo.charAt(0).toUpperCase() + prestador.tipo.slice(1));

  return `
    <div style="min-width: 280px;">
      <h4 style="margin: 0 0 10px 0; color: #28a745;">${prestador.nome}</h4>
      <p style="margin: 5px 0;"><strong>📍 Endereço:</strong> ${prestador.endereco}</p> 
      <p style="margin: 5px 0;"><strong>🔧 Tipo:</strong> ${nomeTipo}</p>
      ${prestador.servicos && prestador.servicos.length > 0 ? 
        `<p style="margin: 5px 0;"><strong>⚙️ Serviços:</strong> ${prestador.servicos.join(', ')}</p>` : ''}
      ${prestador.telefone ? `<p style="margin: 5px 0;"><strong>📱 Telefone:</strong> ${prestador.telefone}</p>` : ''}
      <p style="margin: 5px 0;" title="${descricaoPreco}"><strong>💰 Nível de Preço:</strong> ${estrelas}</p>
      ${prestador.observacoes ? `<p style="margin: 5px 0;"><strong>📝 Obs:</strong> ${prestador.observacoes}</p>` : ''}
      <div style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
        <button onclick="criarRota(${prestador.id})" 
                style="background: #28a745; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
          🗺️ Rota
        </button>
        <button onclick="copiarEndereco('${prestador.endereco}')" 
                style="background: #ffc107; color: #000; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
          📋 Copiar
        </button>
        <button onclick="editarItem('prestador', ${prestador.id})" 
                style="background: #007bff; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
          ✏️ Editar
        </button>
        <button onclick="excluirItem('prestador', ${prestador.id})" 
                style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
          🗑️ Excluir
        </button>
      </div>
    </div>
  `;
}

/**
 * Busca prestadores próximos a uma unidade específica
 */
window.buscarPrestadoresProximos = function(unidadeId) {
  const unidade = unidades.find(u => u.id === unidadeId);
  if (!unidade) return;

  // Define filtros automaticamente
  document.getElementById('filtro-base').value = unidadeId;
  document.getElementById('filtro-raio').value = '100'; // 100km por padrão

  // Aplica filtros
  aplicarFiltros();
};

/**
 * Cria rota até um prestador
 */
window.criarRota = function(prestadorId) {
  const prestador = prestadores.find(p => p.id === prestadorId);
  if (!prestador) return;

  // Se não há base selecionada, usa a mais próxima
  let baseOrigem = null;
  const baseIdSelecionada = document.getElementById('filtro-base')?.value;
  
  if (baseIdSelecionada) {
    baseOrigem = unidades.find(u => u.id == baseIdSelecionada);
  } else {
    // Encontra a base mais próxima
    let menorDistancia = Infinity;
    unidades.forEach(unidade => {
      const distancia = calcularDistancia(
        unidade.latitude, unidade.longitude,
        prestador.latitude, prestador.longitude
      );
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        baseOrigem = unidade;
      }
    });
  }

  if (!baseOrigem) return;

  // Remove rota anterior se existir
  limparRota();

  // Cria nova rota (simulada, pois requer biblioteca adicional)
  const linha = L.polyline([
    [baseOrigem.latitude, baseOrigem.longitude],
    [prestador.latitude, prestador.longitude]
  ], {
    color: '#ff6b35',
    weight: 4,
    opacity: 0.8
  }).addTo(mapa);

  // Armazena a linha para poder remover depois
  window.rotaAtual = linha;

  // Ajusta visualização para mostrar a rota
  mapa.fitBounds([
    [baseOrigem.latitude, baseOrigem.longitude],
    [prestador.latitude, prestador.longitude]
  ], { padding: [20, 20] });

  console.log(`Rota criada de ${baseOrigem.nome} para ${prestador.nome}`);
  mostrarNotificacao(`Rota traçada de ${baseOrigem.nome} para ${prestador.nome}`, 'info');
};

/**
 * Edita um item (base ou prestador)
 */
window.editarItem = function(tipo, id) {
  let item;
  if (tipo === 'unidade') {
    item = unidades.find(u => u.id === id);
  } else {
    item = prestadores.find(p => p.id === id);
  }

  if (!item) return;

  const modal = criarModalEdicao(tipo, item);
  document.body.appendChild(modal);
};

/**
 * Exclui um item (base ou prestador)
 */
window.excluirItem = async function(tipo, id) {
  const item = (tipo === 'unidade' ? unidades : prestadores).find(i => i.id === id);
  if (!item) return;

  if (confirm(`Tem certeza que deseja excluir "${item.nome}"?`)) {
    try {
      await axios.delete(`/api/mapa/locais/${id}`);
      
      // Atualiza a interface recarregando os dados
      await carregarDadosDoServidor();

      mostrarNotificacao(
        `${tipo === 'unidade' ? 'Base' : 'Prestador'} excluído com sucesso!`, 
        'success'
      );

    } catch (error) {
      console.error('Erro ao excluir local:', error);
      mostrarNotificacao(`Erro ao excluir: ${error.response?.data?.error || error.message}`, 'error');
    }
  }
};

/**
 * Cria modal de edição
 */
function criarModalEdicao(tipo, item) {
  const modal = document.createElement('div');
  modal.className = 'modal-cadastro-mapa';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(0,0,0,0.5); z-index: 10000; display: flex; 
    align-items: center; justify-content: center;
  `;

  const isBase = tipo === 'unidade';
  const titulo = isBase ? '🏢 Editar Base' : '🔧 Editar Prestador';

  modal.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 12px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: ${isBase ? '#ff6b35' : '#28a745'};">${titulo}</h3>
        <button onclick="fecharModal(this)" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">✕</button>
      </div>
      
      <form id="form-edicao-${tipo}">
        <input type="hidden" name="id" value="${item.id}">
        <input type="hidden" name="lat" value="${item.latitude}">
        <input type="hidden" name="lng" value="${item.longitude}">
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Nome *</label>
          <input type="text" name="nome" required value="${item.nome}"
                 style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Endereço *</label>
          <input type="text" name="endereco" required value="${item.endereco}"
                 style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <div style="flex: 1;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Cidade *</label>
            <input type="text" name="cidade" required value="${item.cidade}"
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
          </div>
          <div style="width: 80px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Estado *</label>
            <input type="text" name="estado" required maxlength="2" value="${item.estado}"
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
          </div>
        </div>

        ${!isBase ? `
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Tipo de Serviço *</label>
          <select name="tipo" required 
                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
            <option value="borracharia" ${item.tipo === 'borracharia' ? 'selected' : ''}>Borracharia</option>
            <option value="oficina" ${item.tipo === 'oficina' ? 'selected' : ''}>Oficina Mecânica</option>
            <option value="eletrica" ${item.tipo === 'eletrica' ? 'selected' : ''}>Elétrica</option>
            <option value="chapeacao" ${item.tipo === 'chapeacao' ? 'selected' : ''}>Chapeação</option>
            <option value="pintura" ${item.tipo === 'pintura' ? 'selected' : ''}>Pintura</option>
            <option value="lavagem" ${item.tipo === 'lavagem' ? 'selected' : ''}>Lavagem</option>
            <option value="tacografo" ${item.tipo === 'tacografo' ? 'selected' : ''}>Aferição de Tacógrafo</option>
            <option value="fornecedor" ${item.tipo === 'fornecedor' ? 'selected' : ''}>Fornecedor</option>
          </select>
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Serviços Oferecidos</label>
          <input type="text" name="servicos" value="${item.servicos ? item.servicos.join(', ') : ''}"
                 style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                 placeholder="Ex: Troca de pneus, alinhamento, balanceamento">
          <small style="color: #666;">Separe os serviços por vírgula</small>
        </div>
        ` : ''}

        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <div style="flex: 1;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Telefone</label>
            <input type="text" name="telefone" value="${item.telefone || ''}"
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                   placeholder="(00) 00000-0000">
          </div>
          ${!isBase ? `
          <div style="width: 150px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Nível de Preço</label>
            <select name="avaliacao" 
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                    title="Use as estrelas para classificar o preço. Mais estrelas = mais barato.">
              <option value="5" ${item.avaliacao == 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐ (Muito Barato)</option>
              <option value="4" ${item.avaliacao == 4 ? 'selected' : ''}>⭐⭐⭐⭐ (Barato)</option>
              <option value="3" ${item.avaliacao == 3 ? 'selected' : ''}>⭐⭐⭐ (Normal)</option>
              <option value="2" ${item.avaliacao == 2 ? 'selected' : ''}>⭐⭐ (Caro)</option>
              <option value="1" ${item.avaliacao == 1 ? 'selected' : ''}>⭐ (Muito Caro)</option>
            </select>
          </div>
          ` : ''}
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Observações</label>
          <textarea name="observacoes" rows="3" 
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; resize: vertical;"
                    placeholder="Informações adicionais...">${item.observacoes || ''}</textarea>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" onclick="fecharModal(this)" 
                  style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Cancelar
          </button>
          <button type="submit" 
                  style="padding: 10px 20px; background: ${isBase ? '#ff6b35' : '#28a745'}; color: white; border: none; border-radius: 4px; cursor: pointer;">
            💾 Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  `;

  // Adiciona event listener ao formulário
  modal.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault();
    salvarEdicao(tipo, this);
  });

  return modal;
}

/**
 * Salva edição de item
 */
async function salvarEdicao(tipo, form) {
  const formData = new FormData(form);
  const id = parseInt(formData.get('id'));
  
  const dadosAtualizados = {
    id: id,
    nome: formData.get('nome'),
    latitude: parseFloat(formData.get('lat')),
    longitude: parseFloat(formData.get('lng')),
    endereco: formData.get('endereco'),
    cidade: formData.get('cidade'),
    estado: formData.get('estado')?.toUpperCase(),
    telefone: formData.get('telefone') || '',
    observacoes: formData.get('observacoes') || ''
  };

  if (tipo === 'unidade') {
    dadosAtualizados.tipo = 'unidade';
  } else {
    dadosAtualizados.tipo = formData.get('tipo');
    dadosAtualizados.servicos = formData.get('servicos') ? 
      formData.get('servicos').split(',').map(s => s.trim()).filter(s => s) : [];
    dadosAtualizados.avaliacao = parseFloat(formData.get('avaliacao')) || 3;
  }

  try {
    await axios.put(`/api/mapa/locais/${id}`, dadosAtualizados);

    // Atualiza a interface recarregando os dados
    await carregarDadosDoServidor();

    // Fecha modal
    form.closest('.modal-cadastro-mapa').remove();

    mostrarNotificacao(
      `${tipo === 'unidade' ? 'Base' : 'Prestador'} atualizado com sucesso!`, 
      'success'
    );
  } catch (error) {
    console.error('Erro ao atualizar local:', error);
    mostrarNotificacao(`Erro ao atualizar: ${error.response?.data?.error || error.message}`, 'error');
  }
}

/**
 * Copia endereço para área de transferência
 */
window.copiarEndereco = function(endereco) {
  navigator.clipboard.writeText(endereco).then(() => {
    mostrarNotificacao('Endereço copiado!', 'success');
  }).catch(err => {
    console.error('Erro ao copiar endereço:', err);
    // Fallback para browsers mais antigos
    const textArea = document.createElement('textarea');
    textArea.value = endereco;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    mostrarNotificacao('Endereço copiado!', 'success');
  });
};

/**
 * Desenha círculo de raio no mapa
 */
function desenharCirculoRaio(base, raio) {
  // Remove círculo anterior se existir
  if (window.circuloRaio) {
    mapa.removeLayer(window.circuloRaio);
  }

  // Cria novo círculo
  window.circuloRaio = L.circle([base.latitude, base.longitude], {
    color: '#007bff',
    fillColor: '#007bff',
    fillOpacity: 0.1,
    radius: raio * 1000 // converte km para metros
  }).addTo(mapa);
}

/**
 * Remove rota do mapa
 */
function limparRota() {
  if (window.rotaAtual) {
    mapa.removeLayer(window.rotaAtual);
    window.rotaAtual = null;
  }
}

/**
 * Calcula distância entre dois pontos em km (Fórmula de Haversine)
 */
function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Mostra notificação (integra com sistema existente ou cria própria)
 */
function mostrarNotificacao(mensagem, tipo = 'info') {
  // Tenta usar o sistema de notificação existente
  if (window.ui && window.ui.mostrarNotificacao) {
    window.ui.mostrarNotificacao(mensagem, tipo);
    return;
  }

  // Cria notificação própria se não houver sistema
  const notificacao = document.createElement('div');
  const cores = {
    success: '#28a745',
    error: '#dc3545',
    info: '#007bff',
    warning: '#ffc107'
  };

  notificacao.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${cores[tipo] || cores.info};
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 10001;
    max-width: 300px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    font-size: 14px;
  `;
  notificacao.textContent = mensagem;

  document.body.appendChild(notificacao);

  // Remove após 3 segundos
  setTimeout(() => {
    if (notificacao.parentNode) {
      notificacao.parentNode.removeChild(notificacao);
    }
  }, 3000);
}

/**
 * Exporta dados para backup
 */
export function exportarDados() {
  const dados = {
    unidades: unidades,
    prestadores: prestadores,
    versao: '1.0',
    dataExportacao: new Date().toISOString()
  };

  const dataStr = JSON.stringify(dados, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `backup_mapeamento_${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  mostrarNotificacao('Backup exportado com sucesso!', 'success');
  console.log('Dados exportados:', dados);
}

/**
 * Importa dados de backup
 */
export function importarDados() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const dados = JSON.parse(e.target.result);
        
        // Valida estrutura dos dados
        if (dados.unidades && dados.prestadores && Array.isArray(dados.unidades) && Array.isArray(dados.prestadores)) {
          // TODO: Implementar lógica de importação para o servidor
          mostrarNotificacao('Funcionalidade de importação ainda não conectada ao servidor.', 'info');
        } else {
          mostrarNotificacao('Formato de arquivo inválido!', 'error');
        }
      } catch (error) {
        console.error('Erro ao importar dados:', error);
        mostrarNotificacao('Erro ao ler arquivo de backup!', 'error');
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

/**
 * Limpa todos os dados (reset)
 */
export function limparTodosDados() {
  // TODO: Implementar chamada de API para limpar dados no servidor, se necessário.
  mostrarNotificacao('Funcionalidade de limpar todos os dados ainda não implementada para o servidor.', 'info');
}

/**
 * Gera relatório de dados
 */
export function gerarRelatorio() {
  const totalUnidades = unidades.length;
  const totalPrestadores = prestadores.length;
  
  // Conta prestadores por tipo
  const prestadoresPorTipo = prestadores.reduce((acc, p) => {
    acc[p.tipo] = (acc[p.tipo] || 0) + 1;
    return acc;
  }, {});
  
  // Conta prestadores por estado
  const prestadoresPorEstado = prestadores.reduce((acc, p) => {
    acc[p.estado] = (acc[p.estado] || 0) + 1;
    return acc;
  }, {});
  
  // Conta unidades por estado
  const unidadesPorEstado = unidades.reduce((acc, u) => {
    acc[u.estado] = (acc[u.estado] || 0) + 1;
    return acc;
  }, {});
  
  // Calcula média de avaliações
  const avaliacoesPreco = prestadores.filter(p => p.avaliacao).map(p => p.avaliacao);
  const mediaNivelPreco = avaliacoesPreco.length > 0 ? 
    (avaliacoesPreco.reduce((a, b) => a + b, 0) / avaliacoesPreco.length).toFixed(1) : 0;

  const relatorio = {
    dataGeracao: new Date().toLocaleString('pt-BR'),
    resumo: {
      totalUnidades,
      totalPrestadores,
      mediaNivelPreco: parseFloat(mediaNivelPreco)
    },
    prestadoresPorTipo,
    prestadoresPorEstado,
    unidadesPorEstado,
    detalhes: {
      unidades: unidades.map(u => ({
        nome: u.nome,
        cidade: u.cidade,
        estado: u.estado,
        telefone: u.telefone || 'N/A'
      })),
      prestadores: prestadores.map(p => ({
        nome: p.nome,
        tipo: p.tipo,
        cidade: p.cidade,
        estado: p.estado,
        avaliacao: p.avaliacao || 'N/A',
        telefone: p.telefone || 'N/A'
      }))
    }
  };

  // Gera arquivo de relatório
  const relatorioStr = JSON.stringify(relatorio, null, 2);
  const dataBlob = new Blob([relatorioStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `relatorio_mapeamento_${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  // Mostra resumo
  console.log('Relatório gerado:', relatorio);
  mostrarNotificacao(`Relatório gerado! ${totalUnidades} bases, ${totalPrestadores} prestadores`, 'success');
  
  return relatorio;
}

/**
 * Busca prestadores por CEP ou endereço
 */
export async function buscarPorEndereco(endereco) {
  try {
    // Busca coordenadas do endereço usando API Nominatim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=json&addressdetails=1&limit=1&accept-language=pt-BR`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      const local = data[0];
      const lat = parseFloat(local.lat);
      const lng = parseFloat(local.lon);
      
      // Centraliza mapa no endereço encontrado
      mapa.setView([lat, lng], 13);
      
      // Adiciona marcador temporário
      const marcadorTemp = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: '<div style="background: #dc3545; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">📍</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      }).addTo(mapa);
      
      marcadorTemp.bindPopup(`<strong>📍 Localização Encontrada:</strong><br>${local.display_name}`).openPopup();
      
      // Remove marcador após 10 segundos
      setTimeout(() => {
        mapa.removeLayer(marcadorTemp);
      }, 10000);
      
      // Busca prestadores próximos (raio de 50km)
      const prestadoresProximos = prestadores.filter(prestador => {
        const distancia = calcularDistancia(lat, lng, prestador.latitude, prestador.longitude);
        return distancia <= 50;
      });
      
      mostrarNotificacao(`Endereço encontrado! ${prestadoresProximos.length} prestadores num raio de 50km`, 'success');
      
      return {
        endereco: local.display_name,
        lat,
        lng,
        prestadoresProximos
      };
    } else {
      mostrarNotificacao('Endereço não encontrado!', 'error');
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar endereço:', error);
    mostrarNotificacao('Erro ao buscar endereço!', 'error');
    return null;
  }
}

/**
 * Obtém estatísticas do sistema
 */
export function obterEstatisticas() {
  const stats = {
    unidades: {
      total: unidades.length,
      porEstado: unidades.reduce((acc, u) => {
        acc[u.estado] = (acc[u.estado] || 0) + 1;
        return acc;
      }, {}),
      comTelefone: unidades.filter(u => u.telefone).length
    },
    prestadores: {
      total: prestadores.length,
      porTipo: prestadores.reduce((acc, p) => {
        acc[p.tipo] = (acc[p.tipo] || 0) + 1;
        return acc;
      }, {}),
      porEstado: prestadores.reduce((acc, p) => {
        acc[p.estado] = (acc[p.estado] || 0) + 1;
        return acc;
      }, {}),
      comTelefone: prestadores.filter(p => p.telefone).length,
      comServicos: prestadores.filter(p => p.servicos && p.servicos.length > 0).length,
      nivelPrecoMedio: prestadores.length > 0 ? 
        (prestadores.reduce((sum, p) => sum + (p.avaliacao || 3), 0) / prestadores.length).toFixed(1) : 0
    },
    geral: {
      totalItens: unidades.length + prestadores.length,
      estadosCobertos: [...new Set([...unidades.map(u => u.estado), ...prestadores.map(p => p.estado)])].length,
      dataUltimaAtualizacao: new Date().toLocaleString('pt-BR')
    }
  };

  console.log('Estatísticas do sistema:', stats);
  return stats;
}

/**
 * Função para buscar duplicatas
 */
export function buscarDuplicatas() {
  const duplicatas = {
    unidades: [],
    prestadores: []
  };

  // Busca duplicatas em unidades (mesmo nome e cidade)
  for (let i = 0; i < unidades.length; i++) {
    for (let j = i + 1; j < unidades.length; j++) {
      if (unidades[i].nome.toLowerCase() === unidades[j].nome.toLowerCase() && 
          unidades[i].cidade.toLowerCase() === unidades[j].cidade.toLowerCase()) {
        duplicatas.unidades.push([unidades[i], unidades[j]]);
      }
    }
  }

  // Busca duplicatas em prestadores (mesmo nome e cidade)
  for (let i = 0; i < prestadores.length; i++) {
    for (let j = i + 1; j < prestadores.length; j++) {
      if (prestadores[i].nome.toLowerCase() === prestadores[j].nome.toLowerCase() && 
          prestadores[i].cidade.toLowerCase() === prestadores[j].cidade.toLowerCase()) {
        duplicatas.prestadores.push([prestadores[i], prestadores[j]]);
      }
    }
  }

  if (duplicatas.unidades.length > 0 || duplicatas.prestadores.length > 0) {
    console.warn('Duplicatas encontradas:', duplicatas);
    mostrarNotificacao(`Encontradas ${duplicatas.unidades.length + duplicatas.prestadores.length} possíveis duplicatas`, 'warning');
  } else {
    mostrarNotificacao('Nenhuma duplicata encontrada!', 'success');
  }

  return duplicatas;
}

/**
 * Valida integridade dos dados
 */
export function validarDados() {
  const erros = [];

  // Valida unidades
  unidades.forEach((unidade, index) => {
    if (!unidade.nome || unidade.nome.trim() === '') {
      erros.push(`Unidade ${index + 1}: Nome vazio`);
    }
    if (!unidade.latitude || !unidade.longitude || isNaN(unidade.latitude) || isNaN(unidade.longitude)) {
      erros.push(`Unidade ${index + 1} (${unidade.nome}): Coordenadas inválidas`);
    }
    if (!unidade.cidade || unidade.cidade.trim() === '') {
      erros.push(`Unidade ${index + 1} (${unidade.nome}): Cidade vazia`);
    }
    if (!unidade.estado || unidade.estado.length !== 2) {
      erros.push(`Unidade ${index + 1} (${unidade.nome}): Estado inválido`);
    }
  });

  // Valida prestadores
  prestadores.forEach((prestador, index) => {
    if (!prestador.nome || prestador.nome.trim() === '') {
      erros.push(`Prestador ${index + 1}: Nome vazio`);
    }
    if (!prestador.latitude || !prestador.longitude || isNaN(prestador.latitude) || isNaN(prestador.longitude)) {
      erros.push(`Prestador ${index + 1} (${prestador.nome}): Coordenadas inválidas`);
    }
    if (!prestador.cidade || prestador.cidade.trim() === '') {
      erros.push(`Prestador ${index + 1} (${prestador.nome}): Cidade vazia`);
    }
    if (!prestador.estado || prestador.estado.length !== 2) {
      erros.push(`Prestador ${index + 1} (${prestador.nome}): Estado inválido`);
    }
    if (!prestador.tipo || !['borracharia', 'oficina', 'eletrica', 'chapeacao', 'pintura', 'lavagem', 'tacografo', 'fornecedor'].includes(prestador.tipo)) {
      erros.push(`Prestador ${index + 1} (${prestador.nome}): Tipo de serviço inválido`);
    }
    if (prestador.avaliacao && (prestador.avaliacao < 1 || prestador.avaliacao > 5)) {
      erros.push(`Prestador ${index + 1} (${prestador.nome}): Avaliação fora da faixa válida (1-5)`);
    }
  });

  if (erros.length > 0) {
    console.error('Erros de validação encontrados:', erros);
    mostrarNotificacao(`${erros.length} erros de validação encontrados! Verifique o console.`, 'error');
  } else {
    mostrarNotificacao('Todos os dados estão válidos!', 'success');
  }

  return erros;
}

// Expõe funções globais para uso em outros módulos
window.exportarDadosMapa = exportarDados;
window.importarDadosMapa = importarDados;
window.limparTodosDadosMapa = limparTodosDados;
window.gerarRelatorioMapa = gerarRelatorio;
window.buscarPorEnderecoMapa = buscarPorEndereco;
window.obterEstatisticasMapa = obterEstatisticas;
window.buscarDuplicatasMapa = buscarDuplicatas;
window.validarDadosMapa = validarDados;