// main.js

// ==== CONFIGURAÇÃO DO MUNDO ====
const WORLD_SIZE = 14;      // Tamanho do grid (WORLD_SIZE x WORLD_SIZE)
const NUM_AGENTS = 5;
const NUM_TREES = 18;
const NUM_ROCKS = 8;
const NUM_FOOD = 10;
const TILE = 24;            // Tamanho em px de cada tile (canvas)
const COLORS = {
    agent: "#2ecc40", tree: "#16a085", rock: "#767676", food: "#e67e22",
};

// ==== ESTRUTURA DO MUNDO E AGENTES ====
let world = [];
let agents = [];
let running = false;
let paused = false;
let animationId = null;

// TensorFlow.js — cada agente terá um modelo próprio simples!
function buildModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [9], units: 16, activation: "relu" }));
    model.add(tf.layers.dense({ units: 8, activation: "relu" }));
    model.add(tf.layers.dense({ units: 5, activation: "linear" })); // 5 ações possíveis
    model.compile({ optimizer: tf.train.adam(0.01), loss: "meanSquaredError" });
    return model;
}

// Visão em cruz (posição central + 4 vizinhos)
function getObservation(agent) {
    const dirs = [[0,0], [0,-1], [0,1], [-1,0], [1,0]];
    let obs = [];
    for (let [dx,dy] of dirs) {
        let x = agent.x + dx, y = agent.y + dy;
        if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) {
            obs.push(-1); // parede
        } else {
            obs.push(world[y][x]);
        }
    }
    obs.push(agent.energy / 20);     // Normaliza energia
    obs.push(agent.food / 5);        // Comida pego
    obs.push(Math.random());         // Ruído para explorar
    return obs;
}

// Ações: 0=parado, 1=cima, 2=baixo, 3=esq, 4=dir
function agentStep(agent) {
    if (agent.energy <= 0) return;

    const obs = tf.tensor([getObservation(agent)]);
    const qvals = agent.model.predict(obs).arraySync()[0];
    let action = qvals.indexOf(Math.max(...qvals));
    if (Math.random() < 0.18) {
        action = Math.floor(Math.random() * 5); // Exploração
    }
    obs.dispose();

    let nx = agent.x, ny = agent.y;
    if (action === 1) ny--;
    if (action === 2) ny++;
    if (action === 3) nx--;
    if (action === 4) nx++;

    // Verifica limites do grid
    if (nx < 0 || nx >= WORLD_SIZE || ny < 0 || ny >= WORLD_SIZE) {
        agent.energy -= 0.4;
        return;
    }

    // Interações com o recurso do tile
    const tile = world[ny][nx];
    let reward = -0.04; // custo básico de um passo

    if (tile === 1) { // Árvore — pode coletar
        reward = +2;
        agent.food += 1;
        world[ny][nx] = 0;
    } else if (tile === 2) { // Pedra — não coleta mas pode andar
        reward = -0.3;
    } else if (tile === 3) { // Comida — come
        reward = +4;
        agent.food += 2;
        world[ny][nx] = 0;
    }

    // Move agente
    agent.x = nx;
    agent.y = ny;
    agent.energy += reward;
    if (agent.energy > 20) agent.energy = 20;

    // Treinamento Q-learning simplificado
    const nextObs = tf.tensor([getObservation(agent)]);
    const nextQ = agent.model.predict(nextObs).arraySync()[0];
    const maxNextQ = Math.max(...nextQ);
    nextObs.dispose();
    const target = qvals.slice();
    target[action] = reward + 0.85 * maxNextQ;
    agent.model.fit(tf.tensor([getObservation(agent)]), tf.tensor([target]), { epochs: 1, verbose: 0 });
}

