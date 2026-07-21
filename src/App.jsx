import React, { useState, useEffect } from 'react';

// --- CONSTANTES E CONFIGURAÇÕES (Mondrian Design System) ---
const COLORS = {
  mustard: '#e2b714',
  crimson: '#c32148',
  teal: '#008080',
  black: '#111111',
  white: '#ffffff',
  lightGray: '#f4f4f4'
};
const PIE_COLORS = [COLORS.crimson, COLORS.mustard, COLORS.teal, '#333333', '#777777', '#aaaaaa', '#dddddd'];

const ESTADO_STATUS_OPTIONS = ["", "Semeadura <100", "Semeadouro <35", "Germinação >100", "Crescimento >500", "Raiz >1000", "Árvore >5000", "Colheita"];
const CAPITAL_ESTRATEGIA_OPTIONS = ["", "Mobilização Ativa", "Reunião de Núcleo", "Ação de Rua (Panfletagem)", "Estratégia Digital", "Manutenção Territorial", "Observação"];

const getScriptUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SCRIPT_URL) return import.meta.env.VITE_SCRIPT_URL;
    if (typeof process !== 'undefined' && process.env && process.env.VITE_SCRIPT_URL) return process.env.VITE_SCRIPT_URL;
  } catch (e) {}
  return ""; 
};
const SCRIPT_URL = getScriptUrl(); 

// --- FUNÇÕES UTILITÁRIAS ---
const formatCurrency = (val) => {
  if (!val) return "R$ 0,00";
  if (typeof val === 'string' && val.includes('R$')) return val; 
  const numeric = parseFloat(val);
  return isNaN(numeric) ? val : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
};

const formatPercentage = (val) => {
  if (val === null || val === undefined || val === '') return '-';
  if (typeof val === 'string' && val.includes('%')) return val;
  let num = parseFloat(val);
  if (isNaN(num)) return val;
  if (num <= 1 && num > 0) num = num * 100;
  return num.toFixed(2).replace('.', ',') + '%';
};

