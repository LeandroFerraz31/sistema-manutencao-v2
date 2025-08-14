import * as api from './api.js';
import * as ui from './ui.js';
import * as charts from './charts.js';
import * as utils from './utils.js';
import * as map from './map.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let manutencoes = [];
    let manutencoesFiltradas = [];
    let relatorioAtual = [];

    // --- DOM ELEMENTS ---
    const loaderOverlay = document.getElementById('loader-overlay');
    const modal = document.getElementById('modal-editar');
    const closeModal = document.querySelector('.close');
    const formCadastrar = document.getElementById('form-cadastrar');
    const formEditar = document.getElementById('form-editar');
    const formRelatorios = document.getElementById('form-relatorios');
    const colinhaContent = document.getElementById('colinha-content');
    const tabelaManutencoes = document.getElementById('tabela-manutencoes');
    const navLinks = document.querySelectorAll('.sidebar ul li a');
    const sections = document.querySelectorAll('.section');

    const uiElements = {
        totalManutencoes: document.getElementById('total-manutencoes'),
        valorTotal: document.getElementById('valor-total'),
        veiculosAtendidos: document.getElementById('veiculos-atendidos'),
        manutencoesMes: document.getElementById('manutencoes-mes'),
        filtroMotorista: document.getElementById('filtro-motorista'),
        filtroPlaca: document.getElementById('filtro-placa'),
        filtroTipo: document.getElementById('filtro-tipo'),
        filtroListagemTipo: document.getElementById('filtro-listagem-tipo'),
        relatorioPlaca: document.getElementById('placa'),
        relatorioMotorista: document.getElementById('motorista'),
        rankingMotoristas: document.getElementById('ranking-motoristas'),
        rankingVeiculos: document.getElementById('ranking-veiculos'),
    };

    const filtroPeriodo = document.getElementById('filtro-periodo');
    const aplicarFiltrosBtn = document.getElementById('aplicar-filtros');
    const limparFiltrosBtn = document.getElementById('limpar-filtros');
    const exportarExcelBtn = document.getElementById('exportar-excel');
    const fileInput = document.getElementById('file-input');
    const importarExcelBtn = document.getElementById('importar-excel');
    const aplicarFiltroListagemBtn = document.getElementById('aplicar-filtro-listagem');
    const limparFiltroListagemBtn = document.getElementById('limpar-filtro-listagem');
    const filtroListagemInput = document.getElementById('filtro-listagem');
    const filtroListagemTelefoneInput = document.getElementById('filtro-listagem-telefone');
    const filtroListagemTipoSelect = document.getElementById('filtro-listagem-tipo');
    const filtroColinhaInput = document.getElementById('filtro-colinha');

    // --- CORE LOGIC ---

    async function carregarDadosIniciais() {
        ui.showLoader(loaderOverlay, 'Carregando manutenções...');
        try {
            const data = await api.carregarManutencoesAPI();
            console.log('Dados brutos da API:', data);

            let manutencoesTemp = data.filter(man => {
                const isValid = man.data && man.placa && man.motorista && man.tipo && man.local && man.defeito;
                if (!isValid) console.warn('Manutenção com dados incompletos descartada:', man);
                return isValid;
            });

            // Força a ordenação no frontend para garantir o comportamento desejado.
            // Ordena por data (mais nova primeiro) e depois por ID (mais novo primeiro).
            manutencoesTemp.sort((a, b) => {
                const dateComparison = b.data.localeCompare(a.data);
                if (dateComparison !== 0) {
                    return dateComparison;
                }
                return b.id - a.id;
            });

            manutencoes = manutencoesTemp;

            if (manutencoes.length === 0) {
                ui.mostrarNotificacao('Nenhuma manutenção encontrada no banco de dados.', 'info', 10000);
            }

            manutencoesFiltradas = [...manutencoes];
            relatorioAtual = [...manutencoes];

            ui.atualizarFiltros(manutencoes, uiElements);
            aplicarFiltrosDashboard(); // Atualiza o dashboard com os dados completos
            ui.atualizarTabela(manutencoes, tabelaManutencoes, handleEditar, handleExcluir);
            ui.atualizarColinha(manutencoes, colinhaContent);
            carregarRankings();

        } catch (error) {
            console.error('Erro ao carregar manutenções:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Erro desconhecido';
            ui.mostrarNotificacao(`Erro ao carregar dados: ${errorMessage}`, 'error', 10000);
            // Limpa a UI em caso de erro
            manutencoes = [];
            manutencoesFiltradas = [];
            ui.atualizarDashboardUI([], uiElements);
            ui.atualizarTabela([], tabelaManutencoes, handleEditar, handleExcluir);
            ui.atualizarColinha([], colinhaContent);
        } finally {
            ui.hideLoader(loaderOverlay);
        }
    }

    async function carregarRankings() {
        try {
            const rankings = await api.carregarRankingsAPI();
            ui.atualizarRankingsUI(rankings, uiElements);
        } catch (error) {
            console.error('Erro ao carregar rankings:', error);
            ui.mostrarNotificacao('Erro ao carregar rankings.', 'error');
        }
    }

    function aplicarFiltrosDashboard() {
        let dadosFiltrados = [...manutencoes];

        if (uiElements.filtroMotorista?.value) {
            dadosFiltrados = dadosFiltrados.filter(m => m.motorista === uiElements.filtroMotorista.value);
        }
        if (uiElements.filtroPlaca?.value) {
            dadosFiltrados = dadosFiltrados.filter(m => m.placa === uiElements.filtroPlaca.value);
        }
        if (uiElements.filtroTipo?.value) {
            dadosFiltrados = dadosFiltrados.filter(m => m.tipo === uiElements.filtroTipo.value);
        }

        if (filtroPeriodo?.value !== 'todos') {
            const hoje = new Date();
            const hojeUTC = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
            let dataInicio, dataFim;

            switch (filtroPeriodo.value) {
                case 'hoje':
                    dataInicio = new Date(Date.UTC(hojeUTC.getUTCFullYear(), hojeUTC.getUTCMonth(), hojeUTC.getUTCDate()));
                    dataFim = new Date(Date.UTC(hojeUTC.getUTCFullYear(), hojeUTC.getUTCMonth(), hojeUTC.getUTCDate(), 23, 59, 59, 999));
                    break;
                case 'semana':
                    const dayOfWeek = hojeUTC.getUTCDay();
                    dataInicio = new Date(Date.UTC(hojeUTC.getUTCFullYear(), hojeUTC.getUTCMonth(), hojeUTC.getUTCDate() - dayOfWeek));
                    dataFim = new Date(Date.UTC(dataInicio.getUTCFullYear(), dataInicio.getUTCMonth(), dataInicio.getUTCDate() + 6, 23, 59, 59, 999));
                    break;
                case 'mes':
                    dataInicio = new Date(Date.UTC(hojeUTC.getUTCFullYear(), hojeUTC.getUTCMonth(), 1));
                    dataFim = new Date(Date.UTC(hojeUTC.getUTCFullYear(), hojeUTC.getUTCMonth() + 1, 0, 23, 59, 59, 999));
                    break;
                case 'trimestre':
                    const trimestre = Math.floor(hojeUTC.getUTCMonth() / 3);
                    dataInicio = new Date(Date.UTC(hojeUTC.getUTCFullYear(), trimestre * 3, 1));
                    dataFim = new Date(Date.UTC(hojeUTC.getUTCFullYear(), (trimestre + 1) * 3, 0, 23, 59, 59, 999));
                    break;
                case 'ano':
                    dataInicio = new Date(Date.UTC(hojeUTC.getUTCFullYear(), 0, 1));
                    dataFim = new Date(Date.UTC(hojeUTC.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
                    break;
            }

            if (dataInicio && dataFim) {
                dadosFiltrados = dadosFiltrados.filter(m => {
                    const dataMan = utils.normalizeDate(m.data);
                    return dataMan && dataMan.getTime() >= dataInicio.getTime() && dataMan.getTime() <= dataFim.getTime();
                });
            }
        }

        manutencoesFiltradas = dadosFiltrados;
        ui.atualizarDashboardUI(manutencoesFiltradas, uiElements);
        charts.atualizarGraficoTipos(manutencoesFiltradas);
        charts.atualizarGraficoComparacao(manutencoesFiltradas);
    }

    // --- EVENT HANDLERS ---

    function handleEditar(id) {
        const manutencao = manutencoes.find(m => m.id == id);
        ui.preencherFormularioEdicao(manutencao, formEditar, modal);
    }

    async function handleExcluir(id) {
        const manutencao = manutencoes.find(m => m.id == id);
        if (!manutencao) return;

        if (confirm(`Tem certeza que deseja excluir a manutenção da placa ${manutencao.placa}?`)) {
            ui.showLoader(loaderOverlay, 'Excluindo manutenção...');
            try {
                await api.excluirManutencaoAPI(id);
                ui.mostrarNotificacao('Manutenção excluída com sucesso!', 'success');
                carregarDadosIniciais();
            } catch (error) {
                console.error('Erro ao excluir manutenção:', error);
                ui.mostrarNotificacao(`Erro ao excluir: ${error.response?.data?.error || error.message}`, 'error');
            } finally {
                ui.hideLoader(loaderOverlay);
            }
        }
    }

    // --- EVENT LISTENERS ---

    navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('data-section');
        ui.mostrarSecao(sectionId, sections, navLinks);

        if (sectionId === 'mapa') {
            map.inicializarMapa(); // 👈 ativa o mapa só quando a aba for clicada
        }
    });
});

    if (formCadastrar) {
        formCadastrar.addEventListener('submit', async (e) => {
            e.preventDefault();
            ui.showLoader(loaderOverlay, 'Salvando manutenção...');
 
            const formData = new FormData(formCadastrar);
            const anexoInput = formCadastrar.querySelector('#anexo_nota');
            const anexoFiles = anexoInput.files;
            
            // Converte todos os arquivos selecionados para Base64 em paralelo
            const anexoPromises = Array.from(anexoFiles).map(file => {
                return utils.fileToBase64(file).then(base64 => ({
                    nome: file.name,
                    tipo: file.type,
                    dados: base64
                }));
            });

            const anexos = await Promise.all(anexoPromises);

            const manutencao = {
                data: formData.get('data'),
                placa: formData.get('placa').toUpperCase().trim(),
                motorista: formData.get('motorista').trim(),
                telefone: formData.get('telefone') || '',
                tipo: formData.get('tipo'),
                oc: formData.get('oc') || '',
                valor: parseFloat(formData.get('valor')),
                pix: formData.get('pix') || '',
                favorecido: formData.get('favorecido') || '',
                local: formData.get('local').trim(),
                defeito: formData.get('defeito').trim(),
                anexos: anexos // Envia a lista de anexos
            };

            try {
                utils.validarDadosManutencao(manutencao);
                await api.cadastrarManutencaoAPI(manutencao);
                ui.mostrarNotificacao('Manutenção cadastrada com sucesso!', 'success');
                formCadastrar.reset();
                anexoInput.value = ''; // Limpa o campo de arquivo
                carregarDadosIniciais();
            } catch (error) {
                console.error('Erro ao cadastrar manutenção:', error);
                ui.mostrarNotificacao(`Erro ao cadastrar: ${error.response?.data?.error || error.message}`, 'error');
            } finally {
                ui.hideLoader(loaderOverlay);
            }
        });
    }

    if (formEditar) {
        formEditar.addEventListener('submit', async (e) => {
            e.preventDefault();
            ui.showLoader(loaderOverlay, 'Atualizando manutenção...');

            const formData = new FormData(formEditar);
            const anexoInput = formEditar.querySelector('#edit-anexo_nota');
            const anexoFiles = anexoInput.files;

            // Converte todos os novos arquivos selecionados para Base64
            const anexoPromises = Array.from(anexoFiles).map(file => {
                return utils.fileToBase64(file).then(base64 => ({
                    nome: file.name,
                    tipo: file.type,
                    dados: base64
                }));
            });

            const novosAnexos = await Promise.all(anexoPromises);

            const manutencao = {
                id: formData.get('id'),
                data: formData.get('data'),
                placa: formData.get('placa').toUpperCase().trim(),
                motorista: formData.get('motorista').trim(),
                telefone: formData.get('telefone') || '',
                tipo: formData.get('tipo'),
                oc: formData.get('oc') || '',
                valor: parseFloat(formData.get('valor')),
                pix: formData.get('pix') || '',
                favorecido: formData.get('favorecido') || '',
                local: formData.get('local').trim(),
                defeito: formData.get('defeito').trim(),
                // A lógica do backend é de substituição total.
                // Se o usuário não selecionar novos arquivos, a lista de anexos será vazia, e o backend removerá todos os anexos existentes.
                anexos: novosAnexos
            };

            try {
                utils.validarDadosManutencao(manutencao);
                await api.atualizarManutencaoAPI(manutencao);
                ui.mostrarNotificacao('Manutenção atualizada com sucesso!', 'success');
                if (modal) modal.style.display = 'none';
                anexoInput.value = ''; // Limpa o campo de arquivo
                carregarDadosIniciais();
            } catch (error) {
                console.error('Erro ao atualizar manutenção:', error);
                ui.mostrarNotificacao(`Erro ao atualizar: ${error.response?.data?.error || error.message}`, 'error');
            } finally {
                ui.hideLoader(loaderOverlay);
            }
        });
    }

    if (aplicarFiltrosBtn) {
        aplicarFiltrosBtn.addEventListener('click', aplicarFiltrosDashboard);
    }

    if (limparFiltrosBtn) {
        limparFiltrosBtn.addEventListener('click', () => {
            if (uiElements.filtroMotorista) uiElements.filtroMotorista.value = '';
            if (uiElements.filtroPlaca) uiElements.filtroPlaca.value = '';
            if (uiElements.filtroTipo) uiElements.filtroTipo.value = '';
            if (filtroPeriodo) filtroPeriodo.value = 'todos';
            aplicarFiltrosDashboard();
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }

    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        formEditar.querySelector('.cancelar').addEventListener('click', () => {
             modal.style.display = 'none';
        });
    }

    if (exportarExcelBtn) {
        exportarExcelBtn.addEventListener('click', async () => {
            ui.showLoader(loaderOverlay, 'Gerando arquivo Excel...');
            try {
                await api.exportarExcelAPI();
                ui.mostrarNotificacao('Exportação para Excel concluída!', 'success');
            } catch (error) {
                console.error('Erro ao exportar para Excel:', error);
                ui.mostrarNotificacao(`Erro ao exportar: ${error.response?.data?.error || error.message}`, 'error');
            } finally {
                ui.hideLoader(loaderOverlay);
            }
        });
    }

    if (importarExcelBtn && fileInput) {
        importarExcelBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                ui.showLoader(loaderOverlay, 'Importando arquivo...');
                try {
                    const response = await api.importarExcelAPI(file);
                    ui.mostrarNotificacao(response.data.message, 'success');
                    fileInput.value = '';
                    carregarDadosIniciais();
                } catch (error) {
                    console.error('Erro ao importar Excel:', error);
                    ui.mostrarNotificacao(`Erro ao importar: ${error.response?.data?.error || error.message}`, 'error');
                } finally {
                    ui.hideLoader(loaderOverlay);
                }
            }
        });
    }

    if (aplicarFiltroListagemBtn) {
        aplicarFiltroListagemBtn.addEventListener('click', () => {
            let dadosFiltrados = [...manutencoes];
            const termo = filtroListagemInput.value.toLowerCase();
            const telefone = filtroListagemTelefoneInput.value;
            const tipo = filtroListagemTipoSelect.value;

            if (termo) {
                dadosFiltrados = dadosFiltrados.filter(man =>
                    Object.values(man).some(value => value && value.toString().toLowerCase().includes(termo))
                );
            }
            if (telefone) {
                dadosFiltrados = dadosFiltrados.filter(man => man.telefone && man.telefone.includes(telefone));
            }
            if (tipo) {
                dadosFiltrados = dadosFiltrados.filter(man => man.tipo === tipo);
            }
            ui.atualizarTabela(dadosFiltrados, tabelaManutencoes, handleEditar, handleExcluir);
        });
    }

    if (limparFiltroListagemBtn) {
        limparFiltroListagemBtn.addEventListener('click', () => {
            filtroListagemInput.value = '';
            filtroListagemTelefoneInput.value = '';
            filtroListagemTipoSelect.value = '';
            ui.atualizarTabela(manutencoes, tabelaManutencoes, handleEditar, handleExcluir);
        });
    }

    if (formRelatorios) {
        formRelatorios.addEventListener('submit', async (e) => {
            e.preventDefault();
            ui.showLoader(loaderOverlay, 'Gerando relatório...');
            const filtros = {
                data_inicio: document.getElementById('data_inicio').value,
                data_fim: document.getElementById('data_fim').value,
                placa: document.getElementById('placa').value,
                motorista: document.getElementById('motorista').value,
            };

            try {
                relatorioAtual = await api.gerarRelatorioAPI(filtros);
                const relatorioElements = {
                    statsContainer: document.getElementById('relatorio-stats'),
                    tabelaContainer: document.getElementById('relatorio-tabela'),
                    exportarRelatorioBtn: formRelatorios.querySelector('button.btn-success')
                };
                document.getElementById('resultado-relatorio').style.display = 'block';
                ui.atualizarRelatorioUI(relatorioAtual, relatorioElements);
                ui.mostrarNotificacao('Relatório gerado com sucesso!', 'success');
            } catch (error) {
                console.error('Erro ao gerar relatório:', error);
                ui.mostrarNotificacao(`Erro ao gerar relatório: ${error.response?.data?.error || error.message}`, 'error');
            } finally {
                ui.hideLoader(loaderOverlay);
            }
        });

        const exportarRelatorioBtn = formRelatorios.querySelector('button.btn-success');
        if (exportarRelatorioBtn) {
            exportarRelatorioBtn.addEventListener('click', async () => {
                if (relatorioAtual.length === 0) {
                    ui.mostrarNotificacao('Gere um relatório antes de exportar.', 'info');
                    return;
                }
                ui.showLoader(loaderOverlay, 'Exportando relatório...');
                const filtros = {
                    data_inicio: document.getElementById('data_inicio').value,
                    data_fim: document.getElementById('data_fim').value,
                    placa: document.getElementById('placa').value,
                    motorista: document.getElementById('motorista').value,
                };
                try {
                    const response = await api.exportarRelatorioExcelAPI(filtros);
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `relatorio_${filtros.data_inicio}_a_${filtros.data_fim}.xlsx`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    ui.mostrarNotificacao('Relatório exportado com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao exportar relatório:', error);
                    ui.mostrarNotificacao(`Erro ao exportar: ${error.response?.data?.error || error.message}`, 'error');
                } finally {
                    ui.hideLoader(loaderOverlay);
                }
            });
        }
    }

    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('botao-copiar')) {
            const texto = e.target.getAttribute('data-texto');
            navigator.clipboard.writeText(texto).then(() => {
                e.target.textContent = '✅';
                setTimeout(() => { e.target.textContent = '📋'; }, 2000);
            }).catch(err => {
                console.error('Erro ao copiar:', err);
                ui.mostrarNotificacao('Erro ao copiar o texto.', 'error');
            });
        }
    });

    if (filtroColinhaInput) {
        filtroColinhaInput.addEventListener('input', function () {
            const termo = this.value.toLowerCase();
            const itens = colinhaContent.querySelectorAll('.colinha-item');
            itens.forEach(item => {
                item.style.display = item.innerText.toLowerCase().includes(termo) ? 'block' : 'none';
            });
        });
    }

    // --- INITIALIZATION ---
    ui.mostrarSecao('dashboard', sections, navLinks);
    carregarDadosIniciais();
});