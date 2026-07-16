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

const ESTADO_STATUS_OPTIONS = [
  "", "Semeadura <100", "Semeadouro <35", "Germinação >100", 
  "Crescimento >500", "Raiz >1000", "Árvore >5000", "Colheita"
];

const CAPITAL_ESTRATEGIA_OPTIONS = [
  "", "Mobilização Ativa", "Reunião de Núcleo", "Ação de Rua (Panfletagem)",
  "Estratégia Digital", "Manutenção Territorial", "Observação"
];

// --- DICIONÁRIO DE RÓTULOS (Para limpar os títulos gigantes da planilha) ---
const HEADER_LABELS = {
  "% dos votos válidos 2022": "% Votos 22",
  "2022 chapa psol": "Votos PSOL",
  "equipe do mandato": "Equipe",
  "diretório municipal": "Diretório",
  "diárias na cidade de fev/2023 até dez/2025": "Diárias",
  "lideranças (milo)": "Lideranças",
  "valor total de emendas 2023": "Emendas 2023 (R$)",
  "valor total de emendas 2024": "Emendas 2024 (R$)",
  "valor total de emendas 2025": "Emendas 2025 (R$)",
  "círculos territoriais": "Status (Círculo)",
  "estratégia territorial": "Estratégia",
  "% votos comparecidos - 2022": "% Votos 22",
  "% votos comparecidos - 2024": "% Votos 24",
  "bairro replan": "Bairro"
};

const getLabel = (h) => HEADER_LABELS[String(h).toLowerCase().trim()] || h;

// --- CONFIGURAÇÃO DA API ---
const getScriptUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SCRIPT_URL) return import.meta.env.VITE_SCRIPT_URL;
    if (typeof process !== 'undefined' && process.env && process.env.VITE_SCRIPT_URL) return process.env.VITE_SCRIPT_URL;
  } catch (e) {}
  return ""; 
};
const SCRIPT_URL = getScriptUrl(); 

const formatCurrency = (val) => {
  if (!val) return "R$ 0,00";
  if (typeof val === 'string' && val.includes('R$')) return val; 
  const numeric = parseFloat(val);
  if (isNaN(numeric)) return val;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(numeric);
};

