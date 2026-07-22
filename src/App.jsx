import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';

// --- CONFIGURAÇÕES DE AMBIENTE ---
const getEnv = (key) => {
    try { if (typeof import.meta !== 'undefined' && import.meta.env) return import.meta.env[key]; } catch(e){}
    try { if (typeof process !== 'undefined' && process.env) return process.env[key]; } catch(e){}
    try { if (window && window[key]) return window[key]; } catch(e){}
    return '';
};

// As 5 URLs cruciais
const URLS = {
    leads: getEnv('VITE_LEADS_URL') || getEnv('NEXT_PUBLIC_LEADS_URL'),
    emendas: getEnv('VITE_EMENDAS_URL') || getEnv('NEXT_PUBLIC_EMENDAS_URL'),
    agenda: getEnv('VITE_AGENDA_URL') || getEnv('NEXT_PUBLIC_AGENDA_URL'),
    dadosGerais: getEnv('VITE_DADOS_GERAIS_URL') || getEnv('NEXT_PUBLIC_DADOS_GERAIS_URL'),
    contatos: getEnv('VITE_CONTATOS_URL') || getEnv('NEXT_PUBLIC_CONTATOS_URL')
};

// --- FUNÇÕES UTILITÁRIAS ---
const formatCurrency = (num) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num || 0);

