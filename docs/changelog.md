# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added
- Configuração do MkDocs para gerar documentação oficial do sistema.
- Tema *Material for MkDocs* implementado.
- Adição da página de *Guia Rápido*, detalhando inicialização via Docker e manual.
- Documentação da API com endpoints principais.
- Explicação da Arquitetura do sistema, fluxos de frontend e backend com mermaid diagram.

### Changed
- Atualização do arquivo `.gitignore` para ignorar a pasta `site/` (build output do MkDocs).

---

## [1.0.0] - 2026-07-28

### Added
- Autenticação com Access e Refresh Token baseada em JWT.
- Módulo de Contas a Pagar/Receber.
- Automação de contas recorrentes por Cron Job.
- Módulo de Orçamentos globais e por categoria.
- Dashboard Realtime (atualizações via WebSocket).
- Upload de anexos em Gastos Diários.
- Gestão de cartões de crédito e Faturas.
- Exportação nativa em formatos PDF e XLSX.
- Sistema inteligente de estorno (reversão ao status Pendente/Aberto).
