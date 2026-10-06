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
  Chart: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M18 20V10M12 20V4M6 20v-6"></path></svg>,
  Map: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M9 20l-6-3V5l6 3m0 12l6-3m-6 3V8m6 10l6 3V6l-6-3m0 15V5"></path></svg>,
  List: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M4 6h16M4 12h16M4 18h16"></path></svg>,
  ArrowLeft: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M19 12H5m7-7l-7 7 7 7"></path></svg>
};

const parseNumberStrict = (val) => {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') return val;
  let str = String(val).trim();
  if (str === '-' || str === '') return 0;
  str = str.replace(/[R$\s]/g, '');
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/\.\d{3}$/.test(str) || str.split('.').length > 2) {
    str = str.replace(/\./g, '');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

const REGION_COORDS = {
  "GRANDE FLORIANÓPOLIS": [-27.5954, -48.5480],
  "NORTE CATARINENSE": [-26.3045, -48.8487],
  "SUL CATARINENSE": [-28.6733, -49.3736],
  "VALE DO ITAJAÍ": [-26.9194, -49.0661],
  "OESTE CATARINENSE": [-27.1004, -52.6152],
  "SERRANA": [-27.8105, -50.3259]
};

const NativeBarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="p-4 text-xs font-bold uppercase text-gray-500">Sem dados para o gráfico</div>;
  }
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div className="flex h-full items-end gap-2 px-2 pt-8 pb-6 overflow-x-auto">
      {data.map((item, idx) => {
        const heightPct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
        return (
          <div key={idx} className="flex flex-col items-center flex-1 min-w-[40px] group relative h-full justify-end">
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[#111] text-white text-[10px] font-black uppercase px-2 py-1 whitespace-nowrap z-10 pointer-events-none transition-opacity border-2 border-black">
              {item.name}: {item.value.toLocaleString()}
            </div>
            <div className="w-full bg-[#008080] border-2 border-black group-hover:bg-[#c32148] transition-colors relative" style={{ height: `${heightPct}%`, minHeight: '4px' }}></div>
            <div className="text-[9px] font-black uppercase mt-2 text-center truncate w-full transform -rotate-45 origin-top-left translate-y-2 translate-x-2">{item.name}</div>
          </div>
        );
      })}
    </div>
  );
};

const LeafletMap = ({ data }) => {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapReady(true);
      document.head.appendChild(script);
    } else {
      setMapReady(true);
    }
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L || data.length === 0) return;

    const mapContainer = mapRef.current;
    if (mapContainer._leaflet_id) {
      mapContainer._leaflet_id = null;
      mapContainer.innerHTML = ''; 
    }

    const map = window.L.map(mapContainer).setView([-27.27, -50.49], 7);

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    const bounds = [];

    data.forEach(m => {
      let lat = m.lat ? parseFloat(m.lat) : null;
      let lng = m.lng ? parseFloat(m.lng) : null;
      
      if (!lat || !lng) {
        const coords = REGION_COORDS[String(m.regiao).toUpperCase()];
        if (coords) {
          lat = coords[0] + (Math.random() - 0.5) * 0.5;
          lng = coords[1] + (Math.random() - 0.5) * 0.5;
        }
      }

      if (lat && lng) {
        bounds.push([lat, lng]);
        const customIcon = window.L.divIcon({
          className: 'custom-pin',
          html: `<div style="background-color: #c32148; border: 2px solid #111; color: white; font-weight: 900; padding: 2px 6px; font-size: 10px; box-shadow: 2px 2px 0 #111; transform: translate(-50%, -50%); display: inline-block;">
                  ${m.votosTotais.toLocaleString()}
                 </div>`,
          iconSize: [0, 0]
        });

        window.L.marker([lat, lng], { icon: customIcon })
          .bindPopup(`<div style="font-family: sans-serif; text-transform: uppercase;">
                        <h4 style="font-weight: 900; margin: 0; color: #111; font-size: 14px;">${m.municipio}</h4>
                        <p style="font-size: 10px; color: #666; margin: 4px 0 0 0;">${m.regiao}</p>
                        <p style="font-weight: 900; color: #c32148; font-size: 16px; margin: 4px 0 0 0;">${m.votosTotais} VOTOS</p>
                      </div>`)
          .addTo(map);
      }
    });

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30] });

    return () => { map.remove(); };
  }, [mapReady, data]);

  return <div ref={mapRef} className="w-full h-full z-10 bg-gray-100"></div>;
};

