
let API_BASE_URL = ''; // Padrão para produção (caminho relativo)

// Detecta se estamos em um ambiente de desenvolvimento local.
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Se for local E a porta não for a do servidor Flask (ou seja, estamos usando o Live Server),
// apontamos explicitamente para a API na porta 5000.
if (isLocal && window.location.port !== '5000') {
    API_BASE_URL = 'http://127.0.0.1:5000';
    console.log('Ambiente de desenvolvimento detectado. Usando API em:', API_BASE_URL);
}

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = 30000;

export async function carregarManutencoesAPI(telefone = '') {
    let url = '/api/manutencoes';
    if (telefone) {
        url += `?telefone=${encodeURIComponent(telefone)}`;
    }
    const response = await axios.get(url);
    if (!Array.isArray(response.data)) {
        throw new Error('Resposta da API não é um array');
    }
    return response.data;
}

export async function carregarRankingsAPI() {
    const [motoristasResponse, veiculosResponse] = await Promise.all([
        axios.get('/api/estatisticas/motoristas'),
        axios.get('/api/estatisticas/veiculos')
    ]);
    return {
        topMotoristas: motoristasResponse.data.slice(0, 5),
        topVeiculos: veiculosResponse.data.slice(0, 5)
    };
}

export async function cadastrarManutencaoAPI(manutencao) {
    return await axios.post('/api/manutencoes', manutencao);
}

export async function atualizarManutencaoAPI(manutencao) {
    return await axios.put(`/api/manutencoes/${manutencao.id}`, manutencao);
}

export async function excluirManutencaoAPI(id) {
    return await axios.delete(`/api/manutencoes/${id}`);
}

export async function exportarExcelAPI() {
    const response = await axios.get('/api/exportar_excel', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `manutencoes_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

export async function importarExcelAPI(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function (event) {
            try {
                const fileData = event.target.result.split(',')[1];
                const response = await axios.post('/api/importar_excel', {
                    file_data: fileData,
                    filename: file.name
                });
                resolve(response);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

export async function gerarRelatorioAPI(filtros) {
    const response = await axios.post('/api/relatorios', filtros);
    return response.data;
}

export async function exportarRelatorioExcelAPI(filtros) {
    return await axios.post('/api/exportar_relatorio_excel', filtros, { responseType: 'blob' });
}