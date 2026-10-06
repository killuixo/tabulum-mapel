import React, { useState, useEffect, useMemo } from 'react';

const COLORS = {
  mustard: '#e2b714',
  teal: '#008080',
  crimson: '#c32148',
  black: '#111111',
  white: '#ffffff',
  lightGray: '#f4f4f4'
};
const PIE_COLORS = [COLORS.mustard, COLORS.teal, COLORS.crimson, '#555555', '#999999', '#333333', '#dddddd'];

// A injeção dinâmica no Vite às vezes falha no build da Vercel. 
// Definimos o fallback explícito usando a URL do seu print para garantir que sempre funcione.
const fallbackUrl = "https://script.google.com/macros/s/AKfycbwZwDGkjRLBM-m5_HuE1UUVEsCTXchPkD5FncPwd6Sq8LLVEhE7ZW4_gs_SS5epjM8b/exec";
const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SCRIPT_URL) 
  ? import.meta.env.VITE_SCRIPT_URL 
  : fallbackUrl;

const Icons = {
  ChevronDown: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>,
  ChevronRight: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>,
  ArrowUp: () => <svg className="w-4 h-4 inline ml-1 text-[#e2b714]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M5 15l7-7 7 7"></path></svg>,
  ArrowDown: () => <svg className="w-4 h-4 inline ml-1 text-[#e2b714]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>,
  Download: () => <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M4 16v1h16v-1m-8-12v12m-4-4l4 4 4-4"></path></svg>,
  Printer: () => <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M17 17h2v-4H5v4h2m2 4h6v-4H9v4zM5 9h14V5H5v4z"></path></svg>,
  Map: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M9 20l-6-3V5l6 3m0 12l6-3m-6 3V8m6 10l6 3V6l-6-3m0 15V5"></path></svg>,
  Chart: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M18 20V10M12 20V4M6 20v-6"></path></svg>,
  List: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M4 6h16M4 12h16M4 18h16"></path></svg>,
  Grid: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"></path></svg>,
  ArrowLeft: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M19 12H5m7-7l-7 7 7 7"></path></svg>,
  Filter: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M3 4h18l-7 9v7l-4 2v-9L3 4z"></path></svg>
};

const parseSortValue = (val) => {
  if (!val && val !== 0) return -Infinity;
  if (typeof val === 'number') return val;
  const str = String(val).trim().toLowerCase();
  const num = parseFloat(str.replace(',', '.'));
  return (!isNaN(num) && String(num) === str.replace(',', '.')) ? num : str;
};

