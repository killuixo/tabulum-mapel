import React, { useState, useEffect } from 'react';

// --- PALETA MONDRIAN ---
const COLORS = {
  mustard: '#e2b714',
  crimson: '#c32148',
  teal: '#008080',
  black: '#111111',
  white: '#ffffff',
  lightGray: '#f4f4f4'
};
const PIE_COLORS = [COLORS.crimson, COLORS.mustard, COLORS.teal, '#333333', '#777777', '#aaaaaa', '#dddddd'];

const ESTADO_STATUS_OPTIONS = [
  "", "Semeadura <100", "Semeadouro <35", "Germinação >100", 
  "Crescimento >500", "Raiz >1000", "Árvore >5000", "Colheita"
];

const CAPITAL_ESTRATEGIA_OPTIONS = [
  "", "Mobilização Ativa", "Reunião de Núcleo", "Ação de Rua (Panfletagem)",
  "Estratégia Digital", "Manutenção Territorial", "Observação"
];

const getScriptUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SCRIPT_URL) return import.meta.env.VITE_SCRIPT_URL;
    if (typeof process !== 'undefined' && process.env && process.env.VITE_SCRIPT_URL) return process.env.VITE_SCRIPT_URL;
  } catch (e) {}
  return ""; 
};
const SCRIPT_URL = getScriptUrl(); 

// --- FORMATADORES DE DADOS ---
const formatCurrency = (val) => {
  if (!val) return "R$ 0,00";
  if (typeof val === 'string' && val.includes('R$')) return val; 
  const numeric = parseFloat(val);
  if (isNaN(numeric)) return val;
  // Arredondamento estatístico padrão brasileiro
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
};

const formatPercentage = (val) => {
  if (val === null || val === undefined || val === '') return '-';
  if (typeof val === 'string' && val.includes('%')) return val;
  let num = parseFloat(val);
  if (isNaN(num)) return val;
  // Se o valor for decimal (ex: 0.1823), multiplicamos por 100
  if (num <= 1 && num > 0) num = num * 100;
  return num.toFixed(2).replace('.', ',') + '%';
};