const Chatbot = ({ rawData, munsData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ sender: 'bot', text: 'SISTEMA ATIVO. Como posso ajudar com os dados da base?' }]);
  const [input, setInput] = useState('');

  const processQuery = (query) => {
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (q.includes("total") || q.includes("quantos votos")) {
      const total = rawData.reduce((acc, curr) => acc + curr.votos, 0);
      return `Marquito obteve um total de ${total.toLocaleString('pt-BR')} votos na base atual.`;
    }
    
    if (q.includes("melhor regiao") || q.includes("regiao mais")) {
      const regMap = {};
      rawData.forEach(d => { regMap[d.regiao] = (regMap[d.regiao] || 0) + d.votos; });
      const best = Object.entries(regMap).sort((a, b) => b[1] - a[1])[0];
      return `A região com mais votos é ${best[0]}, somando ${best[1].toLocaleString('pt-BR')} votos.`;
    }

    const mun = munsData.find(m => m.municipio.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === q);
    if (mun) {
      return `Em ${mun.municipio} (${mun.regiao}), o registro é de ${mun.votosTotais.toLocaleString('pt-BR')} votos.`;
    }

    return "Não compreendi ou o dado não está na base. Tente perguntar pelo 'Total', 'Melhor região' ou digite o nome exato de um município.";
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setTimeout(() => {
      const botReply = processQuery(userMsg);
      setMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
    }, 500);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="w-80 h-96 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col mb-4">
          <div className="bg-[#111] text-white p-3 border-b-4 border-black flex justify-between items-center shrink-0">
             <span className="font-black uppercase text-xs tracking-widest flex items-center gap-2"><Icons.Chat /> Assessor Virtual</span>
             <button onClick={() => setIsOpen(false)} className="hover:text-[#e2b714] font-black px-2">X</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-[#f4f4f4] space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-2 border-2 border-black max-w-[85%] text-xs font-bold uppercase ${msg.sender === 'user' ? 'bg-[#c32148] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(226,183,20,1)]'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSend} className="border-t-4 border-black flex shrink-0">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte algo..." className="flex-1 p-2 bg-white text-xs font-bold uppercase outline-none" />
            <button type="submit" className="bg-[#111] text-white px-4 font-black uppercase hover:bg-[#e2b714] hover:text-black transition-colors border-l-4 border-black">IR</button>
          </form>
        </div>
      )}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="w-14 h-14 bg-[#111] border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-full flex items-center justify-center hover:scale-110 transition-transform">
          <Icons.Chat />
        </button>
      )}
    </div>
  );
};

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');

  const parseJSONData = (json) => {
    let parsedRows = [];
    const targetArray = json.estado || json.votos || json.dados || json.capital || json;
    
    if (!Array.isArray(targetArray) || targetArray.length < 2) {
      throw new Error("Formato de JSON inválido ou vazio.");
    }

    const normalizeKey = (k) => String(k).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    if (Array.isArray(targetArray[0])) {
      const headers = targetArray[0].map(normalizeKey);
      const idx = {
        municipio: headers.findIndex(h => h === 'MUNICIPIO' || h === 'CIDADE'),
        regiao: headers.findIndex(h => h.includes('REGIAO')),
        bairro: headers.findIndex(h => h === 'BAIRRO'),
        votos: headers.findIndex(h => h.includes('QUANTIDADE DE VOTOS') || h === 'VOTOS')
      };

      if (idx.municipio === -1 || idx.votos === -1) {
        throw new Error("Colunas obrigatórias não encontradas.");
      }

      parsedRows = targetArray.slice(1).map(row => ({
        municipio: row[idx.municipio] || '',
        regiao: idx.regiao > -1 ? row[idx.regiao] || 'Sem Região' : 'Sem Região',
        bairro: idx.bairro > -1 ? row[idx.bairro] || '' : '',
        votos: idx.votos > -1 ? parseNumberStrict(row[idx.votos]) : 0,
        lat: headers.includes('LATITUDE') ? row[headers.indexOf('LATITUDE')] : null,
        lng: headers.includes('LONGITUDE') ? row[headers.indexOf('LONGITUDE')] : null
      }));
    } else {
      parsedRows = targetArray.map(row => {
        const normalizedRow = {};
        Object.keys(row).forEach(k => { normalizedRow[normalizeKey(k)] = row[k]; });
        return {
           municipio: normalizedRow['MUNICIPIO'] || normalizedRow['CIDADE'] || '',
           regiao: normalizedRow['REGIAO EM SC'] || normalizedRow['REGIAO'] || 'Sem Região',
           bairro: normalizedRow['BAIRRO'] || '',
           votos: parseNumberStrict(normalizedRow['QUANTIDADE DE VOTOS'] || normalizedRow['VOTOS'] || 0),
           lat: normalizedRow['LATITUDE'] || null,
           lng: normalizedRow['LONGITUDE'] || null
        };
      });
    }

    return parsedRows.filter(r => r.municipio && String(r.municipio).trim() !== "");
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!API_URL) {
        setError("VITE_SCRIPT_URL não definida na Vercel.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(API_URL);
        if (!res.ok) {
          throw new Error(`ERRO HTTP ${res.status}`);
        }
        const json = await res.json();
        const cleanData = parseJSONData(json);
        setRawData(cleanData);
      } catch (e) {
        setError(`FALHA DE CONEXÃO: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const { munsComVoto, chartDataRegioes, totalGeral } = useMemo(() => {
    if (rawData.length === 0) {
      return { munsComVoto: [], chartDataRegioes: [], totalGeral: 0 };
    }

    const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const filteredRaw = rawData.filter(d => {
      if (!query) return true;
      const mMatch = d.municipio.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query);
      const rMatch = String(d.regiao).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query);
      const bMatch = String(d.bairro).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query);
      return mMatch || rMatch || bMatch;
    });

    const mapMuns = {};
    const regMap = {};
    let total = 0;

    filteredRaw.forEach(d => {
      const munName = d.municipio ? String(d.municipio).trim() : 'Desconhecido';
      const regName = d.regiao ? String(d.regiao).trim() : 'Sem Região';
      const votosNum = parseInt(d.votos) || 0;

      if (!mapMuns[munName]) {
        mapMuns[munName] = { municipio: munName, regiao: regName, votosTotais: 0, bairrosRaw: [], lat: d.lat, lng: d.lng };
      }
      
      mapMuns[munName].votosTotais += votosNum;
      total += votosNum;
      
      if (votosNum > 0 && d.bairro && d.bairro !== "-") {
        mapMuns[munName].bairrosRaw.push({ ...d, votos: votosNum });
      }
    });

    const comVoto = Object.values(mapMuns).filter(m => m.votosTotais > 0);
    
    comVoto.forEach(m => {
      if(!regMap[m.regiao]) regMap[m.regiao] = 0;
      regMap[m.regiao] += m.votosTotais;
    });

    return {
      munsComVoto: comVoto.sort((a,b) => b.votosTotais - a.votosTotais),
      chartDataRegioes: Object.keys(regMap).map(k => ({ name: k, value: regMap[k] })).sort((a,b) => b.value - a.value),
      totalGeral: total
    };
  }, [rawData, searchQuery]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f4f4]">
        <div className="text-xl font-black uppercase text-black animate-pulse">Sincronizando Base de Dados...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f4f4] p-6">
        <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-xl font-black uppercase text-[#c32148]">{error}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f4] font-sans selection:bg-[#e2b714] selection:text-black">
      <header className="bg-white border-b-4 border-black shrink-0 shadow-sm z-20 sticky top-0">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 border-b-4 border-black">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#c32148] border-4 border-black text-white flex items-center justify-center font-black text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">🗂️</div>
            <div>
              <h1 className="text-2xl font-black uppercase leading-none text-[#111]">Tabulum</h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Base de Dados Conectada</p>
            </div>
          </div>
          
          <div className="flex w-full md:w-[400px] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white relative">
             <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><Icons.Search /></div>
             <input type="text" placeholder="Busca Universal (Município, Região, Bairro)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-transparent font-bold text-xs uppercase outline-none text-[#111] placeholder-gray-400" />
             {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 px-4 font-black text-[#c32148] hover:bg-gray-100">X</button>}
          </div>
        </div>

        <div className="flex border-t-2 border-transparent bg-[#111]">
          {[{ id: 'list', label: 'Tabela de Dados', color: 'bg-[#e2b714]' }, { id: 'dashboard', label: 'Análise Gráfica', color: 'bg-[#008080]' }, { id: 'map', label: 'Mapeamento (Leaflet)', color: 'bg-[#c32148]' }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 px-4 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition border-r-2 border-black last:border-r-0 ${activeTab === tab.id ? `${tab.color} text-[#111] ${tab.id !== 'list' ? 'text-white' : ''} shadow-[inset_0_-4px_0_0_#111]` : 'bg-transparent text-gray-400 hover:bg-gray-800'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full max-w-7xl mx-auto">
        {activeTab === 'list' && (
          <div className="animate-[fadeIn_0.3s_ease-in-out]">
            <div className="mb-4 text-[10px] font-black uppercase text-gray-500 bg-white inline-block p-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Mostrando {munsComVoto.length} resultados | Total Filtrado: <span className="text-[#c32148] text-sm">{totalGeral.toLocaleString()}</span> votos
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
              {munsComVoto.map((m, idx) => (
                <div key={idx} className="border-4 border-black bg-white flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group">
                  <div className="h-4 w-full bg-[#e2b714] border-b-4 border-black group-hover:bg-[#008080] transition-colors"></div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{m.regiao}</p>
                      <h3 className="font-black text-xl uppercase leading-tight text-[#111]">{m.municipio}</h3>
                    </div>
                    <div className="mt-6 text-right border-t-2 border-gray-200 pt-3 flex justify-between items-end">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Votos</span>
                       <span className="text-2xl font-black text-[#c32148]">{m.votosTotais.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              ))}
              {munsComVoto.length === 0 && <div className="col-span-full text-center py-10 font-black uppercase text-gray-400">Nenhum dado encontrado para a busca.</div>}
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
             <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-96">
                <div className="bg-[#111] text-white p-4 border-b-4 border-black"><h3 className="font-black uppercase tracking-wider text-sm flex items-center"><Icons.Chart /> <span className="ml-2">Distribuição Regional (Filtro Ativo)</span></h3></div>
                <div className="flex-1 bg-[#f4f4f4] relative p-4"><NativeBarChart data={chartDataRegioes} /></div>
             </div>
             
             <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
                <h3 className="font-black uppercase text-xl mb-4 text-[#111] border-b-4 border-black pb-2 inline-block">Mapeamento em Árvore (Proporção)</h3>
                <div className="flex flex-wrap min-h-[250px] p-2 bg-[#111] gap-[2px]">
                  {munsComVoto.slice(0, 20).map((m, i) => {
                    const total = munsComVoto.slice(0,20).reduce((acc, curr) => acc + curr.votosTotais, 0);
                    const minSize = Math.max((m.votosTotais / total) * 100, 5); 
                    return (
                      <div key={i} className="flex-grow flex items-center justify-center p-2 text-white relative overflow-hidden" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length], flexBasis: `${minSize}%`, minWidth: '100px' }}>
                        <div className="text-center z-10 p-1 bg-black/40 w-full backdrop-blur-sm border border-white/20">
                          <div className="font-black text-[10px] md:text-xs uppercase tracking-wider truncate">{m.municipio}</div>
                          <div className="text-xs font-bold">{m.votosTotais.toLocaleString()} v.</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-[75vh] flex flex-col relative w-full animate-[fadeIn_0.3s_ease-in-out]">
            <div className="bg-[#c32148] text-white p-3 border-b-4 border-black flex justify-between items-center">
              <h3 className="font-black uppercase text-sm flex items-center"><Icons.Map /> <span className="ml-2">Mapa de Votos (Leaflet)</span></h3>
            </div>
            <div className="flex-1 w-full bg-gray-200 relative">
               <LeafletMap data={munsComVoto} />
            </div>
          </div>
        )}
      </main>

      <Chatbot rawData={rawData} munsData={munsComVoto} />
    </div>
  );
}