const parseNumberStrict = (val) => {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') return val;
  let str = String(val).trim();
  if (str === '-' || str === '') return 0;
  
  // Remove R$ e espaços
  str = str.replace(/[R$\s]/gi, '');
  
  // Trata padrão numérico brasileiro (vírgula como decimal)
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    // Se tiver ponto atuando como separador de milhar (ex: 1.250)
    if (/\.\d{3}$/.test(str) && (str.match(/\./g) || []).length === 1) {
      str = str.replace(/\./g, '');
    }
  }
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const exportToCSV = (data, filename) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const NativeBarChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.value));
  
  return (
    <div className="flex h-full items-end gap-2 px-2 pt-8 pb-6 overflow-x-auto">
      {data.map((item, idx) => {
        const heightPct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
        return (
          <div key={idx} className="flex flex-col items-center flex-1 min-w-[40px] group relative h-full justify-end">
            {/* Tooltip Hover */}
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[#111] text-white text-[10px] font-black uppercase px-2 py-1 whitespace-nowrap z-10 pointer-events-none transition-opacity border-2 border-black">
              {item.name}: {item.value.toLocaleString()}
            </div>
            {/* Bar */}
            <div className="w-full bg-[#008080] border-2 border-black group-hover:bg-[#c32148] transition-colors relative" 
                 style={{ height: `${heightPct}%`, minHeight: '4px' }}>
            </div>
            <div className="text-[9px] font-black uppercase mt-2 text-center truncate w-full transform -rotate-45 origin-top-left translate-y-2 translate-x-2">
              {item.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const NativePieChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let cumulativePercent = 0;

  return (
    <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center p-4 gap-6">
      <div className="w-40 h-40 shrink-0 relative">
        <svg viewBox="0 0 32 32" className="w-full h-full transform -rotate-90 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
          {data.map((slice, i) => {
            const percent = (slice.value / total) * 100;
            const offset = cumulativePercent;
            cumulativePercent += percent;
            return (
              <circle key={i} r="16" cx="16" cy="16" fill="transparent"
                stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth="32"
                strokeDasharray={`${percent} 100`} strokeDashoffset={`-${offset}`}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap sm:flex-col gap-2 justify-center max-h-40 overflow-y-auto">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center text-[10px] font-black uppercase bg-white border-2 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-3 h-3 mr-2 border-2 border-black shrink-0" style={{backgroundColor: PIE_COLORS[index % PIE_COLORS.length]}}></div>
            <span className="truncate max-w-[100px] mr-2">{entry.name}</span>
            <span className="text-[#c32148] ml-auto">{((entry.value/total)*100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SortableTable = ({ data, columns, onRowClick, expandRenderer, expandableCol }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState(new Set());

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = parseSortValue(a[sortConfig.key]);
        let bValue = parseSortValue(b[sortConfig.key]);
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const toggleRow = (id, e) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  return (
    <div className="overflow-x-auto border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full print:border-2 print:shadow-none print:break-inside-avoid">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="bg-[#111] text-white uppercase text-xs font-black tracking-wider border-b-4 border-black print:bg-gray-200 print:text-black">
            {columns.map(col => (
              <th key={col.key} 
                  className={`py-4 px-4 cursor-pointer hover:bg-gray-800 print:hover:bg-gray-200 transition select-none border-r-2 border-gray-700 print:border-gray-400 last:border-r-0 ${col.className || ''}`}
                  onClick={() => requestSort(col.key)}>
                <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : 'justify-between'}`}>
                  <span>{col.label}</span>
                  {sortConfig.key === col.key ? (
                    <span className="ml-2">{sortConfig.direction === 'asc' ? <Icons.ArrowUp /> : <Icons.ArrowDown />}</span>
                  ) : (
                    <span className="opacity-0 w-5 ml-2"></span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => {
            const isExpanded = expandedRows.has(rowIndex);
            return (
              <React.Fragment key={rowIndex}>
                <tr className={`border-b-2 border-gray-200 hover:bg-gray-100 transition group ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick && onRowClick(row)}>
                  {columns.map(col => (
                    <td key={col.key} className={`py-3 px-4 border-r-2 border-gray-200 last:border-r-0 ${col.cellClassName || ''} ${col.align === 'right' ? 'text-right' : ''}`}>
                      <div className={`flex items-center text-sm font-bold ${col.align === 'right' ? 'justify-end' : ''}`}>
                        {expandableCol === col.key && expandRenderer && (
                          <button 
                            onClick={(e) => toggleRow(rowIndex, e)}
                            className="mr-3 p-1 bg-gray-200 border-2 border-transparent hover:border-black transition text-black">
                            {isExpanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                          </button>
                        )}
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </div>
                    </td>
                  ))}
                </tr>
                {isExpanded && expandRenderer && (
                  <tr>
                    <td colSpan={columns.length} className="p-0 border-b-4 border-black bg-[#f4f4f4]">
                      <div className="border-l-8 border-[#e2b714] p-4 shadow-inner animate-[fadeIn_0.3s_ease-in-out]">
                        {expandRenderer(row)}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const BairroDetail = ({ bairro, municipio, data, onBack }) => {
  const columns = [
    { key: 'local', label: 'Local / Escola' },
    { key: 'zona', label: 'Zona', render: (val) => <span className="text-gray-600">{val}</span> },
    { key: 'secao', label: 'Seção', render: (val) => <span className="text-gray-600">{val}</span> },
    { key: 'votos', label: 'Votos', align: 'right', render: (val) => <span className="font-black text-[#c32148] text-lg">{val}</span> }
  ];

  const totalVotosBairro = data.reduce((acc, curr) => acc + (parseInt(curr.votos) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto w-full pb-10 animate-[fadeIn_0.3s_ease-in-out]">
      <button onClick={onBack} className="print:hidden flex items-center bg-[#111] text-white px-4 py-2 font-black uppercase text-xs mb-6 hover:bg-[#c32148] transition shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
        <Icons.ArrowLeft /> <span className="ml-2">Voltar ao Município</span>
      </button>

      <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8 print:shadow-none print:border-2">
        <div className="bg-[#008080] p-6 border-b-4 border-black text-white flex justify-between items-end flex-wrap gap-4 print:bg-white print:text-black">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-1 text-black bg-[#e2b714] px-2 py-1 inline-block border-2 border-black">{municipio}</p>
            <h2 className="text-3xl md:text-5xl font-black uppercase">{bairro}</h2>
          </div>
          <div className="text-right border-4 border-black bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black">
            <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Total do Bairro</p>
            <p className="text-2xl font-black text-[#c32148]">{totalVotosBairro.toLocaleString()} VOTOS</p>
          </div>
        </div>
        
        <div className="p-6">
          <h3 className="font-black uppercase text-lg mb-4 text-[#111] border-b-4 border-black pb-2 inline-block">Locais de Votação (Ordenáveis)</h3>
          <SortableTable data={data} columns={columns} />
        </div>
      </div>
    </div>
  );
};

const MunicipioDetail = ({ municipio, data, onBack, onBairroClick }) => {
  const totalVotos = data.reduce((acc, curr) => acc + (parseInt(curr.votos) || 0), 0);
  const totalEmendas = data.reduce((acc, curr) => acc + parseNumberStrict(curr.emendas), 0);
  const emendasList = data.filter(d => parseNumberStrict(d.emendas) > 0);

  const bairrosMap = {};
  data.forEach(d => {
    const v = parseInt(d.votos) || 0;
    const bName = d.bairro ? String(d.bairro).trim() : '';
    if(v > 0 && bName && bName !== "-") {
      if(!bairrosMap[bName]) bairrosMap[bName] = { bairro: bName, votos: 0, locais: 0 };
      bairrosMap[bName].votos += v;
      bairrosMap[bName].locais += 1;
    }
  });
  const bairrosData = Object.values(bairrosMap);

  const bairroColumns = [
    { key: 'bairro', label: 'Bairro', render: (val) => <span className="text-[#008080] underline underline-offset-4 decoration-2 hover:text-[#111] transition">{val}</span> },
    { key: 'locais', label: 'Qtd. Locais', align: 'right' },
    { key: 'votos', label: 'Total Votos', align: 'right', render: (val) => <span className="font-black text-[#c32148]">{val}</span> }
  ];

  return (
    <div className="max-w-6xl mx-auto w-full pb-10 animate-[fadeIn_0.3s_ease-in-out]">
      <button onClick={onBack} className="print:hidden flex items-center bg-[#111] text-white px-4 py-2 font-black uppercase text-xs mb-6 hover:bg-[#e2b714] hover:text-[#111] transition shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
        <Icons.ArrowLeft /> <span className="ml-2">Voltar ao Mapa/Lista</span>
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col print:shadow-none">
          <div className="bg-[#e2b714] p-6 border-b-4 border-black">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-white bg-[#111] px-2 py-1 inline-block border-2 border-black">Ficha Estratégica</p>
            <h2 className="text-4xl md:text-5xl font-black uppercase text-[#111]">{municipio}</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row p-6 gap-6 flex-1 bg-[#f4f4f4]">
            <div className="flex-1 border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-xs font-black uppercase text-gray-500 mb-2 border-b-2 border-gray-200 pb-1">Votos Consolidados</p>
              <p className="text-4xl font-black text-[#c32148]">{totalVotos.toLocaleString('pt-BR')}</p>
            </div>
            <div className="flex-1 border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-xs font-black uppercase text-gray-500 mb-2 border-b-2 border-gray-200 pb-1">Total Emendas (R$)</p>
              <p className="text-3xl font-black text-[#008080]">
                {formatCurrency(totalEmendas)}
              </p>
            </div>
          </div>
        </div>

        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col print:shadow-none">
          <div className="bg-[#111] text-white p-4 border-b-4 border-black print:bg-gray-200 print:text-black">
            <h3 className="font-black uppercase tracking-wider">💰 Histórico de Emendas</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-[300px] bg-[#f4f4f4]">
            {emendasList.length === 0 ? (
              <p className="text-gray-500 text-sm font-bold uppercase text-center mt-10">Nenhuma emenda registrada.</p>
            ) : (
              <ul className="space-y-4">
                {emendasList.map((em, idx) => (
                  <li key={idx} className="border-l-4 border-[#008080] pl-3 bg-white p-2 border-2 border-transparent hover:border-black transition">
                    <p className="font-black text-[10px] uppercase text-gray-800 mb-1 leading-tight">{em.bairro || 'Destinação Geral'}</p>
                    <p className="text-[#008080] font-black text-sm">{formatCurrency(em.emendas)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {bairrosData.length > 0 ? (
        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 print:shadow-none">
          <h3 className="font-black uppercase text-xl mb-4 text-[#111] border-b-4 border-black pb-2 inline-block">Bairros Mapeados</h3>
          <SortableTable 
            data={bairrosData} 
            columns={bairroColumns} 
            onRowClick={(row) => onBairroClick(row.bairro)}
          />
        </div>
      ) : (
        <div className="border-4 border-black bg-white p-6 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
           <p className="font-black uppercase text-gray-500 tracking-widest">Nenhum bairro com votos mapeado neste município.</p>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('list'); // list, dashboard, map
  const [viewMode, setViewMode] = useState('list'); // list, cards
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [selectedBairro, setSelectedBairro] = useState(null);
  const [showZeroVotes, setShowZeroVotes] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [filters, setFilters] = useState({ regioes: [], municipios: [] });

  // Interpretador Universal Inteligente de Planilhas Google via JSON
  const parseJSONData = (json) => {
    let parsedRows = [];
    // Busca a matriz de dados em qualquer possível formato de retorno
    const targetArray = json.estado || json.votos || json.dados || json.capital || json.data || json;
    
    if (!Array.isArray(targetArray)) {
      throw new Error("Formato de JSON inválido ou vazio. É necessário um array contendo os dados da planilha.");
    }

    if (targetArray.length === 0) return [];

    // Função auxiliar super flexível para extrair valores baseados em palavras-chave das colunas
    const findVal = (rowObj, keywords) => {
      const keys = Object.keys(rowObj);
      for (let kw of keywords) {
        const foundKey = keys.find(k => k.toLowerCase().trim().includes(kw));
        if (foundKey) return rowObj[foundKey];
      }
      return null;
    };

    // Se for Array de Arrays (Padrão Sheets API RAW)
    if (Array.isArray(targetArray[0])) {
      if (targetArray.length < 2) return [];
      const headers = targetArray[0].map(h => String(h).trim().toLowerCase());
      
      const getIdx = (kws) => {
        for(let kw of kws) {
          const idx = headers.findIndex(h => h.includes(kw));
          if (idx > -1) return idx;
        }
        return -1;
      };

      const idx = {
        municipio: getIdx(['munic', 'cidade', 'nm_mun']),
        regiao: getIdx(['regi', 'macro', 'meso']),
        bairro: getIdx(['bairro', 'nm_bairro', 'localidade']),
        local: getIdx(['local', 'escola', 'coleg']),
        zona: getIdx(['zona']),
        secao: getIdx(['seç', 'sec']),
        votos: getIdx(['voto', 'qt_', 'qtd', 'total']),
        emendas: getIdx(['emenda', 'valor', 'loa', 'r$'])
      };

      parsedRows = targetArray.slice(1).map(row => ({
        municipio: idx.municipio > -1 ? row[idx.municipio] : null,
        regiao: idx.regiao > -1 ? row[idx.regiao] : 'Sem Região',
        bairro: idx.bairro > -1 ? row[idx.bairro] : '',
        local: idx.local > -1 ? row[idx.local] : '',
        zona: idx.zona > -1 ? row[idx.zona] : '',
        secao: idx.secao > -1 ? row[idx.secao] : '',
        votos: idx.votos > -1 ? parseNumberStrict(row[idx.votos]) : 0,
        emendas: idx.emendas > -1 ? parseNumberStrict(row[idx.emendas]) : 0,
      }));
    } else {
       // É Array de Objetos (JSON Mapeado gerado pela API / App Script)
       parsedRows = targetArray.map(row => {
          const mun = findVal(row, ['munic', 'cidade', 'nm_mun']);
          return {
             municipio: mun,
             regiao: findVal(row, ['regi', 'macro', 'meso']) || 'Sem Região',
             bairro: findVal(row, ['bairro', 'nm_bairro', 'localidade']) || '',
             local: findVal(row, ['local', 'escola', 'coleg']) || '',
             zona: findVal(row, ['zona']) || '',
             secao: findVal(row, ['seç', 'sec']) || '',
             votos: parseNumberStrict(findVal(row, ['voto', 'qt_', 'qtd', 'total'])),
             emendas: parseNumberStrict(findVal(row, ['emenda', 'valor', 'loa', 'r$']))
          };
       });
    }

    // Filtra linhas inválidas ou de cabeçalhos vazios
    return parsedRows.filter(r => r.municipio && String(r.municipio).trim() !== "");
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      if (!API_URL) {
        setError("A variável VITE_SCRIPT_URL não foi definida na Vercel. Adicione a URL da sua API para carregar os dados reais.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(API_URL, { redirect: 'follow' });
        if (!res.ok) {
           if (res.status === 404) {
             throw new Error("ERRO 404: Link da API não encontrado. Verifique a URL gerada.");
           }
           throw new Error(`Erro HTTP: ${res.status}`);
        }
        
        // Verifica se o Google redirecionou para uma página HTML de login (erro de permissão)
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("text/html") !== -1) {
           throw new Error("Erro de Permissão: O Google exigiu login. Refaça a implantação no Apps Script marcando o acesso para 'Qualquer pessoa'.");
        }

        const json = await res.json();

        // Tratamento explícito para erros devolvidos pelo Apps Script (try/catch no codigo.gs)
        if (json.status === "error") {
           throw new Error(`Erro interno da Planilha: ${json.message}`);
        }
        
        const cleanData = parseJSONData(json);
        if (cleanData.length === 0) throw new Error("A base de dados foi processada, mas retornou vazia. Verifique os nomes das colunas na planilha.");

        setRawData(cleanData);
      } catch (e) {
        console.error("Erro de Integração:", e);
        setError(`Falha ao conectar ou processar os dados: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const { munsComVoto, munsSemVoto, optionsRegioes, optionsMunicipios, chartDataRegioes } = useMemo(() => {
    if (rawData.length === 0) return { munsComVoto: [], munsSemVoto: [], optionsRegioes: [], optionsMunicipios: [], chartDataRegioes: [] };

    const mapMuns = {};
    const regioesSet = new Set();
    const munsSet = new Set();

    const filteredData = rawData.filter(d => {
      if (filters.regioes.length > 0 && !filters.regioes.includes(d.regiao)) return false;
      if (filters.municipios.length > 0 && !filters.municipios.includes(d.municipio)) return false;
      return true;
    });

    filteredData.forEach(d => {
      const regName = d.regiao ? String(d.regiao).trim() : 'Sem Região';
      const munName = d.municipio ? String(d.municipio).trim() : 'Desconhecido';
      
      if(regName !== 'Sem Região') regioesSet.add(regName);
      if(munName !== 'Desconhecido') munsSet.add(munName);

      if (!mapMuns[munName]) {
        mapMuns[munName] = {
          municipio: munName,
          regiao: regName,
          votosTotais: 0,
          bairrosRaw: []
        };
      }
      
      const votosNum = parseInt(d.votos) || 0;
      mapMuns[munName].votosTotais += votosNum;
      
      if (votosNum > 0 && d.bairro && String(d.bairro).trim() !== "" && String(d.bairro).trim() !== "-") {
        mapMuns[munName].bairrosRaw.push({ ...d, votos: votosNum });
      }
    });

    const allMuns = Object.values(mapMuns);
    const comVoto = allMuns.filter(m => m.votosTotais > 0);
    const semVoto = allMuns.filter(m => m.votosTotais === 0);

    const regMap = {};
    comVoto.forEach(m => {
      if(!regMap[m.regiao]) regMap[m.regiao] = 0;
      regMap[m.regiao] += m.votosTotais;
    });
    const cDataReg = Object.keys(regMap).map(k => ({ name: k, value: regMap[k] }));

    return {
      munsComVoto: comVoto.sort((a,b) => b.votosTotais - a.votosTotais),
      munsSemVoto: semVoto.sort((a,b) => a.municipio.localeCompare(b.municipio)),
      optionsRegioes: Array.from(regioesSet).sort(),
      optionsMunicipios: Array.from(munsSet).sort(),
      chartDataRegioes: cDataReg.sort((a,b) => b.value - a.value)
    };
  }, [rawData, filters]);

  const toggleFilter = (type, value) => {
    setFilters(prev => {
      const current = prev[type];
      if (current.includes(value)) {
        return { ...prev, [type]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [type]: [...current, value] };
      }
    });
  };

  const clearFilters = () => setFilters({ regioes: [], municipios: [] });

  const renderBairrosExpand = (row) => {
    if (row.bairrosRaw.length === 0) {
      return <p className="text-xs font-bold text-gray-500 uppercase">Nenhum bairro com >1 voto especificado.</p>;
    }

    const bairrosAgrupados = {};
    row.bairrosRaw.forEach(b => {
      if(!bairrosAgrupados[b.bairro]) bairrosAgrupados[b.bairro] = 0;
      bairrosAgrupados[b.bairro] += b.votos;
    });
    const bList = Object.keys(bairrosAgrupados).map(k => ({ bairro: k, votos: bairrosAgrupados[k] }));
    
    return (
      <div>
        <h4 className="text-[10px] font-black uppercase text-[#111] mb-3 bg-[#e2b714] inline-block px-2 py-1 border-2 border-black">Bairros com Votos</h4>
        <div className="flex flex-wrap gap-2">
          {bList.sort((a,b) => b.votos - a.votos).map(b => (
            <button 
              key={b.bairro}
              onClick={(e) => { e.stopPropagation(); setSelectedMunicipio(row.municipio); setSelectedBairro(b.bairro); }}
              className="bg-white border-2 border-black px-3 py-1 text-xs font-bold uppercase hover:bg-[#111] hover:text-white transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {b.bairro} <span className="font-black ml-1 text-[#c32148] bg-gray-100 px-1 border border-gray-300 rounded-none group-hover:bg-gray-800">{b.votos}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const munsColumns = [
    { key: 'municipio', label: 'Município', render: (val) => (
      <span className="font-black uppercase text-base hover:text-[#008080] underline-offset-4 decoration-2" 
            onClick={(e) => { e.stopPropagation(); setSelectedMunicipio(val); }}>
        {val}
      </span>
    )},
    { key: 'regiao', label: 'Região', render: (val) => <span className="text-xs uppercase text-gray-600">{val}</span> },
    { key: 'votosTotais', label: 'Votos', align: 'right', render: (val) => <span className="font-black text-[#c32148] text-xl">{val.toLocaleString('pt-BR')}</span> }
  ];

  const renderCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
      {munsComVoto.map((m, idx) => (
        <div key={idx} 
             onClick={() => setSelectedMunicipio(m.municipio)}
             className="border-4 border-black bg-white cursor-pointer hover:-translate-y-1 transition-transform relative flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group">
          <div className="h-4 w-full bg-[#e2b714] border-b-4 border-black group-hover:bg-[#008080] transition-colors"></div>
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{m.regiao}</p>
              <h3 className="font-black text-2xl uppercase leading-tight text-[#111] group-hover:text-[#008080] transition-colors">{m.municipio}</h3>
            </div>
            <div className="mt-6 text-right border-t-2 border-gray-200 pt-3 flex justify-between items-end">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
               <span className="text-3xl font-black text-[#c32148]">{m.votosTotais.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
  
  const renderDashboard = () => (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-in-out] print:break-inside-avoid w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Barras Nativo */}
        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col print:shadow-none print:border-2">
          <div className="bg-[#111] text-white p-4 border-b-4 border-black print:bg-gray-200 print:text-black">
            <h3 className="font-black uppercase tracking-wider text-sm flex items-center"><Icons.Chart /> <span className="ml-2">Votos por Região (Nativo)</span></h3>
          </div>
          <div className="h-72 bg-[#f4f4f4] relative">
            <NativeBarChart data={chartDataRegioes.slice(0, 8)} />
          </div>
        </div>

        {/* Gráfico de Pizza Nativo */}
        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col print:shadow-none print:border-2">
          <div className="bg-[#e2b714] text-[#111] p-4 border-b-4 border-black">
            <h3 className="font-black uppercase tracking-wider text-sm flex items-center"><Icons.Chart /> <span className="ml-2">Proporção Regional (Nativo)</span></h3>
          </div>
          <div className="h-72 bg-[#f4f4f4]">
            <NativePieChart data={chartDataRegioes} />
          </div>
        </div>
      </div>
      
      {/* Treemap Customizado (Nativo Flexbox) */}
      <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col print:shadow-none print:border-2">
        <div className="bg-[#c32148] text-white p-4 border-b-4 border-black">
          <h3 className="font-black uppercase tracking-wider text-sm">Mapeamento em Árvore (Top 15 Municípios)</h3>
        </div>
        <div className="flex flex-wrap min-h-[250px] p-2 bg-[#111] gap-[2px]">
          {munsComVoto.slice(0, 15).map((m, i) => {
            const total = munsComVoto.slice(0,15).reduce((acc, curr) => acc + curr.votosTotais, 0);
            const pct = (m.votosTotais / total) * 100;
            const minSize = Math.max(pct, 8); 
            return (
              <div key={i} 
                   onClick={() => setSelectedMunicipio(m.municipio)}
                   className="flex-grow flex items-center justify-center p-2 text-white cursor-pointer hover:opacity-80 transition relative overflow-hidden"
                   style={{
                     backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                     flexBasis: `${minSize}%`,
                     minWidth: '120px'
                   }}>
                <div className="text-center z-10 p-1 bg-black/40 w-full backdrop-blur-sm border border-white/20">
                  <div className="font-black text-xs md:text-sm uppercase tracking-wider truncate">{m.municipio}</div>
                  <div className="text-xs font-bold">{m.votosTotais.toLocaleString()} v.</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderMap = () => (
    <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-[75vh] flex flex-col relative w-full animate-[fadeIn_0.3s_ease-in-out]">
      <div className="bg-[#111] text-white p-3 border-b-4 border-black shrink-0 flex justify-between items-center">
        <h3 className="font-black uppercase text-sm flex items-center"><Icons.Map /> <span className="ml-2">Google My Maps (Municípios)</span></h3>
        <span className="text-[10px] font-bold text-[#e2b714] bg-black px-2 py-1 uppercase tracking-widest border border-[#e2b714]">Integração</span>
      </div>
      <div className="flex-1 w-full bg-[#f4f4f4] relative p-2">
        <iframe 
          title="Mapa de Votos"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14197415.861787263!2d-60.106886801931596!3d-27.46914595240228!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94dfb768e8203f19%3A0xc3b8a3eb4232bf36!2sSanta%20Catarina!5e0!3m2!1spt-BR!2sbr!4v1700000000000!5m2!1spt-BR!2sbr" 
          width="100%" 
          height="100%" 
          className="border-2 border-black"
          allowFullScreen="" 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade">
        </iframe>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f4f4]">
        <div className="border-4 border-black bg-white p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <div className="flex gap-2 justify-center mb-6">
            <div className="w-6 h-6 bg-[#e2b714] border-2 border-black animate-bounce" style={{animationDelay: '0s'}}></div>
            <div className="w-6 h-6 bg-[#008080] border-2 border-black animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="w-6 h-6 bg-[#c32148] border-2 border-black animate-bounce" style={{animationDelay: '0.4s'}}></div>
          </div>
          <h1 className="text-2xl font-black text-[#111] tracking-widest uppercase">Tabulum</h1>
          <p className="text-xs font-bold text-gray-500 uppercase mt-2">Buscando Dados na Nuvem...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f4f4] p-4">
        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full flex flex-col">
          <div className="bg-[#c32148] text-white p-6 border-b-4 border-black">
            <h1 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">⚠️ Base Não Localizada</h1>
          </div>
          <div className="p-8 bg-[#f4f4f4]">
            <p className="font-bold text-base text-[#111] uppercase leading-relaxed mb-6">{error}</p>
            
            <div className="bg-white p-5 border-2 border-black space-y-3">
              <h3 className="font-black uppercase text-[#c32148] border-b-2 border-gray-200 pb-2">O que fazer agora?</h3>
              <p className="text-xs font-bold text-gray-600 uppercase">1. Vá até o painel da sua Vercel (Settings &gt; Environment Variables).</p>
              <p className="text-xs font-bold text-gray-600 uppercase">2. Certifique-se de que a variável <span className="bg-gray-200 px-1 border border-black text-black">VITE_SCRIPT_URL</span> aponta para a sua planilha.</p>
              <p className="text-xs font-bold text-gray-600 uppercase">3. Garanta que o JSON retornado tenha a matriz padrão.</p>
            </div>
            
            <button onClick={() => window.location.reload()} className="mt-6 w-full bg-[#111] text-white p-4 font-black uppercase hover:bg-[#008080] transition-colors border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:border-black hover:shadow-none">
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Drill-down Screens
  if (selectedMunicipio && selectedBairro) {
    const bairroData = rawData.filter(d => d.municipio === selectedMunicipio && d.bairro === selectedBairro && parseInt(d.votos) > 0);
    return <div className="p-4 md:p-8 min-h-screen bg-[#f4f4f4]"><BairroDetail bairro={selectedBairro} municipio={selectedMunicipio} data={bairroData} onBack={() => setSelectedBairro(null)} /></div>;
  }

  if (selectedMunicipio) {
    const mData = rawData.filter(d => d.municipio === selectedMunicipio);
    return <div className="p-4 md:p-8 min-h-screen bg-[#f4f4f4]"><MunicipioDetail municipio={selectedMunicipio} data={mData} onBack={() => setSelectedMunicipio(null)} onBairroClick={(b) => setSelectedBairro(b)} /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f4f4f4] font-sans selection:bg-[#e2b714] selection:text-black">
      
      {/* Menu Mobile */}
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden print:hidden fixed bottom-4 right-4 z-50 bg-[#111] text-white p-4 border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-full">
        <Icons.Filter />
      </button>

      {/* Barra Lateral / Filtros */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-72 bg-white border-r-4 border-black flex-shrink-0 print:hidden flex flex-col transition-transform duration-300 ease-in-out`}>
        <div className="p-6 border-b-4 border-black bg-[#111] text-white flex items-center gap-3">
          <div className="w-12 h-12 bg-[#e2b714] border-2 border-white flex items-center justify-center font-black text-xl text-black shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
             🗂️
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tighter uppercase leading-none">Tabulum</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#e2b714]">Mapa Eleitoral</p>
          </div>
        </div>

        <div className="p-6 flex-grow overflow-y-auto">
          <div className="flex justify-between items-center mb-6 border-b-2 border-gray-200 pb-2">
            <h2 className="font-black uppercase text-sm text-[#111] flex items-center"><Icons.Filter /> <span className="ml-1">Filtros Universais</span></h2>
            {(filters.regioes.length > 0 || filters.municipios.length > 0) && (
              <button onClick={clearFilters} className="text-[10px] font-black uppercase text-[#c32148] hover:underline bg-gray-100 px-2 py-1">Limpar</button>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-[10px] font-black text-gray-500 mb-3 uppercase tracking-widest bg-gray-100 p-1 inline-block border-l-4 border-[#008080]">Regiões Mapeadas</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
              {optionsRegioes.map(r => (
                <label key={r} className="flex items-start space-x-3 cursor-pointer group p-1 hover:bg-gray-50 transition">
                  <input type="checkbox" 
                         checked={filters.regioes.includes(r)}
                         onChange={() => toggleFilter('regioes', r)}
                         className="mt-1 h-4 w-4 text-[#111] border-2 border-black rounded-none focus:ring-0 cursor-pointer" />
                  <span className={`text-xs font-bold uppercase ${filters.regioes.includes(r) ? 'text-[#111]' : 'text-gray-600'} group-hover:text-[#008080]`}>{r}</span>
                </label>
              ))}
            </div>
          </div>
          
          <hr className="border-t-2 border-gray-200 mb-6" />
          
          <div className="space-y-3">
            <button onClick={() => exportToCSV(rawData, 'tabulum_dados_completos.csv')} 
                    className="w-full flex items-center justify-center p-3 bg-white hover:bg-[#111] hover:text-white text-[#111] text-xs font-black uppercase tracking-wider transition border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">
              <Icons.Download /> Baixar CSV
            </button>
            <button onClick={() => window.print()} 
                    className="w-full flex items-center justify-center p-3 bg-white hover:bg-[#111] hover:text-white text-[#111] text-xs font-black uppercase tracking-wider transition border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">
              <Icons.Printer /> Exportar PDF
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden print:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Conteúdo Central */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#f4f4f4] relative z-10 w-full print:h-auto print:overflow-visible">
        
        {/* Navegação Superior */}
        <header className="bg-white border-b-4 border-black p-4 print:hidden flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-sm z-20">
          <div className="flex border-2 border-black bg-[#111] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full sm:w-auto">
            {[
              { id: 'list', label: 'Municípios', color: 'bg-[#e2b714]' },
              { id: 'dashboard', label: 'Visão Geral', color: 'bg-[#008080]' },
              { id: 'map', label: 'Mapa', color: 'bg-[#c32148]' }
            ].map((tab) => (
              <button key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 sm:flex-none px-6 py-2 text-xs font-black uppercase tracking-widest transition border-r-2 border-black last:border-r-0 ${activeTab === tab.id ? `${tab.color} text-[#111] ${tab.id !== 'list' ? 'text-white' : ''}` : 'bg-white text-gray-500 hover:bg-gray-200'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          
          {activeTab === 'list' && (
            <div className="flex border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
              <button onClick={() => setViewMode('list')} className={`px-4 py-2 border-r-2 border-black transition ${viewMode === 'list' ? 'bg-[#111] text-white' : 'text-gray-400 hover:bg-gray-100 text-[#111]'}`}>
                <Icons.List />
              </button>
              <button onClick={() => setViewMode('cards')} className={`px-4 py-2 transition ${viewMode === 'cards' ? 'bg-[#111] text-white' : 'text-gray-400 hover:bg-gray-100 text-[#111]'}`}>
                <Icons.Grid />
              </button>
            </div>
          )}
        </header>

        {/* Área de Visualização Principal */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full print:p-0 print:overflow-visible">
          
          {activeTab === 'list' && (
            <div className="animate-[fadeIn_0.3s_ease-in-out] w-full">
              {viewMode === 'list' ? (
                <SortableTable 
                  data={munsComVoto} 
                  columns={munsColumns} 
                  expandableCol="municipio"
                  expandRenderer={renderBairrosExpand}
                />
              ) : (
                renderCards()
              )}
            </div>
          )}

          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'map' && renderMap()}

          {/* Rodapé - Municípios ZERO Votos */}
          {activeTab === 'list' && munsSemVoto.length > 0 && (
            <div className="mt-12 pt-6 border-t-4 border-black print:hidden animate-[fadeIn_0.3s_ease-in-out] w-full">
              <button onClick={() => setShowZeroVotes(!showZeroVotes)}
                      className="bg-white border-2 border-black px-4 py-2 text-xs font-black uppercase text-[#111] hover:bg-[#111] hover:text-white transition flex items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {showZeroVotes ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                <span className="ml-2">Municípios com Zero Votos ({munsSemVoto.length})</span>
              </button>
              
              {showZeroVotes && (
                <div className="mt-6 flex flex-wrap gap-2 p-4 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <p className="w-full text-[10px] font-black uppercase text-[#c32148] mb-2 tracking-widest">Abaixo listados apenas os municípios onde não houve registro de votos:</p>
                  {munsSemVoto.map((m, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase border-2 border-gray-300">
                      {m.municipio}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
