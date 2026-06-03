import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Puzzle, Upload, Download, Star, Shield, FolderOpen, Save, Trash2, Eye, Check, X, AlertTriangle, Info, Plus, Search, Copy, FolderOpen as FolderIcon, GitBranch, Database, Globe, Send, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PluginSettings = () => {
  const {
    pluginSkillsPath, installedPlugins, publishedPlugins, marketplacePlugins,
    installPlugin, uninstallPlugin, togglePlugin,
    publishPlugin, ratePlugin, aiProvider,
    aiChatMessages, aiChatLoading, selectedPluginCategory,
    addAiChatMessage, clearAiChat, setAiChatLoading, setSelectedPluginCategory
  } = useStore();

  const [activeTab, setActiveTab] = useState('create');
  const [pluginName, setPluginName] = useState('');
  const [pluginDesc, setPluginDesc] = useState('');
  const [pluginCategory, setPluginCategory] = useState('skin');
  const [pluginLink, setPluginLink] = useState('');
  const [pluginAuthor, setPluginAuthor] = useState('');
  const [pluginKeywords, setPluginKeywords] = useState('');
  const [pluginMdPath, setPluginMdPath] = useState('');
  const [securityAnalysis, setSecurityAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef(null);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceData, setMarketplaceData] = useState([]);
  const [analyzingPlugin, setAnalyzingPlugin] = useState(null);
  const [pluginAnalysis, setPluginAnalysis] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [installedAnalysis, setInstalledAnalysis] = useState({});
  const [projectFolder, setProjectFolder] = useState('');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChatMessages]);

  // Load marketplace on tab change
  useEffect(() => {
    if (activeTab === 'marketplace' && marketplaceData.length === 0) {
      loadMarketplace();
    }
  }, [activeTab]);

  const loadMarketplace = async () => {
    setMarketplaceLoading(true);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('fetch-marketplace-plugins');
      if (result.ok) {
        setMarketplaceData(result.plugins);
      }
    } catch (e) {
      console.error('Marketplace load failed:', e);
    }
    setMarketplaceLoading(false);
  };

  const analyzeMarketplacePlugin = async (plugin) => {
    setAnalyzingPlugin(plugin.id);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('ai-analyze-plugin', {
        pluginUrl: plugin.downloadLink,
        pluginName: plugin.name
      });
      
      if (result.ok) {
        setPluginAnalysis(prev => ({ 
          ...prev, 
          [plugin.id]: { 
            safe: result.safe, 
            details: result.details, 
            accessLevel: result.accessLevel 
          } 
        }));
      } else {
        setPluginAnalysis(prev => ({ 
          ...prev, 
          [plugin.id]: { 
            safe: false, 
            details: result.error || 'Analiz başarısız', 
            accessLevel: 'Bilinmiyor' 
          } 
        }));
      }
    } catch (e) {
      console.error('Analysis failed:', e);
    }
    setAnalyzingPlugin(null);
  };

  const analyzeInstalledPlugin = async (plugin) => {
    setAnalyzingPlugin(plugin.id);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('ai-analyze-plugin', {
        pluginId: plugin.id,
        pluginName: plugin.name
      });
      
      if (result.ok) {
        setInstalledAnalysis(prev => ({ 
          ...prev, 
          [plugin.id]: { 
            safe: result.safe, 
            details: result.details, 
            accessLevel: result.accessLevel 
          } 
        }));
      } else {
        setInstalledAnalysis(prev => ({ 
          ...prev, 
          [plugin.id]: { 
            safe: false, 
            details: result.error || 'Analiz başarısız', 
            accessLevel: 'Bilinmiyor' 
          } 
        }));
      }
    } catch (e) {
      console.error('Analysis failed:', e);
    }
    setAnalyzingPlugin(null);
  };

  // GitHub Publishing
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [githubPublishing, setGithubPublishing] = useState(false);
  const [githubStatus, setGithubStatus] = useState(null);

  const DEFAULT_SKILLS_PATH = 'docs/plugin-skills.md';
  const displaySkillsPath = pluginSkillsPath || DEFAULT_SKILLS_PATH;

  const copySkillsPath = async () => {
    try {
      await navigator.clipboard.writeText(displaySkillsPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const copySkillsToLocation = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('copy-skills-file');
      if (result?.ok) {
        alert(`Dosya kopyalandı:\n${result.destination}`);
      } else {
        alert('Dosya kopyalama iptal edildi.');
      }
    } catch (e) {
      console.error('Copy to location failed:', e);
      alert('Dosya kopyalama başarısız: ' + e.message);
    }
  };

  const selectMdPath = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('select-file');
      if (result) setPluginMdPath(result);
    } catch (e) {
      console.error('File select failed:', e);
    }
  };

  const sendAiMessage = async () => {
    if (!inputMessage.trim() || aiChatLoading) return;
    
    const userMsg = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    addAiChatMessage({ role: 'user', content: userMsg });
    setAiChatLoading(true);
    
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('ai-chat', {
        message: userMsg,
        history: aiChatMessages,
        category: selectedPluginCategory
      });
      
      if (result.ok) {
        addAiChatMessage({ role: 'assistant', content: result.message });
      } else {
        addAiChatMessage({ 
          role: 'assistant', 
          content: `❌ Hata: ${result.error}` 
        });
      }
    } catch (e) {
      addAiChatMessage({ 
        role: 'assistant', 
        content: `❌ Bağlantı hatası: ${e.message}` 
      });
    }
    
    setAiChatLoading(false);
  };

  const saveLastResponse = async () => {
    const lastAssistant = [...aiChatMessages]
      .reverse()
      .find(m => m.role === 'assistant');
    
    if (!lastAssistant) {
      alert('Kaydedilecek AI yanıtı bulunamadı.');
      return;
    }
    
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('save-plugin-file', {
        content: lastAssistant.content,
        defaultName: `${selectedPluginCategory}-plugin.js`,
        projectFolder
      });
      
      if (result.ok) {
        alert(`Eklenti kaydedildi:\n${result.path}`);
      }
    } catch (e) {
      alert('Kaydetme başarısız: ' + e.message);
    }
  };

  const selectProjectFolder = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('select-folder-dialog');
      if (result.ok && result.path) {
        setProjectFolder(result.path);
      }
    } catch (e) {
      console.error('Folder selection failed:', e);
    }
  };

  const handleGithubPublish = async () => {
    if (!githubToken.trim() || !githubRepo.trim() || !githubOwner.trim()) return;
    setGithubPublishing(true);
    setGithubStatus(null);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('publish-plugin-github', {
        token: githubToken,
        owner: githubOwner,
        repo: githubRepo,
        branch: githubBranch,
        plugin: {
          name: pluginName.trim(),
          description: pluginDesc.trim(),
          category: pluginCategory,
          author: pluginAuthor.trim(),
          keywords: pluginKeywords.trim(),
        }
      });
      setGithubStatus({ ok: true, msg: 'Eklenti GitHub\'a yayınlandı!', url: result.url });
    } catch (e) {
      setGithubStatus({ ok: false, msg: e.message });
    }
    setGithubPublishing(false);
  };

  const handlePublishNeon = async () => {
    if (!pluginName.trim() || !pluginDesc.trim()) return;
    setGithubPublishing(true);
    setGithubStatus(null);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('publish-plugin-neon', {
        plugin: {
          name: pluginName.trim(),
          description: pluginDesc.trim(),
          category: pluginCategory,
          author: pluginAuthor.trim(),
          keywords: pluginKeywords.trim(),
          downloadLink: pluginLink.trim(),
          mdContent: pluginMdPath,
        },
        githubRepo,
        githubOwner,
        githubBranch
      });
      if (result.ok) {
        setGithubStatus({ ok: true, msg: 'Eklenti veritabanına kaydedildi!', pluginId: result.pluginId });
      } else {
        setGithubStatus({ ok: false, msg: result.error });
      }
    } catch (e) {
      setGithubStatus({ ok: false, msg: e.message });
    }
    setGithubPublishing(false);
  };

  const analyzePlugin = async () => {
    if (!aiProvider.apiKey.trim() || !pluginMdPath) return;
    setAnalyzing(true);
    setSecurityAnalysis(null);
    try {
      const { ipcRenderer } = window.require('electron');
      const content = await ipcRenderer.invoke('read-file', pluginMdPath);
      const result = await ipcRenderer.invoke('ai-analyze-plugin', {
        apiKey: aiProvider.apiKey,
        baseUrl: aiProvider.baseUrl,
        model: useStore.getState().aiSelectedModel,
        headers: useStore.getState().aiHeaders,
        content
      });
      setSecurityAnalysis(result);
    } catch (e) {
      setSecurityAnalysis({ ok: false, msg: e.message });
    }
    setAnalyzing(false);
  };

  const handlePublish = () => {
    if (!pluginName.trim() || !pluginDesc.trim()) return;
    publishPlugin({
      id: `plugin-${Date.now()}`,
      name: pluginName.trim(),
      description: pluginDesc.trim(),
      category: pluginCategory,
      downloadLink: pluginLink.trim(),
      author: pluginAuthor.trim(),
      keywords: pluginKeywords.trim(),
      mdPath: pluginMdPath,
    });
    setPluginName('');
    setPluginDesc('');
    setPluginLink('');
    setPluginAuthor('');
    setPluginKeywords('');
    setPluginMdPath('');
  };

  const filteredMarketplace = marketplacePlugins.filter(p =>
    !searchQuery ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.keywords?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Eklenti Sistemi</h2>

      {/* Tabs */}
      <div className="flex border-b" style={{borderColor:'var(--border-color)'}}>
        {[
          { id: 'create', label: 'Eklenti Oluştur', icon: <Plus size={14} /> },
          { id: 'publish', label: 'Yayınla', icon: <Upload size={14} /> },
          { id: 'marketplace', label: 'Mağaza', icon: <Download size={14} /> },
          { id: 'installed', label: 'Yüklü', icon: <Puzzle size={14} /> },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-3 text-sm font-bold transition border-b-2 flex items-center space-x-2"
            style={{
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)',
              borderColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent'
            }}
          >
            {tab.icon} <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Create Plugin Tab */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          {/* AI Skills File - Only in Create Tab */}
          <div className="p-4 rounded-xl" style={{backgroundColor:'var(--color-bg-secondary)'}}>
            <div className="flex items-center space-x-3 mb-3">
              <FolderIcon size={18} style={{color:'var(--color-primary)'}} />
              <span className="font-bold text-sm">AI Skills Dosyası</span>
            </div>
            <p className="text-xs mb-3" style={{color:'var(--text-secondary)'}}>
              Bu dosya AI'nın eklenti oluşturmayı öğrenmesi için kullanılır. Düzenlenemez, sadece kopyalanabilir.
            </p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 text-xs px-3 py-2 rounded-lg truncate" style={{backgroundColor:'rgba(255,255,255,0.05)', color:'var(--text-primary)', fontFamily:'monospace'}}>
                {displaySkillsPath}
              </code>
              <button
                onClick={copySkillsPath}
                className="px-3 py-2 rounded-lg text-white text-xs flex items-center space-x-2 hover:opacity-80 transition"
                style={{backgroundColor:'var(--color-primary)'}}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
              </button>
              <button
                onClick={copySkillsToLocation}
                className="px-3 py-2 rounded-lg text-white text-xs flex items-center space-x-2 hover:opacity-80 transition"
                style={{backgroundColor:'var(--color-primary)'}}
              >
                <FolderIcon size={14} />
                <span>Konuma Kopyala</span>
              </button>
            </div>
          </div>

          {/* Category Selection */}
          <div className="p-4 rounded-xl" style={{backgroundColor:'var(--color-bg-secondary)'}}>
            <h3 className="font-bold mb-3 flex items-center space-x-2">
              <Puzzle size={16} style={{color:'var(--color-primary)'}} />
              <span>Eklenti Kategorisi Seçin</span>
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'skin', label: 'Skin', desc: 'Tema, renk, düzen' },
                { id: 'page', label: 'Sayfa', desc: 'Yeni sayfalar' },
                { id: 'feature', label: 'Özellik', desc: 'Yeni fonksiyonlar' },
                { id: 'integration', label: 'Entegrasyon', desc: 'API bağlantıları' }
              ].map(cat => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedPluginCategory(cat.id)}
                  className={`p-3 rounded-lg cursor-pointer transition ${selectedPluginCategory === cat.id ? 'ring-2' : ''}`}
                  style={{
                    backgroundColor: selectedPluginCategory === cat.id ? 'rgba(15,108,189,0.2)' : 'rgba(255,255,255,0.03)',
                    borderColor: selectedPluginCategory === cat.id ? 'var(--color-primary)' : 'transparent'
                  }}>
                  <div className="text-xs font-bold mb-1">{cat.label}</div>
                  <div className="text-[10px]" style={{color:'var(--text-secondary)'}}>{cat.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Folder Selection */}
          <div className="p-4 rounded-xl" style={{backgroundColor:'var(--color-bg-secondary)'}}>
            <h3 className="font-bold mb-3 flex items-center space-x-2">
              <FolderIcon size={16} style={{color:'var(--color-primary)'}} />
              <span>Proje Klasörü</span>
            </h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={selectProjectFolder}
                className="px-4 py-2 rounded-lg text-sm font-bold transition"
                style={{backgroundColor:'var(--color-primary)', color:'white'}}
              >
                Klasör Seç
              </button>
              {projectFolder && (
                <div className="flex-1 px-3 py-2 rounded-lg text-xs truncate" style={{backgroundColor:'rgba(255,255,255,0.05)', color:'var(--text-secondary)'}}>
                  {projectFolder}
                </div>
              )}
            </div>
            <div className="text-xs mt-2" style={{color:'var(--text-secondary)'}}>
              Eklenti dosyaları bu klasöre kaydedilecek
            </div>
          </div>

          {/* AI Chat Interface */}
          <div className="p-4 rounded-xl" style={{backgroundColor:'var(--color-bg-secondary)'}}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center space-x-2">
                <span>AI Sohbet</span>
              </h3>
              <button
                onClick={clearAiChat}
                className="px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 transition hover:bg-white/10"
                style={{color:'var(--text-secondary)'}}>
                <Trash2 size={12} />
                <span>Temizle</span>
              </button>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto mb-3 p-3 rounded-lg" style={{backgroundColor:'rgba(0,0,0,0.2)'}}>
              {aiChatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <Info size={32} className="mx-auto mb-2 opacity-30" />
                    <div className="text-sm" style={{color:'var(--text-secondary)'}}>
                      Eklenti oluşturmak için AI'ya ne yapmak istediğinizi yazın
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {aiChatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                      <div
                        className="max-w-[80%] px-4 py-2 rounded-2xl text-sm"
                        style={{
                          backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                          color: msg.role === 'user' ? 'white' : 'var(--text-primary)'
                        }}>
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({node, inline, className, children, ...props}) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                  <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto my-2">
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                ) : (
                                  <code className="bg-black/30 px-1 rounded text-xs" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}>
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center space-x-2">
              <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                placeholder="Ne yapmak istiyorsunuz?"
                disabled={aiChatLoading}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
              <button
                onClick={sendAiMessage}
                disabled={aiChatLoading || !inputMessage.trim()}
                className="px-4 py-2 rounded-lg font-bold flex items-center space-x-2 transition disabled:opacity-50"
                style={{backgroundColor:'var(--color-primary)', color:'white'}}>
                {aiChatLoading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                <span>{aiChatLoading ? 'Gönderiliyor...' : 'Gönder'}</span>
              </button>
            </div>

            {/* Actions */}
            {aiChatMessages.length > 0 && (
              <div className="mt-3 flex items-center space-x-2">
                <button
                  onClick={saveLastResponse}
                  className="px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 transition"
                  style={{backgroundColor:'rgba(34,197,94,0.2)', color:'#22c55e'}}>
                  <Save size={12} />
                  <span>Son Yanıtı Kaydet</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publish Plugin Tab */}
      {activeTab === 'publish' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl" style={{backgroundColor:'var(--color-bg-secondary)'}}>
            <h3 className="font-bold mb-4 flex items-center space-x-2">
              <Upload size={16} style={{color:'var(--color-primary)'}} />
              <span>Eklenti Yayınla</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold mb-1 block">Eklenti Adı</label>
                <input value={pluginName} onChange={(e) => setPluginName(e.target.value)}
                  placeholder="Eklenti adı..."
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                  style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">Açıklama</label>
                <textarea value={pluginDesc} onChange={(e) => setPluginDesc(e.target.value)}
                  placeholder="Eklenti açıklaması..."
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                  style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold mb-1 block">Kategori</label>
                  <select value={pluginCategory} onChange={(e) => setPluginCategory(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-xs"
                    style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}>
                    <option value="skin">Skin / Tema</option>
                    <option value="page">Sayfa</option>
                    <option value="feature">Özellik</option>
                    <option value="integration">Entegrasyon</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block">İndirme Linki</label>
                  <input value={pluginLink} onChange={(e) => setPluginLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full border rounded-lg px-3 py-2 text-xs"
                    style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold mb-1 block">Yayıncı Adı</label>
                  <input value={pluginAuthor} onChange={(e) => setPluginAuthor(e.target.value)}
                    placeholder="Yayıncı..."
                    className="w-full border rounded-lg px-3 py-2 text-xs"
                    style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block">Anahtar Kelimeler</label>
                  <input value={pluginKeywords} onChange={(e) => setPluginKeywords(e.target.value)}
                    placeholder="tema, dark, modern..."
                    className="w-full border rounded-lg px-3 py-2 text-xs"
                    style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">Dokümantasyon (.md dosyası)</label>
                <div className="flex items-center space-x-2">
                  <input value={pluginMdPath} onChange={(e) => setPluginMdPath(e.target.value)}
                    placeholder=".md dosya yolu..."
                    className="flex-1 border rounded-lg px-3 py-2 text-xs"
                    style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
                  <button onClick={selectMdPath} className="px-3 py-2 rounded-lg text-white text-xs" style={{backgroundColor:'var(--color-primary)'}}>
                    Seç
                  </button>
                </div>
              </div>
              <button onClick={handlePublish} disabled={!pluginName.trim() || !pluginDesc.trim()}
                className="w-full py-3 rounded-lg text-white font-bold disabled:opacity-50 flex items-center justify-center space-x-2"
                style={{backgroundColor:'var(--color-primary)'}}>
                <Save size={16} /> <span>Yayınla</span>
              </button>
            </div>
          </div>

          {/* GitHub Publishing */}
          <div className="p-4 rounded-xl" style={{backgroundColor:'var(--color-bg-secondary)'}}>
            <h3 className="font-bold mb-4 flex items-center space-x-2">
              <GitBranch size={16} style={{color:'var(--color-primary)'}} />
              <span>GitHub ile Yayınla</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold mb-1 block">GitHub Personal Access Token</label>
                <input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                  style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
                <p className="text-[10px] mt-1" style={{color:'var(--text-secondary)'}}>
                  <a href="https://github.com/settings/tokens" onClick={(e) => { e.preventDefault(); try { window.require('electron').shell.openExternal('https://github.com/settings/tokens'); } catch(ex) { window.open('https://github.com/settings/tokens', '_blank'); } }} className="underline">Token oluştur</a> (repo scope gerekli)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold mb-1 block">Repo Sahibi</label>
                  <input value={githubOwner} onChange={(e) => setGithubOwner(e.target.value)}
                    placeholder="kullanici-adi"
                    className="w-full border rounded-lg px-3 py-2 text-xs"
                    style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block">Repo Adı</label>
                  <input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="player-plugins"
                    className="w-full border rounded-lg px-3 py-2 text-xs"
                    style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">Branch</label>
                <input value={githubBranch} onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder="main"
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                  style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} />
              </div>
              <button onClick={handleGithubPublish} disabled={githubPublishing || !githubToken.trim() || !githubRepo.trim() || !githubOwner.trim()}
                className="w-full py-3 rounded-lg text-white font-bold disabled:opacity-50 flex items-center justify-center space-x-2"
                style={{backgroundColor:'#24292e'}}>
                <GitBranch size={16} /> <span>{githubPublishing ? 'Yayınlanıyor...' : 'GitHub\'a Yayınla'}</span>
              </button>
              {githubStatus && (
                <div className={`p-3 rounded-lg text-xs ${githubStatus.ok ? 'text-green-500' : 'text-red-500'}`}
                  style={{backgroundColor: githubStatus.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}}>
                  {githubStatus.ok ? (
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Check size={14} /> <span className="font-bold">{githubStatus.msg}</span>
                      </div>
                      {githubStatus.url && (
                        <a href={githubStatus.url} onClick={(e) => { e.preventDefault(); try { window.require('electron').shell.openExternal(githubStatus.url); } catch(ex) { window.open(githubStatus.url, '_blank'); } }} className="underline">Repoyu Aç</a>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <X size={14} /> <span>{githubStatus.msg}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Security Analysis */}
          {pluginMdPath && (
            <div className="p-4 rounded-xl" style={{backgroundColor:'var(--color-bg-secondary)'}}>
              <h3 className="font-bold mb-3 flex items-center space-x-2">
                <Shield size={16} style={{color:'var(--color-primary)'}} />
                <span>Güvenlik Analizi</span>
              </h3>
              <p className="text-xs mb-3" style={{color:'var(--text-secondary)'}}>
                AI ile eklenti içeriğini analiz edin. Erişim derecesi, güvenlik riskleri ve işlevselliği hakkında bilgi alın.
              </p>
              <button onClick={analyzePlugin} disabled={analyzing || !aiProvider.apiKey.trim()}
                className="px-4 py-2 rounded-lg text-white text-xs disabled:opacity-50 flex items-center space-x-2"
                style={{backgroundColor:'rgba(255,165,0,0.2)', color:'orange'}}>
                <Shield size={14} className={analyzing ? 'animate-spin' : ''} />
                <span>{analyzing ? 'Analiz ediliyor...' : 'AI ile Analiz Et'}</span>
              </button>
              {securityAnalysis && (
                <div className="mt-4 p-3 rounded-lg text-xs"
                  style={{backgroundColor: securityAnalysis.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: securityAnalysis.ok ? '#22c55e' : '#ef4444'}}>
                  {securityAnalysis.ok ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Check size={14} /> <span className="font-bold">Güvenli</span>
                      </div>
                      <div style={{color:'var(--text-secondary)'}}>{securityAnalysis.details}</div>
                      <div className="mt-2">
                        <span className="font-bold">Erişim Seviyesi:</span> {securityAnalysis.accessLevel || 'Düşük'}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle size={14} /> <span>{securityAnalysis.msg}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Marketplace Tab */}
      {activeTab === 'marketplace' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-3">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs"
              style={{backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}>
              <option value="all">Tüm Kategoriler</option>
              <option value="skin">Skin / Tema</option>
              <option value="page">Sayfa</option>
              <option value="feature">Özellik</option>
              <option value="integration">Entegrasyon</option>
            </select>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs">Min Puan:</span>
              {[1,2,3,4,5].map(r => (
                <Star key={r} size={16}
                  className="cursor-pointer"
                  style={{color: r <= ratingFilter ? '#fbbf24' : 'var(--text-secondary)'}}
                  onClick={() => setRatingFilter(r === ratingFilter ? 0 : r)} />
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{color:'var(--text-secondary)'}} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Eklenti ara..."
              className="w-full border rounded-lg py-2 pl-9 pr-4 text-xs"
              style={{backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}
            />
          </div>

          {marketplaceLoading ? (
            <div className="text-center py-12" style={{color:'var(--text-secondary)'}}>
              <Loader size={40} className="mx-auto mb-4 opacity-30 animate-spin" />
              <p className="text-sm">Yükleniyor...</p>
            </div>
          ) : marketplaceData.length === 0 ? (
            <div className="text-center py-12" style={{color:'var(--text-secondary)'}}>
              <Download size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">Henüz eklenti yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {marketplaceData
                .filter(p => categoryFilter === 'all' || p.category === categoryFilter)
                .filter(p => ratingFilter === 0 || (p.rating || 0) >= ratingFilter)
                .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(plugin => (
                <div key={plugin.id} className="p-4 rounded-xl" style={{backgroundColor:'var(--color-bg-secondary)'}}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-sm">{plugin.name}</div>
                      <div className="text-[10px]" style={{color:'var(--text-secondary)'}}>{plugin.author}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{backgroundColor:'rgba(15,108,189,0.2)', color:'var(--color-primary)'}}>
                      {plugin.category}
                    </span>
                  </div>
                  <p className="text-xs mb-3" style={{color:'var(--text-secondary)'}}>{plugin.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-1">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={14}
                          fill={star <= (plugin.rating || 0) ? '#fbbf24' : 'none'}
                          style={{color: star <= (plugin.rating || 0) ? '#fbbf24' : 'var(--text-secondary)'}} />
                      ))}
                      <span className="text-[10px] ml-2" style={{color:'var(--text-secondary)'}}>
                        {plugin.downloads || 0} indirme
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button onClick={() => analyzeMarketplacePlugin(plugin)}
                      disabled={analyzingPlugin === plugin.id}
                      className="px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1"
                      style={{backgroundColor:'rgba(255,165,0,0.2)', color:'orange'}}>
                      <Shield size={12} className={analyzingPlugin === plugin.id ? 'animate-spin' : ''} />
                      <span>{analyzingPlugin === plugin.id ? 'Analiz ediliyor...' : 'AI Analiz'}</span>
                    </button>
                    
                    <button onClick={() => installPlugin(plugin)}
                      className="px-3 py-1.5 rounded-lg text-white text-xs flex items-center space-x-1"
                      style={{backgroundColor:'var(--color-primary)'}}>
                      <Download size={12} /> <span>İndir</span>
                    </button>
                  </div>

                  {pluginAnalysis[plugin.id] && (
                    <div className="mt-3 p-3 rounded-lg text-xs"
                      style={{backgroundColor: pluginAnalysis[plugin.id].safe ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}}>
                      <div className="font-bold mb-1">
                        {pluginAnalysis[plugin.id].safe ? '✅ Güvenli' : '⚠️ Riskli'}
                      </div>
                      <div style={{color:'var(--text-secondary)'}}>{pluginAnalysis[plugin.id].details}</div>
                      <div className="mt-2">
                        <span className="font-bold">Erişim:</span> {pluginAnalysis[plugin.id].accessLevel}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Installed Plugins Tab */}
      {activeTab === 'installed' && (
        <div className="space-y-3">
          {installedPlugins.length === 0 ? (
            <div className="text-center py-12" style={{color:'var(--text-secondary)'}}>
              <Puzzle size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">Yüklü eklenti yok</p>
            </div>
          ) : (
            installedPlugins.map(plugin => (
              <div key={plugin.id} className="p-4 rounded-xl" style={{backgroundColor:'var(--color-bg-secondary)', opacity: plugin.enabled ? 1 : 0.5}}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Puzzle size={18} style={{color:'var(--color-primary)'}} />
                    <div>
                      <div className="font-bold text-sm">{plugin.name}</div>
                      <div className="text-[10px]" style={{color:'var(--text-secondary)'}}>{plugin.category} • {plugin.author}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => analyzeInstalledPlugin(plugin)}
                      disabled={analyzingPlugin === plugin.id}
                      className="px-2 py-1 rounded-lg text-xs"
                      style={{backgroundColor:'rgba(255,165,0,0.2)', color:'orange'}}>
                      <Shield size={12} className={analyzingPlugin === plugin.id ? 'animate-spin' : ''} />
                    </button>
                    
                    <button onClick={() => togglePlugin(plugin.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${plugin.enabled ? 'text-white' : ''}`}
                      style={plugin.enabled ? {backgroundColor:'var(--color-primary)'} : {backgroundColor:'rgba(255,255,255,0.05)', color:'var(--text-secondary)'}}>
                      {plugin.enabled ? 'Aktif' : 'Pasif'}
                    </button>
                    <button onClick={() => uninstallPlugin(plugin.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {installedAnalysis[plugin.id] && (
                  <div className="mt-3 p-3 rounded-lg text-xs"
                    style={{backgroundColor: installedAnalysis[plugin.id].safe ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}}>
                    <div className="font-bold mb-1">
                      {installedAnalysis[plugin.id].safe ? '✅ Güvenli' : '⚠️ Dikkat'}
                    </div>
                    <div style={{color:'var(--text-secondary)'}}>
                      {installedAnalysis[plugin.id].details}
                    </div>
                    <div className="mt-2">
                      <span className="font-bold">Erişim Seviyesi:</span> {installedAnalysis[plugin.id].accessLevel}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PluginSettings;
