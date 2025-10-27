import os
from flask import Flask, request, jsonify
from upstash_redis import Redis

# A Vercel procurará por esta variável 'app' para servir
app = Flask(__name__)

# --- Configuração do Cliente Redis ---

# Tenta inicializar a conexão com o Redis a partir das variáveis de ambiente
try:
    # A Vercel (ou suas configurações de projeto) deve fornecer esta variável
    redis_url = os.environ.get("UPSTASH_REDIS_URL")
    
    if not redis_url:
        # Se a variável não estiver definida, registramos um erro.
        # O 'redis' ficará como 'None' e as rotas falharão de forma controlada.
        print("❌ ERRO CRÍTICO: Variável de ambiente UPSTASH_REDIS_URL não definida.")
        redis = None
    else:
        # Conecta ao Upstash Redis
        redis = Redis.from_url(redis_url)
        print("✅ Conexão com Upstash Redis estabelecida.")
        
except Exception as e:
    # Captura qualquer outro erro durante a inicialização
    print(f"❌ ERRO CRÍTICO: Falha ao inicializar o cliente Redis: {e}")
    redis = None

# --- Definição das Rotas (Endpoints) ---

@app.route('/', defaults={'path': ''}, methods=['GET', 'POST'])
@app.route('/<path:path>', methods=['GET', 'POST'])
def handle_request(path):
    """
    Rota principal que captura todas as requisições GET e POST.
    """
    
    # Verifica se a conexão com o Redis falhou na inicialização
    if redis is None:
        return jsonify({
            "status": "erro", 
            "mensagem": "Erro interno do servidor: Conexão com o banco de dados falhou."
        }), 500

    # --- Lógica para Requisições POST (Receber dados) ---
    if request.method == 'POST':
        try:
            # Pega os dados enviados (espera-se um JSON)
            data = request.json
            if not data:
                return jsonify({"status": "erro", "mensagem": "Nenhum dado JSON recebido."}), 400

            # Define uma chave. Ex: "iot_data:sensor_cozinha" ou "iot_data:default"
            chave_redis = f"iot_data:{path}" if path else "iot_data:default"
            
            # Salva os dados no Redis.
            # Estamos salvando os dados como uma string JSON.
            redis.set(chave_redis, str(data))
            
            print(f"✅ Dados salvos na chave: {chave_redis}")
            return jsonify({
                "status": "sucesso", 
                "mensagem": "Dados recebidos e salvos.",
                "chave": chave_redis
            }), 201 # 201 Created

        except Exception as e:
            print(f"❌ Erro ao processar POST: {e}")
            return jsonify({"status": "erro", "mensagem": str(e)}), 400

    # --- Lógica para Requisições GET (Consultar dados) ---
    if request.method == 'GET':
        # Se for um GET para a raiz, apenas retorna uma mensagem de status
        if not path:
            return jsonify({
                "status": "online", 
                "mensagem": "IoT Gateway está operacional. Use /<caminho> para ler dados."
            }), 200
        
        try:
            chave_redis = f"iot_data:{path}"
            
            # Busca os dados no Redis
            dados_salvos = redis.get(chave_redis)
            
            if dados_salvos:
                # 'dados_salvos' vem como bytes, então decodificamos
                return jsonify({
                    "status": "sucesso",
                    "chave": chave_redis,
                    "dados": dados_salvos.decode('utf-8')
                }), 200
            else:
                return jsonify({
                    "status": "nao_encontrado", 
                    "chave": chave_redis
                }), 404 # 404 Not Found

        except Exception as e:
            print(f"❌ Erro ao processar GET: {e}")
            return jsonify({"status": "erro", "mensagem": str(e)}), 500

# NOTA IMPORTANTE:
# A linha 'if __name__ == "__main__": app.run()' NÃO é necessária
# e NÃO deve ser incluída. A Vercel usa um servidor WSGI (como Gunicorn)
# por baixo dos panos para executar a variável 'app'.