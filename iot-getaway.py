#!/usr/bin/env python3
import hashlib
import json
import time
import os
from datetime import datetime
from flask import Flask, request, jsonify
import redis # Importa a biblioteca Redis
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()

# --- Configuração do Redis ---
REDIS_URL = os.getenv("UPSTASH_REDIS_URL")
if not REDIS_URL:
    print("❌ Erro: Variável de ambiente UPSTASH_REDIS_URL não definida.")
    exit(1)

try:
    # Conecta ao Redis usando a URL (funciona bem com Upstash)
    redis_client = redis.from_url(REDIS_URL, decode_responses=True) # decode_responses=True para obter strings
    redis_client.ping() # Testa a conexão
    print("✅ Conectado ao Redis.")
except redis.exceptions.ConnectionError as e:
    print(f"❌ Erro ao conectar ao Redis: {e}")
    exit(1)

# --- Configuração do Flask ---
app = Flask(__name__)

def generate_hash(data: dict) -> str:
    """Gera hash SHA-256 dos dados, garantindo ordem das chaves."""
    json_str = json.dumps(data, sort_keys=True, separators=(',', ':'))
    hash_object = hashlib.sha256(json_str.encode('utf-8'))
    return hash_object.hexdigest()

def save_data_to_redis(payload: dict, data_hash: str) -> bool:
    """
    Salva o payload completo no Redis.
    Usa uma chave combinando um prefixo e o hash dos dados.
    Define um tempo de expiração (TTL) - opcional, mas recomendado.
    """
    try:
        # Chave: "sensor_data:<hash_sha256>"
        redis_key = f"sensor_data:{data_hash}"
        # Valor: O payload completo serializado como JSON string
        redis_value = json.dumps(payload, sort_keys=True)
        
        # Tempo de expiração em segundos (ex: 7 dias). Ajuste conforme necessário.
        # Use -1 para nunca expirar (não recomendado para dados de sensor)
        expiration_seconds = 7 * 24 * 60 * 60 # 7 dias
        
        # Salva no Redis com expiração
        redis_client.setex(redis_key, expiration_seconds, redis_value)
        
        print(f"✅ Dados salvos no Redis com chave: {redis_key} (Expira em {expiration_seconds}s)")
        return True
    except redis.exceptions.RedisError as e:
        print(f"❌ Erro ao salvar dados no Redis: {e}")
        return False
    except Exception as e:
        print(f"❌ Erro inesperado ao serializar/salvar no Redis: {e}")
        return False


# --- Endpoint da API ---
@app.route('/process-data', methods=['POST'])
def process_sensor_data():
    """Recebe dados validados da API Next.js, calcula hash e salva no Redis."""
    if not request.is_json:
        return jsonify({"error": "Requisição deve ser JSON"}), 400

    payload = request.get_json()
    if not payload:
         return jsonify({"error": "Nenhum payload JSON recebido"}), 400

    print("\n📦 Dados recebidos da API Next.js:")
    print(json.dumps(payload, indent=2, sort_keys=True))

    try:
        # 1. Gerar hash (necessário para a chave do Redis e para futura ancoragem Solana)
        data_hash = generate_hash(payload)
        print(f"🔑 Hash SHA-256 gerado: {data_hash}")

        # 2. Salvar dados completos no Redis
        success = save_data_to_redis(payload, data_hash)

        if success:
            # A resposta agora inclui o hash, que é a chave para encontrar os dados no Redis
            return jsonify({
                "message": "Dados processados e salvos no Redis com sucesso.",
                "hash": data_hash, 
                "redis_key": f"sensor_data:{data_hash}" 
            }), 200
        else:
            return jsonify({"error": "Falha ao salvar os dados no Redis."}), 500

    except Exception as e:
        print(f"❌ Erro ao processar dados: {e}")
        return jsonify({"error": "Erro interno do servidor durante o processamento."}), 500

if __name__ == '__main__':
    print("--- Servidor Python de Processamento de Dados IoT (com Redis) ---")
    # Executa o servidor Flask
    app.run(host='0.0.0.0', port=5001, debug=True)