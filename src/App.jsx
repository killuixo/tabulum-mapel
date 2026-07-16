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

// --- OPÇÕES DE MENUS SUSPENSOS ---
const ESTADO_STATUS_OPTIONS = [
  "",
  "Semeadura <100",
  "Semeadouro <35",
  "Germinação >100",
  "Crescimento >500",
  "Raiz >1000",
  "Árvore >5000",
  "Colheita"
];

const CAPITAL_ESTRATEGIA_OPTIONS = [
  "",
  "Mobilização Ativa",
  "Reunião de Núcleo",
  "Ação de Rua (Panfletagem)",
  "Estratégia Digital",
  "Manutenção Territorial",
  "Observação"
];

// --- CONFIGURAÇÃO DA API (GOOGLE APPS SCRIPT) ---
// Em Vite, as variáveis DEVEM começar com VITE_ e são injetadas no momento do Build.
// Adicionado fallback para process.env caso a Vercel force um ambiente Node clássico no build.
const getScriptUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SCRIPT_URL) {
      return import.meta.env.VITE_SCRIPT_URL;
    }
    if (typeof process !== 'undefined' && process.env && process.env.VITE_SCRIPT_URL) {
      return process.env.VITE_SCRIPT_URL;
    }
  } catch (e) {
    console.warn("Aviso: Variáveis de ambiente não detetadas.");
  }
  return ""; 
};

// Puxa a URL segura da Vercel
const SCRIPT_URL = getScriptUrl(); 

