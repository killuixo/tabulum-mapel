import React, { useState, useEffect, useMemo, useRef } from 'react';

const COLORS = {
  mustard: '#e2b714',
  teal: '#008080',
  crimson: '#c32148',
  black: '#111111',
  white: '#ffffff',
  lightGray: '#f4f4f4'
};
const PIE_COLORS = [COLORS.mustard, COLORS.teal, COLORS.crimson, '#555555', '#999999', '#333333', '#dddddd'];

const getApiUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SCRIPT_URL) {
      return import.meta.env.VITE_SCRIPT_URL;
    }
  } catch (e) {}
  return ""; 
};
const API_URL = getApiUrl();

const Icons = {
  Search: () => <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>,
  Chat: () => <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>,
  ChevronDown: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>,
  ChevronRight: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>,
  ArrowUp: () => <svg className="w-4 h-4 inline ml-1 text-[#e2b714]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M5 15l7-7 7 7"></path></svg>,
  ArrowDown: () => <svg className="w-4 h-4 inline ml-1 text-[#e2b714]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>,
  Chart: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M18 20V10M12 20V4M6 20v-6"></path></svg>,
  Map: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M9 20l-6-3V5l6 3m0 12l6-3m-6 3V8m6 10l6 3V6l-6-3m0 15V5"></path></svg>,
  List: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M4 6h16M4 12h16M4 18h16"></path></svg>,
  Grid: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"></path></svg>,
  ArrowLeft: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M19 12H5m7-7l-7 7 7 7"></path></svg>,
  Download: () => <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M4 16v1h16v-1m-8-12v12m-4-4l4 4 4-4"></path></svg>,
  Printer: () => <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M17 17h2v-4H5v4h2m2 4h6v-4H9v4zM5 9h14V5H5v4z"></path></svg>,
  Filter: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M3 4h18l-7 9v7l-4 2v-9L3 4z"></path></svg>
};

