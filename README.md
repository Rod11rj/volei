# Escalação da Seleção

<!-- Depois da primeira release, troque XXXXXXX pelo número do concept DOI do Zenodo -->
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXXX)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)

Página web para montar times de vôlei de **4 jogadores** equilibrados em
**número de homens e mulheres** e em **habilidade**.

Você cadastra o elenco uma vez (nome, sexo e nota de 1 a 5), marca quem veio no
dia e a página sorteia times o mais parelhos possível.

## Como usar

1. Na tela de entrada, escolha um lado da quadra: a bola voa até ele. Funciona
   com toque, clique, setas do teclado ou deslizando o dedo.
   - **Convidado (esquerda):** nada é salvo; ao sair ou recarregar, a lista some.
   - **Usuário (direita):** entre com usuário e senha; a lista fica salva.
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

Usuário cadastrado: **viciado** (senha **viciado**).

> **Importante:** o site é estático e não tem servidor, então o login é verificado
> no próprio navegador. Ele separa o modo convidado do modo com lista salva, mas
> **não protege dados**: o código é público e as listas ficam no aparelho de quem
> usa. Pelo mesmo motivo, a lista de um usuário não aparece em outros aparelhos.
> Contas de verdade, sincronizadas entre aparelhos, exigiriam um serviço de
> autenticação externo (por exemplo, Supabase ou Firebase).

As senhas não ficam em texto puro no código: `src/auth.js` guarda o SHA-256 de
`sal:senha`. O comentário no topo desse arquivo mostra como cadastrar outro usuário.

## Como o equilíbrio é calculado

- **Força do jogador:** a nota da mulher vale a própria nota; a do homem é
  multiplicada por um **peso** ajustável (padrão ×1,4). Assim, um homem nota 3
  vale 4,2 pontos e uma mulher nota 3 vale 3.
- **Sexo (regra fixa):** com *H* homens e *T* times, cada time recebe
  ⌊H/T⌋ ou ⌈H/T⌉ homens; o restante das vagas é preenchido por mulheres.
- **Reservas:** se o número de presentes não for múltiplo de 4, quem fica de
  fora é sorteado no grupo (homens ou mulheres) em maior número.
- **Habilidade:** o algoritmo gera 300 montagens aleatórias que respeitam a
  regra de sexo e melhora cada uma por busca local, trocando pares de jogadores
  entre times enquanto a soma dos desvios quadráticos em relação à média
  diminuir. Entre as soluções com diferença até 0,25 ponto da melhor
  encontrada, uma é sorteada, para que os times variem de uma rodada para outra.

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

## Usar e desenvolver

**Só usar:** abra o `index.html` com dois cliques. Não precisa instalar nada.

**Alterar o código** (requer Node.js 20 ou superior):

```bash
npm install        # uma vez: instala o empacotador (esbuild)
npm run build      # depois de alterar src/: gera dist/app.js
npm run watch      # opcional: gera dist/app.js a cada alteração salva
npm test           # roda os testes
```

O código fica em `src/`, dividido em módulos. O navegador não carrega módulos
de páginas abertas direto do disco (`file://`), por isso o `npm run build`
reúne tudo em `dist/app.js`, um script comum que funciona tanto com dois
cliques quanto no GitHub Pages. **Sempre rode `npm run build` e envie o
`dist/app.js` junto** depois de mexer em `src/`.

## Publicar no GitHub Pages

Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta
`/ (root)`. A página fica disponível em `https://<usuario>.github.io/<repositorio>/`.

## Como citar

Se usar este software, cite-o pelo DOI do Zenodo. O botão **Cite this repository**,
na página do repositório no GitHub, gera a referência em APA e BibTeX a partir
do arquivo [`CITATION.cff`](CITATION.cff).

## Licença

Distribuído sob a licença MIT. Veja [`LICENSE`](LICENSE).
