"""Nível 2, caminho B: gera imagem ou vídeo na Higgsfield Cloud API com a sua API key.

Uso:
    python tools/hf_api.py <modelo> <argumentos.json ou JSON direto> <pasta de saída>

Exemplo:
    python tools/hf_api.py bytedance/seedream/v4/text-to-image '{"prompt": "paper-cut desk", "resolution": "2K", "aspect_ratio": "16:9"}' "projetos/001. meu-video/hf"

Credenciais (criadas em https://cloud.higgsfield.ai), numa variável de ambiente, nunca em arquivo do repositório:
    HF_KEY="sua-api-key:seu-api-secret"      ou      HF_API_KEY=... e HF_API_SECRET=...
Instalação do SDK oficial: pip install higgsfield-client
"""

import json
import sys
import urllib.request
from pathlib import Path

import higgsfield_client


# ponytail: baixa toda URL http do resultado, porque o formato da resposta muda de modelo para modelo.
def urls(x):
    if isinstance(x, dict):
        for v in x.values():
            yield from urls(v)
    elif isinstance(x, list):
        for v in x:
            yield from urls(v)
    elif isinstance(x, str) and x.startswith("http"):
        yield x


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    modelo, bruto, saida = sys.argv[1], sys.argv[2], Path(sys.argv[3])
    argumentos = json.loads(Path(bruto).read_text(encoding="utf-8") if Path(bruto).is_file() else bruto)
    saida.mkdir(parents=True, exist_ok=True)

    resultado = higgsfield_client.subscribe(modelo, arguments=argumentos)
    (saida / "ultimo-resultado.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=1), encoding="utf-8")

    for i, url in enumerate(urls(resultado)):
        extensao = Path(url.split("?")[0]).suffix or ".bin"
        destino = saida / f"{modelo.replace('/', '_')}_{i}{extensao}"
        urllib.request.urlretrieve(url, destino)
        print(destino)


if __name__ == "__main__":
    main()
