# Sálvia Massoterapia · protótipo

Protótipo da plataforma de agendamento e gestão para massagem a domicílio. **Todos os dados são fictícios.**

## Como testar

Abra o site e use os botões da página inicial, ou entre com:

| Perfil | E-mail | Senha |
|---|---|---|
| Cliente | ana.demo@exemplo.com | demo1234 |
| Administradora | admin@demo.salvia | demo1234 |

Também dá para criar uma conta nova pelo "Criar conta". Use e-mail inventado.

Os dados ficam salvos **no navegador de quem está testando**. Cada pessoa vê a própria cópia. Para voltar ao estado inicial, use "Restaurar dados da demonstração" (página inicial ou Configurações).

## O que tem

**Cliente:** cadastro e login, painel inicial, agendamento com calendário de horários livres, endereço do atendimento, remarcação e cancelamento conforme a regra de antecedência, pedido de alteração, anamnese em 7 etapas com campos condicionais, mapa corporal interativo (frente e costas, vermelho/amarelo, dor ou atenção, borracha, lista das regiões), consentimento LGPD com versão e data, histórico, pacotes, lista de espera, notificações e perfil.

**Administração:** dashboard com indicadores e gráficos, agenda dia/semana/mês, encaixe manual, bloqueio de horários, marcação de realizado/ausência/cancelamento, ficha completa do cliente (anamnese com versões, mapa, histórico, observações privadas, pagamentos, pacotes), serviços, pacotes com alertas, receitas e despesas, relatórios, exportação Excel/CSV, lista de espera, central de notificações, configurações do negócio e da agenda, log de ações.

**Regras de negócio:** disponibilidade calculada a partir de dias, horários, pausas, duração, deslocamento, antecedência, férias e bloqueios. Revalidação no momento da reserva impede vaga duplicada. Sessão de pacote é descontada ao marcar como realizada. Lista de espera é avisada quando abre vaga. Observações profissionais nunca chegam à área do cliente.

## Limitações deste protótipo

- Sem servidor: os dados vivem no `localStorage` do navegador. A versão final usa Supabase (PostgreSQL + Auth + Row Level Security).
- As regras de acesso estão na camada `src/lib/api.ts`, espelhando o que as políticas RLS farão no banco. No protótipo, alguém com conhecimento técnico consegue ler o `localStorage` do próprio navegador. Isso deixa de existir com o backend.
- WhatsApp, e-mail e Google Sheets: **integração pendente**. Os avisos aparecem só dentro do app, marcados como pendentes.
- Recuperação de senha troca a senha direto na tela (na versão final, link por e-mail).
- Valor do pacote familiar adicional (R$ 200) cadastrado como pacote de 4 sessões. Confirmar a regra.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm test         # 28 testes de regras (agenda, permissões, pacotes, anamnese)
npm run build    # build de produção
```

Teste de ponta a ponta (Playwright, Python): `python3 e2e/fluxo_completo.py` com `npx vite preview --port 4173` rodando.

Stack: Vite, React 19, TypeScript, Tailwind CSS, Recharts, SheetJS.
