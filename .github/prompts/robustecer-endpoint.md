---
description: Reforça segurança, validação e tratamento de erros em um endpoint já scaffoldado, sem criar camadas.
name: Robustecer-endpoint
argument-hint: caminho do controller (ex. backend/src/controllers/documents.controller.js)
agent: agent
---

# Robustecer Endpoint

Reforce o endpoint existente cujo controller está em `${input:controller:caminho do controller}`. Este prompt é uma etapa posterior ao `scaffold-camada`: ele corrige riscos na implementação existente, não cria a estrutura do recurso.

## Limites de escopo

- Parta do princípio de que a rota e as camadas do endpoint já existem. Inspecione o controller e, somente quando necessário para localizar a validação, o tratamento de erros ou o acesso a arquivos, consulte as rotas, serviços, repositórios, middlewares e configurações diretamente relacionados.
- Altere apenas arquivos existentes diretamente necessários para robustecer esse endpoint. Preserve nomes, contratos HTTP, fluxo `routes -> controllers -> services -> repositories` e convenções atuais do projeto.
- Não crie nem recrie routes, controllers, services, repositories, middlewares, endpoints ou arquivos de scaffold. Não duplique middleware global de erros, configuração do Multer ou lógica que já exista.
- Se o endpoint, a camada ou o middleware necessário não existir, não faça o scaffold. Informe o que está faltando para que `scaffold-camada` seja executado primeiro.
- Evite refatorações não necessárias e não altere endpoints não relacionados.

## Requisitos

- **Segurança de caminhos:** não use o nome original enviado pelo cliente como caminho físico. Use o nome interno gerado pelo servidor e valide que caminhos resolvidos para leitura ou remoção permaneçam dentro de `backend/storage`. Valide IDs e nomes de arquivo nas fronteiras apropriadas; não exponha caminhos locais nas respostas.
- **Validação HTTP:** rejeite arquivo ausente, multipart malformado e campos com tipos ou formatos inválidos na entrada. Use `400` para entrada inválida, `413` para limite excedido e `404` para documento ou arquivo inexistente, respeitando o formato de erro já adotado pelo projeto.
- **Erros assíncronos:** encaminhe falhas para o middleware global existente e evite respostas duplicadas. Use `try/catch` quando necessário para encaminhar rejeições com `next(error)`; siga o comportamento da versão do Express e os padrões existentes.
- **Filesystem e Multer:** em falhas após a gravação, remova apenas arquivos temporários criados pela requisição atual. Preserve o erro original se a limpeza também falhar e não apague arquivos preexistentes. Considere a limpeza já feita pelo Multer para não duplicar operações ou mascarar erros.
- **Verificação:** execute os testes existentes relevantes e relate qualquer risco que permaneça sem cobertura. Não crie uma nova camada nem substitua o trabalho do prompt `gerar-testes`.