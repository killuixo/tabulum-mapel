import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { AlertCircle, Loader2, Save, FileSpreadsheet } from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'tabulum-app-v1';

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
let envScriptUrl = null;
try {
  if (typeof process !== 'undefined' && process.env) {
    envScriptUrl = process.env.REACT_APP_SCRIPT_URL || process.env.VITE_SCRIPT_URL;
  }
} catch (e) {
  // Ignora erros de ambiente restrito
}

// SUBSTITUA "COLE_A_URL_DO_SEU_APPS_SCRIPT_AQUI" PELA SUA URL DE VERDADE SE NÃO QUISER USAR VARIÁVEIS DE AMBIENTE
const SCRIPT_URL = envScriptUrl || "COLE_A_URL_DO_SEU_APPS_SCRIPT_AQUI"; 

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('ESTADO');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [estadoData, setEstadoData] = useState([]);
  const [capitalData, setCapitalData] = useState([]);
  
  const [estadoOverrides, setEstadoOverrides] = useState({});
  const [capitalOverrides, setCapitalOverrides] = useState({});

  // 1. Autenticação Firebase (Garante Edições Universais)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erro na autenticação:", err);
        setError("Falha ao conectar com o servidor de sincronização em tempo real.");
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Buscar Dados Seguros do Google Apps Script
  useEffect(() => {
    const fetchSheets = async () => {
      setLoading(true);
      setError(null);

      // Verificação de segurança caso a URL não tenha sido preenchida
      if (!SCRIPT_URL || SCRIPT_URL === "COLE_A_URL_DO_SEU_APPS_SCRIPT_AQUI") {
        setError("API não configurada: Adicione a URL do Google Apps Script nas Variáveis de Ambiente do Vercel ou no código fonte.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(SCRIPT_URL);
        
        if (!response.ok) {
          throw new Error("Não foi possível acessar os dados. O Apps Script pode não estar público.");
        }

        const data = await response.json();
        
        if (data.estado && data.capital) {
          setEstadoData(data.estado);
          setCapitalData(data.capital);
        } else {
           throw new Error("Formato de dados inválido recebido do Apps Script.");
        }

      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        setError("Erro de conexão com a API da planilha segura. Verifique se o link do Apps Script está correto.");
      } finally {
        setLoading(false);
      }
    };

    fetchSheets();
  }, []);

  // 3. Ouvir Edições do Firebase (Overrides Universais)
  useEffect(() => {
    if (!user) return;

    // Inscrição para modificações em ESTADO
    const estadoRef = collection(db, 'artifacts', appId, 'public', 'data', 'estado_overrides');
    const unsubEstado = onSnapshot(estadoRef, (snapshot) => {
      const overrides = {};
      snapshot.forEach(doc => { overrides[doc.id] = doc.data(); });
      setEstadoOverrides(overrides);
    }, (err) => console.error("Erro Estado Sync:", err));

    // Inscrição para modificações em CAPITAL
    const capitalRef = collection(db, 'artifacts', appId, 'public', 'data', 'capital_overrides');
    const unsubCapital = onSnapshot(capitalRef, (snapshot) => {
      const overrides = {};
      snapshot.forEach(doc => { overrides[doc.id] = doc.data(); });
      setCapitalOverrides(overrides);
    }, (err) => console.error("Erro Capital Sync:", err));

    return () => {
      unsubEstado();
      unsubCapital();
    };
  }, [user]);

  // --- HANDLERS DE EDIÇÃO (Salvam na nuvem para todos) ---
  const handleEstadoEdit = async (cidadeId, newValue) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'estado_overrides', cidadeId);
      await setDoc(docRef, { status: newValue }, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar edição:", err);
    }
  };

  const handleCapitalEdit = async (rowId, field, newValue) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'capital_overrides', rowId);
      await setDoc(docRef, { [field]: newValue }, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar edição:", err);
    }
  };

  // --- RENDERIZADORES DE TABELA ---
  const renderEstadoTable = () => {
    if (estadoData.length === 0) return null;
    const headers = estadoData[0];
    const rows = estadoData.slice(1);

    // Converte todos os cabeçalhos para string para garantir busca sem erros
    const safeHeaders = headers.map(h => String(h).toLowerCase());
    const findIndex = (strMatch) => safeHeaders.findIndex(h => h.includes(strMatch.toLowerCase()));
    
    const indices = {
      cidade: findIndex('cidade'), // A
      regiao: findIndex('região'), // B
      votos2018: findIndex('2018'), // C
      votos2022: findIndex('2022'), // D
      percVotos: findIndex('% dos votos'), // E
      chapaPsol: findIndex('chapa psol'), // F
      leads: findIndex('leads'), // G
      equipe: findIndex('equipe do mandato'), // H
      diretorio: findIndex('diretório'), // I
      diarias: findIndex('diárias'), // J
      liderancasMilo: findIndex('lideranças (milo)'), // K
      loa2023: findIndex('loa 2023'), // M
      loa2024: findIndex('loa 2024'), // O
      valor2023: findIndex('valor total de emendas 2023'), // L
      valor2024: findIndex('valor total de emendas 2024'), // N
      valor2025: findIndex('valor total de emendas 2025'), // P
      loa2025: findIndex('loa 2025'), // Q
      circulos: findIndex('círculos territoriais'), // U
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
              <th className="p-2 border-r-2 border-black">Equipe</th>
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
              if (cidade === "Desconhecido" || cidade.trim() === "") return null; // Pular vazias
              
              const rowId = cidade.replace(/[^a-zA-Z0-9]/g, '_'); 
              const sheetStatus = row[indices.circulos];
              const overrideStatus = estadoOverrides[rowId]?.status;
              const displayStatus = overrideStatus !== undefined ? overrideStatus : (sheetStatus || '');

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
                      onChange={(e) => handleEstadoEdit(rowId, e.target.value)}
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
      local: findIndex('local'), // C
      bairro: findIndex('bairro replan'), // D
      distrito: findIndex('distrito'), // E
      regiao: findIndex('região'), // F
      comp2022: findIndex('comp 2022'), // H
      votos2022: findIndex('votos 2022'), // I
      perc2022: findIndex('% votos comparecidos - 2022'), // J
      comp2024: findIndex('comp 2024'), // K
      votos2024: findIndex('votos 2024'), // L
      perc2024: findIndex('% votos comparecidos - 2024'), // M
      articulador: findIndex('equipe do mandato'), // O
      estrategia: findIndex('estratégia territorial'), // R
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
              
              const rowId = (local + "_" + (row[indices.bairro]||"")).replace(/[^a-zA-Z0-9]/g, '_');
              
              const sheetArticulador = row[indices.articulador];
              const sheetEstrategia = row[indices.estrategia];
              
              const overrideArticulador = capitalOverrides[rowId]?.articulador;
              const overrideEstrategia = capitalOverrides[rowId]?.estrategia;
              
              const displayArticulador = overrideArticulador !== undefined ? overrideArticulador : (sheetArticulador || '');
              const displayEstrategia = overrideEstrategia !== undefined ? overrideEstrategia : (sheetEstrategia || '');

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
                      onChange={(e) => handleCapitalEdit(rowId, 'articulador', e.target.value)}
                    />
                  </td>
                  <td className="p-2 border-black bg-red-50">
                     <select 
                      className="w-full bg-white border-2 border-black p-1 font-bold outline-none cursor-pointer focus:ring-0"
                      value={displayEstrategia}
                      onChange={(e) => handleCapitalEdit(rowId, 'estrategia', e.target.value)}
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
          <div className="w-12 h-12 border-4 border-black bg-[#c32148] flex-shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
             <FileSpreadsheet className="text-white" size={24} />
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
            <AlertCircle />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <span className="w-4 h-4 inline-block border-2 border-black" style={{ backgroundColor: activeTab === 'ESTADO' ? COLORS.mustard : COLORS.teal }}></span>
            Visão Geral: {activeTab}
          </h2>
          {user && !loading && (
             <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-black text-white px-3 py-1 rounded-none">
               <Save size={14} className="text-[#e2b714]" />
               Edições Globais Ativas
             </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <Loader2 className="animate-spin text-[#c32148] mb-4" size={48} />
            <p className="font-bold uppercase tracking-wider">Lendo API Segura...</p>
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
