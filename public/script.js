const API_BASE = '/produtos';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const hoje = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  ['mov-data-inicio', 'mov-data-fim', 'saidas-data-inicio', 'saidas-data-fim'].forEach(id => {
    const campo = document.getElementById(id);
    if (campo) campo.value = hoje;
  });
  verificarConexao();
  carregarProdutos();
  carregarValorTotal();
});

async function verificarConexao() {
  const status = document.getElementById('conexao-status');
  if (!status) return;
  try {
    const response = await fetch('/health');
    const result = await response.json();
    status.textContent = response.ok && result.database === 'connected'
      ? 'Banco conectado'
      : 'Banco indisponivel. Confira DATABASE_URL e o estado do Neon.';
    status.dataset.status = response.ok ? 'ok' : 'error';
  } catch (error) {
    status.textContent = 'Nao foi possivel consultar o estado do banco.';
    status.dataset.status = 'error';
  }
}

// Navegação entre abas
function switchTab(tabId, button) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.style.display = 'none');

  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => btn.classList.remove('active'));

  const selectedTab = document.getElementById(tabId);
  if (selectedTab) selectedTab.style.display = 'block';

  if (button) button.classList.add('active');

  // Ações de recarga por aba
  if (tabId === 'produtos-tab') {
    carregarProdutos();
    carregarValorTotal();
  } else if (tabId === 'movimentacoes-tab') {
    buscarMovimentacoes();
  } else if (tabId === 'relatorios-tab') {
    carregarLimites();
    carregarSaidasHoje();
    buscarMaioresSaidas();
  }
}

// 1. Listar Produtos
async function carregarProdutos() {
  const tbody = document.getElementById('produtos-table-body');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/listar`);
    if (!res.ok) throw new Error('Erro ao listar produtos');

    const produtos = await res.json();
    tbody.innerHTML = '';

    if (produtos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum produto cadastrado.</td></tr>';
      return;
    }

    produtos.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${escapeHtml(p.nome)}</td>
        <td>${escapeHtml(p.categoria || '-')}</td>
        <td>${escapeHtml(p.unidade_medida || '-')}</td>
        <td>${p.quantidade}</td>
        <td>R$ ${Number(p.valor).toFixed(2)}</td>
        <td>
          <button type="button" class="btn-sm" onclick="selecionarProdutoEntrada(${Number(p.id)})">Entrada</button> <button type="button" class="btn-sm" onclick="selecionarProdutoSaida(${Number(p.id)})">Saida</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Erro ao carregar produtos.</td></tr>';
  }
}

// 2. Total por Categoria
async function carregarValorTotal() {
  const container = document.getElementById('categoria-totals');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/valor-total`);
    if (!res.ok) throw new Error('Erro ao buscar totais por categoria');

    const dados = await res.json();
    if (dados.length === 0) {
      container.innerHTML = '<p>Nenhum dado disponível.</p>';
      return;
    }

    container.innerHTML = dados.map(item => `
      <p><strong>${escapeHtml(item.categoria || 'Sem categoria')}:</strong> R$ ${Number(item.valor_total || 0).toFixed(2)}</p>
    `).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Erro ao carregar resumo.</p>';
  }
}

// 3. Registrar Entrada no Estoque
async function confirmarEntrada(event) {
  event.preventDefault();

  const id = document.getElementById('entrada-id').value;
  const quantidade = document.getElementById('entrada-qtd').value;

  try {
    const res = await fetch(`${API_BASE}/entrada`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(id), quantidade: Number(quantidade) })
    });

    const data = await res.json();

    if (res.ok) {
      alert('Entrada efetuada com sucesso!');
      document.getElementById('form-entrada').reset();
      carregarProdutos();
      carregarValorTotal();
    } else {
      alert(data.error || 'Erro ao registrar entrada.');
    }
  } catch (err) {
    console.error(err);
    alert('Erro de conexão com o servidor.');
  }
}

function selecionarProdutoEntrada(id) {
  const inputId = document.getElementById('entrada-id');
  if (inputId) {
    inputId.value = id;
    inputId.focus();
  }
}

function selecionarProdutoSaida(id) {
  const campo = document.getElementById('saida-id');
  if (campo) { campo.value = id; campo.focus(); }
}

async function confirmarSaida(event) {
  event.preventDefault();
  const id = Number(document.getElementById('saida-id').value);
  const quantidade = Number(document.getElementById('saida-qtd').value);
  try {
    const res = await fetch(API_BASE + '/saida', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, quantidade })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao registrar saida.');
    alert(data.message || 'Saida registrada com sucesso!');
    document.getElementById('form-saida').reset();
    carregarProdutos();
    carregarValorTotal();
  } catch (err) {
    console.error(err);
    alert(err.message || 'Erro de conexao com o servidor.');
  }
}

