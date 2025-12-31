// main.js - Simulação de Agentes IA com TensorFlow.js
// Versão: 2.0 - Otimizada com melhor gerenciamento de memória e estrutura modular

// ==================== CONFIGURAÇÃO DO MUNDO ====================
const CONFIG = {
    WORLD_SIZE: 14,
    NUM_AGENTS: 5,
    NUM_TREES: 18,
    NUM_ROCKS: 8,
    NUM_FOOD: 10,
    TILE: 24,
    MAX_ENERGY: 20,
    INITIAL_ENERGY: [12, 8], // [mínimo, máximo]
};

const COLORS = {
    agent: "#2ecc40",
    tree: "#16a085",
    rock: "#767676",
    food: "#e67e22",
};

const TILE_TYPES = {
    EMPTY: 0,
    TREE: 1,
    ROCK: 2,
    FOOD: 3,
};

// ==================== ESTADO GLOBAL ====================
const STATE = {
    world: [],
    agents: [],
    running: false,
    paused: false,
    animationId: null,
    stepCount: 0,
};

// ==================== CONSTRUÇÃO DO MODELO IA ====================
/**
 * Cria um modelo de rede neural simples para Q-Learning
 * Entrada: 9 observações (visão em cruz + energia + comida + ruído)
 * Saída: 5 ações possíveis (parado, cima, baixo, esquerda, direita)
 */
function buildModel() {
    try {
        const model = tf.sequential({
            layers: [
                tf.layers.dense({
                    inputShape: [9],
                    units: 16,
                    activation: 'relu',
                    kernelInitializer: 'glorotUniform'
                }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({
                    units: 8,
                    activation: 'relu',
                    kernelInitializer: 'glorotUniform'
                }),
                tf.layers.dense({
                    units: 5,
                    activation: 'linear'
                })
            ]
        });

        model.compile({
            optimizer: tf.train.adam(0.01),
            loss: 'meanSquaredError'
        });

        return model;
    } catch (error) {
        console.error('❌ Erro ao construir modelo:', error);
        return null;
    }
}

// ==================== OBSERVAÇÃO E PERCEPÇÃO ====================
/**
 * Obtém observação da posição atual do agente
 * Usa visão em cruz (5 pontos: centro + 4 vizinhos)
 * Normaliza energia e comida para [0, 1]
 */
function getObservation(agent) {
    try {
        if (!agent) throw new Error('Agente inválido');

        const directions = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]];
        const observation = [];

        // Visão em cruz
        for (const [dx, dy] of directions) {
            const x = agent.x + dx;
            const y = agent.y + dy;

            if (x < 0 || y < 0 || x >= CONFIG.WORLD_SIZE || y >= CONFIG.WORLD_SIZE) {
                observation.push(-1); // parede
            } else {
                observation.push(STATE.world[y][x]);
            }
        }

        // Normaliza valores
        observation.push(agent.energy / CONFIG.MAX_ENERGY);
        observation.push(agent.food / 5);
        observation.push(Math.random()); // ruído para exploração

        return observation;
    } catch (error) {
        console.error('❌ Erro ao obter observação:', error);
        return new Array(9).fill(0);
    }
}

// ==================== LÓGICA DE MOVIMENTO ====================
/**
 * Executa um passo do agente:
 * 1. Observa ambiente
 * 2. Escolhe ação (exploração vs exploitação)
 * 3. Move ou interage
 * 4. Atualiza energia e aprende
 */
function agentStep(agent) {
    try {
        // Verifica se agente está vivo
        if (agent.energy <= 0) {
            agent.alive = false;
            return;
        }

        // Observação e predição
        const observation = getObservation(agent);
        const obsTensor = tf.tensor2d([observation]);
        const qValuesTensor = agent.model.predict(obsTensor);
        const qValues = qValuesTensor.dataSync();
        let action = argmax(Array.from(qValues));

        // Exploração vs Exploitação (epsilon-greedy)
        const epsilon = 0.18;
        if (Math.random() < epsilon) {
            action = Math.floor(Math.random() * 5);
        }

        // Libera tensores
        obsTensor.dispose();
        qValuesTensor.dispose();

        // Calcula nova posição
        let newX = agent.x;
        let newY = agent.y;

        switch (action) {
            case 1: newY--; break; // cima
            case 2: newY++; break; // baixo
            case 3: newX--; break; // esquerda
            case 4: newX++; break; // direita
        }

        // Verifica limites
        if (newX < 0 || newX >= CONFIG.WORLD_SIZE || newY < 0 || newY >= CONFIG.WORLD_SIZE) {
            agent.energy -= 0.4;
            return;
        }

        // Interação com tile e recompensa
        const tile = STATE.world[newY][newX];
        let reward = -0.04; // custo de movimento

        if (tile === TILE_TYPES.TREE) {
            reward = 2;
            agent.food += 1;
            STATE.world[newY][newX] = TILE_TYPES.EMPTY;
        } else if (tile === TILE_TYPES.ROCK) {
            reward = -0.3;
        } else if (tile === TILE_TYPES.FOOD) {
            reward = 4;
            agent.food += 2;
            STATE.world[newY][newX] = TILE_TYPES.EMPTY;
        }

        // Atualiza posição e energia
        agent.x = newX;
        agent.y = newY;
        agent.energy += reward;
        agent.energy = Math.min(agent.energy, CONFIG.MAX_ENERGY);

        // Treinamento Q-Learning
        trainAgent(agent, observation, action, reward, getObservation(agent));

    } catch (error) {
        console.error('❌ Erro no passo do agente:', error);
    }
}

