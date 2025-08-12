# Dashboard de Manutenções Veiculares - Versão Evoluída

## 🚀 Visão Geral

Sistema completo de controle de manutenções veiculares com dashboard interativo no estilo Power BI. Desenvolvido com Flask (Python) no backend e HTML/CSS/JavaScript no frontend, oferece uma experiência moderna e profissional para gestão de manutenções.

## ✨ Principais Funcionalidades

### 📊 Dashboard Executivo
- **Métricas em tempo real**: Total de manutenções, valor gasto, veículos atendidos
- **Gráficos interativos**: Pizza para distribuição por tipo, barras para comparação temporal
- **Rankings dinâmicos**: Top 5 motoristas e veículos com mais problemas
- **Filtros avançados**: Por motorista, placa, tipo e período

### 🔧 Gestão de Manutenções
- **Cadastro completo**: Incluindo campo telefone para uso interno
- **Edição e exclusão**: Interface intuitiva para gerenciar registros
- **Validação robusta**: Campos obrigatórios e validação de dados
- **Histórico completo**: Rastreamento de todas as manutenções

### 📈 Relatórios e Análises
- **Relatórios personalizados**: Filtros por data, placa e motorista
- **Exportação Excel**: Dados sem informações sensíveis
- **Estatísticas avançadas**: Insights sobre padrões de manutenção
- **Colinha rápida**: Para cópia de informações essenciais

### 🗺️ Mapa Interativo de Locais
- **Visualização Georreferenciada**: Exibe no mapa os locais onde as manutenções foram realizadas, agrupando por localidade.
- **Cadastro de Pontos de Interesse**: Permite cadastrar, editar e remover locais personalizados, como "Bases" e "Prestadores de Serviço", com informações detalhadas (endereço, telefone, serviços, etc.).
- **Persistência no Banco de Dados**: Todos os locais personalizados são salvos de forma segura no banco de dados da aplicação (tabela `mapa_locais`), garantindo que a informação seja centralizada e consistente.
- **Filtros Dinâmicos**: Permite buscar e filtrar os locais no mapa por nome, cidade ou tipo.

### 🎨 Design Moderno
- **Estilo Power BI**: Cores vibrantes, gradientes e cards elegantes
- **Responsivo**: Funciona perfeitamente em desktop e mobile
- **Animações suaves**: Transições e micro-interações
- **UX profissional**: Interface intuitiva e corporativa

## 🔒 Privacidade e Segurança

- **Campo telefone**: Apenas para uso interno, não aparece em relatórios ou exportações
- **Dados sensíveis**: Protegidos e não expostos externamente
- **Validação**: Entrada de dados segura e consistente

## 🛠️ Tecnologias Utilizadas

### Backend
- **Flask**: Framework web Python
- **SQLite**: Banco de dados leve e eficiente
- **Pandas**: Manipulação de dados e exportação Excel
- **CORS**: Suporte para requisições cross-origin

### Frontend
- **HTML5**: Estrutura semântica moderna
- **CSS3**: Estilos avançados com gradientes e animações
- **JavaScript ES6+**: Lógica interativa e manipulação do DOM
- **Chart.js**: Gráficos interativos e responsivos
- **Axios**: Cliente HTTP para comunicação com API
- **Leaflet.js**: Biblioteca para mapas interativos

## 📁 Estrutura do Projeto

```
dashboard_manutencoes_evoluido/
├── app.py # Aplicação Flask principal (Backend)
├── manutencoes.db # Banco de dados SQLite (criado automaticamente)
├── templates/
│ └── index.html # Estrutura HTML da página
├── static/
│ ├── styles.css # Estilos da aplicação
│ └── js/ # Pasta com o código JavaScript modularizado
│ ├── main.js # Orquestrador principal do frontend
│ ├── api.js # Módulo para comunicação com a API
│ ├── ui.js # Módulo para manipulação da interface do usuário (DOM)
│ ├── charts.js # Módulo para gerenciamento dos gráficos
│ ├── utils.js # Módulo com funções utilitárias
│ └── map.js # Módulo para o mapa interativo de prestadores
└── README.md # Esta documentação
```