const parseSortValue = (val) => {
  if (val === null || val === undefined || val === "") return -Infinity; 
  if (typeof val === 'number') return val;
  let str = String(val).trim();
  
  if (str.startsWith('R$')) return parseFloat(str.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
  if (str.endsWith('%')) return parseFloat(str.replace('%', '').replace(',', '.').trim()) || 0;
  if (/^\d{1,3}(\.\d{3})*$/.test(str)) return parseInt(str.replace(/\./g, ''), 10);
  
  const parsed = parseFloat(str.replace(',', '.')); // Lida com decimais
  if (!isNaN(parsed) && String(parsed) === str.replace(',', '.')) return parsed; 
  
  return str.toLowerCase();
};

export default function App() {
  const [activeTab, setActiveTab] = useState('DASHBOARD'); 
  const [viewMode, setViewMode] = useState('table'); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);

  const [estadoData, setEstadoData] = useState([]);
  const [capitalData, setCapitalData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ ESTADO: null, CAPITAL: null });
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchSheets = async () => {
    setLoading(true);
    setError(null);
    if (!SCRIPT_URL) {
      setError("API não configurada na Vercel (VITE_SCRIPT_URL).");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error("Falha na comunicação com a planilha.");
      const data = await response.json();
      if (data.estado && data.capital) {
        setEstadoData(data.estado);
        setCapitalData(data.capital);
      } else throw new Error("Dados inválidos.");
    } catch (err) {
      setError("Erro de rede ao conectar com a base de dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSheets(); }, []);

  const updateSheet = async (sheetName, rowIdx, colIdx, value) => {
    setSaving(true);
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update', sheetName, row: rowIdx + 2, col: colIdx + 1, value })
      });
      setLastSaved(new Date());
    } catch (err) {
      alert("Erro ao gravar. As edições não foram salvas na nuvem.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tab, originalRowIndex, colIndex, newValue) => {
    if (tab === 'ESTADO') {
      const newData = [...estadoData];
      newData[originalRowIndex + 1][colIndex] = newValue;
      setEstadoData(newData);
      updateSheet('ESTADO', originalRowIndex, colIndex, newValue);
    } else {
      const newData = [...capitalData];
      newData[originalRowIndex + 1][colIndex] = newValue;
      setCapitalData(newData);
      updateSheet('CAPITAL', originalRowIndex, colIndex, newValue);
    }
    if (selectedItem && selectedItem.originalIndex === originalRowIndex) {
      const updatedRow = [...selectedItem.row];
      updatedRow[colIndex] = newValue;
      setSelectedItem({ ...selectedItem, row: updatedRow });
    }
  };

  const renderDashboard = () => {
    if (estadoData.length < 2 || capitalData.length < 2) return null;
    
    // --- Processamento ESTADO ---
    const estHeaders = estadoData[0].map(h => String(h).toLowerCase());
    const idxEstCidade = estHeaders.findIndex(h => h === 'cidade');
    const idxEstRegiao = estHeaders.findIndex(h => h === 'região');
    const idxEstVotos = estHeaders.findIndex(h => h === '2022' || h === 'votos 2022');
    const idxEstEmenda23 = estHeaders.findIndex(h => h.includes('valor total de emendas 2023'));
    const idxEstEmenda24 = estHeaders.findIndex(h => h.includes('valor total de emendas 2024'));
    const idxEstEmenda25 = estHeaders.findIndex(h => h.includes('valor total de emendas 2025'));

    const regioesSC = {};
    let totalVotosSC = 0;
    const cidadesRelacao = [];

    estadoData.slice(1).forEach(row => {
      const cidade = row[idxEstCidade];
      const regiao = row[idxEstRegiao] ? String(row[idxEstRegiao]).trim() : 'Outras';
      const votos = parseSortValue(row[idxEstVotos]);
      const emendas = parseSortValue(row[idxEstEmenda23]) + parseSortValue(row[idxEstEmenda24]) + parseSortValue(row[idxEstEmenda25]);
      
      // Excluir Grande Florianópolis do gráfico de SC
      if (votos > 0 && regiao.toUpperCase() !== 'GRANDE FLORIANÓPOLIS') {
        if (!regioesSC[regiao]) regioesSC[regiao] = 0;
        regioesSC[regiao] += votos;
        totalVotosSC += votos;
      }
      if (votos > 0 || emendas > 0) {
        cidadesRelacao.push({ cidade, votos, emendas });
      }
    });

    const arrRegioesSC = Object.entries(regioesSC).sort((a, b) => b[1] - a[1]);
    
    // Construtor do Gráfico de Pizza (CSS Conic Gradient) para SC
    let anguloAtualSC = 0;
    const gradientStopsSC = arrRegioesSC.map(([reg, votos], idx) => {
      const perc = (votos / totalVotosSC) * 100;
      const start = anguloAtualSC;
      const end = anguloAtualSC + perc;
      anguloAtualSC = end;
      return `${PIE_COLORS[idx % PIE_COLORS.length]} ${start}% ${end}%`;
    }).join(', ');

    // --- Processamento CAPITAL ---
    const capHeaders = capitalData[0].map(h => String(h).toLowerCase());
    const idxCapRegiao = capHeaders.findIndex(h => h === 'região');
    const idxCapVotos = capHeaders.findIndex(h => h === 'votos 2024' || h === 'votos 2022');

    const regioesFloripa = {};
    let totalVotosCapital = 0;

    capitalData.slice(1).forEach(row => {
      const regiao = row[idxCapRegiao] ? String(row[idxCapRegiao]).trim() : 'Não Mapeada';
      const votos = parseSortValue(row[idxCapVotos]);
      if (votos > 0) {
        if (!regioesFloripa[regiao]) regioesFloripa[regiao] = 0;
        regioesFloripa[regiao] += votos;
        totalVotosCapital += votos;
      }
    });

    const arrRegioesFloripa = Object.entries(regioesFloripa).sort((a, b) => b[1] - a[1]);
    
    // Construtor do Gráfico de Pizza para Capital
    let anguloAtualCap = 0;
    const gradientStopsCap = arrRegioesFloripa.map(([reg, votos], idx) => {
      const perc = (votos / totalVotosCapital) * 100;
      const start = anguloAtualCap;
      const end = anguloAtualCap + perc;
      anguloAtualCap = end;
      return `${PIE_COLORS[idx % PIE_COLORS.length]} ${start}% ${end}%`;
    }).join(', ');

    // Ordenar cidades por emendas para o gráfico de correlação
    cidadesRelacao.sort((a, b) => b.emendas - a.emendas);
    const topCidadesEmendas = cidadesRelacao.filter(c => c.emendas > 0).slice(0, 10);

    return (
      <div className="flex flex-col gap-8 animate-fade-in">
        
        {/* SECÇÃO 1: GRÁFICOS DE PIZZA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pizza SC */}
          <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            <div className="bg-black text-white p-4 border-b-4 border-black">
               <h3 className="font-black text-lg uppercase tracking-widest">Distribuição Estado (SC)</h3>
               <p className="text-[10px] text-gray-400 uppercase">*Exceto Grande Florianópolis</p>
            </div>
            <div className="p-6 flex flex-col sm:flex-row items-center gap-8">
               <div 
                 className="w-48 h-48 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0"
                 style={{ background: `conic-gradient(${gradientStopsSC})` }}
               ></div>
               <div className="flex flex-col gap-2 w-full text-xs font-bold uppercase">
                  {arrRegioesSC.slice(0, 6).map(([reg, votos], idx) => (
                    <div key={reg} className="flex items-center justify-between border-b-2 border-gray-100 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 border border-black inline-block" style={{backgroundColor: PIE_COLORS[idx % PIE_COLORS.length]}}></span>
                        <span className="truncate max-w-[120px]" title={reg}>{reg}</span>
                      </div>
                      <span className="text-gray-600">{formatPercentage(votos / totalVotosSC)}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Pizza CAPITAL */}
          <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            <div className="bg-[#e2b714] text-black p-4 border-b-4 border-black">
               <h3 className="font-black text-lg uppercase tracking-widest">Distribuição Capital</h3>
               <p className="text-[10px] uppercase font-bold text-gray-700">Volume de votos por região</p>
            </div>
            <div className="p-6 flex flex-col sm:flex-row items-center gap-8">
               <div 
                 className="w-48 h-48 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0"
                 style={{ background: `conic-gradient(${gradientStopsCap})` }}
               ></div>
               <div className="flex flex-col gap-2 w-full text-xs font-bold uppercase">
                  {arrRegioesFloripa.map(([reg, votos], idx) => (
                    <div key={reg} className="flex items-center justify-between border-b-2 border-gray-100 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 border border-black inline-block" style={{backgroundColor: PIE_COLORS[idx % PIE_COLORS.length]}}></span>
                        <span>{reg}</span>
                      </div>
                      <span className="text-gray-600">{formatPercentage(votos / totalVotosCapital)}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>

        {/* SECÇÃO 2: CORRELAÇÃO DE ROI */}
        <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-6 border-b-4 border-black pb-4">
            <h3 className="font-black text-2xl uppercase tracking-tighter">Correlação: Investimento x Votos</h3>
            <p className="text-xs md:text-sm font-bold text-gray-500 uppercase mt-2">
              Compara a proporção de <span className="text-[#008080]">verba de emendas enviada (R$)</span> com a proporção de <span className="text-[#c32148]">votos obtidos</span> nos 10 municípios com maiores aportes. Permite visualizar o ROI (Retorno) Político.
            </p>
          </div>
          
          <div className="flex flex-col gap-6">
            {topCidadesEmendas.map((item, idx) => {
              const maxEmenda = topCidadesEmendas[0].emendas;
              // Para evitar barras microscópicas nos votos, comparamos com o máximo DESTA lista
              const maxVotosT = Math.max(...topCidadesEmendas.map(c => c.votos));
              
              const percEmenda = Math.max((item.emendas / maxEmenda) * 100, 2);
              const percVotos = Math.max((item.votos / maxVotosT) * 100, 2);

              return (
                <div key={item.cidade} className="flex flex-col font-bold uppercase text-xs sm:text-sm">
                  <div className="mb-2 truncate text-black">{idx + 1}. {item.cidade}</div>
                  
                  {/* Barra Emendas */}
                  <div className="flex items-center gap-4 mb-1">
                    <div className="w-24 sm:w-32 shrink-0 text-[#008080] truncate" title={formatCurrency(item.emendas)}>
                      {formatCurrency(item.emendas)}
                    </div>
                    <div className="flex-1 bg-gray-100 h-4 sm:h-5 border-2 border-black flex">
                      <div className="h-full bg-[#008080]" style={{ width: `${percEmenda}%` }}></div>
                    </div>
                  </div>
                  
                  {/* Barra Votos */}
                  <div className="flex items-center gap-4">
                    <div className="w-24 sm:w-32 shrink-0 text-[#c32148]">
                      {item.votos.toLocaleString('pt-BR')} V
                    </div>
                    <div className="flex-1 bg-gray-100 h-4 sm:h-5 border-2 border-black flex">
                      <div className="h-full bg-[#c32148]" style={{ width: `${percVotos}%` }}></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    );
  };

  const handleSort = (tab, index) => {
    let direction = 'asc';
    const currentSort = sortConfig[tab];
    if (currentSort && currentSort.key === index && currentSort.direction === 'asc') direction = 'desc';
    setSortConfig(prev => ({ ...prev, [tab]: { key: index, direction } }));
  };

  const getSortedData = (data, tabName) => {
    if (data.length <= 1) return { headers: [], rows: [] };
    const headers = data[0];
    let rows = data.slice(1).map((r, i) => ({ rowData: r, originalIndex: i }));
    
    const config = sortConfig[tabName];
    if (config !== null) {
      rows.sort((a, b) => {
        let valA = parseSortValue(a.rowData[config.key]);
        let valB = parseSortValue(b.rowData[config.key]);
        if (valA < valB) return config.direction === 'asc' ? -1 : 1;
        if (valA > valB) return config.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return { headers, sortedRows: rows };
  };

  // Função para limpar e encurtar os títulos da planilha para não quebrarem o layout
  const getShortHeader = (headerString) => {
    const s = String(headerString).toUpperCase();
    if (s.includes('DIÁRIAS')) return 'DIÁRIAS';
    if (s.includes('EQUIPE')) return 'ARTICULADOR';
    if (s.includes('VALOR TOTAL DE EMENDAS')) return s.replace('VALOR TOTAL DE EMENDAS', 'EMENDAS').trim();
    if (s.includes('% DOS VOTOS')) return '% VOTOS';
    if (s.includes('DIRETÓRIO')) return 'DIRETÓRIO';
    if (s.includes('CÍRCULOS TERRITORIAIS')) return 'STATUS (CÍRCULOS)';
    if (s.includes('BAIRRO REPLAN')) return 'BAIRRO';
    return s;
  };

  const renderDataView = (tabName, dataObj) => {
    const { headers, sortedRows } = getSortedData(dataObj, tabName);
    if (headers.length === 0) return null;

    const safeHeaders = headers.map(h => String(h).toLowerCase());
    const findIndex = (strMatch) => safeHeaders.findIndex(h => h === strMatch || h.includes(strMatch.toLowerCase()));
    
    const indices = tabName === 'ESTADO' ? {
      title: findIndex('cidade'), subtitle: findIndex('região'),
      votos22: findIndex('2022') > -1 ? findIndex('2022') : findIndex('votos 2022'),
      editField1: findIndex('círculos territoriais')
    } : {
      title: findIndex('local'), subtitle: findIndex('bairro replan'),
      votos22: findIndex('votos 2022'),
      editField1: findIndex('equipe do mandato'), editField2: findIndex('estratégia territorial')
    };

    const SortIcon = ({ idx }) => {
      const conf = sortConfig[tabName];
      if (conf?.key !== idx) return <span className="text-gray-500 opacity-30 text-[10px] ml-1">↕</span>;
      return <span className="text-[#e2b714] text-xs ml-1 font-black">{conf.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    if (viewMode === 'cards') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
          {sortedRows.map((item, i) => {
            const row = item.rowData;
            const mainTitle = row[indices.title];
            if (!mainTitle || !String(mainTitle).trim()) return null;

            return (
              <div key={i} className="border-4 border-black bg-white flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div 
                  className="p-4 border-b-4 border-black cursor-pointer group bg-[#111] text-white" 
                  onClick={() => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex })}
                >
                  <h3 className="font-black text-lg uppercase truncate group-hover:text-[#e2b714] transition-colors">{mainTitle}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase truncate mt-1">{row[indices.subtitle]}</p>
                </div>
                
                <div className="p-4 flex-1 flex flex-col gap-3 text-sm font-bold bg-[#fcfcfc]">
                  <div className="flex justify-between border-b border-gray-300 pb-1">
                    <span className="text-gray-500 uppercase text-xs">Votos (2022):</span>
                    <span className="text-[#c32148]">{row[indices.votos22]}</span>
                  </div>

                  <div className="mt-auto pt-2 space-y-3">
                    {tabName === 'ESTADO' && indices.editField1 > -1 && (
                      <div>
                        <label className="text-[10px] uppercase font-black text-[#008080] tracking-wider mb-1 block">Status (Círculos)</label>
                        <select 
                          className="w-full bg-yellow-50 border-2 border-black p-2 font-bold outline-none text-xs focus:bg-yellow-100"
                          value={row[indices.editField1] || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, indices.editField1, e.target.value)}
                        >
                          {ESTADO_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || "-- Selecione --"}</option>)}
                        </select>
                      </div>
                    )}
                    {tabName === 'CAPITAL' && (
                      <>
                        {indices.editField1 > -1 && (
                          <div>
                            <label className="text-[10px] uppercase font-black text-[#c32148] tracking-wider mb-1 block">Articulador</label>
                            <input 
                              type="text" className="w-full bg-red-50 border-2 border-black p-2 font-bold outline-none text-xs focus:bg-red-100"
                              value={row[indices.editField1] || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, indices.editField1, e.target.value)}
                            />
                          </div>
                        )}
                        {indices.editField2 > -1 && (
                          <div>
                            <label className="text-[10px] uppercase font-black text-[#c32148] tracking-wider mb-1 block">Estratégia</label>
                            <select 
                              className="w-full bg-red-50 border-2 border-black p-2 font-bold outline-none text-xs focus:bg-red-100"
                              value={row[indices.editField2] || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, indices.editField2, e.target.value)}
                            >
                              {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || "-- Selecione --"}</option>)}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="p-3 border-t-4 border-black bg-[#e2b714] text-black text-center text-xs font-black uppercase cursor-pointer hover:bg-[#c32148] hover:text-white transition-colors"
                     onClick={() => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex })}>
                  Abrir Ficha Completa
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // VISÃO TABELA
    return (
      <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col animate-fade-in relative z-0">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-xs text-left font-medium border-collapse">
            <thead className="bg-[#111111] text-white uppercase sticky top-0 z-20 shadow-md">
              <tr>
                {headers.map((h, i) => {
                  const shortH = getShortHeader(h);
                  let bgColor = '#111111';
                  let tColor = 'white';
                  
                  // Larguras dinâmicas para economizar espaço
                  let widthClass = 'w-20'; 
                  if (i === indices.title || i === indices.subtitle) widthClass = 'min-w-[140px] max-w-[220px]';
                  else if (shortH === 'SEÇÃO') widthClass = 'w-16 max-w-[80px]';
                  else if (i === indices.editField1 || i === indices.editField2) widthClass = 'min-w-[120px]';

                  // Cores para áreas editáveis
                  if (tabName === 'ESTADO' && i === indices.editField1) { bgColor = COLORS.mustard; tColor = 'black'; }
                  if (tabName === 'CAPITAL' && (i === indices.editField1 || i === indices.editField2)) { bgColor = COLORS.crimson; }

                  return (
                    <th key={i} 
                      className={`p-2 border-r-2 border-b-4 border-black cursor-pointer hover:bg-gray-800 transition-colors align-bottom break-words leading-tight ${widthClass} ${i === indices.title ? 'sticky left-0 z-30 shadow-[2px_0_0_#000]' : ''}`}
                      style={{ backgroundColor: bgColor, color: tColor }}
                      onClick={() => handleSort(tabName, i)}
                    >
                      <div className="flex items-end justify-between gap-1">
                        <span>{shortH}</span>
                        <SortIcon idx={i} />
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedRows.map((item, i) => {
                const row = item.rowData;
                if (!row[indices.title]) return null;

                return (
                  <tr key={i} className="border-b-2 border-gray-300 hover:bg-gray-100 transition-colors group">
                    {row.map((cell, colIdx) => {
                      const isTitle = colIdx === indices.title;
                      const hStr = String(headers[colIdx]).toUpperCase();
                      const isLOA = hStr.includes('LOA') || hStr.includes('VALOR') || hStr.includes('EMENDA');
                      const isPerc = hStr.includes('%');
                      const isSecao = hStr === 'SEÇÃO';
                      
                      let content = cell;
                      if (isLOA) content = formatCurrency(cell);
                      else if (isPerc) content = formatPercentage(cell);

                      // Lógica da Célula SEÇÃO (Encurtar e Hover)
                      if (isSecao) {
                        return (
                          <td key={colIdx} className="p-2 border-r-2 border-black align-top font-bold text-[10px]">
                            <div className="relative group/tooltip">
                               <div className="line-clamp-1 cursor-help w-full">{content || '-'}</div>
                               {content && String(content).length > 8 && (
                                 <div className="hidden group-hover/tooltip:block absolute top-full left-0 mt-1 bg-white border-2 border-black p-2 z-[99] w-64 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] whitespace-normal break-words font-medium">
                                   {content}
                                 </div>
                               )}
                            </div>
                          </td>
                        );
                      }

                      // Campos Editáveis
                      if (tabName === 'ESTADO' && colIdx === indices.editField1) {
                        return (
                          <td key={colIdx} className="p-0 border-r-2 border-black bg-yellow-50 align-top">
                            <select className="w-full h-full min-h-[40px] p-2 bg-transparent font-bold text-[10px] uppercase outline-none focus:bg-yellow-200"
                              value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)}>
                              {ESTADO_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </td>
                        );
                      }
                      if (tabName === 'CAPITAL') {
                        if (colIdx === indices.editField1) return (
                           <td key={colIdx} className="p-0 border-r-2 border-black bg-red-50 align-top">
                             <input type="text" className="w-full h-full min-h-[40px] p-2 bg-transparent font-bold text-[10px] uppercase outline-none focus:bg-red-100"
                              value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)} />
                          </td>
                        );
                        if (colIdx === indices.editField2) return (
                           <td key={colIdx} className="p-0 border-r-2 border-black bg-red-50 align-top">
                             <select className="w-full h-full min-h-[40px] p-2 bg-transparent font-bold text-[10px] uppercase outline-none focus:bg-red-100"
                              value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)}>
                              {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </td>
                        );
                      }

                      // Células Normais (Com quebra de linha permitida para textos longos)
                      return (
                        <td 
                          key={colIdx} 
                          className={`p-2 border-r-2 border-black align-top whitespace-normal break-words ${isTitle ? 'sticky left-0 bg-white font-black cursor-pointer group-hover:bg-gray-200 group-hover:text-[#c32148] z-10 shadow-[2px_0_0_#000]' : ''}`}
                          onClick={isTitle ? () => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex }) : undefined}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!selectedItem) return null;
    const { tab, headers, row, originalIndex } = selectedItem;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 animate-fade-in backdrop-blur-sm">
        <div className="bg-white border-8 border-black w-full max-w-4xl flex flex-col shadow-[12px_12px_0px_0px_rgba(226,183,20,1)] max-h-[90vh]">
          
          <div className="flex border-b-4 border-black shrink-0">
             <div className="w-4 bg-[#c32148] border-r-4 border-black"></div>
             <div className="flex-1 p-4 bg-[#111] text-white flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-black uppercase truncate pr-4">{row[0] || 'Ficha Detalhada'}</h2>
                <button onClick={() => setSelectedItem(null)} className="font-black text-2xl hover:text-[#e2b714] px-2">X</button>
             </div>
          </div>
          
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 overflow-y-auto">
             {headers.map((h, i) => {
               const val = row[i];
               const hStr = String(h).toUpperCase();
               const isLOA = hStr.includes('LOA') || hStr.includes('VALOR') || hStr.includes('EMENDA');
               const isPerc = hStr.includes('%');
               
               let displayVal = val || '-';
               if (isLOA) displayVal = formatCurrency(val);
               else if (isPerc) displayVal = formatPercentage(val);
               
               const safeH = String(h).toLowerCase();
               const isStatus = tab === 'ESTADO' && safeH.includes('círculos');
               const isArticulador = tab === 'CAPITAL' && safeH.includes('equipe');
               const isEstrategia = tab === 'CAPITAL' && safeH.includes('estratégia');

               // Campos Editáveis dentro do Modal
               if (isStatus) {
                 return (
                    <div key={i} className="flex flex-col border-b-2 border-black pb-2 col-span-1 md:col-span-2">
                      <span className="text-xs font-black uppercase text-[#008080] mb-1">{h}</span>
                      <select className="bg-yellow-100 border-2 border-black p-2 font-bold outline-none"
                        value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)}>
                        {ESTADO_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                 );
               }
               if (isArticulador) {
                 return (
                    <div key={i} className="flex flex-col border-b-2 border-black pb-2 col-span-1 md:col-span-2">
                      <span className="text-xs font-black uppercase text-[#c32148] mb-1">{h}</span>
                      <input type="text" className="bg-red-100 border-2 border-black p-2 font-bold outline-none"
                        value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)} />
                    </div>
                 );
               }
               if (isEstrategia) {
                 return (
                    <div key={i} className="flex flex-col border-b-2 border-black pb-2 col-span-1 md:col-span-2">
                      <span className="text-xs font-black uppercase text-[#c32148] mb-1">{h}</span>
                      <select className="bg-red-100 border-2 border-black p-2 font-bold outline-none"
                        value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)}>
                        {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                 );
               }

               return (
                 <div key={i} className="flex flex-col border-b-2 border-gray-200 pb-2">
                   <span className="text-[10px] font-black uppercase text-gray-500 mb-1 leading-tight">{h}</span>
                   <span className="font-bold text-black break-words text-sm">{displayVal}</span>
                 </div>
               )
             })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4] font-sans text-black selection:bg-[#e2b714] selection:text-black flex flex-col">
      <header className="border-b-4 border-black bg-white flex flex-col md:flex-row shadow-md relative z-30 shrink-0">
        <div className="flex-1 p-4 md:p-6 flex items-center gap-4 border-b-4 md:border-b-0 md:border-r-4 border-black">
          <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-black bg-[#c32148] shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl">
             📊
          </div>
          <div className="overflow-hidden">
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none truncate">Tabulum</h1>
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-600 mt-1 truncate">App de Gestão e Análise • 2026</p>
          </div>
        </div>
        <div className="flex flex-row md:flex-col w-full md:w-32 shrink-0 h-4 md:h-auto">
          <div className="flex-1 border-r-4 md:border-r-0 md:border-b-4 border-black bg-[#e2b714]"></div>
          <div className="flex-1 border-r-4 md:border-r-0 md:border-b-4 border-black bg-[#008080]"></div>
          <div className="flex-1 bg-[#c32148]"></div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row border-b-4 border-black bg-white sticky top-0 z-20 shrink-0">
        <button onClick={() => setActiveTab('DASHBOARD')}
          className={`flex-1 p-3 font-black text-sm md:text-lg uppercase tracking-wider border-b-4 sm:border-b-0 sm:border-r-4 border-black transition-colors ${activeTab === 'DASHBOARD' ? 'bg-[#c32148] text-white shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
        > Dashboard </button>
        <button onClick={() => setActiveTab('ESTADO')}
          className={`flex-1 p-3 font-black text-sm md:text-lg uppercase tracking-wider border-b-4 sm:border-b-0 sm:border-r-4 border-black transition-colors ${activeTab === 'ESTADO' ? 'bg-[#e2b714] text-black shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
        > Estado </button>
        <button onClick={() => setActiveTab('CAPITAL')}
          className={`flex-1 p-3 font-black text-sm md:text-lg uppercase tracking-wider transition-colors ${activeTab === 'CAPITAL' ? 'bg-[#008080] text-white shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
        > Capital </button>
      </div>

      <main className="p-4 md:p-6 flex-1 w-full max-w-[1800px] mx-auto flex flex-col">
        {error && (
          <div className="mb-4 border-4 border-black bg-[#c32148] text-white p-4 font-bold flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            ⚠️ <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <span className="w-3 h-3 md:w-4 md:h-4 shrink-0 inline-block border-2 border-black bg-[#111]"></span>
              {activeTab}
            </h2>
            
            {activeTab !== 'DASHBOARD' && (
              <div className="flex bg-white border-4 border-black text-xs font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <button onClick={() => setViewMode('table')} className={`px-4 py-2 uppercase ${viewMode==='table' ? 'bg-black text-white' : 'hover:bg-gray-200'}`}>Lista</button>
                <button onClick={() => setViewMode('cards')} className={`px-4 py-2 border-l-4 border-black uppercase ${viewMode==='cards' ? 'bg-black text-white' : 'hover:bg-gray-200'}`}>Cards</button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
             <button onClick={fetchSheets} className="flex-1 lg:flex-none text-xs bg-white text-black border-4 border-black font-black px-4 py-2 uppercase tracking-widest hover:bg-gray-200 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none whitespace-nowrap">
              🔄 Sincronizar
            </button>
            {saving && (
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-[#e2b714] text-black px-3 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">
                ⏳ Salvando...
              </div>
            )}
            {!saving && lastSaved && (
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-[#008080] text-white px-3 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">
                ✅ Salvo
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-h-[400px]">
            <div className="text-5xl mb-6 animate-bounce">⏳</div>
            <p className="font-black uppercase tracking-widest text-center text-lg">Analisando Dados...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col w-full overflow-hidden">
            {activeTab === 'ESTADO' && renderDataView('ESTADO', estadoData)}
            {activeTab === 'CAPITAL' && renderDataView('CAPITAL', capitalData)}
            {activeTab === 'DASHBOARD' && renderDashboard()}
          </div>
        )}
      </main>
      
      {renderModal()}
    </div>
  );
}
