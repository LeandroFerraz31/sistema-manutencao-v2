/**
 * Converte um arquivo para uma string Base64.
 * @param {File} file O arquivo a ser convertido.
 * @returns {Promise<string>} Uma promessa que resolve para a string Base64.
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

export function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

export function normalizeDate(dateString) {
    if (!dateString) return null;
    // Garante que a data seja tratada como UTC para evitar problemas de fuso horário
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
}

export function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
           date1.getUTCMonth() === date2.getUTCMonth() &&
           date1.getUTCDate() === date2.getUTCDate();
}

export function isSameWeek(date1, date2) {
    if (!date1 || !date2) return false;
    const startOfWeek1 = new Date(date1);
    startOfWeek1.setUTCDate(date1.getUTCDate() - date1.getUTCDay());
    const startOfWeek2 = new Date(date2);
    startOfWeek2.setUTCDate(date2.getUTCDate() - date2.getUTCDay());
    return startOfWeek1.toISOString().split('T')[0] === startOfWeek2.toISOString().split('T')[0];
}

export function isSameMonth(date1, date2) {
    if (!date1 || !date2) return false;
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
           date1.getUTCMonth() === date2.getUTCMonth();
}

export function gerarCores(numCores) {
    const cores = ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#83A8E7', '#C9A8E7', '#E7A8B7', '#A8E7C9', '#E7DFA8'];
    return Array.from({ length: numCores }, (_, i) => cores[i % cores.length]);
}

export function validarDadosManutencao(manutencao) {
    const requiredFields = ['data', 'placa', 'motorista', 'tipo', 'valor', 'local', 'defeito'];
    const missingFields = requiredFields.filter(field => !manutencao[field]);
    if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
    }
    if (isNaN(parseFloat(manutencao.valor))) {
        throw new Error('Valor inválido.');
    }
}