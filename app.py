from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
import sqlite3
import pandas as pd
from io import BytesIO
import base64
from datetime import datetime
import logging
import os

# Configuração de logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static', template_folder='templates')

# Configuração de CORS simplificada.
# Permite que o frontend em desenvolvimento (ex: porta 5500) e o frontend
# em produção no Render acessem a API.
origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://sistema-manutencao-v2.onrender.com"
]
CORS(app, resources={
    r"/api/*": {
        "origins": origins,
        "expose_headers": "Content-Disposition" # Permite que o frontend leia o nome do arquivo
    }
})

def get_db_connection():
    """Cria uma conexão com o banco que permite acesso às colunas por nome."""
    conn = sqlite3.connect('manutencoes.db')
    conn.row_factory = sqlite3.Row
    return conn

# Rota de teste para verificar conectividade
@app.route('/api/test', methods=['GET'])
def test():
    logger.info("Rota de teste acessada")
    return jsonify({'message': 'Servidor está funcionando corretamente'}), 200

def init_db():
    try:
        if not os.path.exists('manutencoes.db'):
            logger.info("Criando novo banco de dados: manutencoes.db")
        conn = get_db_connection()
        conn.execute('PRAGMA foreign_keys = ON;') # Habilita o suporte a chaves estrangeiras
        c = conn.cursor()

        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='manutencoes'")
        table_exists = c.fetchone()

        if not table_exists:
            logger.info("Criando tabela 'manutencoes'...")
            c.execute('''CREATE TABLE manutencoes
                         (id INTEGER PRIMARY KEY AUTOINCREMENT,
                          data TEXT,
                          placa TEXT,
                          motorista TEXT,
                          telefone TEXT,
                          tipo TEXT,
                          oc TEXT,
                          valor REAL,
                          pix TEXT,
                          favorecido TEXT,
                          local TEXT,
                          defeito TEXT)''')
        else:
            # Lógica de migração para remover colunas antigas de anexo
            c.execute("PRAGMA table_info(manutencoes)")
            columns = [column[1] for column in c.fetchall()]
            if 'telefone' not in columns:
                logger.info("Adicionando coluna 'telefone' à tabela 'manutencoes'...")
                c.execute('ALTER TABLE manutencoes ADD COLUMN telefone TEXT DEFAULT ""')
            # As colunas de anexo não são mais necessárias aqui, serão removidas se existirem
            # para simplificar, a lógica de remoção não está inclusa, mas o ideal seria removê-las.
            # Ex: c.execute('ALTER TABLE manutencoes DROP COLUMN anexo_nota')
            if 'latitude' not in columns:
                logger.info("Adicionando coluna 'latitude' à tabela 'manutencoes'...")
                c.execute('ALTER TABLE manutencoes ADD COLUMN latitude REAL')
            if 'longitude' not in columns:
                logger.info("Adicionando coluna 'longitude' à tabela 'manutencoes'...")
                c.execute('ALTER TABLE manutencoes ADD COLUMN longitude REAL')
        
        # Adiciona a tabela para os locais do mapa, se não existir
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='mapa_locais'")
        if not c.fetchone():
            logger.info("Criando tabela 'mapa_locais'...")
            c.execute('''CREATE TABLE mapa_locais
                        (id INTEGER PRIMARY KEY AUTOINCREMENT,
                         nome TEXT NOT NULL,
                         tipo TEXT NOT NULL, -- 'unidade' ou tipo de prestador
                         latitude REAL NOT NULL,
                         longitude REAL NOT NULL,
                         endereco TEXT,
                         cidade TEXT,
                         estado TEXT,
                         telefone TEXT,
                         observacoes TEXT,
                         servicos TEXT, -- Armazenado como texto separado por vírgulas
                         avaliacao REAL
                        )''')
        else:
            logger.info("Tabela 'mapa_locais' já existe. Verificando e adicionando colunas ausentes...")
            c.execute("PRAGMA table_info(mapa_locais)")
            columns = [column[1] for column in c.fetchall()]
            
            colunas_a_adicionar = {
                'endereco': 'TEXT',
                'cidade': 'TEXT',
                'estado': 'TEXT',
                'telefone': 'TEXT',
                'observacoes': 'TEXT',
                'servicos': 'TEXT',
                'avaliacao': 'REAL'
            }

            for col, tipo in colunas_a_adicionar.items():
                if col not in columns:
                    logger.info(f"Adicionando coluna '{col}' à tabela 'mapa_locais'...")
                    c.execute(f'ALTER TABLE mapa_locais ADD COLUMN {col} {tipo}')
        
        # Adiciona a tabela para os anexos, se não existir
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='anexos'")
        if not c.fetchone():
            logger.info("Criando tabela 'anexos' para múltiplos arquivos...")
            c.execute('''CREATE TABLE anexos
                         (id INTEGER PRIMARY KEY AUTOINCREMENT,
                          manutencao_id INTEGER NOT NULL,
                          nome_arquivo TEXT NOT NULL,
                          tipo_arquivo TEXT NOT NULL,
                          dados_arquivo TEXT NOT NULL, -- Armazena como Base64
                          FOREIGN KEY (manutencao_id) REFERENCES manutencoes (id) ON DELETE CASCADE
                         )''')


        # Verificar registros existentes
        c.execute("SELECT COUNT(*) FROM manutencoes")
        count = c.fetchone()[0]
        logger.info(f"Tabela 'manutencoes' contém {count} registros")

        conn.commit()
        conn.close()
        logger.info("Banco de dados inicializado com sucesso")
    except Exception as e:
        logger.error(f"Erro ao inicializar o banco de dados: {str(e)}", exc_info=True)
        raise

