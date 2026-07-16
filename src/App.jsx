import React, { useState, useEffect, useMemo } from 'react';

// --- PALETA MONDRIAN ---
const COLORS = {
  mustard: '#e2b714',
  crimson: '#c32148',
  teal: '#008080',
  black: '#111111',
  white: '#ffffff',
  lightGray: '#f4f4f4'
};

// --- OPÇÕES DE MENUS SUSPENSOS ---
const ESTADO_STATUS_OPTIONS = [
  "", "Semeadura <100", "Semeadouro <35", "Germinação >100", 
  "Crescimento >500", "Raiz >1000", "Árvore >5000", "Colheita"
];

const CAPITAL_ESTRATEGIA_OPTIONS = [
  "", "Mobilização Ativa", "Reunião de Núcleo", "Ação de Rua (Panfletagem)",
  "Estratégia Digital", "Manutenção Territorial", "Observação"
];

// --- API ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyt0-5L-z-fWmucP2JP7nqHtmIe0CUGkY1CZSkom--RxSRemXjUfWjgX8VeFR6LQoLqHg/exec"; 

// --- FUNÇÕES AUXILIARES ---
const formatCurrency = (val) => {
  if (!val) return "R$ 0,00";
  if (typeof val === 'string' && val.includes('R$')) return val; // Já vem formatado
  const numeric = parseFloat(val);
  if (isNaN(numeric)) return val;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
};

