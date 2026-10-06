import React, { useState, useMemo } from 'react';

// Cores Mondrian / Marquito
const COLORS = { mustard: '#e2b714', teal: '#008080', crimson: '#c32148', black: '#111111', white: '#ffffff', lightGray: '#f4f4f4' };
const PIE_COLORS = [COLORS.mustard, COLORS.teal, COLORS.crimson, '#555555', '#999999', '#333333', '#dddddd'];

// BANCO DE DADOS INTEGRADO (Extraído do arquivo HTML do seu colega - Zero Delay / Zero Erros 404)
const DATABASE = {
  "ano_2022": { "total_votos": 40329, "cidades_com_votos": 234 },
  "ano_2026": { "total_votos": 65199, "cidades_com_votos": 274, "crescimento_votos_percentual": "+61.67%" },
  "municipios": {
    "FLORIANÓPOLIS": { nome: "Florianópolis", regiao: "Grande Florianópolis", votos_2022: 25975, votos_2026: 37062, crescimento: "+42.68%" },
    "SÃO JOSÉ": { nome: "São José", regiao: "Grande Florianópolis", votos_2022: 3179, votos_2026: 5059, crescimento: "+59.14%" },
    "PALHOÇA": { nome: "Palhoça", regiao: "Grande Florianópolis", votos_2022: 1556, votos_2026: 2564, crescimento: "+64.78%" },
    "JOINVILLE": { nome: "Joinville", regiao: "Norte Catarinense", votos_2022: 1029, votos_2026: 1555, crescimento: "+51.12%" },
    "GAROPABA": { nome: "Garopaba", regiao: "Sul Catarinense", votos_2022: 432, votos_2026: 1353, crescimento: "+213.19%" },
    "IMBITUBA": { nome: "Imbituba", regiao: "Sul Catarinense", votos_2022: 535, votos_2026: 1202, crescimento: "+124.67%" },
    "ITAJAÍ": { nome: "Itajaí", regiao: "Vale do Itajaí", votos_2022: 595, votos_2026: 1079, crescimento: "+81.34%" },
    "BLUMENAU": { nome: "Blumenau", regiao: "Vale do Itajaí", votos_2022: 555, votos_2026: 891, crescimento: "+60.54%" },
    "CRICIÚMA": { nome: "Criciúma", regiao: "Sul Catarinense", votos_2022: 238, votos_2026: 887, crescimento: "+272.69%" },
    "BIGUAÇU": { nome: "Biguaçu", regiao: "Grande Florianópolis", votos_2022: 569, votos_2026: 829, crescimento: "+45.69%" },
    "BALNEÁRIO CAMBORIÚ": { nome: "Balneário Camboriú", regiao: "Vale do Itajaí", votos_2022: 511, votos_2026: 789, crescimento: "+54.40%" },
    "LAGES": { nome: "Lages", regiao: "Serrana", votos_2022: 236, votos_2026: 609, crescimento: "+158.05%" },
    "CHAPECÓ": { nome: "Chapecó", regiao: "Oeste Catarinense", votos_2022: 110, votos_2026: 488, crescimento: "+343.64%" }
  }
};

const Icons = {
  Chart: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M18 20V10M12 20V4M6 20v-6"></path></svg>,
  Map: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M9 20l-6-3V5l6 3m0 12l6-3m-6 3V8m6 10l6 3V6l-6-3m0 15V5"></path></svg>,
  List: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M4 6h16M4 12h16M4 18h16"></path></svg>
};

const NativeBarChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div className="flex h-full items-end gap-2 px-2 pt-8 pb-6 overflow-x-auto">
      {data.map((item, idx) => (
        <div key={idx} className="flex flex-col items-center flex-1 min-w-[40px] group relative h-full justify-end">
          <div className="w-full bg-[#008080] border-2 border-black group-hover:bg-[#c32148] transition-colors relative" 
               style={{ height: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%`, minHeight: '4px' }}></div>
          <div className="text-[9px] font-black uppercase mt-2 text-center truncate w-full transform -rotate-45 origin-top-left translate-y-2 translate-x-2">{item.name}</div>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { munsComVoto, chartDataRegioes } = useMemo(() => {
    const rawList = Object.values(DATABASE.municipios);
    const regMap = {};
    rawList.forEach(m => {
      if (!regMap[m.regiao]) regMap[m.regiao] = 0;
      regMap[m.regiao] += m.votos_2026;
    });
    
    return {
      munsComVoto: rawList.sort((a,b) => b.votos_2026 - a.votos_2026),
      chartDataRegioes: Object.keys(regMap).map(k => ({ name: k, value: regMap[k] })).sort((a,b) => b.value - a.value)
    };
  }, []);

  const renderDashboard = () => (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-gray-500 mb-1 tracking-widest">Total Votos (2026)</p>
          <p className="text-4xl font-black text-[#c32148]">{DATABASE.ano_2026.total_votos.toLocaleString()}</p>
        </div>
        <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-gray-500 mb-1 tracking-widest">Crescimento vs 2022</p>
          <p className="text-4xl font-black text-[#008080]">{DATABASE.ano_2026.crescimento_votos_percentual}</p>
        </div>
        <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-gray-500 mb-1 tracking-widest">Municípios com Votos</p>
          <p className="text-4xl font-black text-[#111]">{DATABASE.ano_2026.cidades_com_votos}</p>
        </div>
      </div>
      
      <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        <div className="bg-[#111] text-white p-4 border-b-4 border-black">
          <h3 className="font-black uppercase tracking-wider text-sm flex items-center"><Icons.Chart /> <span className="ml-2">Votos por Região (2026)</span></h3>
        </div>
        <div className="h-72 bg-[#f4f4f4] relative p-4"><NativeBarChart data={chartDataRegioes} /></div>
      </div>

      <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        <div className="bg-[#e2b714] text-[#111] p-4 border-b-4 border-black">
          <h3 className="font-black uppercase tracking-wider text-sm">Top Municípios - Crescimento Estratégico</h3>
        </div>
        <table className="w-full text-left text-xs font-bold border-collapse bg-white">
          <thead className="bg-[#111] text-white uppercase text-[10px]">
            <tr><th className="p-3 border-r-2 border-black">Município</th><th className="p-3 border-r-2 border-black text-right">Votos 2022</th><th className="p-3 border-r-2 border-black text-right">Votos 2026</th><th className="p-3 text-right">Crescimento</th></tr>
          </thead>
          <tbody>
            {munsComVoto.slice(0, 10).map((m, i) => (
              <tr key={i} className="border-b-2 border-gray-200">
                <td className="p-3 border-r-2 border-black uppercase text-sm hover:text-[#008080]">{m.nome}</td>
                <td className="p-3 border-r-2 border-black text-right text-gray-500">{m.votos_2022.toLocaleString()}</td>
                <td className="p-3 border-r-2 border-black text-right text-[#c32148] font-black">{m.votos_2026.toLocaleString()}</td>
                <td className="p-3 text-right text-[#008080]">{m.crescimento}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f4] font-sans">
      <header className="bg-white border-b-4 border-black p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4 border-r-4 border-black pr-6">
          <div className="w-12 h-12 bg-[#c32148] border-4 border-black text-white flex items-center justify-center font-black text-xl">🗂️</div>
          <div><h1 className="text-2xl font-black uppercase leading-none">Tabulum</h1><p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Base Consolidada 2026</p></div>
        </div>
        <div className="flex border-2 border-black bg-[#111] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full sm:w-auto">
          {[{ id: 'dashboard', label: 'Visão Estratégica', color: 'bg-[#e2b714]' }, { id: 'map', label: 'Mapa Interativo', color: 'bg-[#008080]' }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 sm:flex-none px-6 py-3 text-xs font-black uppercase tracking-widest transition border-r-2 border-black last:border-r-0 ${activeTab === tab.id ? `${tab.color} text-[#111]` : 'bg-white text-gray-500 hover:bg-gray-200'}`}>{tab.label}</button>
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full max-w-7xl mx-auto">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'map' && (
          <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-[75vh] flex flex-col relative w-full animate-[fadeIn_0.3s_ease-in-out]">
            <div className="bg-[#111] text-white p-3 border-b-4 border-black flex justify-between items-center"><h3 className="font-black uppercase text-sm flex items-center"><Icons.Map /> <span className="ml-2">MyMaps Integrado</span></h3></div>
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14197415.861787263!2d-60.106886801931596!3d-27.46914595240228!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94dfb768e8203f19%3A0xc3b8a3eb4232bf36!2sSanta%20Catarina!5e0!3m2!1spt-BR!2sbr!4v1700000000000!5m2!1spt-BR!2sbr" width="100%" height="100%" className="border-0" allowFullScreen="" loading="lazy"></iframe>
          </div>
        )}
      </main>
    </div>
  );
}