init_db()

def format_date_from_excel(date_val):
    """Converte datas do Excel (serial ou texto) para YYYY-MM-DD."""
    if pd.isna(date_val) or date_val == '':
        return None
    try:
        # Converte para objeto datetime do pandas, que lida com muitos formatos
        dt = pd.to_datetime(date_val)
        return dt.strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        logger.warning(f"Não foi possível converter a data do Excel: {date_val}")
        return None

@app.route('/')
def index():
    logger.debug("Rota raiz acessada")
    return render_template('index.html')

@app.route('/api/manutencoes', methods=['POST'])
def add_manutencao():
    data = request.json
    try:
        required_fields = ['data', 'placa', 'motorista', 'tipo', 'valor', 'local', 'defeito']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        if missing_fields:
            logger.warning(f"Campos obrigatórios ausentes: {missing_fields}")
            return jsonify({'error': f'Campos obrigatórios ausentes: {", ".join(missing_fields)}'}), 400

        valor = float(data['valor'])
        if valor < 0:
            logger.warning("Valor negativo fornecido na requisição")
            return jsonify({'error': 'Valor deve ser maior ou igual a zero.'}), 400

        if not data.get('data'):
            logger.warning(f"Não foi possível converter a data fornecida: '{data['data']}'")
            return jsonify({'error': f"Não foi possível converter a data fornecida: '{data['data']}'."}), 400

        conn = get_db_connection()
        conn.execute('PRAGMA foreign_keys = ON;')
        try:
            conn.execute('BEGIN') # Inicia uma transação
            c = conn.cursor()
            c.execute('''INSERT INTO manutencoes (data, placa, motorista, telefone, tipo, oc, valor, pix, favorecido, local, defeito, latitude, longitude)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (data['data'], data['placa'].upper(), data['motorista'], data.get('telefone', ''), data['tipo'], data.get('oc', ''),
                   valor, data.get('pix', ''), data.get('favorecido', ''), data['local'], data['defeito'],
                   data.get('latitude'), data.get('longitude')))
            
            manutencao_id = c.lastrowid
            anexos = data.get('anexos', []) # Espera uma lista de anexos
            for anexo in anexos:
                c.execute('''INSERT INTO anexos (manutencao_id, nome_arquivo, tipo_arquivo, dados_arquivo)
                             VALUES (?, ?, ?, ?)''',
                          (manutencao_id, anexo.get('nome'), anexo.get('tipo'), anexo.get('dados')))

            conn.commit() # Confirma a transação
        except Exception:
            conn.rollback() # Desfaz em caso de erro
            raise
        finally:
            conn.close()

        logger.info("Manutenção adicionada com sucesso")
        return jsonify({'message': 'Manutenção adicionada com sucesso'}), 201
    except ValueError:
        logger.warning("Valor fornecido não é um número válido")
        return jsonify({'error': 'Valor deve ser um número válido.'}), 400
    except Exception as e:
        logger.error(f"Erro ao adicionar manutenção: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao adicionar manutenção: {str(e)}'}), 500

@app.route('/api/manutencoes', methods=['GET'])
def get_manutencoes():
    try:
        telefone_filtro = request.args.get('telefone', '').strip()
        conn = get_db_connection()
        c = conn.cursor()

        if telefone_filtro:
            logger.debug(f"Filtrando manutenções por telefone: {telefone_filtro}")
            c.execute('SELECT * FROM manutencoes WHERE telefone LIKE ? ORDER BY substr(data, 7, 4) DESC, substr(data, 4, 2) DESC, substr(data, 1, 2) DESC, id DESC', (f'%{telefone_filtro}%',))
        else:
            logger.debug("Recuperando todas as manutenções")
            c.execute('SELECT * FROM manutencoes ORDER BY substr(data, 7, 4) DESC, substr(data, 4, 2) DESC, substr(data, 1, 2) DESC, id DESC')

        manutencoes_rows = c.fetchall()
        manutencoes = [dict(row) for row in manutencoes_rows] # Lista de manutenções já ordenada
        manutencao_ids = [m['id'] for m in manutencoes]

        # Busca todos os anexos para as manutenções listadas de uma só vez (mais eficiente)
        if manutencao_ids:
            placeholders = ','.join('?' for _ in manutencao_ids)
            query_anexos = f"SELECT id, manutencao_id, nome_arquivo, tipo_arquivo, dados_arquivo FROM anexos WHERE manutencao_id IN ({placeholders})"
            c.execute(query_anexos, manutencao_ids)
            anexos_rows = c.fetchall()

            # Mapeia os anexos para cada ID de manutenção
            anexos_map = {}
            for anexo in anexos_rows:
                mid = anexo['manutencao_id']
                if mid not in anexos_map:
                    anexos_map[mid] = []
                anexos_map[mid].append(dict(anexo))
            
            # Adiciona a lista de anexos a cada manutenção
            for manutencao in manutencoes:
                manutencao['anexos'] = anexos_map.get(manutencao['id'], [])


        conn.close()
        logger.info(f"Manutenções retornadas: {len(manutencoes)}")
        return jsonify(manutencoes)
    except Exception as e:
        logger.error(f"Erro ao recuperar manutenções: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao recuperar manutenções: {str(e)}'}), 500

@app.route('/api/manutencoes/<int:id>', methods=['PUT'])
def update_manutencao(id):
    data = request.json
    try:
        required_fields = ['data', 'placa', 'motorista', 'tipo', 'valor', 'local', 'defeito']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        if missing_fields:
            logger.warning(f"Campos obrigatórios ausentes: {missing_fields}")
            return jsonify({'error': f'Campos obrigatórios ausentes: {", ".join(missing_fields)}'}), 400

        valor = float(data['valor'])
        if valor < 0:
            logger.warning("Valor negativo fornecido na requisição")
            return jsonify({'error': 'Valor deve ser maior ou igual a zero.'}), 400

        if not data.get('data'):
            logger.warning(f"Não foi possível converter a data fornecida: '{data['data']}'")
            return jsonify({'error': f"Não foi possível converter a data fornecida: '{data['data']}'."}), 400

        conn = get_db_connection()
        conn.execute('PRAGMA foreign_keys = ON;')
        try:
            conn.execute('BEGIN') # Inicia uma transação
            c = conn.cursor()
            c.execute('''UPDATE manutencoes SET data = ?, placa = ?, motorista = ?, telefone = ?, tipo = ?, oc = ?, valor = ?, pix = ?, favorecido = ?, local = ?, defeito = ?, latitude = ?, longitude = ?
                         WHERE id = ?''',
                      (data['data'], data['placa'].upper(), data['motorista'], data.get('telefone', ''), data['tipo'], data.get('oc', ''),
                       valor, data.get('pix', ''), data.get('favorecido', ''), data['local'], data['defeito'],
                       data.get('latitude'), data.get('longitude'), id))
            
            # Remove anexos antigos e insere os novos
            c.execute('DELETE FROM anexos WHERE manutencao_id = ?', (id,))
            anexos = data.get('anexos', [])
            for anexo in anexos:
                c.execute('''INSERT INTO anexos (manutencao_id, nome_arquivo, tipo_arquivo, dados_arquivo)
                             VALUES (?, ?, ?, ?)''',
                          (id, anexo.get('nome'), anexo.get('tipo'), anexo.get('dados')))
            conn.commit() # Confirma a transação
        except Exception:
            conn.rollback() # Desfaz em caso de erro
            raise
        finally:
            conn.close()

        logger.info(f"Manutenção {id} atualizada com sucesso")
        return jsonify({'message': 'Manutenção atualizada com sucesso'})
    except ValueError:
        logger.warning("Valor fornecido não é um número válido")
        return jsonify({'error': 'Valor deve ser um número válido.'}), 400
    except Exception as e:
        logger.error(f"Erro ao atualizar manutenção: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao atualizar manutenção: {str(e)}'}), 500

@app.route('/api/manutencoes/<int:id>', methods=['DELETE'])
def delete_manutencao(id):
    try:
        conn = get_db_connection()
        conn.execute('PRAGMA foreign_keys = ON;') # Garante que o ON DELETE CASCADE funcione
        c = conn.cursor()
        c.execute('DELETE FROM manutencoes WHERE id = ?', (id,))
        if c.rowcount == 0:
            conn.close()
            logger.warning(f"Manutenção com ID {id} não encontrada")
            return jsonify({'error': 'Manutenção não encontrada'}), 404
        conn.commit()
        conn.close()
        logger.info(f"Manutenção {id} excluída com sucesso")
        return jsonify({'message': 'Manutenção excluída com sucesso'})
    except Exception as e:
        logger.error(f"Erro ao excluir manutenção: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao excluir manutenção: {str(e)}'}), 500

@app.route('/api/estatisticas/motoristas', methods=['GET'])
def get_ranking_motoristas():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('''SELECT motorista, COUNT(*) as total_manutencoes, SUM(valor) as valor_total
                     FROM manutencoes
                     GROUP BY motorista
                     ORDER BY total_manutencoes DESC, valor_total DESC
                     LIMIT 5''')
        motoristas = []
        motoristas = [dict(row) for row in c.fetchall()]
        conn.close()
        logger.info(f"Ranking de motoristas retornado: {len(motoristas)} motoristas")
        return jsonify(motoristas)
    except Exception as e:
        logger.error(f"Erro ao recuperar ranking de motoristas: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao recuperar ranking de motoristas: {str(e)}'}), 500

@app.route('/api/estatisticas/veiculos', methods=['GET'])
def get_ranking_veiculos():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('''SELECT placa, COUNT(*) as total_manutencoes, SUM(valor) as valor_total
                     FROM manutencoes
                     GROUP BY placa
                     ORDER BY total_manutencoes DESC, valor_total DESC
                     LIMIT 5''')
        veiculos = []
        veiculos = [dict(row) for row in c.fetchall()]
        conn.close()
        logger.info(f"Ranking de veículos retornado: {len(veiculos)} veículos")
        return jsonify(veiculos)
    except Exception as e:
        logger.error(f"Erro ao recuperar ranking de veículos: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao recuperar ranking de veículos: {str(e)}'}), 500

@app.route('/api/relatorios', methods=['POST'])
def gerar_relatorio():
    try:
        data = request.json
        data_inicio = data.get('data_inicio')
        data_fim = data.get('data_fim')
        placa = data.get('placa', '').strip()
        motorista = data.get('motorista', '').strip()

        conn = get_db_connection()
        c = conn.cursor()

        query = 'SELECT * FROM manutencoes WHERE data BETWEEN ? AND ?'
        params = [data_inicio, data_fim]

        if placa:
            query += ' AND placa = ?'
            params.append(placa.upper())
        
        if motorista:
            query += ' AND motorista = ?'
            params.append(motorista)

        query += ' ORDER BY substr(data, 7, 4) DESC, substr(data, 4, 2) DESC, substr(data, 1, 2) DESC, id DESC'

        logger.debug(f"Executando query: {query} com parâmetros: {params}")
        c.execute(query, params)
        manutencoes_rows = c.fetchall()
        manutencoes = [dict(row) for row in manutencoes_rows] # Lista de manutenções já ordenada
        manutencao_ids = [m['id'] for m in manutencoes]

        # Busca todos os anexos para as manutenções listadas de uma só vez
        if manutencao_ids:
            placeholders = ','.join('?' for _ in manutencao_ids)
            query_anexos = f"SELECT id, manutencao_id, nome_arquivo, tipo_arquivo FROM anexos WHERE manutencao_id IN ({placeholders})"
            c.execute(query_anexos, manutencao_ids)
            anexos_rows = c.fetchall()

            # Mapeia os anexos para cada ID de manutenção
            anexos_map = {}
            for anexo in anexos_rows:
                mid = anexo['manutencao_id']
                if mid not in anexos_map:
                    anexos_map[mid] = []
                anexos_map[mid].append(dict(anexo))
            
            for manutencao in manutencoes:
                manutencao['anexos'] = anexos_map.get(manutencao['id'], [])

        conn.close()
        logger.info(f"Relatório gerado: {len(manutencoes)} manutenções")
        return jsonify(manutencoes)
    except Exception as e:
        logger.error(f"Erro ao gerar relatório: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao gerar relatório: {str(e)}'}), 500

@app.route('/api/exportar_relatorio_excel', methods=['POST'])
def exportar_relatorio_excel():
    try:
        data = request.json
        data_inicio = data.get('data_inicio')
        data_fim = data.get('data_fim')
        placa = data.get('placa', '').strip()
        motorista = data.get('motorista', '').strip()

        conn = get_db_connection()
        c = conn.cursor()

        query = 'SELECT data, placa, motorista, telefone, tipo, oc, valor, pix, favorecido, local, defeito FROM manutencoes WHERE data BETWEEN ? AND ?'
        params = [data_inicio, data_fim]

        if placa:
            query += ' AND placa = ?'
            params.append(placa.upper())
        
        if motorista:
            query += ' AND motorista = ?'
            params.append(motorista)

        query += ' ORDER BY substr(data, 7, 4) DESC, substr(data, 4, 2) DESC, substr(data, 1, 2) DESC, id DESC'

        logger.debug(f"Executando query para exportação: {query} com parâmetros: {params}")
        df = pd.read_sql_query(query, conn, params=params)
        conn.close()

        if df.empty:
            logger.warning("Nenhum dado disponível para exportação de relatório filtrado")
            return jsonify({'error': 'Nenhum dado disponível para exportação com os filtros aplicados'}), 400

        if 'data' in df.columns:
            df['data'] = pd.to_datetime(df['data']).dt.strftime('%d/%m/%Y')

        # Converte todas as colunas de texto para maiúsculas, exceto a data
        for col in df.select_dtypes(include=['object']).columns:
            if col.lower() != 'data':
                # Usar .astype(str) para lidar com valores nulos (NaN) e convertê-los para vazio
                df[col] = df[col].astype(str).str.upper().replace('NAN', '')

        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='RelatorioManutencoes')
        output.seek(0)

        # Adicionar cabeçalhos explícitos para exportação
        headers = {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': f'attachment; filename=relatorio_manutencoes_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        logger.info("Arquivo Excel de relatório filtrado gerado com sucesso")
        return send_file(
    output,
    mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    as_attachment=True,
    download_name=f'relatorio_manutencoes_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
)
    except Exception as e:
        logger.error(f"Erro ao exportar relatório para Excel: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao exportar relatório para Excel: {str(e)}'}), 500

@app.route('/api/exportar_excel', methods=['GET'])
def exportar_excel():
    try:
        conn = get_db_connection()
        query = 'SELECT * FROM manutencoes ORDER BY substr(data, 7, 4) DESC, substr(data, 4, 2) DESC, substr(data, 1, 2) DESC, id DESC'
        df = pd.read_sql_query(query, conn)
        conn.close()

        if df.empty:
            logger.warning("Nenhum dado disponível para exportação")
            return jsonify({'error': 'Nenhum dado disponível para exportação'}), 400

        if 'data' in df.columns:
            df['data'] = pd.to_datetime(df['data']).dt.strftime('%d/%m/%Y')

        # Converte todas as colunas de texto para maiúsculas, exceto a data
        for col in df.select_dtypes(include=['object']).columns:
            if col.lower() != 'data':
                # Usar .astype(str) para lidar com valores nulos (NaN) e convertê-los para vazio
                df[col] = df[col].astype(str).str.upper().replace('NAN', '')

        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Manutencoes')
        output.seek(0)
        logger.info("Arquivo Excel geral gerado com sucesso")
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'manutencoes_geral_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        )
    except Exception as e:
        logger.error(f"Erro ao exportar para Excel: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao exportar para Excel: {str(e)}'}), 500

@app.route('/api/importar_excel', methods=['POST'])
def importar_excel():
    try:
        data = request.json
        file_data = data.get('file_data')
        filename = data.get('filename')

        if not file_data or not filename:
            logger.warning("Dados do arquivo ou nome do arquivo ausentes")
            return jsonify({'error': 'Dados do arquivo ou nome do arquivo ausentes'}), 400

        file_content = base64.b64decode(file_data)
        df = pd.read_excel(BytesIO(file_content))

        required_columns = ['data', 'placa', 'motorista', 'tipo', 'valor', 'local', 'defeito']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            logger.warning(f"Colunas obrigatórias ausentes no Excel: {missing_columns}")
            return jsonify({'error': f'Colunas obrigatórias ausentes: {", ".join(missing_columns)}'}), 400

        conn = get_db_connection()
        c = conn.cursor()
        inserted = 0

        for _, row in df.iterrows():
            try:
                # Converter a data do Excel para YYYY-MM-DD
                data_formatada = format_date_from_excel(row['data'])
                if not data_formatada:
                    logger.warning(f"Data inválida na linha {row.name}: {row['data']}")
                    continue

                valor = float(row['valor'])
                if valor < 0:
                    logger.warning(f"Valor negativo na linha {row.name}: {row['valor']}")
                    continue

                c.execute('''INSERT INTO manutencoes (data, placa, motorista, telefone, tipo, oc, valor, pix, favorecido, local, defeito)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                          (data_formatada, str(row['placa']).upper(), str(row['motorista']), str(row.get('telefone', '')),
                           str(row['tipo']), str(row.get('oc', '')), valor, str(row.get('pix', '')),
                           str(row.get('favorecido', '')), str(row['local']), str(row['defeito'])))
                inserted += 1
            except Exception as e:
                logger.warning(f"Erro ao processar linha {row.name}: {str(e)}")
                continue

        conn.commit()
        conn.close()
        logger.info(f"{inserted} manutenções importadas com sucesso")
        return jsonify({'message': f'{inserted} manutenções importadas com sucesso'})
    except Exception as e:
        logger.error(f"Erro ao importar Excel: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao importar Excel: {str(e)}'}), 500

@app.route('/api/locais', methods=['GET'])
def get_locais_mapa():
    """
    Endpoint otimizado para o mapa. Retorna locais únicos com coordenadas,
    total de manutenções e tipos de serviços realizados no local.
    """
    try:
        conn = get_db_connection()
        # conn.row_factory já está definido em get_db_connection
        c = conn.cursor()

        query = """
            SELECT
                local,
                latitude,
                longitude,
                COUNT(*) as total_manutencoes,
                GROUP_CONCAT(DISTINCT tipo) as tipos_servicos
            FROM manutencoes
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND local IS NOT NULL AND local != ''
            GROUP BY local, latitude, longitude
        """
        c.execute(query)
        rows = c.fetchall()
        locais = [dict(row) for row in rows]
        conn.close()
        logger.info(f"Retornando {len(locais)} locais para o mapa.")
        return jsonify(locais)
    except Exception as e:
        logger.error(f"Erro ao recuperar locais para o mapa: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao recuperar locais para o mapa: {str(e)}'}), 500

# --- NOVOS ENDPOINTS PARA GERENCIAR LOCAIS DO MAPA (BASES/PRESTADORES) ---

@app.route('/api/mapa/locais', methods=['POST'])
def add_mapa_local():
    """Adiciona um novo local (base ou prestador) no banco de dados."""
    data = request.json
    logger.debug(f"Recebido para adicionar local no mapa: {data}")
    try:
        required_fields = ['nome', 'tipo', 'latitude', 'longitude', 'cidade', 'estado']
        if not all(field in data and data[field] for field in required_fields):
            logger.warning(f"Campos obrigatórios ausentes no cadastro do mapa: {data}")
            return jsonify({'error': 'Campos obrigatórios (nome, tipo, latitude, longitude, cidade, estado) ausentes'}), 400

        conn = get_db_connection()
        conn.execute('PRAGMA foreign_keys = ON;')
        c = conn.cursor()
        c.execute('''INSERT INTO mapa_locais (
                        nome, tipo, latitude, longitude, endereco, cidade, estado, 
                        telefone, observacoes, servicos, avaliacao
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (data['nome'], data['tipo'], data['latitude'], data['longitude'],
                   data.get('endereco', ''), data.get('cidade', ''), data.get('estado', ''),
                   data.get('telefone', ''), data.get('observacoes', ''),
                   # Converte a lista de serviços em uma string
                   ','.join(data.get('servicos', [])),
                   data.get('avaliacao')
                  ))
        conn.commit()
        new_id = c.lastrowid
        data['id'] = new_id
        conn.close()
        logger.info(f"Novo local de mapa adicionado: {data['nome']} (ID: {new_id})")
        return jsonify(data), 201
    except Exception as e:
        logger.error(f"Erro ao adicionar local no mapa: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao adicionar local: {str(e)}'}), 500

@app.route('/api/mapa/locais', methods=['GET'])
def get_all_mapa_locais():
    """Retorna todas as bases e prestadores salvos no banco de dados."""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('SELECT * FROM mapa_locais')
        locais = [dict(row) for row in c.fetchall()]
        conn.close()
        logger.info(f"Retornando {len(locais)} locais personalizados do mapa.")
        return jsonify(locais)
    except Exception as e:
        logger.error(f"Erro ao buscar locais do mapa: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao buscar locais: {str(e)}'}), 500

@app.route('/api/mapa/locais/<int:id>', methods=['PUT'])
def update_mapa_local(id):
    """Atualiza um local existente no mapa."""
    data = request.json
    logger.debug(f"Recebido para ATUALIZAR local no mapa (ID: {id}): {data}")
    try:
        required_fields = ['nome', 'tipo', 'latitude', 'longitude', 'cidade', 'estado']
        if not all(field in data and data[field] for field in required_fields):
            logger.warning(f"Campos obrigatórios ausentes na atualização do mapa: {data}")
            return jsonify({'error': 'Campos obrigatórios (nome, tipo, latitude, longitude, cidade, estado) ausentes'}), 400

        conn = get_db_connection()
        conn.execute('PRAGMA foreign_keys = ON;')
        c = conn.cursor()
        c.execute('''UPDATE mapa_locais SET
                        nome = ?, tipo = ?, latitude = ?, longitude = ?, endereco = ?, cidade = ?, 
                        estado = ?, telefone = ?, observacoes = ?, servicos = ?, avaliacao = ?
                     WHERE id = ?''',
                  (data['nome'], data['tipo'], data['latitude'], data['longitude'],
                   data.get('endereco', ''), data.get('cidade', ''), data.get('estado', ''),
                   data.get('telefone', ''), data.get('observacoes', ''),
                   ','.join(data.get('servicos', [])),
                   data.get('avaliacao'),
                   id
                  ))
        conn.commit()
        conn.close()
        logger.info(f"Local de mapa com ID {id} atualizado.")
        return jsonify({'message': 'Local atualizado com sucesso'})
    except Exception as e:
        logger.error(f"Erro ao atualizar local do mapa: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao atualizar local: {str(e)}'}), 500

@app.route('/api/mapa/locais/<int:id>', methods=['DELETE'])
def delete_mapa_local(id):
    """Exclui um local personalizado do mapa."""
    try:
        conn = get_db_connection()
        conn.execute('PRAGMA foreign_keys = ON;')
        c = conn.cursor()
        c.execute('DELETE FROM mapa_locais WHERE id = ?', (id,))
        if c.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Local não encontrado'}), 404
        conn.commit()
        conn.close()
        logger.info(f"Local de mapa com ID {id} excluído.")
        return jsonify({'message': 'Local excluído com sucesso'})
    except Exception as e:
        logger.error(f"Erro ao excluir local do mapa: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erro ao excluir local: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)