## 🚀 Como Executar

### Pré-requisitos
- Python 3.7+
- pip (gerenciador de pacotes Python)

### Instalação
1. Clone ou baixe o projeto
2. Instale as dependências:
```bash
pip install flask flask-cors pandas xlsxwriter
```

### Execução
1. Navegue até o diretório do projeto:
```bash
cd dashboard_manutencoes_evoluido
```

2. Execute a aplicação:
```bash
python app.py
```

3. Acesse no navegador:
```
http://localhost:5000
```

## 📊 Endpoints da API

### Manutenções
- `GET /api/manutencoes` - Lista todas as manutenções
- `POST /api/manutencoes` - Cria nova manutenção
- `PUT /api/manutencoes/{id}` - Atualiza manutenção
- `DELETE /api/manutencoes/{id}` - Remove manutenção

### Estatísticas
- `GET /api/estatisticas/motoristas` - Retorna o ranking dos 5 motoristas com mais manutenções.
- `GET /api/estatisticas/veiculos` - Retorna o ranking dos 5 veículos com mais manutenções.

### Relatórios
- `POST /api/relatorios` - Gera um relatório filtrado por período, placa e motorista.
- `GET /api/exportar_excel` - Exporta **todos** os dados para um arquivo Excel.
- `POST /api/importar_excel` - Importa dados de um arquivo Excel para o banco de dados.
- `POST /api/exportar_relatorio_excel` - Exporta um relatório filtrado para Excel

## 🏛️ Decisões de Arquitetura e Boas Práticas

Este projeto foi desenvolvido com foco em manutenibilidade, escalabilidade e uma excelente experiência de usuário. A seguir, algumas das principais decisões de engenharia adotadas:

### 1. Modularização do Frontend (JavaScript)

*   **Problema:** Um único arquivo `main.js` com mais de 1200 linhas torna o código difícil de ler, depurar e dar manutenção.
*   **Solução:** O código foi refatorado e dividido em módulos com responsabilidades claras, seguindo o princípio de **Separação de Preocupações (Separation of Concerns)**.
    -   `api.js`: Centraliza toda a comunicação com o backend. Se a API mudar, as alterações são feitas em um único lugar.
    -   `ui.js`: Gerencia toda a manipulação do DOM (tabelas, formulários, notificações), mantendo a lógica de apresentação separada.
    -   `charts.js`: Isola a complexidade da biblioteca Chart.js, facilitando a criação e atualização dos gráficos.
    -   `utils.js`: Contém funções puras e reutilizáveis (formatação de data, moeda, etc.), que podem ser usadas por qualquer outro módulo.
    -   `main.js`: Atua como um orquestrador, inicializando a aplicação e conectando os eventos aos seus respectivos módulos.
*   **Benefício:** O código se torna mais limpo, organizado, fácil de testar e pronto para crescer sem se tornar um "monstro".

### 2. Experiência do Usuário (UX) com Feedback Visual

*   **Problema:** Operações que dependem da rede (como carregar dados ou salvar um formulário) podem demorar alguns segundos. Sem um feedback, o usuário pode achar que a aplicação travou ou clicar no botão de salvar múltiplas vezes.
*   **Solução:** Foi implementado um **estado de "loading" global**. Uma camada (overlay) com um spinner é exibida durante qualquer comunicação com a API.
*   **Benefício:** Melhora drasticamente a experiência do usuário, fornecendo um feedback claro de que o sistema está processando a sua solicitação e evitando ações duplicadas.

### 3. Padronização e Segurança no Tratamento de Dados