const parseNumberStrict = (val) => {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') return val;
  let str = String(val).trim();
  if (str === '-' || str === '') return 0;
  str = str.replace(/[R$\s]/g, '');
  if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{3}$/.test(str) || str.split('.').length > 2) str = str.replace(/\./g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

const exportToCSV = (data, filename) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const normalizeName = (str) => String(str).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

const NativeBarChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="p-4 text-xs font-bold uppercase text-gray-500">Sem dados para o gráfico</div>;
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div className="flex h-full items-end gap-2 px-2 pt-8 pb-6 overflow-x-auto">
      {data.map((item, idx) => (
        <div key={idx} className="flex flex-col items-center flex-1 min-w-[40px] group relative h-full justify-end">
          <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[#111] text-white text-[10px] font-black uppercase px-2 py-1 whitespace-nowrap z-10 pointer-events-none transition-opacity border-2 border-black">
            {item.name}: {item.value.toLocaleString()}
          </div>
          <div className="w-full bg-[#008080] border-2 border-black group-hover:bg-[#c32148] transition-colors relative" style={{ height: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%`, minHeight: '4px' }}></div>
          <div className="text-[9px] font-black uppercase mt-2 text-center truncate w-full transform -rotate-45 origin-top-left translate-y-2 translate-x-2">{item.name}</div>
        </div>
      ))}
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

const LeafletMap = ({ data, onCityClick }) => {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!window.L) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
      const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapReady(true); document.head.appendChild(script);
    } else setMapReady(true);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L || data.length === 0) return;

    const mapContainer = mapRef.current;
    if (mapContainer._leaflet_id) { mapContainer._leaflet_id = null; mapContainer.innerHTML = ''; }

    const map = window.L.map(mapContainer, { zoomControl: false }).setView([-27.27, -50.49], 7);
    window.L.control.zoom({ position: 'topleft' }).addTo(map);

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    const getColor = (votos) => {
      if (votos > 10000) return '#064e3b';
      if (votos > 2500) return '#047857';
      if (votos > 1000) return '#10b981';
      if (votos > 500) return '#34d399';
      if (votos > 100) return '#6ee7b7';
      if (votos > 20) return '#a7f3d0';
      if (votos > 0) return '#d1fae5';
      return '#f8fafc';
    };

    const mapMunsToData = {};
    data.forEach(m => { mapMunsToData[normalizeName(m.municipio)] = m; });

    fetch('https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-42-mun.json')
      .then(res => res.json())
      .then(geoData => {
        window.L.geoJson(geoData, {
          style: (feature) => {
            const munName = normalizeName(feature.properties.name);
            const munData = mapMunsToData[munName];
            return { fillColor: munData ? getColor(munData.votosTotais) : '#f8fafc', weight: 1, opacity: 1, color: '#333', fillOpacity: 0.8 };
          },
          onEachFeature: (feature, layer) => {
            const munName = normalizeName(feature.properties.name);
            const munData = mapMunsToData[munName];
            
            layer.bindTooltip(
              `<div class="bg-[#1e293b] text-white p-2 rounded shadow-lg text-xs font-sans border-2 border-black">
                 <strong class="text-sm block border-b border-gray-600 pb-1 mb-1 uppercase">${feature.properties.name}</strong>
                 <span class="text-gray-400">Votos 2026:</span> <span class="text-[#e2b714] font-black">${munData ? munData.votosTotais.toLocaleString() : 0}</span>
               </div>`,
              { sticky: true, direction: 'auto', className: 'custom-tooltip border-0 bg-transparent shadow-none' }
            );

            layer.on({
              mouseover: (e) => { const l = e.target; l.setStyle({ weight: 3, color: '#e2b714', fillOpacity: 1 }); l.bringToFront(); },
              mouseout: (e) => { window.L.geoJson(geoData).resetStyle(e.target); },
              click: () => { if(munData) onCityClick(munData.municipio); }
            });
          }
        }).addTo(map);
      });

    return () => { map.remove(); };
  }, [mapReady, data]);

  return (
    <div className="w-full h-full z-10 relative">
      <style>{`.custom-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }`}</style>
      <div ref={mapRef} className="w-full h-full"></div>
      <div className="absolute bottom-4 right-4 z-[400] bg-[#111] border-2 border-black p-3 text-white text-[10px] font-bold uppercase shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <p className="mb-2 border-b border-gray-700 pb-1">Votos SC</p>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-[#064e3b] border border-gray-500"></div> &gt; 10.000</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-[#047857] border border-gray-500"></div> 2.500 - 10.000</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-[#10b981] border border-gray-500"></div> 1.000 - 2.500</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-[#34d399] border border-gray-500"></div> 500 - 1.000</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-[#6ee7b7] border border-gray-500"></div> 100 - 500</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-[#a7f3d0] border border-gray-500"></div> 20 - 100</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-[#d1fae5] border border-gray-500"></div> 1 - 20</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#f8fafc] border border-gray-500"></div> 0</div>
      </div>
    </div>
  );
};

const Chatbot = ({ rawData, munsData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ sender: 'bot', text: 'SISTEMA ATIVO. Consulta de Votos 2026.' }]);
  const [input, setInput] = useState('');

  const processQuery = (query) => {
    const q = normalizeName(query);
    if (q.includes("TOTAL") || q.includes("QUANTOS VOTOS")) {
      const total = rawData.reduce((acc, curr) => acc + curr.votos, 0);
      return `Total processado: ${total.toLocaleString('pt-BR')} votos.`;
    }
    const mun = munsData.find(m => normalizeName(m.municipio) === q);
    if (mun) return `${mun.municipio} (${mun.regiao}): ${mun.votosTotais.toLocaleString('pt-BR')} votos.`;
    return "Consulte o total de votos ou informe o nome exato do município.";
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages(prev => [...prev, { sender: 'user', text: input.trim() }]);
    setInput('');
    setTimeout(() => { setMessages(prev => [...prev, { sender: 'bot', text: processQuery(input.trim()) }]); }, 500);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end print:hidden">
      {isOpen && (
        <div className="w-80 h-96 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col mb-4">
          <div className="bg-[#111] text-white p-3 border-b-4 border-black flex justify-between items-center"><span className="font-black uppercase text-xs flex items-center gap-2"><Icons.Chat /> Terminal de Dados</span><button onClick={() => setIsOpen(false)}>X</button></div>
          <div className="flex-1 overflow-y-auto p-4 bg-[#f4f4f4] space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-2 border-2 border-black max-w-[85%] text-xs font-bold uppercase ${msg.sender === 'user' ? 'bg-[#c32148] text-white' : 'bg-white text-black'}`}>{msg.text}</div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSend} className="border-t-4 border-black flex"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Comando..." className="flex-1 p-2 bg-white text-xs font-bold uppercase outline-none" /><button type="submit" className="bg-[#111] text-white px-4 font-black">EX</button></form>
        </div>
      )}
      {!isOpen && <button onClick={() => setIsOpen(true)} className="w-14 h-14 bg-[#111] border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-full flex items-center justify-center hover:scale-110 transition-transform"><Icons.Chat /></button>}
    </div>
  );
};

const MunicipioDetail = ({ municipioData, onBack }) => {
  const bairros = municipioData.bairrosRaw.reduce((acc, curr) => {
    if (!acc[curr.bairro]) acc[curr.bairro] = { bairro: curr.bairro, votos: 0, locais: [] };
    acc[curr.bairro].votos += curr.votos;
    if (curr.local) acc[curr.bairro].locais.push(curr);
    return acc;
  }, {});

  const [expandedBairro, setExpandedBairro] = useState(null);

  return (
    <div className="max-w-6xl mx-auto w-full animate-[fadeIn_0.3s_ease-in-out]">
      <button onClick={onBack} className="print:hidden flex items-center bg-[#111] text-white px-4 py-2 font-black uppercase text-xs mb-6 hover:bg-[#e2b714] hover:text-[#111] transition shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
        <Icons.ArrowLeft /> <span className="ml-2">Retornar</span>
      </button>
      
      <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
        <div className="bg-[#e2b714] p-6 border-b-4 border-black">
          <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-white bg-[#111] px-2 py-1 inline-block border-2 border-black">{municipioData.regiao}</p>
          <h2 className="text-4xl md:text-5xl font-black uppercase text-[#111]">{municipioData.municipio}</h2>
          <p className="text-xs font-bold text-gray-800 mt-2 uppercase">{municipioData.associacao}</p>
        </div>
        <div className="p-6 bg-[#f4f4f4]">
          <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-block">
            <p className="text-xs font-black uppercase text-gray-500 mb-2 border-b-2 border-gray-200 pb-1">Total Consolidado (2026)</p>
            <p className="text-4xl font-black text-[#c32148]">{municipioData.votosTotais.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>

      <h3 className="font-black uppercase text-xl mb-4 text-[#111] border-b-4 border-black pb-2 inline-block">Registros Locais</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(bairros).sort((a,b) => b.votos - a.votos).map((b, i) => (
          <div key={i} className="border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="p-3 bg-[#111] text-white flex justify-between items-center cursor-pointer hover:bg-gray-800" onClick={() => setExpandedBairro(expandedBairro === b.bairro ? null : b.bairro)}>
              <span className="font-black uppercase text-sm truncate pr-2">{b.bairro}</span>
              <div className="flex items-center gap-3">
                <span className="text-[#e2b714] font-black">{b.votos} v.</span>
                {expandedBairro === b.bairro ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
              </div>
            </div>
            {expandedBairro === b.bairro && (
              <div className="p-3 bg-gray-100 border-t-2 border-black max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[10px] uppercase font-bold">
                  <thead><tr><th className="pb-1">Local / Zona / Seção</th><th className="text-right pb-1">Votos</th></tr></thead>
                  <tbody>
                    {b.locais.map((loc, idx) => (
                      <tr key={idx} className="border-t border-gray-300">
                        <td className="py-1 truncate pr-2 max-w-[200px]" title={loc.local}>{loc.local} (Z:{loc.zona} S:{loc.secao})</td>
                        <td className="text-right text-[#c32148] font-black">{loc.votos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('list');
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filters, setFilters] = useState({ regioes: [], municipios: [], associacoes: [] });
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'votosTotais', direction: 'desc' });

  const parseJSONData = (json) => {
    let parsedRows = [];
    const targetArray = json.estado || json.votos || json.dados || json.capital || json;
    if (!Array.isArray(targetArray) || targetArray.length < 2) throw new Error("Formato inválido.");

    if (Array.isArray(targetArray[0])) {
      const headers = targetArray[0].map(normalizeName);
      const idx = {
        municipio: headers.findIndex(h => h === 'MUNICIPIO'),
        regiao: headers.findIndex(h => h === 'REGIAO EM SC'),
        associacao: headers.findIndex(h => h === 'ASSOCIACAO DE MUNICIPIOS'),
        bairro: headers.findIndex(h => h === 'BAIRRO'),
        local: headers.findIndex(h => h === 'LOCAL DE VOTACAO'),
        zona: headers.findIndex(h => h === 'ZONA'),
        secao: headers.findIndex(h => h === 'SECAO'),
        votos: headers.findIndex(h => h === 'QUANTIDADE DE VOTOS')
      };

      if (idx.municipio === -1 || idx.votos === -1) throw new Error("Colunas obrigatórias ausentes.");

      parsedRows = targetArray.slice(1).map(row => ({
        municipio: row[idx.municipio] || '',
        regiao: idx.regiao > -1 ? row[idx.regiao] || 'Sem Região' : 'Sem Região',
        associacao: idx.associacao > -1 ? row[idx.associacao] || 'Sem Associação' : 'Sem Associação',
        bairro: idx.bairro > -1 ? row[idx.bairro] || '' : '',
        local: idx.local > -1 ? row[idx.local] || '' : '',
        zona: idx.zona > -1 ? row[idx.zona] || '' : '',
        secao: idx.secao > -1 ? row[idx.secao] || '' : '',
        votos: idx.votos > -1 ? parseNumberStrict(row[idx.votos]) : 0
      }));
    }
    return parsedRows.filter(r => r.municipio && String(r.municipio).trim() !== "");
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!API_URL) { setError("VITE_SCRIPT_URL não configurada."); setLoading(false); return; }
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setRawData(parseJSONData(json));
      } catch (e) { setError(`FALHA: ${e.message}`); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const { munsComVoto, optionsRegioes, optionsAssociacoes, chartDataRegioes, totalGeral } = useMemo(() => {
    if (rawData.length === 0) return { munsComVoto: [], optionsRegioes: [], optionsAssociacoes: [], chartDataRegioes: [], totalGeral: 0 };

    const query = normalizeName(searchQuery);
    const regSet = new Set();
    const assSet = new Set();
    
    rawData.forEach(d => {
      if(d.regiao && d.regiao !== 'Sem Região') regSet.add(d.regiao);
      if(d.associacao && d.associacao !== 'Sem Associação') assSet.add(d.associacao);
    });

    const filteredRaw = rawData.filter(d => {
      if (filters.regioes.length > 0 && !filters.regioes.includes(d.regiao)) return false;
      if (filters.associacoes.length > 0 && !filters.associacoes.includes(d.associacao)) return false;

      if (!query) return true;
      return normalizeName(d.municipio).includes(query) || normalizeName(d.regiao).includes(query) || normalizeName(d.bairro).includes(query);
    });

    const mapMuns = {};
    const regMap = {};
    let total = 0;

    filteredRaw.forEach(d => {
      const munName = d.municipio ? String(d.municipio).trim() : 'Desconhecido';
      const votosNum = parseInt(d.votos) || 0;

      if (!mapMuns[munName]) mapMuns[munName] = { municipio: munName, regiao: d.regiao, associacao: d.associacao, votosTotais: 0, bairrosRaw: [] };
      mapMuns[munName].votosTotais += votosNum;
      total += votosNum;
      if (votosNum > 0 && d.bairro && d.bairro !== "-") mapMuns[munName].bairrosRaw.push({ ...d, votos: votosNum });
    });

    let comVoto = Object.values(mapMuns).filter(m => m.votosTotais > 0);
    comVoto.sort((a,b) => b.votosTotais - a.votosTotais);
    comVoto = comVoto.map((m, i) => ({ ...m, ranking: i + 1 }));

    comVoto.forEach(m => {
      if(!regMap[m.regiao]) regMap[m.regiao] = 0;
      regMap[m.regiao] += m.votosTotais;
    });

    return {
      munsComVoto: comVoto,
      optionsRegioes: Array.from(regSet).sort(),
      optionsAssociacoes: Array.from(assSet).sort(),
      chartDataRegioes: Object.keys(regMap).map(k => ({ name: k, value: regMap[k] })).sort((a,b) => b.value - a.value),
      totalGeral: total
    };
  }, [rawData, searchQuery, filters]);

  const sortedMuns = useMemo(() => {
    let sortableItems = [...munsComVoto];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = typeof a[sortConfig.key] === 'string' ? a[sortConfig.key].toLowerCase() : a[sortConfig.key];
        let bValue = typeof b[sortConfig.key] === 'string' ? b[sortConfig.key].toLowerCase() : b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [munsComVoto, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const toggleFilter = (type, value) => {
    setFilters(prev => {
      const current = prev[type];
      if (current.includes(value)) return { ...prev, [type]: current.filter(v => v !== value) };
      return { ...prev, [type]: [...current, value] };
    });
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f4f4f4]"><div className="text-xl font-black uppercase text-black">PROCESSANDO DADOS...</div></div>;
  if (error) return <div className="flex min-h-screen items-center justify-center bg-[#f4f4f4] p-6"><div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"><h1 className="text-xl font-black uppercase text-[#c32148]">{error}</h1></div></div>;

  if (selectedMunicipio) {
    const munData = munsComVoto.find(m => m.municipio === selectedMunicipio);
    if(munData) return <div className="p-4 md:p-8 min-h-screen bg-[#f4f4f4]"><MunicipioDetail municipioData={munData} onBack={() => setSelectedMunicipio(null)} /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f4f4f4] font-sans selection:bg-[#e2b714] selection:text-black">
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden print:hidden fixed bottom-20 right-4 z-50 bg-[#111] text-white p-4 border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-full"><Icons.Filter /></button>

      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-72 bg-white border-r-4 border-black flex-shrink-0 print:hidden flex flex-col transition-transform duration-300 ease-in-out`}>
        <div className="p-6 border-b-4 border-black bg-[#111] text-white flex items-center gap-3">
          <div className="w-12 h-12 bg-[#e2b714] border-2 border-white flex items-center justify-center font-black text-xl text-black shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">🗂️</div>
          <div><h1 className="font-black text-2xl tracking-tighter uppercase leading-none">Tabulum</h1><p className="text-[10px] font-bold uppercase tracking-widest text-[#e2b714]">Mapa Eleitoral</p></div>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
          <div className="flex justify-between items-center mb-6 border-b-2 border-gray-200 pb-2">
            <h2 className="font-black uppercase text-sm text-[#111] flex items-center"><Icons.Filter /> <span className="ml-1">Filtros</span></h2>
            {(filters.regioes.length > 0 || filters.associacoes.length > 0) && <button onClick={() => setFilters({ regioes: [], municipios: [], associacoes: [] })} className="text-[10px] font-black uppercase text-[#c32148] hover:underline bg-gray-100 px-2 py-1">Limpar</button>}
          </div>
          <div className="mb-6">
            <h3 className="text-[10px] font-black text-gray-500 mb-