const parseCurrency = (val) => {
    if(!val) return 0;
    if(typeof val === 'number') return val;
    const str = String(val).replace(/[R$\s\.]/g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

// Parser Estrito para Votos (idêntico ao do Mapa Eleitoral)
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

const normalizeStr = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const isFloripa = (str) => {
    const n = normalizeStr(str);
    return n.includes('florianopolis') || n.includes('floripa');
};

// Fuzzy match para achar a coluna de Votos 2022 dinamicamente
const getVotosValue = (obj) => {
    if(!obj) return 0;
    for (const key in obj) {
        const k = key.toLowerCase();
        // Procura por colunas que indiquem os votos do Marquito em 2022
        if ((k.includes('voto') || k.includes('2022') || k.includes('marquito')) && !k.includes('%') && !k.includes('válidos')) {
            return parseNumberStrict(obj[key]);
        }
    }
    return 0;
};

const Icons = {
    Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    MapPin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    FileText: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    Briefcase: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    ChevronUp: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><polyline points="18 15 12 9 6 15"/></svg>,
    ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><polyline points="6 9 12 15 18 9"/></svg>,
    Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
};

const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [data, setData] = useState({ leads: [], emendas: [], agenda: [], estado: [], capital: [], contatos: [] });
    const [loadingInfo, setLoadingInfo] = useState({ isLoading: true, stage: 'Iniciando', progress: 0 });
    const [isMock, setIsMock] = useState(false);
    
    // Controles de Navegação e Visão
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'sc', 'floripa'
    const [selectedEntity, setSelectedEntity] = useState(null); // { type: 'municipio'|'bairro', name: string, regiao: string }

    useEffect(() => {
        const loadData = async () => {
            setLoadingInfo({ isLoading: true, stage: 'Conectando...', progress: 10 });
            try {
                const fetchJSON = async (url) => {
                    if(!url) return null;
                    const res = await fetch(url);
                    if(!res.ok) return null;
                    return await res.json();
                }

                let leadsRaw=[], emendasRaw=[], agendaRaw=[], estadoRaw=[], capitalRaw=[], contatosRaw=[];
                let useMock = false;

                // Tenta buscar online via Variáveis de Ambiente
                if (URLS.leads) leadsRaw = await fetchJSON(URLS.leads) || [];
                if (URLS.emendas) emendasRaw = await fetchJSON(URLS.emendas) || [];
                if (URLS.agenda) agendaRaw = await fetchJSON(URLS.agenda) || [];
                if (URLS.contatos) contatosRaw = await fetchJSON(URLS.contatos) || [];
                if (URLS.dadosGerais) {
                    const dg = await fetchJSON(URLS.dadosGerais);
                    if (dg) { estadoRaw = dg.estado || []; capitalRaw = dg.capital || []; }
                }

                // Fallback para Mock se as variáveis não estiverem configuradas (Ambiente de Teste)
                if (estadoRaw.length === 0 && leadsRaw.length === 0) {
                    useMock = true; setIsMock(true);
                    setLoadingInfo({ isLoading: true, stage: 'Gerando Base Fictícia para Testes...', progress: 50 });
                    
                    // 1. DADOS GERAIS (ESTADO E CAPITAL) - A Força Eleitoral
                    estadoRaw = [
                        { Cidade: "Lages", "Região do Estado": "Serra", "Votos 2022": "1520" },
                        { Cidade: "Joinville", "Região do Estado": "Norte", "Votos 2022": "3250" },
                        { Cidade: "Criciúma", "Região do Estado": "Sul", "Votos 2022": "890" },
                        { Cidade: "Blumenau", "Região do Estado": "Vale do Itajaí", "Votos 2022": "2100" }
                    ];

                    capitalRaw = [
                        { Bairro: "Campeche", Distrito: "Campeche", Região: "Sul da Ilha", "Votos 2022": "800", Local: "Escola A" },
                        { Bairro: "Campeche", Distrito: "Campeche", Região: "Sul da Ilha", "Votos 2022": "1000", Local: "Escola B" }, // Teste de agrupamento
                        { Bairro: "Trindade", Distrito: "Sede", Região: "Centro", "Votos 2022": "1650", Local: "UFSC" },
                        { Bairro: "Armação", Distrito: "Pântano do Sul", Região: "Sul da Ilha", "Votos 2022": "400", Local: "Igreja" },
                        { Bairro: "Lagoa da Conceição", Distrito: "Lagoa", Região: "Leste", "Votos 2022": "1200", Local: "Clube" }
                    ];

                    // 2. CONTATOS CRM (Aba Nova)
                    contatosRaw = [
                        { lideranca: "Maria Silva", base: "Base Florianópolis", municipio_bairro: "Campeche", distrito: "Campeche", situacao: "4 - Comprometido", temas: "Meio Ambiente", articulador: "Ana" },
                        { lideranca: "Associação de Pescadores", base: "Base Florianópolis", municipio_bairro: "Armação", distrito: "Pântano do Sul", situacao: "3 - Simpatizante", temas: "Pesca", articulador: "Beto" },
                        { lideranca: "Carlos Mendes", base: "Base Santa Catarina", municipio_bairro: "Joinville", regiao: "Norte", situacao: "4 - Comprometido", temas: "Trabalho", articulador: "Carla" },
                        { lideranca: "ONG Raízes", base: "Base Santa Catarina", municipio_bairro: "Lages", regiao: "Serra", situacao: "2 - Observar", temas: "Cultura", articulador: "Ana" },
                        { lideranca: "João Pedro", base: "Base Florianópolis", municipio_bairro: "Trindade", distrito: "Sede", situacao: "4 - Comprometido", temas: "Educação", articulador: "Beto" }
                    ];
                    
                    // 3. LEADS (Eventos)
                    leadsRaw = [
                        { NOME: "João (Feira)", CIDADE: "Florianópolis", "BAIRRO REVISADO + REPLAN": "Trindade", ORIGEM: "Assinatura Horta" },
                        { NOME: "Pedro", CIDADE: "Lages", ORIGEM: "Seminário" },
                        { NOME: "Ana", CIDADE: "Florianópolis", "BAIRRO REVISADO + REPLAN": "Campeche", ORIGEM: "Fórum de Mobilidade" },
                        { NOME: "Lucas", CIDADE: "Joinville", ORIGEM: "Abaixo-assinado" }
                    ];

                    // 4. EMENDAS
                    emendasRaw = [
                        { "NÚMERO DA EMENDA": "202401", MUNICÍPIO: "Florianópolis", OBJETO: "Horta Campeche", TOTAL: "150000", TEMA: "Agricultura" },
                        { "NÚMERO DA EMENDA": "202402", MUNICÍPIO: "Lages", OBJETO: "Feira", TOTAL: "80000", TEMA: "Economia" },
                        { "NÚMERO DA EMENDA": "202403", MUNICÍPIO: "Joinville", OBJETO: "Centro Cultural", TOTAL: "250000", TEMA: "Cultura" }
                    ];

                    // 5. AGENDA
                    agendaRaw = [
                        { "Título": "Reunião Comunitária", "Município": "Florianópolis", "Bairro": "Campeche", "Articulador": "Ana" },
                        { "Título": "Visita Técnica", "Município": "Lages", "Bairro": "", "Articulador": "Ana" }
                    ];
                }

                setLoadingInfo({ isLoading: true, stage: 'Cruzando Dados Territoriais...', progress: 80 });

                // Processamento e Normalização Básica para facilitar o cruzamento
                const leads = leadsRaw.map((l, i) => ({
                    id: `l_${i}`,
                    nome: l['NOME'] || l['nome'] || 'Anônimo',
                    municipio: (l['CIDADE'] || l['cidade'] || '').trim(),
                    bairro: (l['BAIRRO REVISADO + REPLAN'] || l['bairroReplan'] || l['bairro'] || '').trim(),
                    tema: l['ORIGEM'] || l['origem'] || 'Outros'
                }));

                const emendas = emendasRaw.map((e, i) => ({
                    id: `e_${i}`,
                    municipio: (e['MUNICÍPIO'] || e['municipio'] || '').trim(),
                    objeto: e['OBJETO'] || e['objeto'] || '',
                    total: parseCurrency(e['TOTAL'] || e['total']),
                    tema: e['TEMA'] || e['tema'] || ''
                }));

                const agenda = agendaRaw.map((a, i) => ({
                    id: `a_${i}`,
                    titulo: a['Título'] || a['titulo'] || '',
                    municipio: (a['Município'] || a['municipio'] || '').trim(),
                    bairro: (a['Bairro'] || a['bairro'] || '').trim(),
                    articulador: (a['Articulador'] || a['articulador'] || '').trim()
                }));

                const contatos = contatosRaw.map((c, i) => ({
                    id: `c_${i}`,
                    nome: c['lideranca'] || c['LIDERANÇA'] || '',
                    base: c['base'] || '',
                    local: (c['municipio_bairro'] || c['MUNICÍPIO'] || c['Bairro REPLAN'] || '').trim(),
                    regiao: (c['regiao'] || c['REGIÃO'] || '').trim(),
                    distrito: (c['distrito'] || c['DISTRITO'] || '').trim(),
                    situacao: c['situacao'] || c['SITUAÇÃO'] || '',
                    tema: c['temas'] || c['TEMAS'] || '',
                    articulador: c['articulador'] || c['ARTICULADOR'] || ''
                })).filter(c => c.nome);

                setData({ leads, emendas, agenda, estado: estadoRaw, capital: capitalRaw, contatos });
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingInfo({ isLoading: false, stage: 'Concluído', progress: 100 });
            }
        };

        loadData();
    }, []);

    return (
        <AppContext.Provider value={{ ...data, loadingInfo, isMock, currentView, setCurrentView, selectedEntity, setSelectedEntity }}>
            {children}
        </AppContext.Provider>
    );
};

const useSortableData = (items, config = null) => {
    const [sortConfig, setSortConfig] = useState(config);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (typeof aValue === 'string') {
                    return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key) => {
        let direction = 'desc'; // Padrão inteligente: do maior pro menor para números
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    return { items: sortedItems, requestSort, sortConfig };
};

const ThSortable = ({ label, sortKey, currentSort, onSort, widthClass="" }) => {
    const isActive = currentSort?.key === sortKey;
    return (
        <th onClick={() => onSort(sortKey)} className={`px-4 py-3 font-black border-r-2 border-black cursor-pointer hover:bg-black hover:text-white transition-colors group select-none ${widthClass}`}>
            <div className="flex items-center justify-between">
                <span>{label}</span>
                <span className={`text-gray-400 group-hover:text-white ${isActive ? 'text-white' : 'opacity-50'}`}>
                    {isActive ? (currentSort.direction === 'asc' ? <Icons.ChevronUp/> : <Icons.ChevronDown/>) : <Icons.ChevronDown/>}
                </span>
            </div>
        </th>
    );
};

const Dashboard = () => {
    const { estado, capital, contatos, emendas } = useContext(AppContext);

    // Cálculos globais
    const stats = useMemo(() => {
        // Agrupa Votos da Capital (Soma todas as seções por bairro)
        const bairrosVotos = {};
        capital.forEach(c => {
            const b = normalizeStr(c.Bairro || c['Local exato']);
            if (b) bairrosVotos[b] = (bairrosVotos[b] || 0) + getVotosValue(c);
        });

        // Agrupa Votos do Estado
        const municipiosVotos = {};
        estado.forEach(e => {
            const m = normalizeStr(e.Cidade);
            if (m && !isFloripa(m)) municipiosVotos[m] = (municipiosVotos[m] || 0) + getVotosValue(e);
        });

        const votosSC = Object.values(municipiosVotos).reduce((a, b) => a + b, 0);
        const votosCap = Object.values(bairrosVotos).reduce((a, b) => a + b, 0);
        const lideCap = contatos.filter(c => c.base.includes('Florianópolis')).length;
        const lideSC = contatos.filter(c => c.base.includes('Santa Catarina')).length;
        const totalEmendas = emendas.reduce((acc, e) => acc + e.total, 0);

        // Top 10 para Fortaleza Eleitoral
        const topSC = Object.entries(municipiosVotos).map(([nome, votos]) => ({ nome, votos })).sort((a,b) => b.votos - a.votos).slice(0, 10);
        
        // Recupera nome original e região para o Top Floripa
        const topCap = Object.entries(bairrosVotos).map(([bairroNorm, votos]) => {
            const original = capital.find(c => normalizeStr(c.Bairro) === bairroNorm);
            return { 
                nome: original?.Bairro || bairroNorm, 
                votos, 
                regiao: original?.Região || '-' 
            };
        }).sort((a,b) => b.votos - a.votos).slice(0, 10);

        return { votosSC, votosCap, lideCap, lideSC, totalEmendas, totalVotos: votosSC + votosCap, topSC, topCap };
    }, [estado, capital, contatos, emendas]);

    return (
        <div className="space-y-8 animate-fade-in w-full max-w-6xl mx-auto pb-12">
            <div className="border-b-4 border-black pb-4">
                <h2 className="text-3xl font-black uppercase tracking-tight text-[#111111]">Painel Estratégico</h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Força Eleitoral e Cruzamento de Bases</p>
            </div>

            {/* KPIs Globais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#111111] text-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#EAA221] flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Votos Base (2022)</span>
                    <span className="text-5xl font-black text-[#EAA221]">{stats.totalVotos.toLocaleString()}</span>
                    <div className="mt-4 flex justify-between text-xs font-bold uppercase">
                        <span>Capital: {stats.votosCap.toLocaleString()}</span>
                        <span>SC: {stats.votosSC.toLocaleString()}</span>
                    </div>
                </div>
                <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#111111] flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center"><Icons.Briefcase/><span className="ml-2">Lideranças (CRM)</span></span>
                    <span className="text-4xl font-black text-black">{stats.lideCap + stats.lideSC}</span>
                    <div className="mt-4 flex justify-between text-[10px] font-bold uppercase text-gray-500">
                        <span>Floripa: {stats.lideCap}</span>
                        <span>Estado: {stats.lideSC}</span>
                    </div>
                </div>
                <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#111111] flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center"><Icons.FileText/><span className="ml-2">Emendas Destinadas</span></span>
                    <span className="text-3xl font-black text-[#007D8A] truncate">{formatCurrency(stats.totalEmendas)}</span>
                </div>
            </div>

            {/* Fortaleza Eleitoral (Top 10) */}
            <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_#C1272D] flex flex-col mt-4">
                <div className="p-4 border-b-4 border-black bg-[#C1272D] text-white flex justify-between items-center">
                    <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-2">Fortaleza Eleitoral (Votos 2022)</h3>
                </div>
                
                <div className="flex flex-col md:flex-row p-6 gap-8 bg-[#FDFBF7]">
                    {/* ESTADO TOP 10 */}
                    <div className="flex-1">
                        <h4 className="font-black text-sm uppercase text-[#111] mb-4 border-b-2 border-black pb-1">Top 10 - Estado (SC)</h4>
                        <div className="space-y-2">
                            {stats.topSC.map((c, i) => (
                                <div key={i} className="flex items-center gap-3 border-b border-gray-200 pb-1">
                                    <span className="font-black text-xs text-gray-400 w-5">{i+1}.</span>
                                    <span className="font-bold text-xs uppercase flex-1 truncate capitalize">{c.nome}</span>
                                    <span className="font-black text-xs text-[#C1272D]">{c.votos.toLocaleString()} V</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hidden md:block w-px bg-gray-300"></div>

                    {/* CAPITAL TOP 10 */}
                    <div className="flex-1">
                        <h4 className="font-black text-sm uppercase text-[#111] mb-4 border-b-2 border-black pb-1">Top 10 - Bairros (Floripa)</h4>
                        <div className="space-y-2">
                            {stats.topCap.map((c, i) => (
                                <div key={i} className="flex items-center gap-3 border-b border-gray-200 pb-1">
                                    <span className="font-black text-xs text-gray-400 w-5">{i+1}.</span>
                                    <div className="flex-1 flex flex-col">
                                        <span className="font-bold text-xs uppercase truncate">{c.nome}</span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">{c.regiao}</span>
                                    </div>
                                    <span className="font-black text-xs text-[#C1272D]">{c.votos.toLocaleString()} V</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ListaMunicipios = () => {
    const { estado, emendas, contatos, leads, setSelectedEntity } = useContext(AppContext);
    const [busca, setBusca] = useState('');

    const dadosAgregados = useMemo(() => {
        const munisSet = new Set([...estado.map(e=>e.Cidade), ...emendas.map(e=>e.municipio), ...contatos.filter(c=>c.base.includes('Santa Catarina')).map(c=>c.local)].filter(m => m && !isFloripa(m)));
        
        return Array.from(munisSet).map(mun => {
            const rowEstado = estado.find(e => normalizeStr(e.Cidade) === normalizeStr(mun)) || {};
            const votos = getVotosValue(rowEstado);
            const regiao = rowEstado['Região do Estado'] || '-';
            
            const volEmendas = emendas.filter(e => normalizeStr(e.municipio) === normalizeStr(mun)).reduce((acc, curr) => acc + curr.total, 0);
            const numContatos = contatos.filter(c => c.base.includes('Santa Catarina') && normalizeStr(c.local) === normalizeStr(mun)).length;
            const numLeads = leads.filter(l => normalizeStr(l.municipio) === normalizeStr(mun)).length;

            return { municipio: mun, regiao, votos, volEmendas, numContatos, numLeads };
        }).filter(m => normalizeStr(m.municipio).includes(normalizeStr(busca)));
    }, [estado, emendas, contatos, leads, busca]);

    const { items, requestSort, sortConfig } = useSortableData(dadosAgregados, { key: 'votos', direction: 'desc' });

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row justify-between md:items-end border-b-4 border-black pb-4 mb-4 gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight flex items-center">
                        <span className="w-4 h-4 bg-[#EAA221] border-2 border-black inline-block mr-3"></span> Raio-X Estado
                    </h2>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Municípios de Santa Catarina</p>
                </div>
                <div className="relative w-full md:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"><Icons.Search /></div>
                    <input type="text" placeholder="Buscar município..." value={busca} onChange={(e)=>setBusca(e.target.value)} 
                        className="w-full pl-10 pr-3 py-2 border-4 border-black bg-white font-bold text-sm focus:outline-none focus:border-[#C1272D] shadow-[4px_4px_0px_0px_#111111]"
                    />
                </div>
            </div>

            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#111111] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-gray-100 border-b-4 border-black text-xs uppercase bg-[#111111] text-white">
                        <tr>
                            <ThSortable label="Município" sortKey="municipio" currentSort={sortConfig} onSort={requestSort} widthClass="w-1/4" />
                            <ThSortable label="Região" sortKey="regiao" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Votos 2022" sortKey="votos" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Lideranças" sortKey="numContatos" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Emendas (R$)" sortKey="volEmendas" currentSort={sortConfig} onSort={requestSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((m, i) => (
                            <tr key={i} className="border-b-2 border-gray-200 hover:bg-[#EAA221]/20 cursor-pointer transition-colors"
                                onClick={() => setSelectedEntity({ type: 'municipio', name: m.municipio, regiao: m.regiao })}>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-sm uppercase text-[#111]">{m.municipio}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 text-xs font-bold text-gray-500 uppercase">{m.regiao}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-[#C1272D] text-right">{m.votos.toLocaleString()}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-bold text-center">
                                    <span className="text-base">{m.numContatos}</span> 
                                    <span className="text-[9px] text-gray-400 block">+ {m.numLeads} leads</span>
                                </td>
                                <td className="px-4 py-3 font-black text-[#007D8A] text-right">{formatCurrency(m.volEmendas)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {items.length === 0 && <div className="p-8 text-center font-bold text-gray-400 uppercase">Nenhum resultado.</div>}
            </div>
        </div>
    );
};

const ListaCapital = () => {
    const { capital, contatos, leads, setSelectedEntity } = useContext(AppContext);
    const [busca, setBusca] = useState('');

    const dadosAgregados = useMemo(() => {
        // Agrupar votos da capital por Bairro matematicamente
        const bairrosVotos = {};
        const bairrosMetadados = {};

        capital.forEach(c => {
            const bNomeOriginal = c.Bairro || c['Local exato'];
            if (!bNomeOriginal) return;
            const b = normalizeStr(bNomeOriginal);
            bairrosVotos[b] = (bairrosVotos[b] || 0) + getVotosValue(c);
            if (!bairrosMetadados[b]) {
                bairrosMetadados[b] = { 
                    nomeOriginal: bNomeOriginal, 
                    distrito: c.Distrito || '-', 
                    regiao: c.Região || '-' 
                };
            }
        });

        // Adicionar bairros que existem no CRM mas talvez não na base eleitoral (raro, mas possível)
        contatos.forEach(c => {
            if (c.base.includes('Florianópolis') && c.local) {
                const b = normalizeStr(c.local);
                if (!bairrosVotos[b]) {
                    bairrosVotos[b] = 0;
                    bairrosMetadados[b] = { nomeOriginal: c.local, distrito: c.distrito || '-', regiao: c.regiao || '-' };
                }
            }
        });

        return Object.keys(bairrosVotos).map(baiNorm => {
            const meta = bairrosMetadados[baiNorm];
            const numContatos = contatos.filter(c => c.base.includes('Florianópolis') && normalizeStr(c.local) === baiNorm).length;
            const numLeads = leads.filter(l => isFloripa(l.municipio) && normalizeStr(l.bairro) === baiNorm).length;

            return { 
                bairro: meta.nomeOriginal, 
                distrito: meta.distrito, 
                regiao: meta.regiao, 
                votos: bairrosVotos[baiNorm], 
                numContatos, 
                numLeads 
            };
        }).filter(b => normalizeStr(b.bairro).includes(normalizeStr(busca)));
    }, [capital, contatos, leads, busca]);

    const { items, requestSort, sortConfig } = useSortableData(dadosAgregados, { key: 'votos', direction: 'desc' });

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row justify-between md:items-end border-b-4 border-black pb-4 mb-4 gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight flex items-center">
                        <span className="w-4 h-4 bg-[#007D8A] border-2 border-black inline-block mr-3"></span> Raio-X Capital
                    </h2>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Bairros de Florianópolis</p>
                </div>
                <div className="relative w-full md:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"><Icons.Search /></div>
                    <input type="text" placeholder="Buscar bairro..." value={busca} onChange={(e)=>setBusca(e.target.value)} 
                        className="w-full pl-10 pr-3 py-2 border-4 border-black bg-white font-bold text-sm focus:outline-none focus:border-[#C1272D] shadow-[4px_4px_0px_0px_#111111]"
                    />
                </div>
            </div>

            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#111111] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-[#111111] text-white border-b-4 border-black text-xs uppercase">
                        <tr>
                            <ThSortable label="Bairro" sortKey="bairro" currentSort={sortConfig} onSort={requestSort} widthClass="w-1/4" />
                            <ThSortable label="Distrito" sortKey="distrito" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Região" sortKey="regiao" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Votos 2022" sortKey="votos" currentSort={sortConfig} onSort={requestSort} />
                            <ThSortable label="Lideranças" sortKey="numContatos" currentSort={sortConfig} onSort={requestSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((b, i) => (
                            <tr key={i} className="border-b-2 border-gray-200 hover:bg-[#007D8A]/20 cursor-pointer transition-colors"
                                onClick={() => setSelectedEntity({ type: 'bairro', name: b.bairro, regiao: b.regiao })}>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-sm uppercase text-[#111]">{b.bairro}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 text-xs font-bold text-gray-500 uppercase">{b.distrito}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 text-xs font-bold text-gray-500 uppercase">{b.regiao}</td>
                                <td className="px-4 py-3 border-r-2 border-gray-200 font-black text-[#C1272D] text-right">{b.votos.toLocaleString()}</td>
                                <td className="px-4 py-3 font-bold text-center">
                                    <span className="text-base">{b.numContatos}</span> 
                                    <span className="text-[9px] text-gray-400 block">+ {b.numLeads} leads</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {items.length === 0 && <div className="p-8 text-center font-bold text-gray-400 uppercase">Nenhum resultado.</div>}
            </div>
        </div>
    );
};

const FichaCompleta = () => {
    const { selectedEntity, setSelectedEntity, leads, emendas, agenda, contatos, estado, capital } = useContext(AppContext);
    
    const entityData = useMemo(() => {
        const { type, name } = selectedEntity;
        const n = normalizeStr(name);
        
        let relLeads = [], relEmendas = [], relContatos = [], relAgendas = [], relVotos = null;

        if (type === 'municipio') {
            relLeads = leads.filter(l => normalizeStr(l.municipio) === n);
            relEmendas = emendas.filter(e => normalizeStr(e.municipio) === n);
            relContatos = contatos.filter(c => c.base.includes('Santa Catarina') && normalizeStr(c.local) === n);
            relAgendas = agenda.filter(a => normalizeStr(a.municipio) === n);
            
            const v = estado.find(r => normalizeStr(r.Cidade) === n);
            if (v) relVotos = getVotosValue(v);
        } 
        else if (type === 'bairro') {
            relLeads = leads.filter(l => isFloripa(l.municipio) && normalizeStr(l.bairro) === n);
            relContatos = contatos.filter(c => c.base.includes('Florianópolis') && normalizeStr(c.local) === n);
            relAgendas = agenda.filter(a => isFloripa(a.municipio) && normalizeStr(a.bairro) === n);
            
            // Soma votos de todas as seções deste bairro
            const vArr = capital.filter(r => normalizeStr(r.Bairro || r['Local exato']) === n);
            if (vArr.length > 0) {
                relVotos = vArr.reduce((acc, curr) => acc + getVotosValue(curr), 0);
            }
        }

        return { leads: relLeads, emendas: relEmendas, contatos: relContatos, agendas: relAgendas, votos: relVotos };
    }, [selectedEntity, leads, emendas, contatos, agenda, estado, capital]);

    const valTotalEmendas = entityData.emendas.reduce((acc, curr) => acc + curr.total, 0);
    const corTema = selectedEntity.type === 'municipio' ? 'bg-[#EAA221]' : 'bg-[#007D8A]';

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto pb-12">
            <button onClick={() => setSelectedEntity(null)} className="bg-black text-white px-4 py-2 font-black uppercase text-[10px] border-4 border-black hover:bg-gray-800 transition-colors shadow-[4px_4px_0_0_#111111] flex items-center w-fit active:translate-y-1 active:shadow-none">
                &larr; Voltar à Lista
            </button>

            <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0_0_#111111] relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-16 h-16 ${corTema} border-l-4 border-b-4 border-black`}></div>
                <span className="inline-block px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest border-2 border-black mb-4">
                    Dossiê de {selectedEntity.type}
                </span>
                <h1 className="text-4xl md:text-5xl font-black text-[#111111] uppercase tracking-tighter leading-none pr-10">{selectedEntity.name}</h1>
                
                <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t-2 border-dashed border-gray-300">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-gray-500 block">Votos Base (2022)</span>
                        <span className="text-3xl font-black text-[#C1272D]">{entityData.votos !== null ? entityData.votos.toLocaleString() : '-'}</span>
                    </div>
                    <div className="w-px bg-gray-300 mx-2 hidden sm:block"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-gray-500 block">Região Geográfica</span>
                        <span className="text-xl font-black">{selectedEntity.regiao || '-'}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Lideranças CRM */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_#111111] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-black text-white border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center"><Icons.Briefcase/><span className="ml-2">Lideranças (CRM)</span></h3>
                        <span className="font-black text-sm bg-white text-black border-2 border-black px-2">{entityData.contatos.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[350px]">
                        {entityData.contatos.length > 0 ? (
                            <table className="w-full text-left text-xs">
                                <tbody>
                                    {entityData.contatos.map((c, i) => (
                                        <tr key={i} className="border-b-2 border-gray-200 hover:bg-gray-100 transition-colors">
                                            <td className="p-3">
                                                <div className="font-black uppercase leading-tight">{c.nome}</div>
                                                <div className="text-[9px] font-bold text-gray-500 uppercase mt-1 truncate">Articulador: <span className="text-black">{c.articulador || '-'}</span></div>
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className="bg-gray-200 px-2 border border-black text-[9px] font-black uppercase inline-block max-w-[120px] truncate">{c.situacao || 'S/ Status'}</span>
                                                <div className="text-[9px] font-bold text-gray-500 uppercase mt-1 truncate max-w-[120px]">{c.tema}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <div className="p-6 text-center text-gray-400 font-bold uppercase text-xs">Nenhum contato estratégico.</div>}
                    </div>
                </div>

                {/* Agendas (Novo) */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_#111111] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-[#C1272D] text-white border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center"><Icons.Calendar/><span className="ml-2">Agendas Realizadas</span></h3>
                        <span className="font-black text-sm bg-black border-2 border-white px-2">{entityData.agendas.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[350px] p-2 space-y-2">
                        {entityData.agendas.length > 0 ? entityData.agendas.map((a, i) => (
                            <div key={i} className="border-2 border-black p-2 bg-white flex flex-col">
                                <span className="font-black text-xs uppercase leading-tight mb-1">{a.titulo}</span>
                                <span className="text-[9px] font-bold text-gray-500 uppercase">Articulador: {a.articulador || '-'}</span>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem agendas mapeadas.</div>}
                    </div>
                </div>

                {/* Leads (Eventos) */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_#111111] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-gray-100 border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center"><Icons.Users/><span className="ml-2">Leads (Eventos)</span></h3>
                        <span className="font-black text-sm bg-white border-2 border-black px-2">{entityData.leads.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] p-2 space-y-2">
                        {entityData.leads.length > 0 ? entityData.leads.map((l, i) => (
                            <div key={i} className="border-b-2 border-gray-200 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0 pl-2">
                                <div className="font-black text-xs uppercase leading-tight truncate">{l.nome}</div>
                                <div className="text-[9px] font-bold text-gray-500 uppercase truncate mt-0.5">{l.tema}</div>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem registros.</div>}
                    </div>
                </div>

                {/* Emendas */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_#111111] flex flex-col lg:col-span-2">
                    <div className="p-4 bg-gray-100 border-b-4 border-black flex justify-between items-center">
                        <h3 className="font-black uppercase flex items-center"><Icons.FileText/><span className="ml-2">Emendas (Total: {formatCurrency(valTotalEmendas)})</span></h3>
                        <span className="font-black text-sm bg-white border-2 border-black px-2">{entityData.emendas.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] p-2 space-y-2">
                        {entityData.emendas.length > 0 ? entityData.emendas.map((e, i) => (
                            <div key={i} className="border-2 border-black p-2 bg-white">
                                <div className="font-black text-xs uppercase leading-tight mb-1 line-clamp-2">{e.objeto}</div>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-[9px] font-bold text-gray-500 uppercase bg-gray-200 px-1 border border-gray-300">{e.tema}</span>
                                    <span className="font-black text-xs text-[#007D8A]">{formatCurrency(e.total)}</span>
                                </div>
                            </div>
                        )) : <div className="text-center text-gray-400 font-bold uppercase text-xs py-4">Sem emendas mapeadas.</div>}
                    </div>
                </div>
            </div>
        </div>
    )
};

const AppShell = () => {
    const { loadingInfo, isMock, currentView, setCurrentView, selectedEntity, setSelectedEntity } = useContext(AppContext);

    if (loadingInfo.isLoading) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
            <div className="w-16 h-16 border-4 border-[#FDFBF7] border-t-[#C1272D] border-r-[#EAA221] border-b-[#007D8A] animate-spin mb-6 shadow-[4px_4px_0px_0px_#111111]"></div>
            <div className="w-full max-w-xs bg-white border-4 border-black p-4 shadow-[6px_6px_0_0_#111111] flex flex-col gap-3 text-center">
                <p className="text-[10px] font-black tracking-widest uppercase text-black">{loadingInfo.stage}</p>
                <div className="w-full h-3 bg-gray-200 border-2 border-black overflow-hidden">
                    <div className="h-full bg-black transition-all duration-300 ease-out" style={{ width: `${loadingInfo.progress}%` }}></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[#FDFBF7]">
            {/* SIDEBAR MONDRIAN */}
            <div className="w-full md:w-80 bg-white border-b-4 md:border-b-0 md:border-r-4 border-black flex flex-col z-20 flex-shrink-0 relative">
                <div className="p-6 border-b-4 border-black bg-black text-white">
                    <h1 className="text-3xl font-black tracking-tighter uppercase">TABULUM</h1>
                    <p className="text-[10px] font-black tracking-widest uppercase mt-1 text-[#EAA221]">Central Eleitoral 2026</p>
                </div>
                <div className="p-4 flex flex-row md:flex-col gap-2 overflow-x-auto border-b-4 border-black md:border-none bg-gray-100 md:bg-white md:flex-1 custom-scrollbar">
                    <button onClick={() => { setCurrentView('dashboard'); setSelectedEntity(null); }} className={`flex-shrink-0 md:w-full p-4 font-black uppercase text-xs border-4 border-black text-left transition-colors shadow-[4px_4px_0_0_#111111] active:translate-y-1 active:shadow-none ${currentView === 'dashboard' && !selectedEntity ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}>
                        Visão Geral (Força)
                    </button>
                    <button onClick={() => { setCurrentView('sc'); setSelectedEntity(null); }} className={`flex-shrink-0 md:w-full p-4 font-black uppercase text-xs border-4 border-black text-left transition-colors shadow-[4px_4px_0_0_#111111] active:translate-y-1 active:shadow-none ${currentView === 'sc' && !selectedEntity ? 'bg-[#EAA221] text-black' : 'bg-white hover:bg-gray-100'}`}>
                        Raio-X Estado (SC)
                    </button>
                    <button onClick={() => { setCurrentView('floripa'); setSelectedEntity(null); }} className={`flex-shrink-0 md:w-full p-4 font-black uppercase text-xs border-4 border-black text-left transition-colors shadow-[4px_4px_0_0_#111111] active:translate-y-1 active:shadow-none ${currentView === 'floripa' && !selectedEntity ? 'bg-[#007D8A] text-white' : 'bg-white hover:bg-gray-100'}`}>
                        Raio-X Capital (Floripa)
                    </button>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 relative bg-[#FDFBF7] custom-scrollbar">
                {isMock && (
                    <div className="absolute top-0 left-0 w-full bg-[#EAA221] border-b-4 border-black p-2 text-center font-black uppercase text-[10px] z-50 shadow-sm">
                        ⚠️ MODO DEMONSTRAÇÃO (Variáveis do Vercel ausentes). Exibindo dados fictícios cruzados para visualização do design.
                    </div>
                )}
                <div className={`relative z-10 w-full h-full ${isMock ? 'pt-8' : ''}`}>
                    {selectedEntity ? <FichaCompleta /> : (
                        currentView === 'dashboard' ? <Dashboard /> :
                        currentView === 'sc' ? <ListaMunicipios /> :
                        <ListaCapital />
                    )}
                </div>
            </main>
        </div>
    );
};

export default function App() {
    return (
        <AppProvider>
            <style dangerouslySetInnerHTML={{__html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                * { font-family: 'Inter', sans-serif; scrollbar-width: thin; scrollbar-color: #111 #FDFBF7; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #FDFBF7; border-left: 2px solid #111; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #111; }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
            <AppShell />
        </AppProvider>
    );
}
