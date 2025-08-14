import { formatarMoeda, normalizeDate, isSameMonth } from './utils.js';

export function mostrarNotificacao(mensagem, tipo = 'info', duracao = 5000) {
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;
    notificacao.textContent = mensagem;
    document.body.appendChild(notificacao);
    setTimeout(() => {
        notificacao.remove();
    }, duracao);
}

export function showLoader(loaderOverlay, message = 'Carregando dados...') {
    if (loaderOverlay) {
        const p = loaderOverlay.querySelector('p');
        if (p) p.textContent = message;
        loaderOverlay.classList.add('show');
    }
}

export function hideLoader(loaderOverlay) {
    if (loaderOverlay) {
        loaderOverlay.classList.remove('show');
    }
}

export function mostrarSecao(sectionId, sections, navLinks) {
    sections.forEach(section => section.classList.remove('active'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.error(`Seção com ID ${sectionId} não encontrada`);
    }
    navLinks.forEach(link => link.classList.remove('active'));
    const targetLink = document.querySelector(`a[data-section="${sectionId}"]`);
    if (targetLink) {
        targetLink.classList.add('active');
    }
}

export function atualizarFiltros(manutencoes, elements) {
    const { filtroMotorista, filtroPlaca, filtroTipo, filtroListagemTipo, relatorioPlaca, relatorioMotorista } = elements;

    const motoristas = [...new Set(manutencoes.map(m => m.motorista))].sort();
    const placas = [...new Set(manutencoes.map(m => m.placa))].sort();
    const tipos = [...new Set(manutencoes.map(m => m.tipo))].sort();

    const preencherSelect = (select, options, placeholder) => {
        if (!select) return;
        select.innerHTML = `<option value="">${placeholder}</option>`;
        options.forEach(optionValue => {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = optionValue;
            select.appendChild(option);
        });
    };

    preencherSelect(filtroMotorista, motoristas, 'Todos os Motoristas');
    preencherSelect(filtroPlaca, placas, 'Todas as Placas');
    preencherSelect(filtroTipo, tipos, 'Todos os Tipos');
    preencherSelect(filtroListagemTipo, tipos, 'Todos os Tipos');
    preencherSelect(relatorioPlaca, placas, 'Todas as Placas');
    preencherSelect(relatorioMotorista, motoristas, 'Todos os Motoristas');
}

export function atualizarDashboardUI(dados, elements) {
    const { totalManutencoes, valorTotal, veiculosAtendidos, manutencoesMes } = elements;

    if (totalManutencoes) {
        totalManutencoes.textContent = dados.length || '0';
    }
    const valor = dados.reduce((acc, man) => acc + Number(man.valor || 0), 0);
    if (valorTotal) {
        valorTotal.textContent = formatarMoeda(valor);
    }

    const tiposExcluidos = ['Compra de Corda', 'Madeirite', 'Lona', 'Cinta e Catraca', 'EPIs', 'DIVERSOS'];
    const veiculosAtendidosSet = new Set(dados.filter(man => !tiposExcluidos.includes(man.tipo)).map(man => man.placa));
    if (veiculosAtendidos) {
        veiculosAtendidos.textContent = veiculosAtendidosSet.size || '0';
    }

    const hoje = new Date();
    const hojeUTC = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
    const manutencoesMesCount = dados.filter(man => isSameMonth(normalizeDate(man.data), hojeUTC)).length;
    if (manutencoesMes) {
        manutencoesMes.textContent = manutencoesMesCount || '0';
    }
}

export function atualizarRankingsUI(rankings, elements) {
    const { rankingMotoristas, rankingVeiculos } = elements;
    const { topMotoristas, topVeiculos } = rankings;

    const preencherRanking = (element, data, nomeProp, valorProp) => {
        if (!element) return;
        element.innerHTML = '';
        if (data.length === 0) {
            element.innerHTML = `<p>Nenhum dado disponível</p>`;
            return;
        }
        data.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'ranking-item';
            div.innerHTML = `
                <div class="ranking-position">${index + 1}º</div>
                <div class="ranking-info">
                    <div class="ranking-name">${item[nomeProp]}</div>
                    <div class="ranking-stats">${item.total_manutencoes} manutenções • ${formatarMoeda(item.valor_total)}</div>
                </div>
            `;
            element.appendChild(div);
        });
    };

    preencherRanking(rankingMotoristas, topMotoristas, 'motorista');
    preencherRanking(rankingVeiculos, topVeiculos, 'placa');
}

