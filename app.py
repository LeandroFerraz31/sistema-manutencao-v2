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
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static', template_folder='templates')

# Configuração de CORS
origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://sistema-manutencao-v2.onrender.com"
]
CORS(app, resources={
    r"/api/*": {
        "origins": origins,
        "expose_headers": "Content-Disposition"
    }
})

# Rota de teste para verificar conectividade
@app.route('/api/test', methods=['GET'])
def test():
    logger.info("Rota de teste acessada")
    return jsonify({'message': 'Servidor está funcionando corretamente'}), 200

def init_db():
    try:
        db_path = os.path.join(os.getcwd(), 'manutencoes.db')
        logger.info(f"Inicializando banco de dados em: {db_path}")
        
        conn = sqlite3.connect(db_path)
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
            # Verificar se a coluna telefone existe
            c.execute("PRAGMA table_info(manutencoes)")
            columns = [column[1] for column in c.fetchall()]
            if 'telefone' not in columns:
                logger.info("Adicionando coluna 'telefone' à tabela 'manutencoes'...")
                c.execute('ALTER TABLE manutencoes ADD COLUMN telefone TEXT DEFAULT ""')

        # Verificar registros existentes
        c.execute("SELECT COUNT(*) FROM manutencoes")
        count = c.fetchone()[0]
        logger.info(f"Tabela 'manutencoes' contém {count} registros")

        conn.commit()
        conn.close()
        logger.info("Banco de dados inicializado com sucesso")
    except Exception as e:
        logger.error(f"Erro ao inicializar o banco de dados: {str(e)}")
        raise

# Inicializar o banco quando o módulo for carregado
init_db()

def format_date_from_excel(date_val):
    """Converte datas do Excel (serial ou texto) para YYYY-MM-DD."""
    if pd.isna(date_val) or date_val == '':
        return None
    try:
        dt = pd.to_datetime(date_val)
        return dt.strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        logger.warning(f"Não foi possível converter a data do Excel: {date_val}")
        return None

@app.route('/')
def index():
    logger.info("Rota raiz acessada")
    return render_template('index.html')

