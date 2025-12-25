# mundo-2d-ia-tfjs

Simulação de um mundo 2D com agentes inteligentes que aprendem com TensorFlow.js.  
Feito para rodar no navegador e compatível com dispositivos mobile.

## Recursos

- Mundo 2D com árvores, pedras e comida
- Agentes controlados por IA (usando TensorFlow.js: aprendizado por reforço)
- Totalmente responsivo (funciona em smartphones)
- Visualização em tempo real no canvas

## Como usar

1. Acesse a página: *(ative o GitHub Pages na aba Settings > Pages desse repositório)*
2. Ou abra o `index.html` diretamente em seu navegador.

## Estrutura do projeto

- `index.html` — Página principal e elementos da interface
- `main.js` — Código da simulação, lógica do ambiente, agentes e IAs integrados ao TensorFlow.js
- `styles.css` — Visual responsivo para desktop e celular
- `LICENSE` — Licença MIT

## Como funciona

- O mundo é gerado em um grid 2D.
- Agentes (caixinhas coloridas) enxergam ao redor e podem: mover, coletar recursos, buscar comida.
- Cada agente é controlado por uma rede neural simples, aprendendo com TensorFlow.js — cada episódio, eles melhoram suas ações com base nas recompensas (ex: sobreviver, se alimentar).
- Os recursos se regeneram.
- O código é modular para testes e adaptações.

## Créditos

Desenvolvido por Xeting  
Backend de IA: TensorFlow.js  
Simulação e interface: HTML5, JS e CSS3

## Licença

MIT# Xeting-