// ==== GERADOR DO MUNDO ====
function resetWorld() {
    // 0: vazio, 1: árvore, 2: pedra, 3: comida
    world = Array(WORLD_SIZE).fill(0).map(() => Array(WORLD_SIZE).fill(0));
    scatter(1, NUM_TREES);
    scatter(2, NUM_ROCKS);
    scatter(3, NUM_FOOD);

    agents = [];
    for (let i = 0; i < NUM_AGENTS; i++) {
        let [x, y] = emptySpot();
        agents.push({
            x, y,
            energy: 12 + Math.random()*8,
            food: 0,
            color: COLORS.agent,
            model: buildModel(),
        });
    }
}

function scatter(type, amount) {
    let cnt = 0;
    while (cnt < amount) {
        let x = Math.floor(Math.random()*WORLD_SIZE);
        let y = Math.floor(Math.random()*WORLD_SIZE);
        if (world[y][x] === 0) {
            world[y][x] = type;
            cnt++;
        }
    }
}
function emptySpot() {
    let x, y;
    do {
        x = Math.floor(Math.random() * WORLD_SIZE);
        y = Math.floor(Math.random() * WORLD_SIZE);
    } while (world[y][x] !== 0);
    return [x, y];
}

// ==== DRAW NO CANVAS ====
function draw() {
    const canvas = document.getElementById("simCanvas");
    const ctx = canvas.getContext("2d");

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mundos
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            if (world[y][x] === 1) drawTile(ctx, x, y, COLORS.tree); // árvore
            if (world[y][x] === 2) drawTile(ctx, x, y, COLORS.rock);
            if (world[y][x] === 3) drawTile(ctx, x, y, COLORS.food);
        }
    }
    // Agentes
    for (let ag of agents) {
        drawAgent(ctx, ag);
    }
}
function drawTile(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
    ctx.strokeStyle="#fff2";
    ctx.strokeRect(x*TILE, y*TILE, TILE, TILE);
}
function drawAgent(ctx, ag) {
    ctx.beginPath();
    ctx.arc(ag.x*TILE+TILE/2, ag.y*TILE+TILE/2, TILE/2.2, 0, 2*Math.PI);
    ctx.fillStyle = ag.color;
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = 2;
    ctx.strokeStyle="#205";
    ctx.stroke();

    // Energia como barra
    ctx.fillStyle="#111";
    ctx.fillRect(ag.x*TILE+4, ag.y*TILE+TILE-5, TILE-8, 3);
    ctx.fillStyle="#0f0";
    let w = (TILE-8) * (ag.energy/20);
    ctx.fillRect(ag.x*TILE+4, ag.y*TILE+TILE-5, w, 3);
}

function drawAll() {
    draw();
    document.getElementById("status").textContent =
      `Agentes vivos: ${agents.filter(a=>a.energy>0).length} | Passo: ${stepCount}`;
}

// ==== LOOP DA SIMULAÇÃO ====
let stepCount = 0;

function simStep() {
    if (!running || paused) return;
    for (let agent of agents) {
        if (agent.energy > 0) agentStep(agent);
    }
    // Regenera recursos
    if (stepCount % 17 === 0 && stepCount > 0) {
        scatter(1, 2); // árvores
        scatter(3, 1); // comida
    }
    drawAll();
    stepCount++;
    animationId = requestAnimationFrame(simStep);
}

// ==== CONTROLES DA UI ====
function setupUI() {
    document.getElementById("startBtn").onclick = () => {
        if (!running) {
            running = true; paused = false;
            stepCount = 1;
            simStep();
        } else {
            paused = false;
        }
    };
    document.getElementById("pauseBtn").onclick = () => {
        paused = true;
        drawAll();
    };
    document.getElementById("resetBtn").onclick = () => {
        if (animationId) cancelAnimationFrame(animationId);
        running = false; paused = false;
        stepCount = 0;
        resetWorld();
        drawAll();
    };
    // Touch control (debug, opcional para mobile)
    document.getElementById("simCanvas").addEventListener("click", function(evt) {
        // Se quiser implementar manipulação manual, adicione aqui (ex: selec/arrasta agente)
    });
}

// ==== INICIALIZAÇÃO ====
document.addEventListener("DOMContentLoaded", ()=> {
    resetWorld();
    setupUI();
    drawAll();
});