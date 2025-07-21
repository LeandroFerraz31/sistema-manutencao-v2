import { gerarCores, formatarMoeda, normalizeDate, isSameDay, isSameWeek, isSameMonth } from './utils.js';

let graficoTipos = null;
let graficoComparacao = null;

export function atualizarGraficoTipos(manutencoesFiltradas) {
    const canvas = document.getElementById('grafico-tipos');
    if (!canvas) {
        console.error('Elemento grafico-tipos não encontrado');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (graficoTipos) graficoTipos.destroy();

    const tiposCount = {};
    manutencoesFiltradas.forEach(man => {
        tiposCount[man.tipo] = (tiposCount[man.tipo] || 0) + 1;
    });

    const labels = Object.keys(tiposCount);
    const data = Object.values(tiposCount);
    const cores = gerarCores(labels.length);

    if (labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhum dado disponível', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    graficoTipos = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: cores,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed * 100) / total).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

export function atualizarGraficoComparacao(manutencoesFiltradas) {
    const canvas = document.getElementById('grafico-comparacao');
    if (!canvas) {
        console.error('Elemento grafico-comparacao não encontrado');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (graficoComparacao) graficoComparacao.destroy();

    const hoje = new Date();
    const hojeUTC = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));

    const atendimentosDia = manutencoesFiltradas.filter(man => isSameDay(normalizeDate(man.data), hojeUTC)).length;
    const valorDia = manutencoesFiltradas.reduce((acc, man) => isSameDay(normalizeDate(man.data), hojeUTC) ? acc + Number(man.valor || 0) : acc, 0);

    const atendimentosSemana = manutencoesFiltradas.filter(man => isSameWeek(normalizeDate(man.data), hojeUTC)).length;
    const valorSemana = manutencoesFiltradas.reduce((acc, man) => isSameWeek(normalizeDate(man.data), hojeUTC) ? acc + Number(man.valor || 0) : acc, 0);

    const atendimentosMes = manutencoesFiltradas.filter(man => isSameMonth(normalizeDate(man.data), hojeUTC)).length;
    const valorMes = manutencoesFiltradas.reduce((acc, man) => isSameMonth(normalizeDate(man.data), hojeUTC) ? acc + Number(man.valor || 0) : acc, 0);

    if (atendimentosDia === 0 && atendimentosSemana === 0 && atendimentosMes === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhum dado disponível', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    graficoComparacao = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Hoje', 'Esta Semana', 'Este Mês'],
            datasets: [
                {
                    label: 'Quantidade de Atendimentos',
                    data: [atendimentosDia, atendimentosSemana, atendimentosMes],
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Valor Gasto (R$)',
                    data: [valorDia, valorSemana, valorMes],
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Valor (R$)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (context.datasetIndex === 1) {
                                return `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}`;
                            }
                            return `${context.dataset.label}: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}