// ====================== CONFIGURAÇÕES ======================
const API_BASE = 'http://localhost:5000/api';
const TELEGRAM_GROUP_URL = 'https://web.telegram.org/a/#-1001234567890'; // Substitua pelo seu grupo
const DEFAULT_API_KEY = 'AIzaSyA9a8QscXbFVLcVn6slY5ddmCHbpmQ5oFY'; // KEY inserida conforme solicitado

// ====================== ESTADO GLOBAL ======================
let currentState = {
    name: '',
    command: '',
    apiKey: DEFAULT_API_KEY,
    isProcessing: false
};

// ===== INICIALIZAÇÃO =====
window.addEventListener('load', () => {
    // Carrega API key salva ou usa DEFAULT_API_KEY
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        document.getElementById('geminiApiKey').value = savedKey;
        currentState.apiKey = savedKey;
    } else {
        // Preenche o input com a key inserida
        const input = document.getElementById('geminiApiKey');
        if (input) input.value = DEFAULT_API_KEY;
    }

    addLog('Sistema iniciado', 'info');
});

// Salva API key ao alterar
const apiInput = document.getElementById('geminiApiKey');
if (apiInput) {
    apiInput.addEventListener('input', (e) => {
        const key = e.target.value.trim();
        currentState.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        addLog('API Key atualizada', 'success');
    });
}

// Enter no input
const nameInputEl = document.getElementById('nameInput');
if (nameInputEl) {
    nameInputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchPerson();
        }
    });
}

// ===== BUSCAR PESSOA =====
async function searchPerson() {
    const nameInput = document.getElementById('nameInput');
    const name = nameInput ? nameInput.value.trim() : '';
    
    if (!name) {
        showStatus('❌ Digite um nome para buscar!', 'error');
        return;
    }
    
    if (!currentState.apiKey) {
        showStatus('❌ Configure sua Gemini API Key primeiro!', 'error');
        return;
    }
    
    currentState.name = name;
    currentState.command = `/nome ${name}`;
    
    addLog(`Iniciando busca: ${name}`, 'info');
    
    // Copia comando para área de transferência
    copyToClipboard(currentState.command);
    
    showStatus(`✅ Comando copiado: ${currentState.command}`, 'success');
    addLog(`Comando copiado: ${currentState.command}`, 'success');
    
    // Abre Telegram
    openTelegram();
    
    // Mostra botão Gemini
    const gemBtn = document.getElementById('geminiBtn');
    if (gemBtn) gemBtn.classList.add('active');
    
    addLog('Telegram aberto. Clique no botão GEMINI quando estiver pronto!', 'info');
}

// ===== COPIAR PARA ÁREA DE TRANSFERÊNCIA =====
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => addLog('Copiado via Clipboard API', 'success'))
            .catch(() => copyFallback(text));
    } else {
        copyFallback(text);
    }
}

function copyFallback(text) {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'absolute';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();
    try { document.execCommand('copy'); addLog('Copiado via fallback', 'success'); }
    catch (e) { addLog('Falha ao copiar via fallback', 'error'); }
    document.body.removeChild(temp);
}

// ===== ABRIR TELEGRAM =====
function openTelegram() {
    const container = document.getElementById('telegramContainer');
    const frame = document.getElementById('telegramFrame');
    if (!container || !frame) { addLog('Container/frame do Telegram não encontrados', 'error'); return; }
    
    frame.src = TELEGRAM_GROUP_URL;
    container.classList.add('active');
    
    showStatus('📱 Telegram Web aberto. Aguarde carregar...', 'loading');
    addLog('Telegram Web carregando...', 'info');
}

function closeTelegram() {
    const container = document.getElementById('telegramContainer');
    if (container) container.classList.remove('active');
    const gemBtn = document.getElementById('geminiBtn');
    if (gemBtn) gemBtn.classList.remove('active');
    addLog('Telegram fechado', 'info');
}

function refreshTelegram() {
    const frame = document.getElementById('telegramFrame');
    if (frame) { frame.src = frame.src; addLog('Telegram atualizado', 'info'); }
}

// ===== ATIVAR GEMINI VISION =====
async function activateGeminiVision() {
    if (currentState.isProcessing) {
        showStatus('⏳ Aguarde o processamento atual terminar', 'loading');
        return;
    }
    
    if (!currentState.apiKey) {
        showStatus('❌ Configure sua Gemini API Key!', 'error');
        return;
    }
    
    currentState.isProcessing = true;
    const gemBtn = document.getElementById('geminiBtn');
    if (gemBtn) gemBtn.disabled = true;
    
    try {
        addLog('🤖 Ativando Gemini Vision...', 'info');
        showStatus('🤖 Gemini Vision ativado! Processando...', 'loading');
        
        addLog('📸 Capturando screenshot da tela...', 'info');
        const screenshot = await captureScreen();
        
        if (!screenshot) throw new Error('Falha ao capturar screenshot');
        addLog('✅ Screenshot capturado', 'success');
        
        addLog('🧠 Analisando tela com Gemini Vision...', 'info');
        const analysis = await analyzeWithGemini(screenshot);
        
        if (!analysis) throw new Error('Gemini não conseguiu analisar');
        addLog('✅ Análise concluída', 'success');
        addLog(`Resultado: ${JSON.stringify(analysis, null, 2)}`, 'data');
        
        await executeActions(analysis);
        
        addLog('⏳ Aguardando resposta do bot (5s)...', 'info');
        showStatus('⏳ Aguardando resposta do QueryBuscasBot...', 'loading');
        await sleep(5000);
        
        addLog('🔍 Procurando arquivo .txt...', 'info');
        await findAndOpenTxt();
        
    } catch (error) {
        showStatus(`❌ Erro: ${error.message}`, 'error');
        addLog(`❌ ERRO: ${error.message}`, 'error');
    } finally {
        currentState.isProcessing = false;
        if (gemBtn) gemBtn.disabled = false;
    }
}