const parseSortValue = (val) => {
  if (val === null || val === undefined || val === "") return -Infinity; 
  if (typeof val === 'number') return val;
  let str = String(val).trim();
  
  if (str.startsWith('R$')) return parseFloat(str.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
  if (str.endsWith('%')) return parseFloat(str.replace('%', '').replace(',', '.').trim()) || 0;
  if (/^\d{1,3}(\.\d{3})*$/.test(str)) return parseInt(str.replace(/\./g, ''), 10);
  
  const parsed = parseFloat(str.replace(',', '.'));
  if (!isNaN(parsed) && String(parsed) === str.replace(',', '.')) return parsed; 
  
  return str.toLowerCase();
};

export default function App() {
  const [activeTab, setActiveTab] = useState('DASHBOARD'); 
  const [viewMode, setViewMode] = useState('table'); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [estadoData, setEstadoData] = useState([]);
  const [capitalData, setCapitalData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ ESTADO: null, CAPITAL: null });
  const [selectedItem, setSelectedItem] = useState(null);

  // --- COMUNICAÇÃO COM API ---
  const fetchSheets = async () => {
    setLoading(true);
    setError(null);
    if (!SCRIPT_URL) {
      setError("API não configurada. Adicione VITE_SCRIPT_URL nas variáveis da Vercel (Production) e faça Redeploy.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error("Erro de comunicação.");
      const data = await response.json();
      if (data.estado && data.capital) {
        setEstadoData(data.estado);
        setCapitalData(data.capital);
      } else throw new Error("Dados inválidos.");
    } catch (err) {
      setError("Falha ao conectar com o banco de dados. Verifique a URL do script.");
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
    } catch (err) {
      alert("Erro ao gravar alteração na planilha.");
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

  const renderDashboard = () => {
    if (estadoData.length < 2 || capitalData.length < 2) return null;
    
    // --- Processamento ESTADO ---
    const estHeaders = estadoData[0].map(h => String(h).toLowerCase());
    const idxEstCidade = estHeaders.findIndex(h => h === 'cidade');
    const idxEstRegiao = estHeaders.findIndex(h => h === 'região');
    const idxEstVotos = estHeaders.findIndex(h => h === '2022' || h === 'votos 2022');
    const idxEstEmenda23 = estHeaders.findIndex(h => h.includes('valor') && h.includes('23'));
    const idxEstEmenda24 = estHeaders.findIndex(h => h.includes('valor') && h.includes('24'));
    const idxEstEmenda25 = estHeaders.findIndex(h => h.includes('valor') && h.includes('25'));

    const regioesSC = {};
    const cidadesRelacao = [];
    let totalVotosSC = 0;
    let totalEmendasSC = 0;

    estadoData.slice(1).forEach(row => {
      const cidade = row[idxEstCidade];
      if (!cidade) return;
      const regiao = row[idxEstRegiao] || 'Outras';
      const votos = parseSortValue(row[idxEstVotos]);
      const emendas = parseSortValue(row[idxEstEmenda23]) + parseSortValue(row[idxEstEmenda24]) + parseSortValue(row[idxEstEmenda25]);

      if (votos > 0) {
        if (!regioesSC[regiao]) regioesSC[regiao] = 0;
        regioesSC[regiao] += votos;
        totalVotosSC += votos;
      }
      totalEmendasSC += emendas;
      
      if (votos > 0 || emendas > 0) {
        cidadesRelacao.push({ cidade, votos, emendas });
      }
    });

    const arrRegioesSC = Object.entries(regioesSC).sort((a, b) => b[1] - a[1]);
    const maxVotosRegiaoSC = arrRegioesSC[0]?.[1] || 1;
    cidadesRelacao.sort((a, b) => b.emendas - a.emendas); // Ordena por maior emenda

    // --- Processamento CAPITAL ---
    const capHeaders = capitalData[0].map(h => String(h).toLowerCase());
    const idxCapRegiao = capHeaders.findIndex(h => h === 'região');
    const idxCapVotos = capHeaders.findIndex(h => h === 'votos 2024' || h === 'votos 2022'); // Pega o mais recente que achar

    const regioesFloripa = {};
    let totalVotosCapital = 0;

    capitalData.slice(1).forEach(row => {
      const regiao = row[idxCapRegiao];
      if (!regiao) return;
      const votos = parseSortValue(row[idxCapVotos]);
      if (votos > 0) {
        if (!regioesFloripa[regiao]) regioesFloripa[regiao] = 0;
        regioesFloripa[regiao] += votos;
        totalVotosCapital += votos;
      }
    });
    const arrRegioesFloripa = Object.entries(regioesFloripa).sort((a, b) => b[1] - a[1]);
    const maxVotosRegiaoFloripa = arrRegioesFloripa[0]?.[1] || 1;

    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        {/* KPIs Globais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black uppercase text-gray-500 tracking-widest mb-1">Total Votos SC</p>
            <p className="text-4xl lg:text-5xl font-black text-[#c32148]">{totalVotosSC.toLocaleString('pt-BR')}</p>
          </div>
          <div className="border-4 border-black bg-[#e2b714] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black uppercase text-black tracking-widest mb-1">Total Votos Capital</p>
            <p className="text-4xl lg:text-5xl font-black text-black">{totalVotosCapital.toLocaleString('pt-BR')}</p>
          </div>
          <div className="border-4 border-black bg-[#008080] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white">
             <p className="text-xs font-black uppercase tracking-widest mb-1">Volume de Emendas</p>
            <p className="text-3xl lg:text-4xl font-black">{formatCurrency(totalEmendasSC)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Heatmap SC */}
          <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black text-lg uppercase mb-6 border-b-4 border-black pb-2">Mapa de Calor SC (Por Região)</h3>
            <div className="flex flex-col gap-3">
              {arrRegioesSC.map(([reg, votos], idx) => {
                const perc = Math.max((votos / maxVotosRegiaoSC) * 100, 2);
                return (
                  <div key={reg} className="flex flex-col">
                    <div className="flex justify-between text-xs font-bold uppercase mb-1">
                      <span>{reg}</span>
                      <span>{votos.toLocaleString('pt-BR')} v</span>
                    </div>
                    <div className="w-full bg-gray-200 h-4 border-2 border-black flex">
                      <div className="h-full bg-[#c32148] border-r-2 border-black" style={{ width: `${perc}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Heatmap Capital & Relação Emendas */}
          <div className="flex flex-col gap-6">
            <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="font-black text-lg uppercase mb-6 border-b-4 border-black pb-2">Mapa de Calor Capital</h3>
              <div className="flex flex-wrap gap-2">
                {arrRegioesFloripa.map(([reg, votos]) => {
                  const perc = Math.max((votos / maxVotosRegiaoFloripa) * 100, 15);
                  // Treemap nativo CSS via flex-basis
                  return (
                    <div key={reg} 
                         className="border-2 border-black p-3 flex flex-col justify-end min-h-[80px]"
                         style={{ flexBasis: `${perc}%`, flexGrow: 1, backgroundColor: COLORS.mustard }}>
                       <span className="text-2xl font-black">{votos.toLocaleString('pt-BR')}</span>
                       <span className="text-xs font-bold uppercase">{reg}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Gráfico Correlação */}
            <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-1">
              <h3 className="font-black text-lg uppercase mb-2">Correlação: Emendas x Votos</h3>
              <p className="text-xs text-gray-500 uppercase font-bold mb-6 border-b-4 border-black pb-2">Top 10 Municípios com mais aportes</p>
              
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[300px] pr-2">
                {cidadesRelacao.filter(c => c.emendas > 0).slice(0, 10).map((item, idx) => {
                  const maxE = cidadesRelacao[0].emendas;
                  const maxV = Math.max(...cidadesRelacao.slice(0,10).map(c=>c.votos));
                  const pE = (item.emendas / maxE) * 100;
                  const pV = Math.max((item.votos / maxV) * 100, 2);

                  return (
                    <div key={item.cidade} className="flex flex-col text-xs font-bold uppercase">
                      <div className="mb-1 truncate">{idx+1}. {item.cidade}</div>
                      <div className="flex gap-2 items-center">
                        <div className="w-16 text-right text-[#008080] truncate">{formatCurrency(item.emendas)}</div>
                        <div className="flex-1 bg-gray-100 h-3 border border-black flex">
                          <div className="h-full bg-[#008080]" style={{ width: `${pE}%` }}></div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center mt-1">
                        <div className="w-16 text-right text-[#c32148]">{item.votos} v</div>
                        <div className="flex-1 bg-gray-100 h-3 border border-black flex">
                          <div className="h-full bg-[#c32148]" style={{ width: `${pV}%` }}></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDataView = (tabName, dataObj) => {
    const { headers, sortedRows } = getSortedData(dataObj, tabName);
    if (headers.length === 0) return null;

    const safeHeaders = headers.map(h => String(h).toLowerCase());
    const findIndex = (strMatch) => safeHeaders.findIndex(h => h === strMatch || h.includes(strMatch));
    
    const indices = tabName === 'ESTADO' ? {
      title: findIndex('cidade'), sub: findIndex('região'), edit1: findIndex('círculos')
    } : {
      title: findIndex('local'), sub: findIndex('bairro replan'), edit1: findIndex('equipe'), edit2: findIndex('estratégia')
    };

    const SortIcon = ({ idx }) => {
      const conf = sortConfig[tabName];
      if (conf?.key !== idx) return <span className="text-gray-500 opacity-50 ml-1">↕</span>;
      return <span className="text-white ml-1 font-black">{conf.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    if (viewMode === 'cards') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
          {sortedRows.map((item, i) => {
            const row = item.rowData;
            const mainTitle = row[indices.title];
            if (!mainTitle) return null;

            return (
              <div key={i} className="border-4 border-black bg-white flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div 
                  className="p-3 border-b-4 border-black cursor-pointer bg-black text-white" 
                  onClick={() => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex })}
                >
                  <h3 className="font-black text-base uppercase truncate hover:text-[#e2b714]">{mainTitle}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{row[indices.sub]}</p>
                </div>
                
                <div className="p-3 flex-1 flex flex-col gap-2 text-xs font-bold bg-[#fcfcfc]">
                  {/* Resumo de 3 campos numéricos importantes */}
                  {headers.slice(2, 5).map((h, hIdx) => (
                     <div key={hIdx} className="flex justify-between border-b border-gray-200 pb-1">
                       <span className="text-gray-500 truncate mr-2">{getLabel(h)}</span>
                       <span className="text-[#c32148]">{row[hIdx+2]}</span>
                     </div>
                  ))}
                  
                  {/* Controles de Edição */}
                  <div className="mt-2 pt-2 space-y-2 border-t-2 border-dashed border-gray-300">
                    {tabName === 'ESTADO' && indices.edit1 > -1 && (
                      <div>
                        <label className="text-[10px] uppercase text-[#008080]">Status</label>
                        <select className="w-full bg-yellow-50 border-2 border-black p-1 font-bold"
                          value={row[indices.edit1] || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, indices.edit1, e.target.value)}>
                          {ESTADO_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    )}
                    {tabName === 'CAPITAL' && (
                      <>
                        {indices.edit1 > -1 && (
                          <div>
                            <label className="text-[10px] uppercase text-[#c32148]">Articulador</label>
                            <input type="text" className="w-full bg-red-50 border-2 border-black p-1 font-bold"
                              value={row[indices.edit1] || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, indices.edit1, e.target.value)} />
                          </div>
                        )}
                        {indices.edit2 > -1 && (
                          <div>
                            <label className="text-[10px] uppercase text-[#c32148]">Estratégia</label>
                            <select className="w-full bg-red-50 border-2 border-black p-1 font-bold"
                              value={row[indices.edit2] || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, indices.edit2, e.target.value)}>
                              {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // VISUALIZAÇÃO TABELA OTIMIZADA
    return (
      <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative max-h-[70vh] flex flex-col animate-fade-in">
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs text-left font-medium border-collapse">
            <thead className="bg-[#111111] text-white uppercase sticky top-0 z-20">
              <tr>
                {headers.map((h, i) => {
                  let bgColor = '#111111';
                  let tColor = 'white';
                  let widthClass = 'w-24'; // Default min width for numbers
                  
                  const isTitle = i === indices.title;
                  const isSub = i === indices.sub;
                  const isEdit = i === indices.edit1 || i === indices.edit2;
                  
                  if (isTitle || isSub) widthClass = 'min-w-[150px] max-w-[250px]';
                  else if (String(h).length > 20) widthClass = 'min-w-[120px] max-w-[150px]';
                  else widthClass = 'min-w-[70px] max-w-[100px]';

                  if (isEdit) {
                    bgColor = tabName === 'ESTADO' ? COLORS.mustard : COLORS.crimson;
                    tColor = tabName === 'ESTADO' ? 'black' : 'white';
                  }

                  return (
                    <th key={i} 
                      className={`p-2 border-r-2 border-b-4 border-black cursor-pointer hover:bg-gray-800 transition-colors align-bottom whitespace-normal break-words leading-tight ${widthClass} ${isTitle ? 'sticky left-0 z-30 shadow-[2px_0_0_#000]' : ''}`}
                      style={{ backgroundColor: bgColor, color: tColor }}
                      onClick={() => handleSort(tabName, i)}
                      title="Clique para ordenar"
                    >
                      <div className="flex items-end justify-between gap-1">
                        <span>{getLabel(h)}</span>
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
                      const isEdit1 = colIdx === indices.edit1;
                      const isEdit2 = colIdx === indices.edit2;
                      const hStr = String(headers[colIdx]).toUpperCase();
                      const isLOA = hStr.includes('LOA') || hStr.includes('VALOR');
                      
                      let content = cell;
                      if (isLOA) content = formatCurrency(cell);

                      // Colunas Editáveis Diretas na Tabela
                      if (tabName === 'ESTADO' && isEdit1) {
                        return (
                          <td key={colIdx} className="p-0 border-r-2 border-black bg-yellow-50 align-top">
                            <select className="w-full h-full min-h-[40px] p-2 bg-transparent font-bold text-[10px] outline-none focus:bg-yellow-200 whitespace-normal"
                              value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)}>
                              {ESTADO_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </td>
                        );
                      }
                      if (tabName === 'CAPITAL') {
                        if (isEdit1) return (
                           <td key={colIdx} className="p-0 border-r-2 border-black bg-red-50 align-top">
                             <input type="text" className="w-full h-full min-h-[40px] p-2 bg-transparent font-bold text-[10px] outline-none focus:bg-red-100"
                              value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)} />
                          </td>
                        );
                        if (isEdit2) return (
                           <td key={colIdx} className="p-0 border-r-2 border-black bg-red-50 align-top">
                             <select className="w-full h-full min-h-[40px] p-2 bg-transparent font-bold text-[10px] outline-none focus:bg-red-100 whitespace-normal"
                              value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)}>
                              {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </td>
                        );
                      }

                      // Células de Leitura
                      return (
                        <td 
                          key={colIdx} 
                          className={`p-2 border-r-2 border-black align-top whitespace-normal break-words leading-tight ${isTitle ? 'sticky left-0 bg-white font-black cursor-pointer group-hover:bg-gray-200 group-hover:text-[#c32148] z-10 shadow-[2px_0_0_#000]' : ''}`}
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
                <button onClick={() => setSelectedItem(null)} className="font-black text-2xl hover:text-[#e2b714]">✕</button>
             </div>
          </div>
          
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 overflow-y-auto">
             {headers.map((h, i) => {
               const val = row[i];
               const isLOA = String(h).toUpperCase().includes('LOA') || String(h).toUpperCase().includes('VALOR');
               const displayVal = isLOA ? formatCurrency(val) : (val || '-');
               
               const safeH = String(h).toLowerCase();
               const isStatus = tab === 'ESTADO' && safeH.includes('círculos');
               const isArticulador = tab === 'CAPITAL' && safeH.includes('equipe');
               const isEstrategia = tab === 'CAPITAL' && safeH.includes('estratégia');

               if (isStatus) {
                 return (
                    <div key={i} className="flex flex-col border-b-2 border-black pb-2 col-span-1 md:col-span-2">
                      <span className="text-xs font-black uppercase text-[#008080] mb-1">{getLabel(h)}</span>
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
                      <span className="text-xs font-black uppercase text-[#c32148] mb-1">{getLabel(h)}</span>
                      <input type="text" className="bg-red-100 border-2 border-black p-2 font-bold outline-none"
                        value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)} />
                    </div>
                 );
               }
               if (isEstrategia) {
                 return (
                    <div key={i} className="flex flex-col border-b-2 border-black pb-2 col-span-1 md:col-span-2">
                      <span className="text-xs font-black uppercase text-[#c32148] mb-1">{getLabel(h)}</span>
                      <select className="bg-red-100 border-2 border-black p-2 font-bold outline-none"
                        value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)}>
                        {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                 );
               }

               return (
                 <div key={i} className="flex flex-col border-b-2 border-gray-200 pb-2">
                   <span className="text-[10px] font-black uppercase text-gray-500 mb-1 leading-tight">{getLabel(h)}</span>
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
                <button onClick={() => setViewMode('table')} className={`px-4 py-2 uppercase ${viewMode==='table' ? 'bg-black text-white' : 'hover:bg-gray-200'}`}>Tabela</button>
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
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-h-[400px]">
            <div className="text-5xl mb-6 animate-bounce">⏳</div>
            <p className="font-black uppercase tracking-widest text-center text-lg">Analisando Dados...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col w-full">
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