export function atualizarTabela(dados, tabelaManutencoes, editarCallback, excluirCallback) {
    if (!tabelaManutencoes) {
        console.error('Elemento tabela-manutencoes não encontrado');
        return;
    }
    tabelaManutencoes.innerHTML = '';

    if (dados.length === 0) {
        tabelaManutencoes.innerHTML = '<tr><td colspan="12">Nenhuma manutenção encontrada.</td></tr>';
        return;
    }

    dados.forEach((manutencao) => {
        const dataMan = normalizeDate(manutencao.data);
        let dataFormatada = 'N/A';
        if (dataMan) {
            dataFormatada = `${dataMan.getUTCDate().toString().padStart(2, '0')}/${(dataMan.getUTCMonth() + 1).toString().padStart(2, '0')}/${dataMan.getUTCFullYear().toString().slice(-2)}`;
        }
        const valorFormatado = formatarMoeda(Number(manutencao.valor || 0));

        const row = document.createElement('tr');
        // Usando textContent para segurança (prevenção de XSS)
        const createCell = (text) => {
            const td = document.createElement('td');
            td.textContent = text;
            return td;
        };

        row.appendChild(createCell(dataFormatada));
        row.appendChild(createCell(manutencao.placa || 'N/A'));
        row.appendChild(createCell(manutencao.motorista || 'N/A'));
        row.appendChild(createCell(manutencao.telefone || 'N/A'));
        row.appendChild(createCell(manutencao.tipo || 'N/A'));
        row.appendChild(createCell(manutencao.oc || 'N/A'));
        row.appendChild(createCell(valorFormatado));
        row.appendChild(createCell(manutencao.pix || 'N/A'));
        row.appendChild(createCell(manutencao.favorecido || 'N/A'));
        row.appendChild(createCell(manutencao.local || 'N/A'));
        
        const defeitoCell = createCell(manutencao.defeito || 'N/A');
        defeitoCell.className = 'defeito-cell';
        row.appendChild(defeitoCell);

        const acoesCell = document.createElement('td');
        acoesCell.className = 'acoes-cell';
        const acoesContainer = document.createElement('div');
        acoesContainer.className = 'acoes-container';

        const editButton = document.createElement('button');
        editButton.className = 'btn-edit editar';
        editButton.title = 'Editar';
        editButton.textContent = '✏️';
        editButton.onclick = () => editarCallback(manutencao.id);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn-delete excluir';
        deleteButton.title = 'Excluir';
        deleteButton.textContent = '🗑️';
        deleteButton.onclick = () => excluirCallback(manutencao.id);

        acoesContainer.appendChild(editButton);
        acoesContainer.appendChild(deleteButton);
        acoesCell.appendChild(acoesContainer);
        row.appendChild(acoesCell);

        tabelaManutencoes.appendChild(row);
    });
}

export function atualizarColinha(manutencoes, colinhaContent) {
    if (!colinhaContent) return;
    colinhaContent.innerHTML = '';

    if (manutencoes.length === 0) {
        colinhaContent.innerHTML = '<p>Aqui aparecerão as informações para cópia rápida...</p>';
        return;
    }

    manutencoes.forEach(man => {
        // Constrói o texto para o botão de copiar
        const entryText = `Placa: ${man.placa || 'N/A'}\nMotorista: ${man.motorista || 'N/A'} - Tipo: ${man.tipo || 'N/A'}\nValor total: ${formatarMoeda(Number(man.valor || 0))}\nCHAVE PIX: ${man.pix || 'N/A'} ${man.favorecido || ''}\nOC: ${man.oc || 'N/A'}\nLocal: ${man.local || 'N/A'}\nDefeito: ${man.defeito || 'N/A'}`.trim();

        // Constrói o link do Google Maps se houver coordenadas
        let mapaLink = '';
        if (man.latitude && man.longitude) {
            const url = `https://www.google.com/maps?q=${man.latitude},${man.longitude}`;
            mapaLink = `
                <a href="${url}" class="map-link" target="_blank" title="Ver no Google Maps">
                    🗺️
                </a>
            `;
        }

        // Constrói os links dos anexos se houver
        let anexosHTML = '';
        if (man.anexos && man.anexos.length > 0) {
            anexosHTML = man.anexos.map((anexo, index) => `
                <a href="${anexo.dados_arquivo}" 
                   class="anexo-link" 
                   download="${anexo.nome_arquivo}" 
                   title="Baixar ${anexo.nome_arquivo}"
                   style="right: ${70 + (index * 40)}px;">
                    📎
                </a>
            `).join('');
        }

        const entry = document.createElement('div');
        entry.className = 'colinha-item';
        entry.innerHTML = `
            <div class="colinha-content-item">
                <p><strong>Placa:</strong> ${man.placa || 'N/A'}</p>
                <p><strong>Motorista:</strong> ${man.motorista || 'N/A'} - <strong>Tipo:</strong> ${man.tipo || 'N/A'}</p>
                <p><strong>Valor total:</strong> ${formatarMoeda(Number(man.valor || 0))}</p>
                <p><strong>CHAVE PIX:</strong> ${man.pix || 'N/A'} ${man.favorecido || ''}</p>
                <p><strong>OC:</strong> ${man.oc || 'N/A'}</p>
                <p>
                    <strong>Local:</strong> ${man.local || 'N/A'}
                    ${mapaLink}
                </p>
                <p><strong>Defeito/Serviços:</strong> ${man.defeito || 'N/A'}</p>
            </div>
            
            ${anexosHTML}
            <button class="botao-copiar" data-texto="${entryText}">📋</button>
        `;
        colinhaContent.appendChild(entry);
    });
}

