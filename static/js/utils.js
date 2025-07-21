export function normalizeDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        console.warn('Data vazia ou inválida recebida:', dateStr);
        return null;
    }
    try {
        const date = new Date(`${dateStr}T00:00:00`);
        if (isNaN(date.getTime())) {
            return null;
        }
        return date;
    } catch (error) {
        console.warn('Erro ao normalizar data:', dateStr, error);
        return null;
    }
}

export function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate()
    );
}

export function isSameWeek(date, referenceDate) {
    if (!date || !referenceDate) return false;
    const dayOfWeek = referenceDate.getUTCDay();
    const startOfWeek = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate() - dayOfWeek));
    const endOfWeek = new Date(Date.UTC(startOfWeek.getUTCFullYear(), startOfWeek.getUTCMonth(), startOfWeek.getUTCDate() + 6));
    return date.getTime() >= startOfWeek.getTime() && date.getTime() <= endOfWeek.getTime();
}

export function isSameMonth(date, referenceDate) {
    if (!date || !referenceDate) return false;
    return (
        date.getUTCFullYear() === referenceDate.getUTCFullYear() &&
        date.getUTCMonth() === referenceDate.getUTCMonth()
    );
}

export function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

export function gerarCores(count) {
    const cores = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#C9CBCF', '#7BC225', '#FF5733', '#C70039'
    ];
    return Array.from({ length: count }, (_, i) => cores[i % cores.length]);
}

export function validarDadosManutencao(dados) {
    const requiredFields = ['data', 'placa', 'motorista', 'tipo', 'valor', 'local', 'defeito'];
    const missingFields = requiredFields.filter(field => !dados[field] || dados[field].toString().trim() === '');
    if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios não preenchidos: ${missingFields.join(', ')}`);
    }
    if (isNaN(parseFloat(dados.valor)) || parseFloat(dados.valor) < 0) {
        throw new Error('Valor deve ser um número válido maior ou igual a zero');
    }
    return true;
}