const parseSortValue = (val) => {
  if (!val && val !== 0) return -Infinity; 
  if (typeof val === 'number') return val;
  let str = String(val).trim();
  
  if (str.startsWith('R$')) return parseFloat(str.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
  if (str.endsWith('%')) return parseFloat(str.replace('%', '').replace(',', '.')) || 0;
  if (/^\d{1,3}(\.\d{3})*$/.test(str)) return parseInt(str.replace(/\./g, ''), 10);
  
  const parsed = parseFloat(str.replace(',', '.')); 
  return (!isNaN(parsed) && String(parsed) === str.replace(',', '.')) ? parsed : str.toLowerCase();
};

const getShortHeader = (headerString) => {
  const s = String(headerString).toUpperCase();
  if (s.includes('DIÁRIAS')) return 'DIÁRIAS';
  if (s.includes('EQUIPE')) return 'ARTICULADOR';
  if (s.includes('VALOR TOTAL DE EMENDAS') || s.includes('EMENDA')) return 'EMENDAS';
  if (s.includes('% DOS VOTOS') || s.includes('% VOTOS')) return '% VOTOS';
  if (s.includes('DIRETÓRIO')) return 'DIRETÓRIO';
  if (s.includes('CÍRCULOS TERRITORIAIS')) return 'STATUS (CÍRCULOS)';
  if (s.includes('ESTRATÉGIA TERRITORIAL')) return 'ESTRATÉGIA';
  if (s.includes('BAIRRO REPLAN')) return 'BAIRRO';
  if (s.includes('2022') || s.includes('VOTOS')) return 'VOTOS';
  return s;
};

// Funções de inteligência de dados (identificar índices dinamicamente)
const findIndices = (headers) => {
  const safeH = headers.map(h => String(h).toLowerCase());
  return {
    cidade: safeH.findIndex(h => h === 'cidade' || h === 'município' || h === 'local'),
    regiao: safeH.findIndex(h => h.includes('região') || h.includes('bairro replan') || h.includes('distrito')),
    votos: safeH.findIndex(h => h.includes('2022') || h.includes('votos') || h === 'voto'),
    emendas: safeH.filter(h => h.includes('emenda') || h.includes('loa')), // Array de colunas de emendas
    diarias: safeH.findIndex(h => h.includes('diária')),
    status: safeH.findIndex(h => h.includes('círculos') || h.includes('estratégia territorial')),
    articulador: safeH.findIndex(h => h.includes('equipe do mandato') || h.includes('articulador'))
  };
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [activeTab, setActiveTab] = useState('DASHBOARD'); 
  const [viewMode, setViewMode] = useState('cards'); // Default para cards (mais limpo)
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
      } else throw new Error("Dados inválidos. Verifique as abas da planilha.");
    } catch (err) {
      setError("Erro de rede ao conectar com a base de dados. " + err.message);
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
      alert("Erro ao gravar na nuvem. Verifique sua conexão.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tab, originalRowIndex, colIndex, newValue) => {
    const isEstado = tab === 'ESTADO';
    const data = isEstado ? estadoData : capitalData;
    const setData = isEstado ? setEstadoData : setCapitalData;

    const newData = [...data];
    newData[originalRowIndex + 1][colIndex] = newValue;
    setData(newData);
    updateSheet(tab, originalRowIndex, colIndex, newValue);

    if (selectedItem && selectedItem.originalIndex === originalRowIndex) {
      const updatedRow = [...selectedItem.row];
      updatedRow[colIndex] = newValue;
      setSelectedItem({ ...selectedItem, row: updatedRow });
    }
  };

  const handleSort = (tab, index) => {
    let direction = 'asc';
    if (sortConfig[tab]?.key === index && sortConfig[tab].direction === 'asc') direction = 'desc';
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

  // Processa dados brutos para gerar os rankings e insights
  const processAnalytics = (data, tipo) => {
    if (data.length < 2) return [];
    const headers = data[0];
    const idx = findIndices(headers);
    
    const registros = [];
    data.slice(1).forEach(row => {
      const nome = row[idx.cidade] ? String(row[idx.cidade]).trim() : 'Desconhecido';
      if (!nome || nome === 'Desconhecido') return;

      const votos = idx.votos > -1 ? parseSortValue(row[idx.votos]) : 0;
      let emendas = 0;
      idx.emendas.forEach(i => { emendas += (parseSortValue(row[i]) || 0); });
      const diarias = idx.diarias > -1 ? parseSortValue(row[idx.diarias]) : 0;
      
      registros.push({ nome, votos, emendas, diarias });
    });

    return registros;
  };

  const renderRankList = (title, data, metric, color, isCurrency = false, subtitle = "") => (
    <div className="border-4 border-black bg-white flex flex-col h-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="p-3 border-b-4 border-black text-white flex justify-between items-end" style={{ backgroundColor: color }}>
        <h3 className="font-black text-sm uppercase tracking-wider leading-tight">{title}</h3>
      </div>
      {subtitle && <div className="px-3 py-2 bg-gray-100 border-b-2 border-black text-[10px] font-bold uppercase text-gray-600">{subtitle}</div>}
      <div className="p-3 flex flex-col gap-2 overflow-y-auto max-h-[300px]">
        {data.slice(0, 10).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between border-b-2 border-gray-100 pb-1 last:border-0">
            <span className="font-bold text-xs uppercase truncate pr-2 w-2/3">{idx + 1}. {item.nome}</span>
            <span className="font-black text-xs whitespace-nowrap" style={{ color: color }}>
              {isCurrency ? formatCurrency(item[metric]) : item[metric].toLocaleString('pt-BR')}
            </span>
          </div>
        ))}
        {data.length === 0 && <div className="text-xs text-gray-400 font-bold uppercase text-center py-4">Sem dados suficientes</div>}
      </div>
    </div>
  );

  const renderDashboard = () => {
    if (estadoData.length < 2 && capitalData.length < 2) return null;
    
    const analyticsSC = processAnalytics(estadoData, 'ESTADO').filter(r => r.nome.toUpperCase() !== 'FLORIANÓPOLIS');
    const analyticsCap = processAnalytics(capitalData, 'CAPITAL');

    // Cálculos de prioridade (Onde Circular)
    // Alta prioridade: Tem votos (>100), mas tem 0 diárias (presença fraca)
    const prioridadeCirculacaoSC = [...analyticsSC]
      .filter(r => r.votos > 100)
      .sort((a, b) => (b.votos / (a.diarias + 1)) - (a.votos / (b.diarias + 1))); 
      // Ratio: Votos por Diária (quanto mais alto, mais "rende" ir lá, ou mais "abandonado" está)

    return (
      <div className="flex flex-col gap-10 animate-fade-in pb-12">
        {/* CABEÇALHO DO DASHBOARD */}
        <div className="bg-[#111] p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(226,183,20,1)] flex flex-col md:flex-row gap-4 justify-between items-center text-white">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Inteligência Estratégica</h2>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Resumo Executivo para Assessores</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-[#e2b714]">Status de Dados</div>
            <div className="text-sm font-black uppercase">SC: {estadoData.length-1} Linhas | CAP: {capitalData.length-1} Linhas</div>
          </div>
        </div>

        {/* PERGUNTAS CHAVE DOS ASSESSORES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. Onde Circular (Recomendação do Analista) */}
          <div className="col-span-1 lg:col-span-2 border-4 border-black bg-[#e2b714] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            <div className="p-4 border-b-4 border-black bg-[#111] text-white">
              <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-2">🎯 Onde Marquito deve circular?</h3>
            </div>
            <div className="p-4 bg-white flex-1 text-black text-xs font-bold uppercase flex flex-col gap-3">
              <p className="text-[#008080] border-b-2 border-gray-200 pb-2">Top 5 Locais com alta densidade eleitoral vs. baixa presença recente (Diárias).</p>
              {prioridadeCirculacaoSC.slice(0, 5).map((c, i) => (
                <div key={i} className="flex justify-between items-center border-l-4 border-[#c32148] pl-3 py-1 bg-gray-50">
                  <span className="truncate pr-2">{i+1}. {c.nome}</span>
                  <div className="text-right shrink-0">
                    <span className="block text-[#c32148]">{c.votos.toLocaleString()} Votos</span>
                    <span className="block text-gray-500 text-[10px]">{c.diarias} Diárias reg.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Onde teve emendas */}
          {renderRankList("💰 Maiores Emendas (SC)", [...analyticsSC].sort((a, b) => b.emendas - a.emendas).filter(r => r.emendas > 0), "emendas", COLORS.teal, true, "Municípios que mais receberam recursos")}

          {/* 3. Onde há diárias */}
          {renderRankList("🚗 Mapa de Diárias (SC)", [...analyticsSC].sort((a, b) => b.diarias - a.diarias).filter(r => r.diarias > 0), "diarias", COLORS.black, false, "Presença física registrada")}

        </div>

        {/* CONSOLIDAÇÃO DE VOTOS */}
        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(195,33,72,1)] flex flex-col mt-4">
          <div className="p-4 border-b-4 border-black bg-[#c32148] text-white">
            <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-2">🗳️ Fortaleza Eleitoral (Onde tem Votos)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 p-6 gap-8 bg-[#fcfcfc]">
            <div>
               <h4 className="font-black text-sm uppercase text-[#111] mb-4 border-b-2 border-black pb-1">Top 10 - Estado (SC)</h4>
               <div className="flex flex-col gap-2">
                 {[...analyticsSC].sort((a, b) => b.votos - a.votos).slice(0,10).map((c, i) => (
                   <div key={i} className="flex items-center gap-3">
                     <span className="font-black text-xs text-gray-400 w-5">{i+1}.</span>
                     <span className="font-bold text-xs uppercase flex-1 truncate">{c.nome}</span>
                     <span className="font-black text-xs text-[#c32148]">{c.votos.toLocaleString()} V</span>
                   </div>
                 ))}
               </div>
            </div>
            <div>
               <h4 className="font-black text-sm uppercase text-[#111] mb-4 border-b-2 border-black pb-1">Top 10 - Capital (Bairros/Locais)</h4>
               <div className="flex flex-col gap-2">
                 {[...analyticsCap].sort((a, b) => b.votos - a.votos).slice(0,10).map((c, i) => (
                   <div key={i} className="flex items-center gap-3">
                     <span className="font-black text-xs text-gray-400 w-5">{i+1}.</span>
                     <span className="font-bold text-xs uppercase flex-1 truncate">{c.nome}</span>
                     <span className="font-black text-xs text-[#c32148]">{c.votos.toLocaleString()} V</span>
                   </div>
                 ))}
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

    const isEstado = tabName === 'ESTADO';
    const mainColor = isEstado ? COLORS.mustard : COLORS.teal;
    const idx = findIndices(headers);

    // Identificar colunas para sumarização nos Cards
    let totaisEmendas = (row) => idx.emendas.reduce((acc, curr) => acc + (parseSortValue(row[curr]) || 0), 0);

    const SortIcon = ({ colIdx }) => {
      const conf = sortConfig[tabName];
      return conf?.key !== colIdx ? <span className="text-gray-400 opacity-50 text-[10px] ml-1">↕</span> : 
             <span className="text-white text-xs ml-1 font-black">{conf.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    if (viewMode === 'cards') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in pb-10">
          {sortedRows.map((item, i) => {
            const row = item.rowData;
            const titulo = row[idx.cidade];
            if (!titulo?.trim()) return null;

            const votos = row[idx.votos] ? parseSortValue(row[idx.votos]) : 0;
            const emendas = totaisEmendas(row);
            const diarias = idx.diarias > -1 ? parseSortValue(row[idx.diarias]) : 0;

            return (
              <div key={i} className="border-4 border-black bg-white flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform relative">
                {/* Cabeçalho do Card */}
                <div className="p-4 border-b-4 border-black cursor-pointer group bg-[#111] text-white flex flex-col justify-between" 
                     onClick={() => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex })}>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-black text-lg uppercase line-clamp-2 leading-tight group-hover:text-[#e2b714] transition-colors">{titulo}</h3>
                    {idx.articulador > -1 && row[idx.articulador] && (
                      <span className="bg-[#c32148] text-white text-[9px] font-black uppercase px-2 py-1 border-2 border-black whitespace-nowrap">
                        {row[idx.articulador]}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase truncate mt-2">{idx.regiao > -1 ? row[idx.regiao] : ''}</p>
                </div>
                
                {/* KPIs Sistematizados */}
                <div className="p-4 flex-1 flex flex-col gap-3 text-xs font-bold bg-[#fcfcfc]">
                  
                  <div className="grid grid-cols-2 gap-2 mb-2 border-b-2 border-gray-200 pb-3">
                    <div className="flex flex-col">
                      <span className="text-gray-500 uppercase text-[9px] tracking-wider">Votos</span>
                      <span className="text-[#c32148] text-lg font-black">{votos.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <span className="text-gray-500 uppercase text-[9px] tracking-wider">Diárias</span>
                      <span className="text-black text-lg font-black">{diarias > 0 ? diarias : '-'}</span>
                    </div>
                    <div className="col-span-2 flex flex-col mt-1">
                      <span className="text-gray-500 uppercase text-[9px] tracking-wider">Emendas (Total)</span>
                      <span className="text-[#008080] font-black">{emendas > 0 ? formatCurrency(emendas) : 'R$ 0,00'}</span>
                    </div>
                  </div>

                  {/* Campos Editáveis Rápidos */}
                  <div className="mt-auto space-y-3">
                    {idx.status > -1 && (
                      <div>
                        <label className="text-[10px] uppercase font-black tracking-wider mb-1 block" style={{color: mainColor}}>
                          {getShortHeader(headers[idx.status])}
                        </label>
                        <select className="w-full bg-gray-50 border-2 border-black p-2 font-bold outline-none text-xs focus:bg-gray-200"
                          value={row[idx.status] || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, idx.status, e.target.value)}>
                          {(isEstado ? ESTADO_STATUS_OPTIONS : CAPITAL_ESTRATEGIA_OPTIONS).map(opt => <option key={opt} value={opt}>{opt || "-- Definir --"}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-3 border-t-4 border-black text-black text-center text-xs font-black uppercase cursor-pointer hover:opacity-90 transition-opacity"
                     style={{ backgroundColor: mainColor, color: isEstado ? 'black' : 'white' }}
                     onClick={() => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex })}>
                  Ficha Completa ➔
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Visão em Tabela (Mais limpa, apenas colunas essenciais, o resto na ficha)
    // Para limpar a tabela, mostramos apenas: Cidade, Região, Votos, Status, Diárias, Total Emendas
    return (
      <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col animate-fade-in relative z-0 mb-10">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-xs text-left font-medium border-collapse">
            <thead className="bg-[#111] text-white uppercase sticky top-0 z-20 shadow-md">
              <tr>
                {headers.map((h, i) => {
                  const shortH = getShortHeader(h);
                  // Ocultar colunas prolixas na tabela para "limpar a interface" (elas ficam no Modal)
                  if (![idx.cidade, idx.regiao, idx.votos, idx.status, idx.diarias, idx.articulador].includes(i) && !idx.emendas.includes(i)) {
                    return null; 
                  }

                  let widthClass = 'w-24'; 
                  if (i === idx.cidade) widthClass = 'min-w-[150px] sticky left-0 z-30 bg-[#111] shadow-[2px_0_0_#000]';
                  if (i === idx.status) widthClass = 'min-w-[140px]';

                  return (
                    <th key={i} onClick={() => handleSort(tabName, i)}
                      className={`p-3 border-r-2 border-b-4 border-black cursor-pointer hover:bg-gray-800 transition-colors align-bottom ${widthClass}`}
                    >
                      <div className="flex items-end justify-between gap-1 text-[10px] sm:text-xs">
                        <span>{shortH}</span>
                        <SortIcon colIdx={i} />
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedRows.map((item, i) => {
                const row = item.rowData;
                if (!row[idx.cidade]) return null;

                return (
                  <tr key={i} className="border-b-2 border-gray-300 hover:bg-gray-50 transition-colors group">
                    {row.map((cell, colIdx) => {
                       if (![idx.cidade, idx.regiao, idx.votos, idx.status, idx.diarias, idx.articulador].includes(colIdx) && !idx.emendas.includes(colIdx)) {
                        return null; 
                      }

                      const hStr = String(headers[colIdx]).toUpperCase();
                      const isMoney = hStr.includes('LOA') || hStr.includes('VALOR') || hStr.includes('EMENDA');
                      const content = isMoney ? formatCurrency(cell) : 
                                      (hStr.includes('%') || hStr.includes('ROI')) ? formatPercentage(cell) : cell;

                      // Status Interativo na Tabela
                      if (colIdx === idx.status) {
                        return (
                          <td key={colIdx} className="p-0 border-r-2 border-black align-top bg-gray-50">
                            <select className="w-full h-full min-h-[40px] px-2 bg-transparent font-bold text-[10px] uppercase outline-none focus:bg-gray-200 cursor-pointer"
                              value={cell || ''} onChange={(e) => handleEdit(tabName, item.originalIndex, colIdx, e.target.value)}>
                              {(isEstado ? ESTADO_STATUS_OPTIONS : CAPITAL_ESTRATEGIA_OPTIONS).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </td>
                        );
                      }

                      return (
                        <td key={colIdx} onClick={colIdx === idx.cidade ? () => setSelectedItem({ tab: tabName, headers, row, originalIndex: item.originalIndex }) : undefined}
                          className={`p-3 border-r-2 border-black align-middle whitespace-normal break-words font-bold ${isMoney ? 'text-[#008080]' : ''} ${colIdx === idx.votos ? 'text-[#c32148] font-black' : ''} ${colIdx === idx.cidade ? 'sticky left-0 bg-white cursor-pointer group-hover:bg-gray-100 group-hover:text-[#c32148] z-10 shadow-[2px_0_0_#000] uppercase text-sm' : 'text-xs'}`}
                        >
                          {content || '-'}
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
    const idx = findIndices(headers);
    const mainColor = tab === 'ESTADO' ? COLORS.mustard : COLORS.teal;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 animate-fade-in backdrop-blur-sm overflow-hidden">
        <div className="bg-white border-8 border-black w-full max-w-5xl flex flex-col shadow-[12px_12px_0px_0px_rgba(226,183,20,1)] max-h-full">
          <div className="flex border-b-4 border-black shrink-0">
             <div className="w-4 border-r-4 border-black" style={{ backgroundColor: mainColor }}></div>
             <div className="flex-1 p-4 bg-[#111] text-white flex justify-between items-center">
                <div className="flex flex-col">
                  <h2 className="text-xl sm:text-3xl font-black uppercase truncate leading-none mb-1">{row[idx.cidade] || 'Ficha Detalhada'}</h2>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tab} - {row[idx.regiao] || 'Região não definida'}</span>
                </div>
                <button onClick={() => setSelectedItem(null)} className="font-black text-2xl hover:text-[#c32148] px-2 transition-colors">X</button>
             </div>
          </div>
          
          <div className="p-4 sm:p-8 overflow-y-auto bg-[#f4f4f4]">
             {/* Highlight Panel inside Modal */}
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="border-4 border-black bg-white p-3 flex flex-col">
                   <span className="text-[10px] font-black uppercase text-gray-500 mb-1">Votos Base</span>
                   <span className="text-xl font-black text-[#c32148]">{row[idx.votos] || 0}</span>
                </div>
                <div className="border-4 border-black bg-white p-3 flex flex-col">
                   <span className="text-[10px] font-black uppercase text-gray-500 mb-1">Diárias</span>
                   <span className="text-xl font-black">{idx.diarias > -1 ? (row[idx.diarias] || 0) : '-'}</span>
                </div>
                <div className="col-span-2 border-4 border-black bg-white p-3 flex flex-col justify-center">
                   <span className="text-[10px] font-black uppercase text-gray-500 mb-1">Status / Estratégia</span>
                   {idx.status > -1 ? (
                     <select className="w-full bg-gray-100 border-2 border-black p-1 font-bold outline-none text-sm focus:bg-white"
                        value={row[idx.status] || ''} onChange={(e) => handleEdit(tab, originalIndex, idx.status, e.target.value)}>
                        {(tab === 'ESTADO' ? ESTADO_STATUS_OPTIONS : CAPITAL_ESTRATEGIA_OPTIONS).map(opt => <option key={opt} value={opt}>{opt || "-- Definir --"}</option>)}
                      </select>
                   ) : <span className="font-bold text-sm">Não mapeado</span>}
                </div>
             </div>

             <h3 className="font-black text-sm uppercase border-b-4 border-black pb-2 mb-4 text-[#111]">Todos os Dados Mapeados</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
               {headers.map((h, i) => {
                 const val = row[i];
                 const hStr = String(h).toUpperCase();
                 const displayVal = (hStr.includes('LOA') || hStr.includes('VALOR') || hStr.includes('EMENDA')) ? formatCurrency(val) : 
                                    (hStr.includes('%') || hStr.includes('ROI')) ? formatPercentage(val) : (val || '-');
                 
                 // Skip main fields already shown at top to avoid redundancy, except if we want full raw view. 
                 // Let's show all for completeness in the "Ficha"
                 if (i === idx.status) return null; // Already editable above

                 return (
                   <div key={i} className="flex flex-col border-b-2 border-gray-300 pb-2 bg-white p-2 border-2 border-transparent hover:border-black transition-colors">
                     <span className="text-[9px] font-black uppercase text-[#008080] mb-1 leading-tight tracking-wider">{h}</span>
                     
                     {/* Se for campo de articulador, permite edição simples */}
                     {i === idx.articulador ? (
                        <input type="text" className="bg-transparent font-black text-black text-sm outline-none border-b border-dashed border-gray-400 focus:border-black focus:bg-gray-100 px-1"
                          value={val || ''} onChange={(e) => handleEdit(tab, originalIndex, i, e.target.value)} placeholder="Definir equipe..." />
                     ) : (
                        <span className="font-black text-black break-words text-sm px-1">{displayVal}</span>
                     )}
                   </div>
                 )
               })}
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4] font-sans text-black selection:bg-[#e2b714] selection:text-black flex flex-col">
      <header className="border-b-4 border-black bg-white flex flex-col md:flex-row shadow-md relative z-30 shrink-0">
        <div className="flex-1 p-4 md:p-6 flex items-center gap-4 border-b-4 md:border-b-0 md:border-r-4 border-black">
          <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-black bg-[#c32148] shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl text-white">🗂️</div>
          <div className="overflow-hidden">
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none truncate">Tabulum</h1>
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-600 mt-1 truncate">Inteligência Eleitoral • 2026</p>
          </div>
        </div>
        <div className="flex flex-row md:flex-col w-full md:w-32 shrink-0 h-4 md:h-auto">
          <div className="flex-1 border-r-4 md:border-r-0 md:border-b-4 border-black bg-[#e2b714]"></div>
          <div className="flex-1 border-r-4 md:border-r-0 md:border-b-4 border-black bg-[#008080]"></div>
          <div className="flex-1 bg-[#c32148]"></div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row border-b-4 border-black bg-white sticky top-0 z-20 shrink-0 shadow-sm">
        {['DASHBOARD', 'ESTADO', 'CAPITAL'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 p-4 font-black text-sm md:text-base uppercase tracking-widest border-b-4 sm:border-b-0 sm:border-r-4 border-black transition-colors ${activeTab === tab ? (tab === 'DASHBOARD' ? 'bg-[#111] text-white' : tab === 'ESTADO' ? 'bg-[#e2b714] text-black' : 'bg-[#008080] text-white') + ' shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-400 hover:text-black'}`}
          > {tab} </button>
        ))}
      </div>

      <main className="p-4 md:p-6 flex-1 w-full max-w-[1600px] mx-auto flex flex-col">
        {error && <div className="mb-6 border-4 border-black bg-[#c32148] text-white p-4 font-bold flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">⚠️ <span className="text-sm">{error}</span></div>}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <span className="w-4 h-4 shrink-0 inline-block border-2 border-black bg-[#111]"></span> 
              {activeTab === 'DASHBOARD' ? 'Painel Estratégico' : `Base de Dados: ${activeTab}`}
            </h2>
            {activeTab !== 'DASHBOARD' && (
              <div className="flex bg-white border-4 border-black text-[10px] font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <button onClick={() => setViewMode('cards')} className={`px-4 py-2 transition-colors ${viewMode==='cards' ? 'bg-black text-white' : 'hover:bg-gray-200 text-gray-600'}`}>Cards</button>
                <button onClick={() => setViewMode('table')} className={`px-4 py-2 border-l-4 border-black transition-colors ${viewMode==='table' ? 'bg-black text-white' : 'hover:bg-gray-200 text-gray-600'}`}>Lista Limpa</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto font-black text-[10px] uppercase tracking-widest">
             <button onClick={fetchSheets} className="flex-1 lg:flex-none bg-white text-black border-4 border-black px-4 py-3 hover:bg-gray-200 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none whitespace-nowrap">
               🔄 Sincronizar Base
             </button>
            {saving && <div className="flex items-center gap-2 bg-[#e2b714] text-black px-4 py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">⏳ Salvando nuvem...</div>}
            {!saving && lastSaved && <div className="flex items-center gap-2 bg-[#008080] text-white px-4 py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">✅ Sincronizado</div>}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-h-[400px]">
            <div className="text-5xl mb-6 animate-bounce">📊</div>
            <p className="font-black uppercase tracking-widest text-center text-lg">Processando Dados Estratégicos...</p>
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