/**
 * Encontra o índice do valor máximo em um array
 */
function argmax(array) {
    return array.reduce((maxIdx, val, idx, arr) => 
        val > arr[maxIdx] ? idx : maxIdx, 0
    );
}

/**
 * Treina o agente usando Q-Learning
 */
function trainAgent(agent, observation, action, reward, nextObservation) {
    try {
        const obsTensor = tf.tensor2d([observation]);
        const nextObsTensor = tf.tensor2d([nextObservation]);

        const qValues = agent.model.predict(obsTensor).dataSync();
        const nextQValues = agent.model.predict(nextObsTensor).dataSync();
        const maxNextQ = Math.max(...Array.from(nextQValues));

        const target = Array.from(qValues);
        target[action] = reward + 0.85 * maxNextQ;

        // Treina modelo
        agent.model.fit(obsTensor, tf.tensor2d([target]), {
            epochs: 1,
            verbose: 0
        }).then(() => {
            obsTensor.dispose();
            nextObsTensor.dispose();
        }).catch(error => {
            console.error('❌ Erro no treinamento:', error);
            obsTensor.dispose();
            nextObsTensor.dispose();
        });

    } catch (error) {
        console.error('❌ Erro ao treinar agente:', error);
    }
}

// ==================== GERAÇÃO DO MUNDO ====================
/**
 * Reseta o mundo e cria novos agentes
 */
function resetWorld() {
    try {
        // Limpa tensores antigos
        STATE.agents.forEach(agent => {
            if (agent.model) {
                agent.model.dispose();
            }
        });

        // Cria grid vazio
        STATE.world = Array(CONFIG.WORLD_SIZE)
            .fill(0)
            .map(() => Array(CONFIG.WORLD_SIZE).fill(TILE_TYPES.EMPTY));

        // Distribui recursos
        scatter(TILE_TYPES.TREE, CONFIG.NUM_TREES);
        scatter(TILE_TYPES.ROCK, CONFIG.NUM_ROCKS);
        scatter(TILE_TYPES.FOOD, CONFIG.NUM_FOOD);

        // Cria agentes
        STATE.agents = [];
        for (let i = 0; i < CONFIG.NUM_AGENTS; i++) {
            const [x, y] = findEmptySpot();
            const energy = CONFIG.INITIAL_ENERGY[0] + Math.random() * CONFIG.INITIAL_ENERGY[1];

            STATE.agents.push({
                id: i,
                x,
                y,
                energy,
                food: 0,
                color: COLORS.agent,
                model: buildModel(),
                alive: true
            });
        }

        STATE.stepCount = 0;
    } catch (error) {
        console.error('❌ Erro ao resetar mundo:', error);
    }
}

/**
 * Distribui recursos aleatoriamente no mapa
 */
function scatter(type, amount) {
    let count = 0;
    let attempts = 0;
    const maxAttempts = amount * 10;

    while (count < amount && attempts < maxAttempts) {
        const x = Math.floor(Math.random() * CONFIG.WORLD_SIZE);
        const y = Math.floor(Math.random() * CONFIG.WORLD_SIZE);

        if (STATE.world[y][x] === TILE_TYPES.EMPTY) {
            STATE.world[y][x] = type;
            count++;
        }
        attempts++;
    }
}

/**
 * Encontra um espaço vazio no mapa
 */
function findEmptySpot() {
    let x, y;
    do {
        x = Math.floor(Math.random() * CONFIG.WORLD_SIZE);
        y = Math.floor(Math.random() * CONFIG.WORLD_SIZE);
    } while (STATE.world[y][x] !== TILE_TYPES.EMPTY);
    return [x, y];
}

// ==================== RENDERIZAÇÃO ====================
/**
 * Renderiza o mundo no canvas
 */
