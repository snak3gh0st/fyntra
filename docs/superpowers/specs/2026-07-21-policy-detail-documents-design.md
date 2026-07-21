# Policy Detail Page + Documents — Design

## Contexto

Primeiro de cinco sub-projetos da fase de "análise de apólices" pedida pelo
usuário (ordem acordada: 1. Detalhe de apólice → 2. Dashboard de carteira →
3. Alertas de risco → 4. Comparação entre agentes (admin) → 5. Motor de
illustration Term/Final Expense). Este spec cobre só o item 1.

Hoje uma apólice só aparece como linha de tabela (`/agent/policies`,
`/client`). Não existe página de detalhe, não existe histórico de status
(só o status atual), e não existe upload/armazenamento de documento.

## Escopo

1. **Modelo de dados novo**: `PolicyDocument`.
2. **Storage de arquivo**: volume persistente no Coolify (não disco efêmero
   do container — o app já foi reconstruído várias vezes nesta sessão e um
   disco comum perderia tudo a cada deploy).
3. **Upload**: admin ou agente dono/upline da apólice.
4. **Download**: com checagem de acesso — agente (própria apólice/downline),
   admin (qualquer uma), cliente (só leitura, só a própria apólice).
5. **Páginas**: `/agent/policies/[id]` (agente/admin) e
   `/client/policies/[id]` (cliente, só leitura).

**Fora de escopo deste sub-projeto**: timeline de mudança de status (não
existe fonte de dado — ficaria pra uma fase futura que adicionar histórico
de status como sua própria mudança de schema).

## Modelo de dados

```prisma
model PolicyDocument {
  id             String   @id @default(cuid())
  policyId       String
  policy         Policy   @relation(fields: [policyId], references: [id])
  filename       String
  storedPath     String
  mimeType       String
  sizeBytes      Int
  uploadedById   String
  uploadedBy     User     @relation(fields: [uploadedById], references: [id])
  createdAt      DateTime @default(now())

  @@index([policyId])
}
```

`Policy` ganha `documents PolicyDocument[]`. `User` ganha
`uploadedDocuments PolicyDocument[]`.

## Storage

- Variável de ambiente `UPLOADS_DIR` (default `/data/uploads` em produção,
  `./uploads` local — adicionar ao `.gitignore`).
- Arquivo salvo em `${UPLOADS_DIR}/policies/<policyId>/<uuid>-<nome-original-sanitizado>`.
- `storedPath` no banco guarda o caminho relativo a `UPLOADS_DIR` (não o
  caminho absoluto — portável entre ambientes).
- Tipo aceito: `application/pdf`, `image/png`, `image/jpeg`. Limite de
  tamanho: 10 MB.
- Deploy: `docker-compose.yaml` em produção ganha um volume nomeado
  montado em `/data/uploads`, e `Dockerfile`/env ganham `UPLOADS_DIR=/data/uploads`.
  Isso é uma mudança de infra fora do código do app — documentada no plano
  como um passo manual de deploy, não algo que o app builda sozinho.

## Controle de acesso

- Upload (server action): `requireRole('ADMIN', 'AGENT')`. Se `AGENT`,
  verifica que `policy.agentId` está em `[agent.id, ...downlineIds]` antes
  de aceitar o upload.
- Download (route handler `/api/documents/[id]`): resolve o
  `PolicyDocument` → `Policy` → checa o papel da sessão:
  - `ADMIN`: sempre pode.
  - `AGENT`: `policy.agentId` precisa estar no escopo do agente (self+downline).
  - `CLIENT`: `policy.clientId` precisa ser o cliente da sessão.
  - Caso contrário: 403, nunca serve o arquivo.
- Nunca expor `storedPath` bruto no HTML — sempre servir via essa rota
  autenticada, nunca um link direto de arquivo estático.

## Páginas

### `/agent/policies/[id]` (agente/admin)

- Cabeçalho: nº apólice, carrier, produto, prêmio, valor de face, status
  (pill), data de vigência.
- Cliente vinculado (nome, email).
- Extrato de comissão gerada por essa apólice: todos os `CommissionRecord`
  dessa `policyId`, incluindo de que agente (útil pro admin/upline ver quem
  recebeu o quê).
- Documentos: lista com nome/tamanho/data + link de download (via rota
  autenticada) + formulário de upload.
- Link "← Voltar" pra `/agent/policies`.

### `/client/policies/[id]` (cliente)

- Mesmo cabeçalho, sem comissão (cliente nunca vê valor de comissão).
- Documentos: lista + download, sem upload.

### Navegação

`/agent/policies` e `/client` (lista) ganham link por linha pra o detalhe
(`Ver detalhes` ou o próprio número da apólice vira link).

## Testes

- Lógica de escopo de acesso ao documento (agente self+downline, cliente
  próprio, admin tudo) é a parte não-trivial — ganha teste unitário puro
  (função `canAccessPolicy(role, sessionUserContext, policy)` extraída,
  testável sem DB).
- Upload/download em si (I/O de arquivo) verificado manualmente, mesma
  limitação de sandbox das fases anteriores.

## Auto-revisão

Sem placeholder, sem TBD. Escopo consistente com a decisão do usuário
(quer documentos já nesta fase, volume persistente no Coolify). Não inclui
timeline de status (explicitamente fora de escopo, motivo declarado).
