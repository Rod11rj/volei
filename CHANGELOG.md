# Histórico de versões

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.1.0] - 2026-11-23

### Adicionado
- Tela de entrada com escolha entre convidado e usuário cadastrado, navegada por uma bola que voa até o lado escolhido da quadra (toque, setas do teclado ou deslizar).
- Login local com o usuário `viciado`; senhas guardadas como hash SHA-256 com sal.
- Lista de jogadores salva por usuário; no modo convidado nada é salvo e a página avisa antes de sair.
- Testes de login e de salvamento.

### Removido
- Backup (copiar e importar) da lista de jogadores.

### Alterado
- A página abre com dois cliques no `index.html`: o código-fonte passou para `src/` e é reunido em `dist/app.js` por `npm run build` (esbuild).
- A lista salva pela versão 1.0.0 passa automaticamente para o primeiro usuário que entrar.

## [1.0.0] - 2026-11-23

### Adicionado
- Cadastro de jogadores com nome, sexo e nota de 1 a 5, salvo no navegador.
- Seleção dos presentes no dia, com busca e marcação em lote.
- Geração de times de 4 equilibrados em sexo e habilidade, com peso ajustável para a nota masculina.
- Escolha de reservas no grupo em maior número quando o total não é múltiplo de 4.
- Troca manual de jogadores entre times e cópia dos times em texto.
- Backup e restauração da lista de jogadores.
- Testes automatizados do algoritmo de equilíbrio.