function draw() {
    try {
        const canvas = document.getElementById('simCanvas');
        if (!canvas) throw new Error('Canvas não encontrado');

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Contexto 2D não disponível');

        // Limpa canvas
        ctx.fillStyle = '#f7fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Desenha tiles
        for (let y = 0; y < CONFIG.WORLD_SIZE; y++) {
            for (let x = 0; x < CONFIG.WORLD_SIZE; x++) {
                const tile = STATE.world[y][x];
                let color = null;

                if (tile === TILE_TYPES.TREE) color = COLORS.tree;
                else if (tile === TILE_TYPES.ROCK) color = COLORS.rock;
                else if (tile === TILE_TYPES.FOOD) color = COLORS.food;

                if (color) drawTile(ctx, x, y, color);
            }
        }

        // Desenha agentes
        STATE.agents.forEach(agent => {
            if (agent.alive) drawAgent(ctx, agent);
        });

    } catch (error) {
        console.error('❌ Erro ao desenhar:', error);
    }
}

/**
 * Desenha um tile no mapa
 */
function drawTile(ctx, x, y, color) {
    const px = x * CONFIG.TILE;
    const py = y * CONFIG.TILE;

    ctx.fillStyle = color;
    ctx.fillRect(px, py, CONFIG.TILE, CONFIG.TILE);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, CONFIG.TILE, CONFIG.TILE);
}

/**
 * Desenha um agente com barra de energia
 */
function drawAgent(ctx, agent) {
    const centerX = agent.x * CONFIG.TILE + CONFIG.TILE / 2;
    const centerY = agent.y * CONFIG.TILE + CONFIG.TILE / 2;
    const radius = CONFIG.TILE / 2.2;

    // Círculo do agente
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = agent.color;
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#205';
    ctx.stroke();

    // Barra de energia
    const barY = agent.y * CONFIG.TILE + CONFIG.TILE - 5;
    const barWidth = CONFIG.TILE - 8;
    const barX = agent.x * CONFIG.TILE + 4;

    ctx.fillStyle = '#111';
    ctx.fillRect(barX, barY, barWidth, 3);

    ctx.fillStyle = '#0f0';
    const energyWidth = barWidth * (agent.energy / CONFIG.MAX_ENERGY);
    ctx.fillRect(barX, barY, energyWidth, 3);
}

/**
 * Atualiza e desenha tudo
 */
function updateDisplay() {
    draw();
    updateStatus();
}

/**
 * Atualiza o status da simulação
 */
function updateStatus() {
    try {
        const statusEl = document.getElementById('status');
        if (!statusEl) return;

        const aliveCount = STATE.agents.filter(a => a.alive && a.energy > 0).length;
        statusEl.textContent = `Agentes vivos: ${aliveCount} | Passo: ${STATE.stepCount}`;
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
    }
}

// ==================== LOOP DE SIMULAÇÃO ====================
/**
 * Loop principal da simulação
 */
function simulationStep() {
    if (!STATE.running || STATE.paused) return;

    // Executa passo de cada agente
    STATE.agents.forEach(agent => {
        if (agent.alive && agent.energy > 0) {
            agentStep(agent);
        }
    });

    // Regenera recursos periodicamente
    if (STATE.stepCount % 17 === 0 && STATE.stepCount > 0) {
        scatter(TILE_TYPES.TREE, 2);
        scatter(TILE_TYPES.FOOD, 1);
    }

    updateDisplay();
    STATE.stepCount++;

    STATE.animationId = requestAnimationFrame(simulationStep);
}

// ==================== INTERFACE DO USUÁRIO ====================
/**
 * Configura os botões e eventos
 */
function setupUI() {
    try {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        const canvas = document.getElementById('simCanvas');

        if (!startBtn || !pauseBtn || !resetBtn || !canvas) {
            throw new Error('Elementos da UI não encontrados');
        }

        startBtn.addEventListener('click', () => {
            if (!STATE.running) {
                STATE.running = true;
                STATE.paused = false;
                simulationStep();
            } else {
                STATE.paused = false;
            }
        });

        pauseBtn.addEventListener('click', () => {
            STATE.paused = true;
            updateDisplay();
        });

        resetBtn.addEventListener('click', () => {
            if (STATE.animationId) {
                cancelAnimationFrame(STATE.animationId);
            }
            STATE.running = false;
            STATE.paused = false;
            resetWorld();
            updateDisplay();
        });

        // Acessibilidade: teclas de atalho
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                STATE.paused ? (STATE.paused = false, simulationStep()) : (STATE.paused = true);
            }
        });

    } catch (error) {
        console.error('❌ Erro ao configurar UI:', error);
    }
}

// ==================== INICIALIZAÇÃO ====================
/**
 * Inicializa a aplicação quando o DOM está pronto
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Verifica se TensorFlow está disponível
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js não foi carregado');
        }

        resetWorld();
        setupUI();
        updateDisplay();

        console.log('✅ Simulação iniciada com sucesso!');
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        alert('Erro ao inicializar a aplicação: ' + error.message);
    }
});