export default function App() {
  const [activeTab, setActiveTab] = useState('ESTADO');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);

  const [estadoData, setEstadoData] = useState([]);
  const [capitalData, setCapitalData] = useState([]);

  // 1. Buscar Dados da Planilha (GET)
  const fetchSheets = async () => {
    setLoading(true);
    setError(null);

    if (!SCRIPT_URL) {
      setError("API não configurada. Se já adicionou VITE_SCRIPT_URL na Vercel, vá à aba 'Deployments' e faça um REDEPLOY para aplicar a alteração.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error("Não foi possível aceder à folha de cálculo.");
      const data = await response.json();
      
      if (data.estado && data.capital) {
        setEstadoData(data.estado);
        setCapitalData(data.capital);
      } else {
         throw new Error("Formato de dados inválido. Verifique o Google Apps Script.");
      }
    } catch (err) {
      console.error("Erro ao procurar dados:", err);
      setError("Erro de ligação à folha de cálculo. Verifique o URL e a política de partilha (CORS).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, []); // Executa apenas uma vez ao abrir a aplicação

  // 2. Gravar Edição na Planilha (POST)
  const updateSheet = async (sheetName, rowIdx, colIdx, value) => {
    setSaving(true);
    try {
      const payload = {
        action: 'update',
        sheetName: sheetName,
        row: rowIdx + 2, 
        col: colIdx + 1, 
        value: value
      };

      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });
      
      setLastSaved(new Date());
    } catch (err) {
      console.error("Erro ao gravar:", err);
      alert("Houve um erro de rede ao tentar gravar a informação na folha de cálculo.");
    } finally {
      setSaving(false);
    }
  };

  // --- HANDLERS DE EDIÇÃO (Otimistas - Atualizam o ecrã na hora e enviam para o Google) ---
  const handleEstadoEdit = (rowIndex, colIndex, newValue) => {
    const newData = [...estadoData];
    newData[rowIndex + 1][colIndex] = newValue;
    setEstadoData(newData);
    updateSheet('ESTADO', rowIndex, colIndex, newValue);
  };

  const handleCapitalEdit = (rowIndex, colIndex, newValue) => {
    const newData = [...capitalData];
    newData[rowIndex + 1][colIndex] = newValue;
    setCapitalData(newData);
    updateSheet('CAPITAL', rowIndex, colIndex, newValue);
  };

  // --- RENDERIZADORES DE TABELA ---
  const renderEstadoTable = () => {
    if (estadoData.length === 0) return null;
    const headers = estadoData[0];
    const rows = estadoData.slice(1);

    const safeHeaders = headers.map(h => String(h).toLowerCase());
    const findIndex = (strMatch) => safeHeaders.findIndex(h => h.includes(strMatch.toLowerCase()));
    
    const indices = {
      cidade: findIndex('cidade'), 
      regiao: findIndex('região'), 
      votos2018: findIndex('2018'), 
      votos2022: findIndex('2022'), 
      percVotos: findIndex('% dos votos'), 
      chapaPsol: findIndex('chapa psol'), 
      leads: findIndex('leads'), 
      equipe: findIndex('equipe do mandato'), 
      diretorio: findIndex('diretório'), 
      diarias: findIndex('diárias'), 
      liderancasMilo: findIndex('lideranças (milo)'), 
      loa2023: findIndex('loa 2023'), 
      loa2024: findIndex('loa 2024'), 
      valor2023: findIndex('valor total de emendas 2023'), 
      valor2024: findIndex('valor total de emendas 2024'), 
      valor2025: findIndex('valor total de emendas 2025'), 
      loa2025: findIndex('loa 2025'), 
      circulos: findIndex('círculos territoriais'), 
    };

    return (
      <div className="overflow-x-auto border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <table className="w-full text-sm text-left font-medium whitespace-nowrap">
          <thead className="bg-[#111111] text-white uppercase text-xs">
            <tr>
              <th className="p-3 border-r-2 border-b-4 border-black sticky left-0 bg-[#111111] z-10 min-w-[200px]">Cidade</th>
              <th className="p-3 border-r-2 border-b-4 border-black">Região</th>
              <th className="p-3 border-r-2 border-b-4 border-black text-center" colSpan="8" style={{backgroundColor: COLORS.teal}}>Votos / Recebidos</th>
              <th className="p-3 border-r-2 border-b-4 border-black text-center" colSpan="3" style={{backgroundColor: COLORS.mustard, color: COLORS.black}}>Assessoria</th>
              <th className="p-3 border-r-2 border-b-4 border-black text-center" colSpan="4" style={{backgroundColor: COLORS.crimson}}>Sefaz</th>
              <th className="p-3 border-b-4 border-black bg-[#e2b714] text-black">Status (Círculos)</th>
            </tr>
            <tr className="bg-white text-black border-b-4 border-black">
              <th className="p-2 border-r-2 border-black sticky left-0 bg-white z-10">Nome</th>
              <th className="p-2 border-r-2 border-black">Região</th>
              <th className="p-2 border-r-2 border-black">2018</th>
              <th className="p-2 border-r-2 border-black">2022</th>
              <th className="p-2 border-r-2 border-black">% 2022</th>
              <th className="p-2 border-r-2 border-black">PSOL</th>
              <th className="p-2 border-r-2 border-black">Leads</th>
              <th className="p-2 border-r-2 border-black">Equipa</th>
              <th className="p-2 border-r-2 border-black">Diretório</th>
              <th className="p-2 border-r-2 border-black">Diárias</th>
              <th className="p-2 border-r-2 border-black">Lideranças</th>
              <th className="p-2 border-r-2 border-black">LOA 23</th>
              <th className="p-2 border-r-2 border-black">LOA 24</th>
              <th className="p-2 border-r-2 border-black">Valor 23</th>
              <th className="p-2 border-r-2 border-black">Valor 24</th>
              <th className="p-2 border-r-2 border-black">Valor 25</th>
              <th className="p-2 border-r-2 border-black">LOA 25</th>
              <th className="p-2 border-black font-bold">Menu Editável</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const cidade = row[indices.cidade] ? String(row[indices.cidade]) : "Desconhecido";
              if (cidade === "Desconhecido" || cidade.trim() === "") return null; 
              
              const displayStatus = row[indices.circulos] || '';

              return (
                <tr key={i} className="border-b-2 border-black hover:bg-gray-100 transition-colors">
                  <td className="p-2 border-r-2 border-black sticky left-0 bg-white font-bold">{cidade}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.regiao]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.votos2018]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.votos2022]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.percVotos]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.chapaPsol]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.leads]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.equipe]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.diretorio]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.diarias]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.liderancasMilo]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.loa2023]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.loa2024]}</td>
                  <td className="p-2 border-r-2 border-black text-xs">{row[indices.valor2023]}</td>
                  <td className="p-2 border-r-2 border-black text-xs">{row[indices.valor2024]}</td>
                  <td className="p-2 border-r-2 border-black text-xs">{row[indices.valor2025]}</td>
                  <td className="p-2 border-r-2 border-black">{row[indices.loa2025]}</td>
                  <td className="p-2 border-black bg-yellow-50">
                    <select 
                      className="w-full bg-white border-2 border-black p-1 font-bold outline-none cursor-pointer hover:bg-yellow-100 transition-colors focus:ring-0"
                      value={displayStatus}
                      onChange={(e) => handleEstadoEdit(i, indices.circulos, e.target.value)}
                    >
                      {ESTADO_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || "-- Selecione --"}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCapitalTable = () => {
    if (capitalData.length === 0) return null;
    const headers = capitalData[0];
    const rows = capitalData.slice(1);

    const safeHeaders = headers.map(h => String(h).toLowerCase());
    const findIndex = (strMatch) => safeHeaders.findIndex(h => h.includes(strMatch.toLowerCase()));
    
    const indices = {
      local: findIndex('local'),
      bairro: findIndex('bairro replan'), 
      distrito: findIndex('distrito'), 
      regiao: findIndex('região'), 
      comp2022: findIndex('comp 2022'), 
      votos2022: findIndex('votos 2022'), 
      perc2022: findIndex('% votos comparecidos - 2022'),
      comp2024: findIndex('comp 2024'), 
      votos2024: findIndex('votos 2024'), 
      perc2024: findIndex('% votos comparecidos - 2024'),
      articulador: findIndex('equipe do mandato'), 
      estrategia: findIndex('estratégia territorial'), 
    };

    return (
      <div className="overflow-x-auto border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <table className="w-full text-sm text-left font-medium whitespace-nowrap">
          <thead className="bg-[#111111] text-white uppercase text-xs">
            <tr>
              <th className="p-3 border-r-2 border-b-4 border-black sticky left-0 bg-[#111111] z-10 min-w-[300px]">Localidade</th>
              <th className="p-3 border-r-2 border-b-4 border-black">Geografia</th>
              <th className="p-3 border-r-2 border-b-4 border-black text-center" colSpan="3" style={{backgroundColor: COLORS.teal}}>Dados 2022</th>
              <th className="p-3 border-r-2 border-b-4 border-black text-center" colSpan="3" style={{backgroundColor: COLORS.mustard, color: COLORS.black}}>Dados 2024</th>
              <th className="p-3 border-b-4 border-black text-center" colSpan="2" style={{backgroundColor: COLORS.crimson}}>Gestão e Articulação (Editável)</th>
            </tr>
            <tr className="bg-white text-black border-b-4 border-black">
              <th className="p-2 border-r-2 border-black sticky left-0 bg-white z-10">Local de Votação</th>
              <th className="p-2 border-r-2 border-black">Bairro / Distrito / Região</th>
              <th className="p-2 border-r-2 border-black">Comparecimento</th>
              <th className="p-2 border-r-2 border-black">Votos</th>
              <th className="p-2 border-r-2 border-black">% Votos</th>
              <th className="p-2 border-r-2 border-black">Comparecimento</th>
              <th className="p-2 border-r-2 border-black">Votos</th>
              <th className="p-2 border-r-2 border-black">% Votos</th>
              <th className="p-2 border-r-2 border-black min-w-[200px]">Articulador Responsável</th>
              <th className="p-2 border-black min-w-[200px]">Estratégia Territorial</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const local = row[indices.local] ? String(row[indices.local]) : "";
              if (!local.trim()) return null;
              
              const displayArticulador = row[indices.articulador] || '';
              const displayEstrategia = row[indices.estrategia] || '';

              return (
                <tr key={i} className="border-b-2 border-black hover:bg-gray-100 transition-colors">
                  <td className="p-2 border-r-2 border-black sticky left-0 bg-white font-bold text-xs whitespace-normal">{local}</td>
                  <td className="p-2 border-r-2 border-black text-xs">
                    <span className="font-bold">{row[indices.bairro]}</span> <br/> 
                    <span className="text-gray-500">{row[indices.distrito]} - {row[indices.regiao]}</span>
                  </td>
                  <td className="p-2 border-r-2 border-black text-center">{row[indices.comp2022]}</td>
                  <td className="p-2 border-r-2 border-black text-center">{row[indices.votos2022]}</td>
                  <td className="p-2 border-r-2 border-black text-center">{row[indices.perc2022]}</td>
                  <td className="p-2 border-r-2 border-black text-center">{row[indices.comp2024]}</td>
                  <td className="p-2 border-r-2 border-black text-center">{row[indices.votos2024]}</td>
                  <td className="p-2 border-r-2 border-black text-center">{row[indices.perc2024]}</td>
                  <td className="p-2 border-r-2 border-black bg-red-50">
                     <input 
                      type="text"
                      className="w-full bg-white border-2 border-black p-1 font-bold outline-none focus:ring-0"
                      placeholder="Nome..."
                      value={displayArticulador}
                      onChange={(e) => handleCapitalEdit(i, indices.articulador, e.target.value)}
                    />
                  </td>
                  <td className="p-2 border-black bg-red-50">
                     <select 
                      className="w-full bg-white border-2 border-black p-1 font-bold outline-none cursor-pointer focus:ring-0"
                      value={displayEstrategia}
                      onChange={(e) => handleCapitalEdit(i, indices.estrategia, e.target.value)}
                    >
                      {CAPITAL_ESTRATEGIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || "-- Selecione --"}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4] font-sans text-black selection:bg-[#e2b714] selection:text-black">
      {/* HEADER MONDRIAN */}
      <header className="border-b-4 border-black bg-white flex flex-col md:flex-row shadow-md relative z-20">
        <div className="flex-1 p-6 md:p-8 flex items-center gap-4 border-b-4 md:border-b-0 md:border-r-4 border-black" style={{ backgroundColor: COLORS.white }}>
          <div className="w-12 h-12 border-4 border-black bg-[#c32148] flex-shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-2xl">
             📊
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Tabulum</h1>
            <p className="text-sm font-bold uppercase tracking-widest text-gray-600 mt-1">Mapa de Votos 2026</p>
          </div>
        </div>
        
        {/* Color Blocks */}
        <div className="flex flex-row md:flex-col w-full md:w-32">
          <div className="flex-1 h-8 md:h-full border-r-4 md:border-r-0 md:border-b-4 border-black" style={{ backgroundColor: COLORS.mustard }}></div>
          <div className="flex-1 h-8 md:h-full border-r-4 md:border-r-0 md:border-b-4 border-black" style={{ backgroundColor: COLORS.teal }}></div>
          <div className="flex-1 h-8 md:h-full" style={{ backgroundColor: COLORS.crimson }}></div>
        </div>
      </header>

      {/* TABS NAVIGATION */}
      <div className="flex border-b-4 border-black bg-white sticky top-0 z-20">
        <button 
          onClick={() => setActiveTab('ESTADO')}
          className={`flex-1 p-4 font-black text-xl uppercase tracking-wider border-r-4 border-black transition-all ${activeTab === 'ESTADO' ? 'bg-[#e2b714] text-black shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
        >
          Estado
        </button>
        <button 
          onClick={() => setActiveTab('CAPITAL')}
          className={`flex-1 p-4 font-black text-xl uppercase tracking-wider transition-all ${activeTab === 'CAPITAL' ? 'bg-[#008080] text-white shadow-[inset_0_-4px_0_0_#000]' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
        >
          Capital
        </button>
      </div>

      {/* CONTENT AREA */}
      <main className="p-4 md:p-8 max-w-[1600px] mx-auto">
        {error && (
          <div className="mb-6 border-4 border-black bg-[#c32148] text-white p-4 font-bold flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            ⚠️ <span>{error}</span>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <span className="w-4 h-4 inline-block border-2 border-black" style={{ backgroundColor: activeTab === 'ESTADO' ? COLORS.mustard : COLORS.teal }}></span>
            Visão Geral: {activeTab}
            <button 
               onClick={fetchSheets}
               className="ml-4 text-xs bg-black text-white px-3 py-1 uppercase tracking-widest hover:bg-gray-800 transition-colors"
            >
              Atualizar Dados
            </button>
          </h2>
          
          <div className="flex items-center gap-2">
            {saving && (
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-[#e2b714] text-black px-3 py-1 border-2 border-black">
                ⏳ Salvando na Planilha...
              </div>
            )}
            {!saving && lastSaved && (
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-[#008080] text-white px-3 py-1 border-2 border-black">
                ✅ Salvo com sucesso
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
          <div className="animate-fade-in">
            {activeTab === 'ESTADO' ? renderEstadoTable() : renderCapitalTable()}
          </div>
        )}
      </main>
      
      <footer className="mt-12 border-t-4 border-black bg-white p-6 text-center font-bold text-sm uppercase tracking-widest text-gray-500">
        Tabulum © 2026 • Sistema de Gestão Territorial
      </footer>
    </div>
  );
}