// 4. Cadastrar Novo Produto
async function cadastrarProduto(event) {
  event.preventDefault();

  const nome = document.getElementById('cad-nome').value;
  const categoria = document.getElementById('cad-categoria').value;
  const unidade_medida = document.getElementById('cad-medida').value;
  const quantidade = document.getElementById('cad-qtd').value;
  const valor = document.getElementById('cad-valor').value;

  try {
    const res = await fetch(`${API_BASE}/cadastrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        categoria,
        unidade_medida,
        quantidade: Number(quantidade),
        valor: Number(valor)
      })
    });

    const data = await res.json();

    if (res.ok) {
      alert('Produto cadastrado com sucesso!');
      document.getElementById('form-cadastro').reset();
      switchTab('produtos-tab', document.querySelector('.nav-btn'));
    } else {
      alert(data.error || 'Erro ao cadastrar produto.');
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao conectar com o servidor.');
  }
}

// 5. Movimentações por Período
async function buscarMovimentacoes() {
  const dataInicial = document.getElementById('mov-data-inicio').value;
  const dataFinal = document.getElementById('mov-data-fim').value;
  const tbody = document.getElementById('movimentacoes-table-body');

  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/movimentacoes?data_inicial=${dataInicial}&data_final=${dataFinal}`);
    if (!res.ok) throw new Error('Erro ao buscar movimentações');

    const dados = await res.json();
    tbody.innerHTML = '';

    if (dados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma movimentação no período.</td></tr>';
      return;
    }

    dados.forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(m.nome_do_produto)}</td>
        <td>${escapeHtml(m.unidade_medida)}</td>
        <td>${m.total_de_entradas}</td>
        <td>${m.total_de_saidas}</td>
        <td>${m.saida_no_periodo}</td>
        <td>R$ ${Number(m.valor_total_financeiro_das_entradas).toFixed(2)}</td>
        <td>R$ ${Number(m.valor_financeiro_das_saidas).toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Erro ao buscar movimentações.</td></tr>';
  }
}

// 6. Limites Alerta
async function carregarLimites() {
  const lista = document.getElementById('limites-lista');
  if (!lista) return;

  try {
    const res = await fetch(`${API_BASE}/limites`);
    if (!res.ok) throw new Error('Erro ao buscar alertas');

    const dados = await res.json();
    lista.innerHTML = '';

    if (dados.length === 0) {
      lista.innerHTML = '<li>Nenhum produto fora dos limites.</li>';
      return;
    }

    dados.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${escapeHtml(item.nome)}</strong>: Qtd Atual ${item.quantidade}`;
      lista.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    lista.innerHTML = '<li>Erro ao carregar limites.</li>';
  }
}

async function carregarSaidasHoje() {
  const lista = document.getElementById('saidas-lista');
  if (!lista) return;
  try {
    const response = await fetch(API_BASE + '/saidas?hoje=true');
    if (!response.ok) throw new Error('Request failed');
    const rows = await response.json();
    lista.innerHTML = '';
    if (!rows.length) { lista.innerHTML = '<li>Nenhuma saida registrada hoje.</li>'; return; }
    rows.forEach(row => {
      const item = document.createElement('li');
      item.textContent = 'Produto #' + row.produtos_id + ': ' + row.quantidade + ' un - ' + row.datas;
      lista.appendChild(item);
    });
  } catch (error) {
    lista.innerHTML = '<li>Erro ao carregar saidas do dia.</li>';
  }
}

// 7. Maiores Saídas
async function buscarMaioresSaidas() {
  const dataInicial = document.getElementById('saidas-data-inicio').value;
  const dataFinal = document.getElementById('saidas-data-fim').value;
  const lista = document.getElementById('maiores-saidas-lista');

  if (!lista) return;

  try {
    const res = await fetch(`${API_BASE}/maiores-saidas?data_inicial=${dataInicial}&data_final=${dataFinal}`);
    if (!res.ok) throw new Error('Erro ao buscar maiores saídas');

    const dados = await res.json();
    lista.innerHTML = '';

    if (dados.length === 0) {
      lista.innerHTML = '<li>Nenhuma saída registrada no período.</li>';
      return;
    }

    dados.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${escapeHtml(item.nome_do_produto)}</strong>: ${item.quantidade_total_de_saidas} un (R$ ${Number(item.valor_total_financeiro_das_saidas).toFixed(2)})`;
      lista.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    lista.innerHTML = '<li>Erro ao carregar maiores saídas.</li>';
  }
}