export function preencherFormularioEdicao(manutencao, formEditar, modal) {
    if (!manutencao) return;
    formEditar.querySelector('#edit-data').value = manutencao.data;
    formEditar.querySelector('#edit-placa').value = manutencao.placa;
    formEditar.querySelector('#edit-motorista').value = manutencao.motorista;
    formEditar.querySelector('#edit-telefone').value = manutencao.telefone || '';
    formEditar.querySelector('#edit-tipo').value = manutencao.tipo;
    formEditar.querySelector('#edit-oc').value = manutencao.oc || '';
    formEditar.querySelector('#edit-valor').value = manutencao.valor;
    formEditar.querySelector('#edit-pix').value = manutencao.pix || '';
    formEditar.querySelector('#edit-favorecido').value = manutencao.favorecido || '';
    formEditar.querySelector('#edit-local').value = manutencao.local;
    formEditar.querySelector('#edit-defeito').value = manutencao.defeito;
    formEditar.querySelector('input[name="id"]').value = manutencao.id;

    // Lida com o anexo
    const anexoAtualContainer = formEditar.querySelector('#anexo-atual-container');
    anexoAtualContainer.innerHTML = '';

    if (manutencao.anexos && manutencao.anexos.length > 0) {
        const linksHTML = manutencao.anexos.map(anexo => `
            <div class="anexo-item-atual">
                <a href="${anexo.dados_arquivo}" target="_blank" class="link-anexo-atual" download="${anexo.nome_arquivo}">
                    ${anexo.nome_arquivo}
                </a>
            </div>
        `).join('');
        anexoAtualContainer.innerHTML = linksHTML;
    } else {
        anexoAtualContainer.innerHTML = '<p><em>Nenhum anexo existente.</em></p>';
    }

    if (modal) modal.style.display = 'flex';
}

export function atualizarRelatorioUI(relatorio, elements) {
    const { statsContainer, tabelaContainer, exportarRelatorioBtn } = elements;

    if (!statsContainer || !tabelaContainer) return;

    statsContainer.innerHTML = '';
    tabelaContainer.innerHTML = '';

    if (relatorio.length === 0) {
        tabelaContainer.innerHTML = '<p>Nenhum dado encontrado para o relatório.</p>';
        if (exportarRelatorioBtn) exportarRelatorioBtn.style.display = 'none';
        return;
    }

    const totalManutencoes = relatorio.length;
    const totalValor = relatorio.reduce((acc, man) => acc + Number(man.valor || 0), 0);
    const veiculosUnicos = new Set(relatorio.map(man => man.placa)).size;

    statsContainer.innerHTML = `
        <div class="relatorio-stat"><span class="stat-label">Total de Manutenções</span><span class="stat-value">${totalManutencoes}</span></div>
        <div class="relatorio-stat"><span class="stat-label">Valor Total</span><span class="stat-value">${formatarMoeda(totalValor)}</span></div>
        <div class="relatorio-stat"><span class="stat-label">Veículos Únicos</span><span class="stat-value">${veiculosUnicos}</span></div>
    `;

    const tabela = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <thead>
            <tr><th>Data</th><th>Placa</th><th>Motorista</th><th>Tipo</th><th>OC</th><th>Valor</th><th>Local</th><th>Defeito</th></tr>
        </thead>`;
    tabela.appendChild(thead);

    const tbody = document.createElement('tbody');
    const createCell = (text) => {
        const td = document.createElement('td');
        td.textContent = text;
        return td;
    };

    relatorio.forEach(man => {
        const dataMan = normalizeDate(man.data);
        const dataFormatada = dataMan ? `${dataMan.getUTCDate().toString().padStart(2, '0')}/${(dataMan.getUTCMonth() + 1).toString().padStart(2, '0')}/${dataMan.getUTCFullYear().toString().slice(-2)}` : 'N/A';
        
        const tr = document.createElement('tr');
        tr.appendChild(createCell(dataFormatada));
        tr.appendChild(createCell(man.placa || 'N/A'));
        tr.appendChild(createCell(man.motorista || 'N/A'));
        tr.appendChild(createCell(man.tipo || 'N/A'));
        tr.appendChild(createCell(man.oc || 'N/A'));
        tr.appendChild(createCell(formatarMoeda(Number(man.valor || 0))));
        tr.appendChild(createCell(man.local || 'N/A'));
        tr.appendChild(createCell(man.defeito || 'N/A'));
        
        tbody.appendChild(tr);
    });

    tabela.appendChild(tbody);
    tabelaContainer.appendChild(tabela);

    if (exportarRelatorioBtn) exportarRelatorioBtn.style.display = 'inline-flex';
}