@app.route('/api/manutencoes', methods=['POST'])
def add_manutencao():
    data = request.json
    try:
        required_fields = ['data', 'placa', 'motorista', 'tipo', 'valor', 'local', 'defeito']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        if missing_fields:
            return jsonify({'error': f'Campos obrigatórios ausentes: {", ".join(missing_fields)}'}), 400

        valor = float(data['valor'])
        if valor < 0:
            return jsonify({'error': 'Valor deve ser maior ou igual a zero.'}), 400

        if not data.get('data'):
            return jsonify({'error': f"Data inválida fornecida: '{data['data']}'."}), 400

        conn = sqlite3.connect('manutencoes.db')
        c = conn.cursor()
        c.execute('''INSERT INTO manutencoes (data, placa, motorista, telefone, tipo, oc, valor, pix, favorecido, local, defeito)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (data['data'], data['placa'].upper(), data['motorista'], data.get('telefone', ''), data['tipo'], data.get('oc', ''),
                   valor, data.get('pix', ''), data.get('favorecido', ''), data['local'], data['defeito']))
        conn.commit()
        conn.close()
        logger.info("Manutenção adicionada com sucesso")
        return jsonify({'message': 'Manutenção adicionada com sucesso'}), 201
    except ValueError:
        return jsonify({'error': 'Valor deve ser um número válido.'}), 400
    except Exception as e:
        logger.error(f"Erro ao adicionar manutenção: {str(e)}")
        return jsonify({'error': f'Erro ao adicionar manutenção: {str(e)}'}), 500

@app.route('/api/manutencoes', methods=['GET'])
def get_manutencoes():
    try:
        telefone_filtro = request.args.get('telefone', '').strip()
        conn = sqlite3.connect('manutencoes.db')
        c = conn.cursor()

        if telefone_filtro:
            c.execute('SELECT * FROM manutencoes WHERE telefone LIKE ?', (f'%{telefone_filtro}%',))
        else:
            c.execute('SELECT * FROM manutencoes ORDER BY data DESC')

        rows = c.fetchall()
        manutencoes = []
        for row in rows:
            manutencao = {
                'id': row[0],
                'data': row[1] or '',
                'placa': row[2] or '',
                'motorista': row[3] or '',
                'telefone': row[4] or '',
                'tipo': row[5] or '',
                'oc': row[6] or '',
                'valor': row[7] if row[7] is not None else 0.0,
                'pix': row[8] or '',
                'favorecido': row[9] or '',
                'local': row[10] or '',
                'defeito': row[11] or ''
            }
            manutencoes.append(manutencao)

        conn.close()
        logger.info(f"Retornadas {len(manutencoes)} manutenções")
        return jsonify(manutencoes)
    except Exception as e:
        logger.error(f"Erro ao recuperar manutenções: {str(e)}")
        return jsonify({'error': f'Erro ao recuperar manutenções: {str(e)}'}), 500

@app.route('/api/manutencoes/<int:id>', methods=['PUT'])
def update_manutencao(id):
    data = request.json
    try:
        required_fields = ['data', 'placa', 'motorista', 'tipo', 'valor', 'local', 'defeito']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        if missing_fields:
            return jsonify({'error': f'Campos obrigatórios ausentes: {", ".join(missing_fields)}'}), 400

        valor = float(data['valor'])
        if valor < 0:
            return jsonify({'error': 'Valor deve ser maior ou igual a zero.'}), 400

        conn = sqlite3.connect('manutencoes.db')
        c = conn.cursor()
        c.execute('''UPDATE manutencoes SET data = ?, placa = ?, motorista = ?, telefone = ?, tipo = ?, oc = ?, valor = ?, pix = ?, favorecido = ?, local = ?, defeito = ?
                     WHERE id = ?''',
                  (data['data'], data['placa'].upper(), data['motorista'], data.get('telefone', ''), data['tipo'], data.get('oc', ''),
                   valor, data.get('pix', ''), data.get('favorecido', ''), data['local'], data['defeito'], id))
        conn.commit()
        conn.close()
        logger.info(f"Manutenção {id} atualizada com sucesso")
        return jsonify({'message': 'Manutenção atualizada com sucesso'})
    except ValueError:
        return jsonify({'error': 'Valor deve ser um número válido.'}), 400
    except Exception as e:
        logger.error(f"Erro ao atualizar manutenção: {str(e)}")
        return jsonify({'error': f'Erro ao atualizar manutenção: {str(e)}'}), 500

@app.route('/api/manutencoes/<int:id>', methods=['DELETE'])
def delete_manutencao(id):
    try:
        conn = sqlite3.connect('manutencoes.db')
        c = conn.cursor()
        c.execute('DELETE FROM manutencoes WHERE id = ?', (id,))
        if c.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Manutenção não encontrada'}), 404
        conn.commit()
        conn.close()
        logger.info(f"Manutenção {id} excluída com sucesso")
        return jsonify({'message': 'Manutenção excluída com sucesso'})
    except Exception as e:
        logger.error(f"Erro ao excluir manutenção: {str(e)}")
        return jsonify({'error': f'Erro ao excluir manutenção: {str(e)}'}), 500

@app.route('/api/estatisticas/motoristas', methods=['GET'])
def get_ranking_motoristas():
    try:
        conn = sqlite3.connect('manutencoes.db')
        c = conn.cursor()
        c.execute('''SELECT motorista, COUNT(*) as total_manutencoes, SUM(valor) as valor_total
                     FROM manutencoes
                     GROUP BY motorista
                     ORDER BY total_manutencoes DESC, valor_total DESC
                     LIMIT 5''')
        motoristas = []
        for row in c.fetchall():
            motoristas.append({
                'motorista': row[0] or 'Desconhecido',
                'total_manutencoes': row[1],
                'valor_total': row[2] if row[2] is not None else 0.0
            })
        conn.close()
        return jsonify(motoristas)
    except Exception as e:
        logger.error(f"Erro ao recuperar ranking de motoristas: {str(e)}")
        return jsonify({'error': f'Erro ao recuperar ranking de motoristas: {str(e)}'}), 500

@app.route('/api/estatisticas/veiculos', methods=['GET'])
def get_ranking_veiculos():
    try:
        conn = sqlite3.connect('manutencoes.db')
        c = conn.cursor()
        c.execute('''SELECT placa, COUNT(*) as total_manutencoes, SUM(valor) as valor_total
                     FROM manutencoes
                     GROUP BY placa
                     ORDER BY total_manutencoes DESC, valor_total DESC
                     LIMIT 5''')
        veiculos = []
        for row in c.fetchall():
            veiculos.append({
                'placa': row[0] or 'Desconhecida',
                'total_manutencoes': row[1],
                'valor_total': row[2] if row[2] is not None else 0.0
            })
        conn.close()
        return jsonify(veiculos)
    except Exception as e:
        logger.error(f"Erro ao recuperar ranking de veículos: {str(e)}")
        return jsonify({'error': f'Erro ao recuperar ranking de veículos: {str(e)}'}), 500

@app.route('/api/relatorios', methods=['POST'])
def gerar_relatorio():
    try:
        data = request.json
        data_inicio = data.get('data_inicio')
        data_fim = data.get('data_fim')
        placa = data.get('placa', '').strip()
        motorista = data.get('motorista', '').strip()

        conn = sqlite3.connect('manutencoes.db')
        c = conn.cursor()

        query = 'SELECT * FROM manutencoes WHERE data BETWEEN ? AND ?'
        params = [data_inicio, data_fim]

        if placa:
            query += ' AND placa = ?'
            params.append(placa.upper())
        
        if motorista:
            query += ' AND motorista = ?'
            params.append(motorista)

        query += ' ORDER BY data DESC'

        c.execute(query, params)
        rows = c.fetchall()

        manutencoes = []
        for row in rows:
            manutencao = {
                'id': row[0],
                'data': row[1] or '',
                'placa': row[2] or '',
                'motorista': row[3] or '',
                'telefone': row[4] or '',
                'tipo': row[5] or '',
                'oc': row[6] or '',
                'valor': row[7] if row[7] is not None else 0.0,
                'pix': row[8] or '',
                'favorecido': row[9] or '',
                'local': row[10] or '',
                'defeito': row[11] or ''
            }
            manutencoes.append(manutencao)

        conn.close()
        logger.info(f"Relatório gerado: {len(manutencoes)} manutenções")
        return jsonify(manutencoes)
    except Exception as e:
        logger.error(f"Erro ao gerar relatório: {str(e)}")
        return jsonify({'error': f'Erro ao gerar relatório: {str(e)}'}), 500

@app.route('/api/exportar_relatorio_excel', methods=['POST'])
def exportar_relatorio_excel():
    try:
        data = request.json
        data_inicio = data.get('data_inicio')
        data_fim = data.get('data_fim')
        placa = data.get('placa', '').strip()
        motorista = data.get('motorista', '').strip()

        conn = sqlite3.connect('manutencoes.db')
        c = conn.cursor()

        query = 'SELECT data, placa, motorista, telefone, tipo, oc, valor, pix, favorecido, local, defeito FROM manutencoes WHERE data BETWEEN ? AND ?'
        params = [data_inicio, data_fim]

        if placa:
            query += ' AND placa = ?'
            params.append(placa.upper())
        
        if motorista:
            query += ' AND motorista = ?'
            params.append(motorista)

        query += ' ORDER BY data DESC'

        df = pd.read_sql_query(query, conn, params=params)
        conn.close()

        if df.empty:
            return jsonify({'error': 'Nenhum dado disponível para exportação com os filtros aplicados'}), 400

        # Formatar datas
        if 'data' in df.columns and not df['data'].empty:
            df['data'] = pd.to_datetime(df['data'], errors='coerce').dt.strftime('%d/%m/%Y')

        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='RelatorioManutencoes')
        output.seek(0)

        logger.info("Arquivo Excel de relatório filtrado gerado com sucesso")
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'relatorio_manutencoes_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        )
    except Exception as e:
        logger.error(f"Erro ao exportar relatório para Excel: {str(e)}")
        return jsonify({'error': f'Erro ao exportar relatório para Excel: {str(e)}'}), 500

@app.route('/api/exportar_excel', methods=['GET'])
def exportar_excel():
    try:
        conn = sqlite3.connect('manutencoes.db')
        query = 'SELECT * FROM manutencoes ORDER BY data DESC'
        df = pd.read_sql_query(query, conn)
        conn.close()

        if df.empty:
            return jsonify({'error': 'Nenhum dado disponível para exportação'}), 400

        # Formatar datas
        if 'data' in df.columns and not df['data'].empty:
            df['data'] = pd.to_datetime(df['data'], errors='coerce').dt.strftime('%d/%m/%Y')

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
        logger.error(f"Erro ao exportar para Excel: {str(e)}")
        return jsonify({'error': f'Erro ao exportar para Excel: {str(e)}'}), 500

@app.route('/api/importar_excel', methods=['POST'])
def importar_excel():
    try:
        data = request.json
        file_data = data.get('file_data')
        filename = data.get('filename')

        if not file_data or not filename:
            return jsonify({'error': 'Dados do arquivo ou nome do arquivo ausentes'}), 400

        file_content = base64.b64decode(file_data)
        df = pd.read_excel(BytesIO(file_content))

        required_columns = ['data', 'placa', 'motorista', 'tipo', 'valor', 'local', 'defeito']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return jsonify({'error': f'Colunas obrigatórias ausentes: {", ".join(missing_columns)}'}), 400

        conn = sqlite3.connect('manutencoes.db')
        c = conn.cursor()
        inserted = 0

        for _, row in df.iterrows():
            try:
                data_formatada = format_date_from_excel(row['data'])
                if not data_formatada:
                    continue

                valor = float(row['valor'])
                if valor < 0:
                    continue

                c.execute('''INSERT INTO manutencoes (data, placa, motorista, telefone, tipo, oc, valor, pix, favorecido, local, defeito)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                          (data_formatada, str(row['placa']).upper(), str(row['motorista']), str(row.get('telefone', '')),
                           str(row['tipo']), str(row.get('oc', '')), valor, str(row.get('pix', '')),
                           str(row.get('favorecido', '')), str(row['local']), str(row['defeito'])))
                inserted += 1
            except Exception as e:
                logger.warning(f"Erro ao processar linha: {str(e)}")
                continue

        conn.commit()
        conn.close()
        logger.info(f"{inserted} manutenções importadas com sucesso")
        return jsonify({'message': f'{inserted} manutenções importadas com sucesso'})
    except Exception as e:
        logger.error(f"Erro ao importar Excel: {str(e)}")
        return jsonify({'error': f'Erro ao importar Excel: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)