const API_BASE = '/produtos';

document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos();
  carregarValorTotal();
});

// Navegação entre abas
function switchTab(tabId) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.style.display = 'none');

  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => btn.classList.remove('active'));

  const selectedTab = document.getElementById(tabId);
  if (selectedTab) selectedTab.style.display = 'block';

  if (event && event.target) {
    event.target.classList.add('active');
  }

  // Ações de recarga por aba
  if (tabId === 'produtos-tab') {
    carregarProdutos();
    carregarValorTotal();
  } else if (tabId === 'movimentacoes-tab') {
    buscarMovimentacoes();
  } else if (tabId === 'relatorios-tab') {
    carregarLimites();
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
        <td>${p.nome}</td>
        <td>${p.categoria || '-'}</td>
        <td>${p.unidade_medida || '-'}</td>
        <td>${p.quantidade}</td>
        <td>R$ ${Number(p.valor).toFixed(2)}</td>
        <td>
          <button type="button" class="btn-sm" onclick="selecionarProdutoEntrada(${p.id})">Entrada</button>
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
      <p><strong>${item.categoria}:</strong> R$ ${Number(item.valor_total || 0).toFixed(2)}</p>
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
      switchTab('produtos-tab');
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
        <td>${m.nome_do_produto}</td>
        <td>${m.unidade_medida}</td>
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
      li.innerHTML = `<strong>${item.nome}</strong>: Qtd Atual ${item.quantidade}`;
      lista.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    lista.innerHTML = '<li>Erro ao carregar limites.</li>';
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
      li.innerHTML = `<strong>${item.nome_do_produto}</strong>: ${item.quantidade_total_de_saidas} un (R$ ${Number(item.valor_total_financeiro_das_saidas).toFixed(2)})`;
      lista.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    lista.innerHTML = '<li>Erro ao carregar maiores saídas.</li>';
  }
}