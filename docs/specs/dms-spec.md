# Especificação - Document Management System

**Status:** especificação do MVP
**Base:** `docs/specs/spec-template.md`

## 1. Objetivo

Entregar uma aplicação web simples para que um usuário local de demonstração possa enviar documentos, consultar os documentos enviados e baixar cada arquivo pelo seu identificador, usando armazenamento local no servidor.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos metadados dos documentos do usuário local de demonstração.
- Download de um documento pelo identificador.
- Gravação dos arquivos em `backend/storage` com Multer e `diskStorage`.
- Metadados mantidos em memória durante a execução do processo.
- Interface React para upload, listagem e download, consumindo a API via `fetch`.
- Tratamento de entradas inválidas, falhas de armazenamento e documentos inexistentes.

### Fora do escopo

- Autenticação, autorização ou isolamento seguro entre usuários. O campo `owner` representa somente o usuário local de demonstração.
- Persistência durável de metadados, banco de dados ou recuperação automática de metadados após reinício.
- Armazenamento externo, em nuvem ou por provedores de upload de terceiros.
- Versionamento, compartilhamento, edição, exclusão e busca avançada de documentos.
- Restrições por extensão ou tipo de conteúdo. O MVP aceita qualquer tipo de arquivo, limitado pelo tamanho máximo.
- Limpeza automática ou recuperação de arquivos que ficaram sem metadados após reinício ou falha.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O sistema deve aceitar o envio de um arquivo por `POST /upload`, usando `multipart/form-data` e o campo `file`. | Uma requisição válida retorna `201` e os metadados do documento criado. |
| RF-02 | O sistema deve rejeitar upload sem arquivo, multipart inválido ou arquivo acima do limite configurado. | Arquivo ausente ou requisição inválida retorna `400`; arquivo acima do limite retorna `413`; nenhum registro de metadados é criado. |
| RF-03 | O sistema deve gerar um identificador e um nome interno de armazenamento no servidor, sem usar o nome enviado pelo cliente como caminho físico. | O identificador é único; nomes contendo caminhos ou caracteres especiais não permitem gravar fora de `backend/storage`. |
| RF-04 | O sistema deve associar os documentos ao usuário local de demonstração, identificado como `demo-user`. | O campo `owner` da resposta contém `demo-user`; não há promessa de autenticação ou segregação de segurança. |
| RF-05 | O sistema deve listar os metadados dos documentos registrados em memória por `GET /documents`. | A resposta contém somente metadados, sem caminhos locais ou conteúdo binário, ordenados do mais recente para o mais antigo. |
| RF-06 | O sistema deve permitir o download de um documento por `GET /documents/:id/download`. | O arquivo é retornado como conteúdo binário, com nome original sugerido no cabeçalho de download. |
| RF-07 | O sistema deve responder com erro previsível para identificador desconhecido ou arquivo local indisponível. | A API retorna `404` sem expor caminhos internos nem stack traces. |
| RF-08 | O sistema deve preservar o endpoint `GET /health`. | O endpoint continua retornando `200` e `{ "status": "ok" }`. |
| RF-09 | A interface deve apresentar estados de carregamento, lista vazia e erro, além de permitir upload, atualização da listagem e download. | O usuário recebe retorno compreensível quando uma operação falha e pode repetir a operação. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos enviados devem ser gravados no filesystem local em `backend/storage`, utilizando Multer com `diskStorage`. Não usar storage em memória do Multer nem serviço externo para armazenar os arquivos. |
| RNF-02 | Os metadados devem ser mantidos em memória nesta fase. Reiniciar o processo apaga os metadados, mesmo que os arquivos continuem no diretório local. |
| RNF-03 | O limite máximo do upload deve ser configurável pela variável `DMS_MAX_FILE_SIZE_MB`, com valor padrão de `10` MB. `PORT` permanece configurável pelo ambiente, com o fallback atual de `3000`. |
| RNF-04 | Downloads devem ser transmitidos a partir do arquivo local, sem carregar desnecessariamente o arquivo inteiro em memória. |
| RNF-05 | A aplicação deve tratar erros nas fronteiras HTTP e de filesystem, retornando mensagens sem detalhes internos do servidor. |
| RNF-06 | O backend deve permanecer em JavaScript/CommonJS, usar Express e Multer disponíveis no projeto e usar `node:test` para testes backend. |
| RNF-07 | O frontend deve permanecer em React/Vite e chamar a API com o prefixo `/api`, conforme o proxy existente. |
| RNF-08 | A solução deve manter responsabilidades pequenas e seguir KISS, YAGNI, SOLID e a separação de camadas definida para o projeto. |

