# Escalação da Seleção

<!-- Depois da primeira release, troque XXXXXXX pelo número do concept DOI do Zenodo -->
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXXX)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)

Página web para montar times de vôlei de **4 jogadores** equilibrados em
**número de homens e mulheres** e em **habilidade**.


## Como usar

1. Na tela de entrada, escolha um lado da quadra: a bola voa até ele. Funciona
   com toque, clique, setas do teclado ou deslizando o dedo.
   - **Convidado (esquerda):** nada é salvo; ao sair ou recarregar, a lista some.
   - **Usuário (direita):** entre com usuário e senha; a lista fica salva no seu navegador.
2. Cadastre os jogadores. Cada novo jogador já entra marcado como presente.
3. Marque ou desmarque quem veio hoje (botões **Todos** / **Nenhum** ajudam).
4. Toque em **Gerar times**. Cada novo clique gera outra combinação igualmente equilibrada.
5. Se quiser, troque dois jogadores de time tocando em um e depois no outro.
6. **Copiar times** gera um texto pronto para colar no grupo.

## Acesso e armazenamento

| Modo | O que acontece com a lista |
|---|---|
| Convidado | Fica só na memória da página. Recarregar ou sair apaga tudo. |
| Usuário | Fica salva no `localStorage` do navegador, separada por usuário. |

## Como o equilíbrio é calculado

- **Força do jogador:** a nota da mulher vale a própria nota; a do homem é
  multiplicada por um **peso** ajustável (padrão ×1,4). Assim, um homem nota 3
  vale 4,2 pontos e uma mulher nota 3 vale 3.
- **Sexo (regra fixa):** o sistema busca equilibrar a quantidades de homens e mulheres em cada time.
- **Reservas:** se o número de presentes não for múltiplo de 4, quem fica de
  fora é sorteado no grupo (homens ou mulheres) em maior número.


## Estrutura

```
index.html          esqueleto da página (sem estilo nem lógica)
css/styles.css      estilos (tokens, base, layout, componentes)
assets/             ilustração do topo e ícone
src/                código-fonte JavaScript, em módulos:
  main.js             ponto de entrada: sessão → tela de entrada → aplicação
  auth.js             usuários, verificação de senha e sessão
  entry.js            tela de entrada com a quadra e a bola
  app.js              controlador: estado, eventos e renderização
  balancer.js         algoritmo de equilíbrio (puro, sem DOM)
  storage.js          salvamento por usuário (convidado não salva)
  templates.js        geração do HTML a partir dos dados
  utils.js            funções utilitárias
dist/app.js         src/ reunido num único arquivo (gerado; é o que a página carrega)
tests/              testes automatizados (algoritmo, login e salvamento)
CITATION.cff        metadados de citação (GitHub)
.zenodo.json        metadados do registro no Zenodo
CHANGELOG.md        histórico de versões
LICENSE             licença MIT
```



## Como citar

Se usar este software, cite-o pelo DOI do Zenodo. 

## Licença

Distribuído sob a licença MIT. Veja [`LICENSE`](LICENSE).
