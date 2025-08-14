import sqlite3
import logging

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_db_connection():
    """Cria uma conexão com o banco que permite acesso às colunas por nome."""
    conn = sqlite3.connect('manutencoes.db')
    conn.row_factory = sqlite3.Row
    return conn

def inferir_tipo_e_nome(dados_base64):
    """Tenta inferir o tipo de arquivo e gerar um nome padrão a partir do conteúdo Base64."""
    if not dados_base64 or not isinstance(dados_base64, str):
        return None, None

    if dados_base64.startswith('data:application/pdf;base64,'):
        return 'application/pdf', 'anexo_migrado.pdf'
    elif dados_base64.startswith('data:image/jpeg;base64,'):
        return 'image/jpeg', 'anexo_migrado.jpg'
    elif dados_base64.startswith('data:image/png;base64,'):
        return 'image/png', 'anexo_migrado.png'
    elif dados_base64.startswith('data:image/gif;base64,'):
        return 'image/gif', 'anexo_migrado.gif'
    
    # Se não for um formato conhecido, assume que é uma imagem jpg por padrão
    return 'image/jpeg', 'anexo_migrado_desconhecido.jpg'


def migrar_banco_de_dados():
    """
    Executa a migração do banco de dados para suportar múltiplos anexos,
    preservando os dados existentes.
    """
    logging.info("Iniciando script de migração do banco de dados...")
    conn = None
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # 1. Verificar a estrutura da tabela 'anexos'.
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='anexos'")
        table_exists = c.fetchone()
        
        required_columns = {'id', 'manutencao_id', 'nome_arquivo', 'tipo_arquivo', 'dados_arquivo'}
        has_correct_structure = False

        if table_exists:
            logging.info("Tabela 'anexos' encontrada. Verificando estrutura...")
            c.execute("PRAGMA table_info(anexos)")
            existing_columns = {column['name'] for column in c.fetchall()}
            if required_columns.issubset(existing_columns):
                has_correct_structure = True
                logging.info("Estrutura da tabela 'anexos' está correta.")
            else:
                logging.warning("Tabela 'anexos' com estrutura incorreta. Recriando a tabela...")
                c.execute("DROP TABLE anexos")
                table_exists = False # Força a recriação

        if not table_exists or not has_correct_structure:
            logging.info("Criando a tabela 'anexos' com a estrutura correta...")
            c.execute('''CREATE TABLE anexos
                         (id INTEGER PRIMARY KEY AUTOINCREMENT,
                          manutencao_id INTEGER NOT NULL,
                          nome_arquivo TEXT NOT NULL,
                          tipo_arquivo TEXT NOT NULL,
                          dados_arquivo TEXT NOT NULL,
                          FOREIGN KEY (manutencao_id) REFERENCES manutencoes (id) ON DELETE CASCADE
                         )''')
            logging.info("Tabela 'anexos' criada/recriada com sucesso.")

        # 3. Verificar se a coluna 'anexo_nota' existe na tabela 'manutencoes'.
        c.execute("PRAGMA table_info(manutencoes)")
        columns = [column['name'] for column in c.fetchall()]
        if 'anexo_nota' not in columns:
            logging.info("A coluna 'anexo_nota' não foi encontrada. Nenhuma migração de dados de anexo é necessária.")
            conn.close()
            return

        logging.info("Coluna 'anexo_nota' encontrada. Iniciando a migração dos dados de anexos.")
        
        # 4. Buscar todos os anexos da coluna antiga.
        c.execute("SELECT id, anexo_nota FROM manutencoes WHERE anexo_nota IS NOT NULL AND anexo_nota != ''")
        anexos_antigos = c.fetchall()

        if not anexos_antigos:
            logging.info("Nenhum anexo antigo encontrado para migrar.")
        else:
            # 5. Inserir cada anexo antigo na nova tabela 'anexos'.
            migrados = 0
            for anexo in anexos_antigos:
                manutencao_id = anexo['id']
                dados_base64 = anexo['anexo_nota']
                
                tipo_arquivo, nome_arquivo = inferir_tipo_e_nome(dados_base64)

                if nome_arquivo:
                    c.execute('''INSERT INTO anexos (manutencao_id, nome_arquivo, tipo_arquivo, dados_arquivo)
                                 VALUES (?, ?, ?, ?)''',
                              (manutencao_id, nome_arquivo, tipo_arquivo, dados_base64))
                    migrados += 1
            logging.info(f"{migrados} de {len(anexos_antigos)} anexos foram migrados para a nova tabela.")

        # 6. Renomear a coluna antiga para evitar uso futuro e marcar a migração como concluída.
        logging.info("Renomeando a coluna 'anexo_nota' para 'anexo_nota_migrado'...")
        c.execute('ALTER TABLE manutencoes RENAME COLUMN anexo_nota TO anexo_nota_migrado')
        conn.commit()
        logging.info("Coluna renomeada com sucesso.")

        logging.info("Migração do banco de dados concluída com sucesso!")

    except Exception as e:
        logging.error(f"Ocorreu um erro inesperado durante a migração: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    migrar_banco_de_dados()