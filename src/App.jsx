import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- CONFIGURAÇÃO DE CORES (Mondrian) ---
const COLORS = {
  mustard: '#e2b714',
  teal: '#008080',
  crimson: '#c32148',
  black: '#111111',
  white: '#ffffff',
  lightGray: '#f4f4f4'
};
const PIE_COLORS = [COLORS.mustard, COLORS.teal, COLORS.crimson, '#555555', '#999999', '#333333', '#dddddd'];

// --- VARIÁVEIS DE AMBIENTE ---
const getApiUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SCRIPT_URL) {
      return import.meta.env.VITE_SCRIPT_URL;
    }
  } catch (e) {}
  return ""; 
};
const API_URL = getApiUrl();

// --- ÍCONES ---
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

// --- FUNÇÕES UTILITÁRIAS ---
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

// Coordenadas Centrais das Regiões de SC (Fallback caso a planilha não tenha LAT/LNG)
const REGION_COORDS = {
  "GRANDE FLORIANÓPOLIS": [-27.5954, -48.5480],
  "NORTE CATARINENSE": [-26.3045, -48.8487],
  "SUL CATARINENSE": [-28.6733, -49.3736],
  "VALE DO ITAJAÍ": [-26.9194, -49.0661],
  "OESTE CATARINENSE": [-27.1004, -52.6152],
  "SERRANA": [-27.8105, -50.3259]
};

// --- COMPONENTES VISUAIS NATIVOS ---
const NativeBarChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="p-4 text-xs font-bold uppercase text-gray-500">Sem dados para o gráfico</div>;
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

// --- COMPONENTE DO MAPA LEAFLET DINÂMICO ---
const LeafletMap = ({ data }) => {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Injeção Dinâmica do Leaflet para evitar erros de Build na Vercel
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

    const map = window.L.map(mapContainer).setView([-27.27, -50.49], 7); // Centro de SC

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Agrupamento por Região ou Município (dependendo dos dados disponíveis)
    const bounds = [];
    const aggregated = {};

    data.forEach(m => {
      // Se houver coluna LAT/LNG na planilha, usa ela. Senão, agrupa por Região
      let lat = m.lat ? parseFloat(m.lat) : null;
      let lng = m.lng ? parseFloat(m.lng) : null;
      
      if (!lat || !lng) {
        const coords = REGION_COORDS[String(m.regiao).toUpperCase()];
        if (coords) {
          lat = coords[0] + (Math.random() - 0.5) * 0.5; // Dispersão visual
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

// --- COMPONENTE CHATBOT (Estratégico) ---
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

    // Busca específica por município
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

// --- APLICATIVO PRINCIPAL ---
export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);

  // Interpretador Resiliente da Planilha
  const parseJSONData = (json) => {
    let parsedRows = [];
    const targetArray = json.estado || json.votos || json.dados || json.capital || json;
    if (!Array.isArray(targetArray) || targetArray.length < 2) throw new Error("Formato de JSON inválido ou vazio.");

    const normalizeKey = (k) => String(k).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    if (Array.isArray(targetArray[0])) {
      const headers = targetArray[0].map(normalizeKey);
      const idx = {
        municipio: headers.findIndex(h => h === 'MUNICIPIO' || h === 'CIDADE'),
        regiao: headers.findIndex(h => h.includes('REGIAO')),
        bairro: headers.findIndex(h => h === 'BAIRRO'),
        votos: headers.findIndex(h => h.includes('QUANTIDADE DE VOTOS') || h === 'VOTOS')
      };

      if (idx.municipio === -1 || idx.votos === -1) throw new Error("Colunas obrigatórias não encontradas.");

      parsedRows = targetArray.slice(1).map(row => ({
        municipio: row[idx.municipio] || '',
        regiao: idx.regiao > -1 ? row[idx.regiao] || 'Sem Região' : 'Sem Região',
        bairro: idx.bairro > -1 ? row[idx.bairro] || '' : '',
        votos: idx.votos > -1 ? parseNumberStrict(row[idx.votos]) : 0,
        // Suporte futuro a coordenadas no mapa
        lat: headers.includes('LATITUDE') ? row[headers.indexOf('LATITUDE')] : null,
        lng: headers.includes('LONGITUDE') ? row[headers.indexOf('LONGITUDE')] : null
      }));
    }
    return parsedRows.filter(r => r.municipio && String(r.municipio).trim() !== "");
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!API_URL) { setError("VITE_SCRIPT_URL não definida na Vercel."); setLoading(false); return;