const parseSortValue = (val) => {
  if (val === null || val === undefined || val === "") return -Infinity; // Vazios vão pro final
  if (typeof val === 'number') return val;
  let str = String(val).trim();
  
  if (str.startsWith('R$')) {
    return parseFloat(str.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
  }
  if (str.endsWith('%')) {
    return parseFloat(str.replace('%', '').replace(',', '.').trim()) || 0;
  }
  if (/^\d{1,3}(\.\d{3})*$/.test(str)) { // ex: "1.500" (Mil e quinhentos)
    return parseInt(str.replace(/\./g, ''), 10);
  }
  
  const parsed = parseFloat(str);
  if (!isNaN(parsed) && String(parsed) === str) return parsed; 
  
  return str.toLowerCase();
};


export default function App() {
  const [activeTab, setActiveTab] = useState('ESTADO'); // ESTADO, CAPITAL, DASHBOARD
  const [viewMode, setViewMode] = useState('table'); // table, cards
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);

  const [estadoData, setEstadoData] = useState([]);
  const [capitalData, setCapitalData] = useState([]);
  
  // Controle de Ordenação { tab: { key: index, direction: 'asc'|'desc' } }
  const [sortConfig, setSortConfig] = useState({ ESTADO: null, CAPITAL: null });

  // Controle de Modal de Detalhes
  const [selectedItem, setSelectedItem] = useState(null);

  // 1. Buscar Dados
  const fetchSheets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error("Não foi possível aceder à folha de cálculo.");
      const data = await response.json();
      
      if (data.estado && data.capital) {
        setEstadoData(data.estado);
        setCapitalData(data.capital);
      } else {
         throw new Error("Formato de dados inválido.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de ligação. Verifique se tem internet e se o script está ativo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSheets(); }, []);

  // 2. Gravar Edição
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
    
    // Atualizar no modal aberto, se houver
    if (selectedItem && selectedItem.originalIndex === originalRowIndex) {
      const updatedRow = [...selectedItem.row];
      updatedRow[colIndex] = newValue;
      setSelectedItem({ ...selectedItem, row: updatedRow });
    }
  };

  // --- ORDENAÇÃO DE DADOS ---
  const handleSort = (tab, index) => {
    let direction = 'asc';
    const currentSort = sortConfig[tab];
    if (currentSort && currentSort.key === index && currentSort.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig(prev => ({ ...prev, [tab]: { key: index, direction } }));
  };

  const getSortedData = (data, tabName) => {
    if (data.length <= 1) return { headers: [], rows: [] };
    const headers = data[0];
    // Adicionamos originalIndex para não perder a referência exata da linha na hora de salvar!
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

  // --- DASHBOARD (Mapas Literais em Blocos / Mondrian Style) ---
  const renderDashboard = () => {
    if (estadoData.length < 2) return null;
    
    const headers = estadoData[0];
    const safeHeaders = headers.map(h => String(h).toLowerCase());
    const regiaoIdx = safeHeaders.findIndex(h => h.includes('região'));
    const votos22Idx = safeHeaders.findIndex(h => h === '2022' || h.includes('2022') && !h.includes('%'));
    
    const statsByRegion = {};
    let totalVotos = 0;
    
    estadoData.slice(1).forEach(row => {
      const regiao = row[regiaoIdx] || 'Indefinida';
      const votos = parseSortValue(row[votos22Idx] || 0);
      if (votos > 0) {
        if (!statsByRegion[regiao]) statsByRegion[regiao] = 0;
        statsByRegion[regiao] += votos;
        totalVotos += votos;
      }
    });

    const regionsSorted = Object.entries(statsByRegion).sort((a, b) => b[1] - a[1]);
    const maxVotos = regionsSorted[0]?.[1] || 1;

    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black text-xl uppercase mb-2">Total de Votos (2022)</h3>
            <p className="text-5xl font-black text-[#c32148]">{totalVotos.toLocaleString('pt-BR')}</p>
          </div>
          <div className="border-4 border-black bg-[#e2b714] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black text-xl uppercase mb-2 text-black">Municípios Atingidos</h3>
            <p className="text-5xl font-black text-black">{estadoData.length - 1}</p>
          </div>
        </div>

        {/* MAPA LITERAL EM BLOCOS (Sem bibliotecas externas) */}
        <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-black text-xl uppercase mb-6 flex items-center gap-2">
            <span className="w-4 h-4 bg-[#008080] border-2 border-black inline-block"></span>
            Mapa Literal de Votos por Região
          </h3>
          
          <div className="flex flex-col gap-4">
            {regionsSorted.map(([regiao, votos], idx) => {
              const percentage = Math.max((votos / maxVotos) * 100, 5); // min 5% para aparecer
              const barColor = idx % 3 === 0 ? COLORS.crimson : idx % 3 === 1 ? COLORS.teal : COLORS.mustard;
              const textColor = idx % 3 === 2 ? COLORS.black : COLORS.white;

              return (
                <div key={regiao} className="flex flex-col">
                  <div className="flex justify-between text-sm font-bold uppercase mb-1">
                    <span>{regiao}</span>
                    <span>{votos.toLocaleString('pt-BR')} votos</span>
                  </div>
                  <div className="w-full bg-[#f4f4f4] border-2 border-black h-8 relative">
                    <div 
                      className="absolute top-0 left-0 h-full border-r-2 border-black transition-all duration-1000"
                      style={{ width: `${percentage}%`, backgroundColor: barColor }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };


  // --- RENDERIZADOR PRINCIPAL (TABELA / CARDS) ---
  const renderDataView = (tabName, dataObj, options) => {
    const { headers, sortedRows } = getSortedData(dataObj, tabName);
    if (headers.length === 0) return null;

    const safeHeaders = headers.map(h => String(h).toLowerCase());
    const findIndex = (strMatch) => safeHeaders.findIndex(h => h === strMatch || h.includes(strMatch.toLowerCase()));
    
    // Índices Dinâmicos
    const indices = tabName === 'ESTADO' ? {
      title: findIndex('cidade'), subtitle: findIndex('região'),
      votos22: findIndex('2022') > -1 ? findIndex('2022') : findIndex('votos 2022'),
      emendasTotal: findIndex('valor total de emendas'),
      editField1: findIndex('círculos territoriais')
    } : {
      title: findIndex('local'), subtitle: findIndex('bairro replan'),
      votos22: findIndex('votos 2022'),
      editField1: findIndex('equipe do mandato'),
      editField2: findIndex('estratégia territorial')
    };

    const sortConfigLocal = sortConfig[tabName];
    const SortIcon = ({ idx }) => {
      if (sortConfigLocal?.key !== idx) return <span className="text-gray-400 text-[10px] ml-1">↕</span>;
      return <span className="text-white text-xs ml-1 font-black">{sortConfigLocal.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    // VISÃO CARDS (MOBILE)
    if (viewMode === 'cards') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
          {sortedRows.map((item, i) => {
            const row = item.rowData;
            const mainTitle = row[indices.title] || "Indefinido";
            if (!mainTitle.trim()) return null;

            return (
              <div key={i} className="border-4 border-black bg-white flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all">
                {/* Header do Card clicável para Modal */}
                <div 
                  className="p-4 border-b-4 border-black cursor-pointer group" 
                  style={{backgroundColor: tabName === 'ESTADO' ? COLORS.mustard : COLORS.teal}}
                  onClick={() => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex })}
                >
                  <h3 className="font-black text-lg uppercase truncate text-black group-hover:underline">
                    {mainTitle}
                  </h3>
                  <p className="text-xs font-bold text-black opacity-80 uppercase">{row[indices.subtitle]}</p>
                </div>
                
                {/* Corpo do Card */}
                <div className="p-4 flex-1 flex flex-col gap-3 text-sm font-bold">
                  <div className="flex justify-between border-b-2 border-black pb-1">
                    <span>Votos (2022):</span>
                    <span className="text-[#c32148]">{row[indices.votos22]}</span>
                  </div>
                  
                  {tabName === 'ESTADO' && indices.emendasTotal > -1 && (
                    <div className="flex justify-between border-b-2 border-black pb-1">
                      <span>Total Emendas:</span>
                      <span className="text-[#008080]">{formatCurrency(row[indices.emendasTotal])}</span>
                    </div>
                  )}

                  {/* Áreas Editáveis no Card */}
                  <div className="mt-auto pt-2 space-y-2">
                    {tabName === 'ESTADO' ? (
                      <div>
                        <label className="text-xs uppercase text-gray-500">Status (Círculos)</label>
                        <select 
                          className="w-full bg-yellow-50 border-2 border-black p-1 font-bold outline-none"
                          value={row[indices.editField1] || ''}
                          onChange={(e) => handleEdit(tabName, item.originalIndex, indices.editField1, e.target.value)}
                        >
                          {ESTADO_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || "-- Selecione --"}</option>)}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs uppercase text-gray-500">Articulador</label>
                          <input 
                            type="text" className="w-full bg-red-50 border-2 border-black p-1 font-bold outline-none"
                            value={row[indices.editField1] || ''}
                            onChange={(e) => handleEdit(tabName, item.originalIndex, indices.editField1, e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase text-gray-500">Estratégia</label>
                          <select 
                            className="w-full bg-red-50 border-2 border-black p-1 font-bold outline-none"
                            value={row[indices.editField2] || ''}
                            onChange={(e) => handleEdit(tabName, item.originalIndex, indices.editField2, e.target.value)}
                          >
                            {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || "-- Selecione --"}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="p-2 border-t-2 border-black bg-gray-100 text-center text-xs font-bold uppercase cursor-pointer hover:bg-black hover:text-white transition-colors"
                     onClick={() => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex })}>
                  🔍 Abrir Ficha Completa
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // VISÃO TABELA (DESKTOP)
    return (
      <div className="overflow-x-auto border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-fade-in">
        <table className="w-full text-sm text-left font-medium whitespace-nowrap">
          <thead className="bg-[#111111] text-white uppercase text-xs">
            <tr className="bg-[#111111]">
              {headers.map((h, i) => {
                // Formatação visual dos cabeçalhos baseada na aba
                let bgColor = '#111111';
                let textColor = 'white';
                if (tabName === 'ESTADO') {
                  if (i === indices.editField1) { bgColor = COLORS.mustard; textColor = 'black'; }
                  else if (i >= indices.votos22 && i < indices.emendasTotal) bgColor = COLORS.teal;
                } else {
                  if (i === indices.editField1 || i === indices.editField2) { bgColor = COLORS.crimson; }
                }
                
                return (
                  <th 
                    key={i} 
                    className={`p-3 border-r-2 border-b-4 border-black cursor-pointer hover:bg-gray-800 transition-colors select-none ${i === indices.title ? 'sticky left-0 z-10 min-w-[200px]' : ''}`}
                    style={{ backgroundColor: bgColor, color: textColor }}
                    onClick={() => handleSort(tabName, i)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{h}</span>
                      <SortIcon idx={i} />
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((item, i) => {
              const row = item.rowData;
              const mainTitle = row[indices.title];
              if (!mainTitle || !String(mainTitle).trim()) return null;

              return (
                <tr key={i} className="border-b-2 border-black hover:bg-gray-200 transition-colors group">
                  {row.map((cell, colIdx) => {
                    const isTitle = colIdx === indices.title;
                    const isLOA = String(headers[colIdx]).toUpperCase().includes('LOA') || String(headers[colIdx]).toUpperCase().includes('VALOR');
                    
                    let cellContent = cell;
                    if (isLOA) cellContent = formatCurrency(cell);

                    // Colunas Editáveis
                    if (tabName === 'ESTADO' && colIdx === indices.editField1) {
                      return (
                        <td key={colIdx} className="p-0 border-r-2 border-black bg-yellow-50 min-w-[150px]">
                          <select 
                            className="w-full h-full p-2 bg-transparent font-bold outline-none cursor-pointer focus:bg-yellow-200"
                            value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)}
                          >
                            {ESTADO_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </td>
                      );
                    }
                    if (tabName === 'CAPITAL' && colIdx === indices.editField1) {
                      return (
                         <td key={colIdx} className="p-0 border-r-2 border-black bg-red-50 min-w-[150px]">
                           <input 
                            type="text" className="w-full h-full p-2 bg-transparent font-bold outline-none focus:bg-red-100"
                            value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)}
                          />
                        </td>
                      );
                    }
                    if (tabName === 'CAPITAL' && colIdx === indices.editField2) {
                      return (
                         <td key={colIdx} className="p-0 border-r-2 border-black bg-red-50 min-w-[150px]">
                           <select 
                            className="w-full h-full p-2 bg-transparent font-bold outline-none cursor-pointer focus:bg-red-100"
                            value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)}
                          >
                            {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </td>
                      );
                    }

                    // Células Normais (Título clicável)
                    return (
                      <td 
                        key={colIdx} 
                        className={`p-2 border-r-2 border-black ${isTitle ? 'sticky left-0 bg-white font-black cursor-pointer group-hover:bg-gray-200 hover:underline' : ''}`}
                        onClick={isTitle ? () => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex }) : undefined}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // --- MODAL DE FICHA COMPLETA ---
  const renderModal = () => {
    if (!selectedItem) return null;
    const { tab, headers, row, originalIndex } = selectedItem;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in backdrop-blur-sm overflow-y-auto">
        <div className="bg-white border-8 border-black w-full max-w-3xl my-auto relative shadow-[16px_16px_0px_0px_rgba(226,183,20,1)]">
          {/* Header do Modal Mondrian */}
          <div className="flex border-b-4 border-black">
             <div className="w-4 bg-[#c32148] border-r-4 border-black"></div>
             <div className="flex-1 p-4 bg-[#111] text-white flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase truncate pr-4">{row[0] || 'Detalhes'}</h2>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="font-black text-xl hover:text-[#e2b714] transition-colors"
                >
                  X
                </button>
             </div>
          </div>
          
          {/* Grid de Informações */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 max-h-[70vh] overflow-y-auto">
             {headers.map((h, i) => {
               const val = row[i];
               const isLOA = String(h).toUpperCase().includes('LOA') || String(h).toUpperCase().includes('VALOR');
               const displayVal = isLOA ? formatCurrency(val) : (val || '-');
               
               // Verifica se é um campo que deve ser editável no modal também
               const safeH = String(h).toLowerCase();
               const isStatus = tab === 'ESTADO' && safeH.includes('círculos territoriais');
               const isArticulador = tab === 'CAPITAL' && safeH.includes('equipe do mandato');
               const isEstrategia = tab === 'CAPITAL' && safeH.includes('estratégia territorial');

               if (isStatus) {
                 return (
                    <div key={i} className="flex flex-col border-b-2 border-gray-300 pb-2 col-span-1 md:col-span-2">
                      <span className="text-xs font-black uppercase text-[#008080] mb-1">{h}</span>
                      <select 
                        className="bg-yellow-100 border-2 border-black p-2 font-bold focus:ring-0"
                        value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)}
                      >
                        {ESTADO_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                 );
               }
               if (isArticulador) {
                 return (
                    <div key={i} className="flex flex-col border-b-2 border-gray-300 pb-2 col-span-1 md:col-span-2">
                      <span className="text-xs font-black uppercase text-[#c32148] mb-1">{h}</span>
                      <input 
                        type="text" className="bg-red-100 border-2 border-black p-2 font-bold focus:ring-0"
                        value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)}
                      />
                    </div>
                 );
               }
               if (isEstrategia) {
                 return (
                    <div key={i} className="flex flex-col border-b-2 border-gray-300 pb-2 col-span-1 md:col-span-2">
                      <span className="text-xs font-black uppercase text-[#c32148] mb-1">{h}</span>
                      <select 
                        className="bg-red-100 border-2 border-black p-2 font-bold focus:ring-0"
                        value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)}
                      >
                        {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                 );
               }

               return (
                 <div key={i} className="flex flex-col border-b-2 border-gray-300 pb-2">
                   <span className="text-xs font-black uppercase text-gray-500 mb-1">{h}</span>
                   <span className="font-bold text-black break-words">{displayVal}</span>
                 </div>
               )
             })}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-[#f4f4f4] font-sans text-black selection:bg-[#e2b714] selection:text-black pb-12">
      {/* HEADER MONDRIAN */}
      <header className="border-b-4 border-black bg-white flex flex-col md:flex-row shadow-md relative z-20">
        <div className="flex-1 p-6 flex items-center gap-4 border-b-4 md:border-b-0 md:border-r-4 border-black">
          <div className="w-12 h-12 border-4 border-black bg-[#c32148] flex-shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-2xl">
             📊
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">Tabulum</h1>
            <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-gray-600 mt-1">Gestão Territorial 2026</p>
          </div>
        </div>
        <div className="flex flex-row md:flex-col w-full md:w-32">
          <div className="flex-1 h-8 md:h-full border-r-4 md:border-r-0 md:border-b-4 border-black" style={{ backgroundColor: COLORS.mustard }}></div>
          <div className="flex-1 h-8 md:h-full border-r-4 md:border-r-0 md:border-b-4 border-black" style={{ backgroundColor: COLORS.teal }}></div>
          <div className="flex-1 h-8 md:h-full" style={{ backgroundColor: COLORS.crimson }}></div>
        </div>
      </header>

      {/* TABS NAVIGATION */}
      <div className="flex flex-col sm:flex-row border-b-4 border-black bg-white sticky top-0 z-20">
        <button 
          onClick={() => setActiveTab('ESTADO')}
          className={`flex-1 p-3 md:p-4 font-black text-sm md:text-xl uppercase tracking-wider border-b-4 sm:border-b-0 sm:border-r-4 border-black transition-all ${activeTab === 'ESTADO' ? 'bg-[#e2b714] text-black shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
        >
          Estado
        </button>
        <button 
          onClick={() => setActiveTab('CAPITAL')}
          className={`flex-1 p-3 md:p-4 font-black text-sm md:text-xl uppercase tracking-wider border-b-4 sm:border-b-0 sm:border-r-4 border-black transition-all ${activeTab === 'CAPITAL' ? 'bg-[#008080] text-white shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
        >
          Capital
        </button>
        <button 
          onClick={() => setActiveTab('DASHBOARD')}
          className={`flex-1 p-3 md:p-4 font-black text-sm md:text-xl uppercase tracking-wider transition-all ${activeTab === 'DASHBOARD' ? 'bg-[#c32148] text-white shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
        >
          Dashboard
        </button>
      </div>

      {/* CONTENT AREA */}
      <main className="p-4 md:p-8 max-w-[1800px] mx-auto">
        {error && (
          <div className="mb-6 border-4 border-black bg-[#c32148] text-white p-4 font-bold flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            ⚠️ <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <span className="w-4 h-4 inline-block border-2 border-black bg-[#111]"></span>
              Visão: {activeTab}
            </h2>
            
            {activeTab !== 'DASHBOARD' && (
              <div className="flex bg-white border-4 border-black text-sm font-bold">
                <button 
                  onClick={() => setViewMode('table')} 
                  className={`px-3 py-1 uppercase ${viewMode==='table' ? 'bg-black text-white' : 'hover:bg-gray-200'}`}
                >Lista</button>
                <button 
                  onClick={() => setViewMode('cards')} 
                  className={`px-3 py-1 border-l-4 border-black uppercase ${viewMode==='cards' ? 'bg-black text-white' : 'hover:bg-gray-200'}`}
                >Cards</button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
             <button 
               onClick={fetchSheets}
               className="text-xs bg-white text-black border-2 border-black font-black px-3 py-2 uppercase tracking-widest hover:bg-gray-200 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              🔄 Atualizar
            </button>
            {saving && (
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-[#e2b714] text-black px-3 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                ⏳ Salvando...
              </div>
            )}
            {!saving && lastSaved && (
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-[#008080] text-white px-3 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                ✅ Salvo
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-4xl mb-4 animate-bounce">⏳</div>
            <p className="font-bold uppercase tracking-wider text-center">
              Lendo Google Sheets...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'ESTADO' && renderDataView('ESTADO', estadoData)}
            {activeTab === 'CAPITAL' && renderDataView('CAPITAL', capitalData)}
            {activeTab === 'DASHBOARD' && renderDashboard()}
          </>
        )}
      </main>
      
      {/* OVERLAY MODAL FICHA */}
      {renderModal()}

    </div>
  );
}