## 5. Modelo de dados

Os metadados são registros em memória durante a vida do processo. O contrato público não deve expor o caminho nem o nome interno do arquivo no filesystem.

| Campo | Tipo | Visibilidade | Descrição |
| --- | --- | --- | --- |
| `id` | string | Público | Identificador único gerado pelo servidor. |
| `originalName` | string | Público | Nome original fornecido no upload, usado como nome sugerido no download e tratado como dado não confiável. |
| `size` | number | Público | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Público | Data e hora do upload em ISO 8601, em UTC. |
| `owner` | string | Público | Identificador fixo `demo-user` no MVP, sem representar autenticação. |
| `mimeType` | string | Público | Tipo informado/detectado no upload, com fallback `application/octet-stream`; não é validação de segurança. |
| `storedFilename` | string | Interno | Nome gerado pelo servidor para o arquivo em `backend/storage`; nunca é aceito do cliente nem retornado pela API. |

Regras do modelo:

- Gerar `id` e `storedFilename` no servidor com mecanismo apropriado para identificadores únicos; eles não devem derivar do nome original.
- Preservar `originalName` apenas como metadado. Ao usá-lo em `Content-Disposition`, codificá-lo de forma compatível com HTTP e evitar injeção de cabeçalhos.
- O repositório mantém um índice em memória por `id`. A ausência desse registro após reinício é esperada nesta fase.
- Se o arquivo for gravado, mas o registro de metadados não puder ser criado, tentar remover o arquivo recém-gravado e retornar erro de armazenamento. A falha de limpeza não deve mascarar o erro original.
- Arquivos remanescentes sem metadados após uma reinicialização são órfãos não listáveis; não há processo de reconciliação no MVP.

## 6. Contratos de API

As rotas do backend são definidas sem prefixo `/api`. No desenvolvimento, o frontend chama `/api/...` e o proxy do Vite remove esse prefixo ao encaminhar a requisição ao backend. Não duplicar `/api` nas rotas Express.

### Formato de erro