*   **Armazenamento de Datas:**
    -   **Problema:** Lidar com múltiplos formatos de data (`DD/MM/YY`, `YYYY-MM-DD`, etc.) é complexo e propenso a erros. Armazenar datas como texto no formato `DD/MM/YY` impede a ordenação e filtragem correta no banco de dados.
    -   **Solução:** Foi adotado o padrão **ISO 8601 (`YYYY-MM-DD`)** como formato único para comunicação e armazenamento. O frontend envia neste formato, o backend armazena e processa neste formato, e o frontend é responsável por formatá-lo para uma exibição amigável (`DD/MM/YY`).
    -   **Benefício:** Simplifica o código, aumenta a confiabilidade e garante que as consultas no banco de dados (como filtros por período) funcionem perfeitamente.

*   **Prevenção de Cross-Site Scripting (XSS):**
    -   **Problema:** Inserir dados vindos do usuário diretamente no HTML com `innerHTML` é uma grave falha de segurança, permitindo que código malicioso seja executado no navegador de outros usuários.
    -   **Solução:** A renderização de dados dinâmicos (como a tabela de listagem e de relatórios) foi refatorada para usar `document.createElement()` e `element.textContent`. A propriedade `textContent` interpreta qualquer entrada como texto puro, neutralizando qualquer script malicioso.
    -   **Benefício:** Garante a segurança da aplicação, protegendo os usuários contra ataques XSS.

## 🎯 Principais Melhorias Implementadas

### Backend
- ✅ Campo telefone adicionado à tabela de manutenções
- ✅ Novos endpoints para estatísticas avançadas
- ✅ Proteção de dados sensíveis em relatórios
- ✅ Validação robusta de dados
- ✅ Suporte a migração automática do banco

### Frontend
- ✅ Interface moderna estilo Power BI
- ✅ Filtros avançados em tempo real
- ✅ Gráficos interativos (pizza e barras)
- ✅ Rankings dinâmicos
- ✅ Design responsivo
- ✅ Animações e transições suaves
- ✅ Notificações de feedback

### UX/UI
- ✅ Cores vibrantes e gradientes
- ✅ Cards com ícones e métricas
- ✅ Layout corporativo profissional
- ✅ Micro-interações
- ✅ Estados de hover e foco
- ✅ Tipografia moderna

## 🔧 Configurações Avançadas

### Banco de Dados
O sistema cria automaticamente o banco SQLite na primeira execução. Para bancos existentes, a migração do campo telefone é feita automaticamente.

### CORS
Configurado para aceitar requisições de:
- http://127.0.0.1:5500
- http://localhost:5500

### Filtros
- **Listagem**: Busca textual e filtros avançados
- **Relatórios**: Filtros por data, placa e motorista

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- **Desktop**: Layout completo com sidebar
- **Tablet**: Layout adaptado com navegação horizontal
- **Mobile**: Interface otimizada para toque

## 🎨 Paleta de Cores

- **Azul Principal**: #0078d4 (estilo Microsoft)
- **Roxo Secundário**: #8764b8
- **Verde Sucesso**: #107c10
- **Laranja Aviso**: #ff8c00
- **Vermelho Erro**: #d13438

## 📈 Métricas do Dashboard

1. **Total de Manutenções**: Contador geral
2. **Valor Total Gasto**: Soma de todos os valores
3. **Veículos Atendidos**: Placas únicas (excluindo tipos específicos)
4. **Manutenções no Mês**: Contador do mês atual

## 🏆 Rankings

- **Top 5 Motoristas**: Ordenados por quantidade de manutenções
- **Top 5 Veículos**: Ordenados por quantidade de problemas
- **Distribuição por Tipo**: Gráfico pizza interativo

## 🔄 Atualizações Futuras

Sugestões para próximas versões:
- Autenticação de usuários
- Relatórios em PDF
- Notificações por email
- Integração com APIs externas
- Dashboard de custos por período
- Previsão de manutenções

## 📞 Suporte

Para dúvidas ou sugestões sobre o sistema, consulte a documentação ou entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para otimizar a gestão de manutenções veiculares**
