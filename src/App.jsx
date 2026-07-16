import React, { useState, useEffect } from 'react';

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

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyt0-5L-z-fWmucP2JP7nqHtmIe0CUGkY1CZSkom--RxSRemXjUfWjgX8VeFR6LQoLqHg/exec"; 

const formatCurrency = (val) => {
  if (!val && val !== 0) return "R$ 0,00";
  if (typeof val === 'string' && val.includes('R$')) return val; 
  const numeric = parseFloat(val);
  if (isNaN(numeric)) return val;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
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
  const [activeTab, setActiveTab] = useState('ESTADO'); // ESTADO, CAPITAL, DASHBOARD
  const [viewMode, setViewMode] = useState('table'); // table, cards
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [estadoData, setEstadoData] = useState([]);
  const [capitalData, setCapitalData] = useState([]);
  
  const [sortConfig, setSortConfig] = useState({ ESTADO: null, CAPITAL: null });
  const [selectedItem, setSelectedItem] = useState(null); 

  const fetchSheets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error("Falha na comunicação com a API.");
      const data = await response.json();
      
      if (data.estado && data.capital) {
        setEstadoData(data.estado);
        setCapitalData(data.capital);
      } else {
         throw new Error("Formato de dados inválido.");
      }
    } catch (err) {
      setError("Erro de conexão. Verifique se o Google Apps Script está ativo.");
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
      alert("Houve uma falha de rede ao tentar gravar na nuvem.");
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

  const renderModal = () => {
    if (!selectedItem) return null;
    const { tab, headers, row, originalIndex } = selectedItem;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 animate-fade-in backdrop-blur-sm">
        <div className="bg-white border-8 border-black w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[12px_12px_0px_0px_rgba(226,183,20,1)]">
          <div className="flex border-b-4 border-black shrink-0">
             <div className="w-4 bg-[#c32148] border-r-4 border-black"></div>
             <div className="flex-1 p-4 bg-[#111] text-white flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-black uppercase truncate pr-4">{row[0] || 'Ficha Detalhada'}</h2>
                <button onClick={() => setSelectedItem(null)} className="font-black text-2xl hover:text-[#e2b714]">✕</button>
             </div>
          </div>
          
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 overflow-y-auto">
             {headers.map((h, i) => {
               const safeH = String(h).toLowerCase();
               const val = row[i];
               const isLOA = safeH.includes('loa') || safeH.includes('valor');
               const displayVal = isLOA ? formatCurrency(val) : (val || '-');
               
               const isStatus = tab === 'ESTADO' && safeH.includes('círculos');
               const isArticulador = tab === 'CAPITAL' && (safeH.includes('articulador') || safeH.includes('equipe'));
               const isEstrategia = tab === 'CAPITAL' && safeH.includes('estratégia');

               if (isStatus) {
                 return (
                    <div key={i} className="flex flex-col border-b-2 border-gray-300 pb-2 col-span-1 md:col-span-2">
                      <span className="text-xs font-black uppercase text-[#008080] mb-1">{h}</span>
                      <select className="bg-yellow-100 border-2 border-black p-2 font-bold focus:ring-0"
                        value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)}>
                        {ESTADO_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                 );
               }
               if (isArticulador) {
                 return (
                    <div key={i} className="flex flex-col border-b-2 border-gray-300 pb-2 col-span-1 md:col-span-2">
                      <span className="text-xs font-black uppercase text-[#c32148] mb-1">{h}</span>
                      <input type="text" className="bg-red-100 border-2 border-black p-2 font-bold focus:ring-0"
                        value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)} />
                    </div>
                 );
               }
               if (isEstrategia) {
                 return (
                    <div key={i} className="flex flex-col border-b-2 border-gray-300 pb-2 col-span-1 md:col-span-2">
                      <span className="text-xs font-black uppercase text-[#c32148] mb-1">{h}</span>
                      <select className="bg-red-100 border-2 border-black p-2 font-bold focus:ring-0"
                        value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)}>
                        {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                 );
               }

               return (
                 <div key={i} className="flex flex-col border-b-2 border-gray-200 pb-2">
                   <span className="text-[10px] font-black uppercase text-gray-500 mb-1 break-words whitespace-normal">{h}</span>
                   <span className="font-bold text-black break-words text-sm sm:text-base">{displayVal}</span>
                 </div>
               )
             })}
          </div>
        </div>
      </div>
    );
  };

  const renderDataView = (tabName, dataObj) => {
    const { headers, sortedRows } = getSortedData(dataObj, tabName);
    if (headers.length === 0) return null;

    const sortConfigLocal = sortConfig[tabName];
    const SortIcon = ({ idx }) => {
      if (sortConfigLocal?.key !== idx) return <span className="text-gray-400 text-[10px] ml-2">↕</span>;
      return <span className="text-white text-xs ml-2 font-black">{sortConfigLocal.direction === 'asc' ? '↓' : '↑'}</span>;
    };

    // VIEW: CARDS (Mobile friendly)
    if (viewMode === 'cards') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
          {sortedRows.map((item, i) => {
            const row = item.rowData;
            const mainTitle = row[0] || "Registro"; 
            const subTitle = row[1] || ""; 
            
            return (
              <div key={i} className="border-4 border-black bg-white flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all">
                <div 
                  className="p-4 border-b-4 border-black cursor-pointer group" 
                  style={{backgroundColor: tabName === 'ESTADO' ? COLORS.mustard : COLORS.teal}}
                  onClick={() => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex })}
                >
                  <h3 className="font-black text-lg uppercase break-words text-black group-hover:underline">
                    {mainTitle}
                  </h3>
                  <p className="text-xs font-bold text-black opacity-80 uppercase mt-1 break-words whitespace-normal">{subTitle}</p>
                </div>
                
                <div className="p-4 flex-1 flex flex-col gap-3 text-sm font-bold bg-[#fcfcfc]">
                  {headers.slice(2, 6).map((h, idx) => {
                    const safeH = String(h).toLowerCase();
                    const isLOA = safeH.includes('loa') || safeH.includes('valor');
                    return (
                      <div key={idx} className="flex justify-between border-b-2 border-gray-200 pb-1 gap-2">
                        <span className="text-gray-500 text-[10px] uppercase truncate w-1/2">{h}:</span>
                        <span className="text-right break-words whitespace-normal w-1/2">{isLOA ? formatCurrency(row[idx+2]) : row[idx+2]}</span>
                      </div>
                    )
                  })}
                </div>
                
                <div className="p-3 border-t-4 border-black bg-black text-white text-center text-xs font-black uppercase cursor-pointer hover:bg-[#c32148] transition-colors"
                     onClick={() => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex })}>
                  📄 Abrir Ficha Completa
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // VIEW: TABLE (Desktop optimized with wrapping)
    return (
      <div className="overflow-x-auto border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-fade-in relative max-h-[75vh]">
        <table className="w-full text-sm text-left font-medium">
          <thead className="bg-[#111111] text-white uppercase text-xs sticky top-0 z-20">
            <tr>
              {headers.map((h, i) => {
                const safeH = String(h).toLowerCase();
                let bgColor = '#111111';
                let textColor = 'white';
                
                const isStatus = tabName === 'ESTADO' && safeH.includes('círculos');
                const isArticulador = tabName === 'CAPITAL' && (safeH.includes('articulador') || safeH.includes('equipe'));
                const isEstrategia = tabName === 'CAPITAL' && safeH.includes('estratégia');

                if (isStatus || isArticulador || isEstrategia) {
                   bgColor = isStatus ? COLORS.mustard : COLORS.crimson;
                   textColor = isStatus ? 'black' : 'white';
                }

                return (
                  <th 
                    key={i} 
                    className={`p-3 border-r-2 border-b-4 border-black cursor-pointer hover:bg-gray-800 transition-colors align-bottom min-w-[140px] max-w-[250px] whitespace-normal break-words ${i === 0 ? 'sticky left-0 z-30 shadow-[2px_0_0_#000]' : ''}`}
                    style={{ backgroundColor: bgColor, color: textColor }}
                    onClick={() => handleSort(tabName, i)}
                    title="Clique para ordenar"
                  >
                    <div className="flex items-end justify-between gap-2">
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
              if (!row[0] && !row[1] && !row[2]) return null;

              return (
                <tr key={i} className="border-b-2 border-gray-300 hover:bg-gray-100 transition-colors group">
                  {row.map((cell, colIdx) => {
                    const h = String(headers[colIdx]).toLowerCase();
                    const isTitle = colIdx === 0;
                    const isLOA = h.includes('loa') || h.includes('valor') || h.includes('r$');
                    
                    let cellContent = cell;
                    if (isLOA) cellContent = formatCurrency(cell);

                    const isStatus = tabName === 'ESTADO' && h.includes('círculos');
                    const isArticulador = tabName === 'CAPITAL' && (h.includes('articulador') || h.includes('equipe'));
                    const isEstrategia = tabName === 'CAPITAL' && h.includes('estratégia');

                    if (isStatus) {
                      return (
                        <td key={colIdx} className="p-0 border-r-2 border-black bg-yellow-50 min-w-[180px]">
                          <select 
                            className="w-full h-full min-h-[48px] p-2 bg-transparent font-bold outline-none cursor-pointer focus:bg-yellow-200 text-xs whitespace-normal break-words"
                            value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)}
                          >
                            {ESTADO_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </td>
                      );
                    }
                    if (isArticulador) {
                      return (
                         <td key={colIdx} className="p-0 border-r-2 border-black bg-red-50 min-w-[180px]">
                           <input 
                            type="text" className="w-full h-full min-h-[48px] p-2 bg-transparent font-bold outline-none focus:bg-red-100 text-xs whitespace-normal break-words"
                            placeholder="Digitar nome..."
                            value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)}
                          />
                        </td>
                      );
                    }
                    if (isEstrategia) {
                      return (
                         <td key={colIdx} className="p-0 border-r-2 border-black bg-red-50 min-w-[180px]">
                           <select 
                            className="w-full h-full min-h-[48px] p-2 bg-transparent font-bold outline-none cursor-pointer focus:bg-red-100 text-xs whitespace-normal break-words"
                            value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)}
                          >
                            {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </td>
                      );
                    }

                    return (
                      <td 
                        key={colIdx} 
                        className={`p-3 border-r-2 border-black whitespace-normal break-words text-xs ${isTitle ? 'sticky left-0 bg-white font-black cursor-pointer group-hover:bg-gray-200 hover:underline hover:text-[#c32148] z-10 shadow-[2px_0_0_#000]' : ''}`}
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

  const renderDashboard = () => {
    if (estadoData.length < 2) return null;
    
    const headers = estadoData[0];
    const safeHeaders = headers.map(h => String(h).toLowerCase());
    
    const regiaoIdx = safeHeaders.findIndex(h => h.includes('região'));
    const votos22Idx = safeHeaders.findIndex(h => h === '2022' || (h.includes('2022') && !h.includes('%') && !h.includes('chapa')));
    
    const statsByRegion = {};
    let totalVotos = 0;
    
    estadoData.slice(1).forEach(row => {
      const regiao = (regiaoIdx > -1 && row[regiaoIdx]) ? row[regiaoIdx] : 'Não Informada';
      const votos = (votos22Idx > -1) ? parseSortValue(row[votos22Idx]) : 0;
      
      if (row[0]) {
        if (!statsByRegion[regiao]) statsByRegion[regiao] = { votos: 0, municipios: 0 };
        statsByRegion[regiao].municipios += 1;
        if (votos > 0) {
           statsByRegion[regiao].votos += votos;
           totalVotos += votos;
        }
      }
    });

    const regionsSorted = Object.entries(statsByRegion).sort((a, b) => b[1].votos - a[1].votos);
    const maxVotos = regionsSorted[0]?.[1].votos || 1;

    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
            <h3 className="font-black text-xl sm:text-2xl uppercase mb-2">Total de Votos (Est.)</h3>
            <p className="text-4xl sm:text-6xl font-black text-[#c32148]">{totalVotos.toLocaleString('pt-BR')}</p>
          </div>
          <div className="border-4 border-black bg-[#e2b714] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
            <h3 className="font-black text-xl sm:text-2xl uppercase mb-2 text-black">Municípios Na Planilha</h3>
            <p className="text-4xl sm:text-6xl font-black text-black">{estadoData.length - 1}</p>
          </div>
        </div>

        <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-black text-xl sm:text-2xl uppercase mb-8 flex items-center gap-3">
            <span className="w-6 h-6 bg-[#008080] border-4 border-black block"></span>
            Densidade por Região (Mapa Literal)
          </h3>
          
          <div className="flex flex-col gap-5">
            {regionsSorted.map(([regiao, dados], idx) => {
              const percentage = Math.max((dados.votos / maxVotos) * 100, 2); 
              const barColor = idx % 3 === 0 ? COLORS.crimson : idx % 3 === 1 ? COLORS.teal : COLORS.mustard;

              return (
                <div key={regiao} className="flex flex-col relative">
                  <div className="flex justify-between text-xs sm:text-sm font-black uppercase mb-1 z-10">
                    <span>{regiao} <span className="text-gray-400 font-bold ml-2">({dados.municipios} cidades)</span></span>
                    <span>{dados.votos.toLocaleString('pt-BR')} v</span>
                  </div>
                  <div className="w-full bg-[#f4f4f4] border-4 border-black h-10 relative">
                    <div 
                      className="absolute top-0 left-0 h-full border-r-4 border-black transition-all duration-1000"
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

  return (
    <div className="min-h-screen bg-[#f4f4f4] font-sans text-black selection:bg-[#e2b714] selection:text-black pb-12">
      <header className="border-b-4 border-black bg-white flex flex-col md:flex-row shadow-md relative z-30">
        <div className="flex-1 p-6 md:p-8 flex items-center gap-4 border-b-4 md:border-b-0 md:border-r-4 border-black">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-black bg-[#c32148] shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-2xl sm:text-3xl">
             📊
          </div>
          <div className="overflow-hidden">
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none truncate">Tabulum</h1>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-600 mt-1 truncate">Mapa de Votos 2026</p>
          </div>
        </div>
        <div className="flex flex-row md:flex-col w-full md:w-32 shrink-0">
          <div className="flex-1 h-6 md:h-full border-r-4 md:border-r-0 md:border-b-4 border-black bg-[#e2b714]"></div>
          <div className="flex-1 h-6 md:h-full border-r-4 md:border-r-0 md:border-b-4 border-black bg-[#008080]"></div>
          <div className="flex-1 h-6 md:h-full bg-[#c32148]"></div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row border-b-4 border-black bg-white sticky top-0 z-20">
        <button 
          onClick={() => setActiveTab('ESTADO')}
          className={`flex-1 p-3 sm:p-4 font-black text-sm sm:text-lg uppercase tracking-wider border-b-4 sm:border-b-0 sm:border-r-4 border-black transition-all ${activeTab === 'ESTADO' ? 'bg-[#e2b714] text-black shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
        >
          Estado
        </button>
        <button 
          onClick={() => setActiveTab('CAPITAL')}
          className={`flex-1 p-3 sm:p-4 font-black text-sm sm:text-lg uppercase tracking-wider border-b-4 sm:border-b-0 sm:border-r-4 border-black transition-all ${activeTab === 'CAPITAL' ? 'bg-[#008080] text-white shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
        >
          Capital
        </button>
        <button 
          onClick={() => setActiveTab('DASHBOARD')}
          className={`flex-1 p-3 sm:p-4 font-black text-sm sm:text-lg uppercase tracking-wider transition-all ${activeTab === 'DASHBOARD' ? 'bg-[#c32148] text-white shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
        >
          Dashboard
        </button>
      </div>

      <main className="p-4 sm:p-8 max-w-[1800px] mx-auto w-full">
        {error && (
          <div className="mb-6 border-4 border-black bg-[#c32148] text-white p-4 font-bold flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            ⚠️ <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <span className="w-4 h-4 shrink-0 inline-block border-2 border-black bg-[#111]"></span>
              Visão: {activeTab}
            </h2>
            
            {activeTab !== 'DASHBOARD' && (
              <div className="flex bg-white border-4 border-black text-xs sm:text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <button onClick={() => setViewMode('table')} className={`px-4 py-1.5 uppercase ${viewMode==='table' ? 'bg-black text-white' : 'hover:bg-gray-200'}`}>Tabela</button>
                <button onClick={() => setViewMode('cards')} className={`px-4 py-1.5 border-l-4 border-black uppercase ${viewMode==='cards' ? 'bg-black text-white' : 'hover:bg-gray-200'}`}>Cards</button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
             <button onClick={fetchSheets} className="text-xs bg-white text-black border-4 border-black font-black px-4 py-2 uppercase tracking-widest hover:bg-gray-200 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">
              🔄 Atualizar Planilha
            </button>
            {saving && (
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-[#e2b714] text-black px-3 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                ⏳ Salvando...
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 sm:p-24 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-5xl mb-6 animate-bounce">⏳</div>
            <p className="font-black uppercase tracking-widest text-center text-lg">Lendo Dados...</p>
          </div>
        ) : (
          <div className="w-full">
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