Erros da API usam JSON no formato abaixo, salvo no download binário bem-sucedido:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo file."
  }
}
```

`code` é estável para uso pelo frontend; `message` é uma mensagem segura para apresentação. Não retornar stack trace, caminhos locais ou conteúdo de erros internos.

### `POST /upload`

- **Entrada:** `multipart/form-data`, exatamente um arquivo no campo `file`. Qualquer tipo é aceito. O limite é `DMS_MAX_FILE_SIZE_MB`, padrão `10` MB.
- **Sucesso:** `201 Created`, `Content-Type: application/json`.

```json
{
  "document": {
    "id": "<id-gerado>",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-11-11T12:00:00.000Z",
    "owner": "demo-user",
    "mimeType": "application/pdf"
  }
}
```

- **Erros:** `400 Bad Request` para arquivo ausente ou multipart inválido; `413 Payload Too Large` para limite excedido; `500 Internal Server Error` para falha local de gravação ou registro. Usar códigos como `FILE_REQUIRED`, `INVALID_MULTIPART`, `FILE_TOO_LARGE` e `STORAGE_ERROR`.

### `GET /documents`

- **Entrada:** nenhuma.
- **Sucesso:** `200 OK`, `Content-Type: application/json`. Retorna documentos do usuário de demonstração, em ordem decrescente de `uploadedAt`.

```json
{
  "documents": [
    {
      "id": "<id-gerado>",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-11-11T12:00:00.000Z",
      "owner": "demo-user",
      "mimeType": "application/pdf"
    }
  ]
}
```

- **Lista vazia:** `200 OK` com `{ "documents": [] }`.
- Os itens não incluem `storedFilename`, diretório, caminho local ou bytes do arquivo.

### `GET /documents/:id/download`

- **Entrada:** `id` do documento na URL.
- **Sucesso:** `200 OK`, corpo binário; definir `Content-Type` pelo `mimeType` armazenado ou `application/octet-stream` como fallback, e `Content-Disposition: attachment` com o nome original tratado com segurança.
- **Erros:** `404 Not Found` com código `DOCUMENT_NOT_FOUND` quando o id não existe ou o arquivo não está disponível. `500 Internal Server Error` com código `STORAGE_ERROR` para outra falha de leitura. Não incluir caminho local na resposta.

## 7. Decisões arquiteturais

### Backend

Manter a Clean Architecture simples indicada pelo projeto, com direção de dependência `routes -> controllers -> services -> repositories`:

- `routes/`: registra método, caminho e middlewares; delega para controllers.
- `controllers/`: interpreta parâmetros e arquivos recebidos, faz validação HTTP básica e traduz resultados/erros para status e respostas.
- `services/`: concentra regras do caso de uso, associação ao usuário de demonstração, metadados e decisões de negócio.
- `repositories/`: encapsula o índice de metadados em memória e acesso ao filesystem local.
- Multer é middleware de entrada configurado com `diskStorage`, com destino em `backend/storage` e nome físico gerado pelo servidor. Sua configuração não deve mover as regras de negócio para a rota.
- Em caso de falha entre a gravação local e a criação do metadado, o fluxo deve tentar remover o arquivo recém-criado.
- Preservar o endpoint existente `/health` e manter a aplicação exportável para testes.

### Frontend

- Usar componentes funcionais React e manter a organização existente em `components/`, `pages/` e `services/`.
- Centralizar chamadas `fetch` para upload, listagem e download no serviço de API.
- Usar `/api` nas chamadas do frontend; o proxy Vite encaminha ao backend sem esse prefixo.
- Apresentar nome, tamanho e data do documento; não apresentar identificadores internos do filesystem.

### Armazenamento e configuração

- O único destino de arquivos é `backend/storage`; não usar nuvem, banco de dados ou serviço externo.
- Os metadados são voláteis. Após reinício, a listagem começa vazia e arquivos antigos podem permanecer no disco sem referência.
- Configurar porta e limite de upload por variáveis de ambiente, com defaults documentados; não permitir que configuração de caminho habilite armazenamento fora da pasta local prescrita.
- O MVP aceita qualquer tipo de arquivo, mas o limite de tamanho não pode ser desabilitado acidentalmente por configuração inválida; inicialização/configuração deve validar o valor e aplicar o padrão documentado ou falhar claramente.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro para implementar o MVP. **Nesta atividade, somente este documento de especificação deve ser criado; não executar nem alterar arquivos de backend, frontend ou testes.**

1. Revisar e aprovar os contratos, códigos de erro, limite de upload e comportamento de usuário único descritos nesta especificação.
2. Implementar o repositório local de documentos: Multer com `diskStorage` em `backend/storage`, geração de nomes internos, metadados em memória e tratamento de falha/limpeza após erro de registro.
3. Implementar os serviços de upload, listagem e download, mantendo as regras de negócio fora das camadas HTTP e do repositório.
4. Implementar controllers e routes para os três endpoints, preservar `/health` e traduzir erros de Multer, aplicação e filesystem para os contratos definidos.
5. Criar testes backend com `node:test` para upload válido e inválido, limite excedido, listagem vazia e preenchida, download, id/arquivo inexistente e falhas locais; garantir isolamento e limpeza dos arquivos temporários de teste.
6. Implementar o serviço `fetch` e a interface React para enviar, listar e baixar documentos, incluindo estados de carregamento, lista vazia e erro.
7. Validar o build do frontend, a suíte backend e o fluxo integrado via proxy `/api`; confirmar que os arquivos válidos ficam apenas em `backend/storage`.