// ===== CAPTURAR SCREENSHOT =====
async function captureScreen() {
    try {
        const response = await fetch(`${API_BASE}/capture-screen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Falha na captura');
        const data = await response.json();
        return data.screenshot;
        
    } catch (error) {
        addLog(`Erro ao capturar: ${error.message}`, 'error');
        return null;
    }
}

// ===== ANALISAR COM GEMINI =====
async function analyzeWithGemini(screenshot) {
    try {
        const response = await fetch(`${API_BASE}/gemini-analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: currentState.apiKey,
                screenshot: screenshot,
                command: currentState.command
            })
        });
        
        if (!response.ok) throw new Error('Falha na análise');
        const data = await response.json();
        return data.analysis;
        
    } catch (error) {
        addLog(`Erro ao analisar: ${error.message}`, 'error');
        return null;
    }
}

// ===== EXECUTAR AÇÕES =====
async function executeActions(analysis) {
    const campo = analysis && analysis.campo_texto ? analysis.campo_texto : { x: 540, y: 2000 };
    const enviar = analysis && analysis.botao_enviar ? analysis.botao_enviar : { x: 1000, y: 2000 };
    
    try {
        addLog(`1️⃣ Clicando no campo (${campo.x}, ${campo.y})`, 'info');
        showStatus('1/3: Clicando no campo de texto...', 'loading');
        
        await fetch(`${API_BASE}/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: campo.x, y: campo.y })
        });
        
        await sleep(1000);
        
        addLog(`2️⃣ Colando comando: ${currentState.command}`, 'info');
        showStatus('2/3: Colando comando...', 'loading');
        
        await fetch(`${API_BASE}/paste`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        await sleep(1000);
        
        addLog(`3️⃣ Clicando em ENVIAR (${enviar.x}, ${enviar.y})`, 'info');
        showStatus('3/3: Enviando comando...', 'loading');
        
        await fetch(`${API_BASE}/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: enviar.x, y: enviar.y })
        });
        
        addLog('✅ Comando enviado com sucesso!', 'success');
        
    } catch (error) {
        throw new Error(`Erro ao executar ações: ${error.message}`);
    }
}

// ===== PROCURAR E ABRIR TXT =====
async function findAndOpenTxt() {
    try {
        const screenshot = await captureScreen();
        if (!screenshot) throw new Error('Falha ao capturar tela');
        
        addLog('🔍 Procurando arquivo .txt com Gemini...', 'info');
        
        const response = await fetch(`${API_BASE}/find-txt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: currentState.apiKey,
                screenshot: screenshot
            })
        });
        
        if (!response.ok) throw new Error('Falha ao procurar arquivo');
        const data = await response.json();
        
        if (data.found) {
            addLog(`✅ Arquivo encontrado: ${data.filename}`, 'success');
            
            await fetch(`${API_BASE}/click`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.coords)
            });
            
            await sleep(2000);
            openTxtViewer(data.content || 'Conteúdo do arquivo será exibido aqui...');
            showStatus('✅ Arquivo aberto com sucesso!', 'success');
            
        } else {
            showStatus('⚠️ Nenhum arquivo .txt encontrado', 'error');
            addLog('⚠️ Arquivo .txt não encontrado na resposta', 'warning');
        }
        
    } catch (error) {
        addLog(`Erro ao procurar arquivo: ${error.message}`, 'error');
        showStatus('⚠️ Erro ao procurar arquivo', 'error');
    }
}

// ===== TXT VIEWER =====
function openTxtViewer(content) {
    const viewer = document.getElementById('txtViewer');
    const txtContent = document.getElementById('txtContent');
    if (!viewer || !txtContent) { addLog('Visualizador TXT não encontrado', 'error'); return; }
    
    txtContent.textContent = content;
    viewer.classList.add('active');
    addLog('📄 Arquivo TXT exibido', 'success');
    closeTelegram();
}

function closeTxtViewer() {
    const viewer = document.getElementById('txtViewer');
    if (viewer) viewer.classList.remove('active');
    addLog('Visualizador TXT fechado', 'info');
}

function copyTxtContent() {
    const contentEl = document.getElementById('txtContent');
    if (!contentEl) return;
    const content = contentEl.textContent;
    copyToClipboard(content);
    showStatus('✅ Conteúdo copiado!', 'success');
    addLog('Conteúdo do TXT copiado', 'success');
}

function downloadTxt() {
    const contentEl = document.getElementById('txtContent');
    if (!contentEl) return;
    const content = contentEl.textContent;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultado_${(currentState.name || 'saida').replace(/ /g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog('Arquivo TXT baixado', 'success');
}

// ===== STATUS =====
function showStatus(message, type) {
    const status = document.getElementById('status');
    if (!status) return;
    status.className = `status-box active ${type}`;
    status.textContent = message;
}

// ===== LOG =====
function addLog(message, type = 'info') {
    const log = document.getElementById('geminiLog');
    const logContent = document.getElementById('logContent');
    if (!log || !logContent) return;
    
    log.classList.add('active');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const timestamp = new Date().toLocaleTimeString();
    
    let icon = '📝';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    if (type === 'info') icon = 'ℹ️';
    if (type === 'data') icon = '📊';
    
    entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${icon} ${message}`;
    logContent.insertBefore(entry, logContent.firstChild);
    logContent.scrollTop = 0;
}

function clearLog() {
    const logContent = document.getElementById('logContent');
    if (!logContent) return;
    logContent.innerHTML = '';
    addLog('Log limpo', 'info');
}

// ===== UTILIDADES =====
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }