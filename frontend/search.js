const fs = require('fs');
const path = require('path');
const words = {
  'Operacao': 'Operação', 'Visao': 'Visão', 'Servico': 'Serviço', 'Servicos': 'Serviços',
  'Veiculo': 'Veículo', 'Veiculos': 'Veículos', 'Diagnostico': 'Diagnóstico', 'Pecas': 'Peças',
  'Historico': 'Histórico', 'Movimentacoes': 'Movimentações', 'Solicitacoes': 'Solicitações',
  'Situacao': 'Situação', 'Descricao': 'Descrição', 'Observacoes': 'Observações',
  'Analises': 'Análises', 'Relatorios': 'Relatórios', 'Usuarios': 'Usuários',
  'Administracao': 'Administração', 'Periodo': 'Período', 'Disponivel': 'Disponível',
  'Indisponivel': 'Indisponível', 'Critico': 'Crítico', 'Pendencias': 'Pendências',
  'Acoes': 'Ações', 'Concluidas': 'Concluídas', 'Execucao': 'Execução', 'Conclusao': 'Conclusão',
  'Manutencao': 'Manutenção', 'Tecnico': 'Técnico', 'Mecanico': 'Mecânico', 'Obrigatoria': 'Obrigatória'
};

const dir = 'c:/AvanceOS/EXPORT/avanceos/frontend/src';

function walk(currentDir) {
  let results = [];
  const list = fs.readdirSync(currentDir);
  list.forEach(file => {
    const filePath = path.join(currentDir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(dir);
const matches = [];

files.forEach(file => {
  let changed = false;
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    // skip imports and types to reduce noise
    if (line.includes('import ') || line.includes('export type') || line.includes('interface ')) return;
    
    let hasMatch = false;
    for (let word of Object.keys(words)) {
      const regex = new RegExp('\\b' + word + '\\b');
      if (regex.test(line)) {
        hasMatch = true;
        break;
      }
    }
    
    if (hasMatch) {
      matches.push({ file: file, lineNum: idx + 1, line: line.trim() });
    }
  });
});

fs.writeFileSync('c:/AvanceOS/EXPORT/avanceos/frontend/search_results.json', JSON.stringify(matches, null, 2));
console.log('Done!');
