# Product

## Register

product

## Users

Agentes de seguro de vida da RICOS, ligados à comunidade brasileira nos EUA
(contratados via Five Rings Financial e Alliance Group). Perfil variado de
idade, não majoritariamente jovem-tech. Uso misto: sessões de análise mais
longas no desktop do escritório, e checagens rápidas no celular em campo
(entre reuniões com cliente, no carro, etc). O sistema precisa funcionar bem
nos dois contextos, não só no desktop.

Três papéis distintos, cada um com um job-to-be-done diferente na mesma tela
compartilhada:
- **Admin**: mantém a hierarquia de agentes, configura planos de comissão,
  importa dados de apólice/comissão via CSV. Trabalho de "acertar os dados",
  precisa de confiança de que a ação teve efeito (feedback claro de
  sucesso/erro por linha).
- **Agente**: consulta o próprio negócio — clientes, apólices, comissão
  (direta e de downline), e onde está na hierarquia. Trabalho de "checar
  minha situação", rápido, sem fricção.
- **Cliente**: só olha as próprias apólices. Uso esporádico, precisa ser
  instantaneamente legível sem nenhum contexto do produto.

## Product Purpose

Fyntra é o sistema interno que dá à RICOS o que nenhuma ferramenta de
mercado (nem concorrentes como SparkLeads) resolve: gestão de hierarquia
multinível de agentes com comissionamento de override, apólices e clientes,
tudo em um só lugar. Sucesso é um agente conseguir responder "quanto vou
receber, de quem, e por quê" em segundos, e um admin conseguir subir um CSV
de comissão sem medo de corromper os números de ninguém.

## Brand Personality

Sério, confiável, direto. É uma ferramenta financeira/de seguradora — a
estética precisa comunicar solidez e precisão, não entretenimento. Sem
gamificação, sem tom "vamos crescer juntos" de CRM de vendas. Confiança vem
de clareza (números certos, hierarquia visível, feedback de erro honesto),
não de polimento decorativo.

## Anti-references

Explicitamente **não** deve parecer um CRM white-label genérico (o padrão
GoHighLevel reskin que produtos como SparkLeads/Brazilionaires usam):
dashboard escuro raso, cards idênticos, botão roxo/azul de SaaS padrão, cara
de "ferramenta de lead gen bonitinha". Fyntra lida com dinheiro real e
estrutura organizacional real — a UI precisa parecer mais próxima de uma
ferramenta de operações financeiras séria do que de um CRM de marketing.

## Design Principles

1. **Números primeiro.** Comissão, hierarquia e status de apólice são a
   razão do produto existir — nunca enterrar esses dados atrás de
   decoração. Hierarquia visual deve refletir importância real do dado.
2. **Erro é informação, não vergonha.** Import de CSV, mudança de hierarquia
   e cálculo de comissão lidam com dinheiro e estrutura organizacional —
   todo erro precisa ser específico (qual linha, o quê, por quê), nunca uma
   mensagem genérica.
3. **Um papel, uma tela sem ruído do resto.** Admin, agente e cliente veem
   a mesma "casa" mas cada um só deveria ver o que é relevante ao seu
   job-to-be-done — nada de navegação ou linguagem que vaze contexto de
   outro papel.
4. **Desktop e mobile são igualmente reais.** Agente em campo no celular não
   é caso secundário — layouts precisam funcionar de verdade nos dois, não
   só ter breakpoint que "não quebra".
5. **Confiança pela clareza, não pelo polimento.** Prefira contraste
   correto, hierarquia tipográfica forte e espaçamento intencional a
   qualquer efeito decorativo (glassmorphism, gradiente, sombra pesada)
   que não carregue informação.

## Accessibility & Inclusion

Padrão razoável: WCAG AA (contraste ≥4.5:1 em texto de corpo, ≥3:1 em texto
grande), navegação completa por teclado, nenhum status (ex: apólice
aprovada/pendente/cancelada) comunicado só por cor — sempre com texto/ícone
também. Sem requisito formal adicional além disso.
