import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, Link, Copy, Check, Lock, Download, Plus, Pencil, MessageSquare, Folder, PlusSquare, Globe, XCircle, Upload } from 'lucide-react';
import { uploadFileWithProgress } from '../utils/upload';

export default function Admin() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('sections');
  
  const [sections, setSections] = useState([]);
  const [adminFiles, setAdminFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [publicUploads, setPublicUploads] = useState([]);

  // Form states
  const [newSection, setNewSection] = useState({ title: '', description: '', title_fa: '', description_fa: '' });
  const [newItem, setNewItem] = useState({ section_id: '', title: '', description: '', title_fa: '', description_fa: '', url: '', type: 'link' });
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editSection, setEditSection] = useState({ title: '', description: '', title_fa: '', description_fa: '' });
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState({ title: '', description: '', title_fa: '', description_fa: '', url: '', type: 'link' });
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadEta, setUploadEta] = useState(0);
  const abortControllerRef = useRef<(() => void) | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  
  // UI states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  
  const [viewingClicksFor, setViewingClicksFor] = useState<string | null>(null);
  const [shareClicks, setShareClicks] = useState<any[]>([]);
  
  const [viewingItemClicksFor, setViewingItemClicksFor] = useState<number | null>(null);
  const [itemClicks, setItemClicks] = useState<any[]>([]);

  const [viewingPublicUploadClicksFor, setViewingPublicUploadClicksFor] = useState<number | null>(null);
  const [publicUploadClicks, setPublicUploadClicks] = useState<any[]>([]);

  const [identitySettings, setIdentitySettings] = useState({ name: '', name_fa: '', profession: '', profession_fa: '', image: '', language_mode: 'en', timezone: 'UTC' });
  const [identityStatus, setIdentityStatus] = useState('');
  const isFa = identitySettings.language_mode === 'fa';
  const inputFontClass = isFa ? 'font-vazir text-right' : '';

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // SQLite CURRENT_TIMESTAMP is YYYY-MM-DD HH:MM:SS in UTC
    // We append 'Z' to ensure it's parsed as UTC. 
    // We also replace space with 'T' for better compatibility.
    const utcDateString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z';
    try {
      return new Date(utcDateString).toLocaleString('en-US', { 
        timeZone: identitySettings.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return new Date(utcDateString).toLocaleString();
    }
  };

  const fetchData = () => {
    fetch('/api/sections').then(res => res.json()).then(setSections);
    fetch('/api/admin/files').then(res => res.json()).then(setAdminFiles);
    fetch('/api/admin/messages').then(res => res.json()).then(setMessages);
    fetch('/api/public-uploads').then(res => res.json()).then(setPublicUploads);
  };

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' }).then(res => res.json()).then(data => {
      setIdentitySettings({
        name: data.identity_name || '',
        name_fa: data.identity_name_fa || '',
        profession: data.identity_profession || '',
        profession_fa: data.identity_profession_fa || '',
        image: data.identity_image || '',
        language_mode: data.language_mode || 'en',
        timezone: data.timezone || 'UTC'
      });
      if (data.identity_name) {
        document.title = data.identity_name;
      }
      if (data.identity_image) {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) {
          link.href = data.identity_image;
        } else {
          const newLink = document.createElement('link');
          newLink.rel = 'icon';
          newLink.href = data.identity_image;
          document.head.appendChild(newLink);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || 'Incorrect pin');
        setAdminPassword('');
      }
    } catch (err) {
      setAuthError('Connection error');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Sections
  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentityStatus('Saving...');
    try {
      await fetch('/api/settings', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity_name: identitySettings.name,
          identity_name_fa: identitySettings.name_fa,
          identity_profession: identitySettings.profession,
          identity_profession_fa: identitySettings.profession_fa,
          identity_image: identitySettings.image,
          language_mode: identitySettings.language_mode,
          timezone: identitySettings.timezone
        })
      });
      setIdentityStatus('Saved!');
      setTimeout(() => setIdentityStatus(''), 2000);
    } catch (err) {
      setIdentityStatus('Error saving');
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSection) });
    setNewSection({ title: '', description: '', title_fa: '', description_fa: '' });
    fetchData();
  };
  const handleEditSection = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    await fetch(`/api/sections/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editSection) });
    setEditingSectionId(null);
    fetchData();
  };
  const handleDeleteSection = async (id: number) => {
    await fetch(`/api/sections/${id}`, { method: 'DELETE' });
    fetchData();
  };
  const handleAddItem = async (e: React.FormEvent, sectionId: number) => {
    e.preventDefault();
    await fetch('/api/section-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newItem, section_id: sectionId }) });
    setNewItem({ section_id: '', title: '', description: '', title_fa: '', description_fa: '', url: '', type: 'link' });
    fetchData();
  };
  const handleEditItem = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    await fetch(`/api/section-items/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) });
    setEditingItemId(null);
    fetchData();
  };
  const handleDeleteItem = async (id: number) => {
    await fetch(`/api/section-items/${id}`, { method: 'DELETE' });
    fetchData();
  };

  // File Manager
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile) return;

    if (newFile.size > 1024 * 1024 * 1024) {
      setUploadStatus('File size exceeds 1GB limit');
      return;
    }

    setUploadStatus('Uploading...');
    setUploadProgress(0);
    setUploadEta(0);
    
    const formData = new FormData();
    formData.append('file', newFile);
    
    try {
      const { promise, abort } = uploadFileWithProgress('/api/admin/files', formData, (progress, eta) => {
        setUploadProgress(progress);
        setUploadEta(eta);
      });
      abortControllerRef.current = abort;
      
      await promise;
      setNewFile(null);
      setUploadStatus('');
      fetchData();
    } catch (error: any) {
      if (error.message === 'Upload cancelled') {
        setUploadStatus('Upload cancelled.');
      } else {
        setUploadStatus(error.message || 'Upload failed.');
      }
    } finally {
      abortControllerRef.current = null;
    }
  };
  const handleDeleteFile = async (id: number) => {
    await fetch(`/api/admin/files/${id}`, { method: 'DELETE' });
    fetchData();
  };
  const handleGenerateShareLink = async (fileId: number) => {
    await fetch(`/api/admin/files/${fileId}/shares`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: sharePassword || null }) });
    setSharePassword('');
    setSelectedFileId(null);
    fetchData();
  };
  const handleDeleteShare = async (shareId: string) => {
    await fetch(`/api/admin/shares/${shareId}`, { method: 'DELETE' });
    fetchData();
  };
  const handleViewClicks = async (shareId: string) => {
    if (viewingClicksFor === shareId) { setViewingClicksFor(null); return; }
    const res = await fetch(`/api/admin/shares/${shareId}/clicks`);
    setShareClicks(await res.json());
    setViewingClicksFor(shareId);
  };
  const handleResetShareClicks = async (shareId: string) => {
    if (!confirm('Are you sure you want to reset stats for this share link?')) return;
    await fetch(`/api/admin/shares/${shareId}/clicks`, { method: 'DELETE' });
    if (viewingClicksFor === shareId) setShareClicks([]);
    fetchData();
  };

  // Section Item Clicks
  const handleViewItemClicks = async (itemId: number) => {
    if (viewingItemClicksFor === itemId) { setViewingItemClicksFor(null); return; }
    const res = await fetch(`/api/section-items/${itemId}/clicks`);
    setItemClicks(await res.json());
    setViewingItemClicksFor(itemId);
  };
  const handleResetItemClicks = async (itemId: number) => {
    if (!confirm('Are you sure you want to reset stats for this link?')) return;
    await fetch(`/api/section-items/${itemId}/clicks`, { method: 'DELETE' });
    if (viewingItemClicksFor === itemId) setItemClicks([]);
    fetchData();
  };

  // Public Uploads
  const handleViewPublicUploadClicks = async (id: number) => {
    if (viewingPublicUploadClicksFor === id) { setViewingPublicUploadClicksFor(null); return; }
    const res = await fetch(`/api/public-uploads/${id}/clicks`);
    setPublicUploadClicks(await res.json());
    setViewingPublicUploadClicksFor(id);
  };
  const handleResetPublicUploadClicks = async (id: number) => {
    if (!confirm('Are you sure you want to reset stats for this public upload?')) return;
    await fetch(`/api/public-uploads/${id}/clicks`, { method: 'DELETE' });
    if (viewingPublicUploadClicksFor === id) setPublicUploadClicks([]);
    fetchData();
  };
  const handleDeletePublicUpload = async (id: number) => {
    await fetch(`/api/public-uploads/${id}`, { method: 'DELETE' });
    fetchData();
  };

  // Messages
  const handleDeleteMessage = async (id: number) => {
    await fetch(`/api/messages/${id}`, { method: 'DELETE' });
    fetchData();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-sans relative">
        <button onClick={() => navigate('/')} className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-zinc-300 transition-colors" title="Back to Home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1"/>
          </svg>
        </button>
        <form onSubmit={handleLogin} className={`p-8 rounded-3xl bg-zinc-900 border border-zinc-800 max-w-sm w-full space-y-6 ${isFa ? 'font-vazir' : ''}`} dir={isFa ? 'rtl' : 'ltr'}>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-5 h-5 text-zinc-400" />
            </div>
            <h1 className="text-xl font-medium text-zinc-100">{isFa ? 'دسترسی مدیریت' : 'Admin Access'}</h1>
            <p className="text-sm text-zinc-500">{isFa ? 'پین کد را وارد کنید' : 'Enter pin to continue'}</p>
          </div>
          <div>
            <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-center text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${inputFontClass}`} placeholder={isFa ? 'اینجا وارد کنید...' : 'Enter here...'} autoFocus />
            {authError && <p className="text-red-400 text-xs text-center mt-3">{authError}</p>}
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white font-medium transition-colors">{isFa ? 'باز کردن' : 'Unlock'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col md:flex-row ${identitySettings.language_mode === 'fa' ? 'font-vazir' : 'font-roboto'}`} dir={identitySettings.language_mode === 'fa' ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-900 p-6 flex flex-col gap-8 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight text-zinc-100">Admin Panel</h1>
            <p className="text-sm text-zinc-500 mt-1">{identitySettings.name || 'Your Name'}</p>
          </div>
          <button onClick={() => navigate('/')} className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors" title="Back to Home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
          </button>
        </div>
        <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 flex-1">
          {[
            { id: 'sections', icon: Folder, label: 'Sections' },
            { id: 'files', icon: Upload, label: 'File Manager' },
            { id: 'public_uploads', icon: Globe, label: 'Public Links' },
            { id: 'messages', icon: MessageSquare, label: 'Inbox' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
          <a href="https://github.com/rezasadid753" target="_blank" rel="noreferrer" className="flex items-center justify-center md:justify-start gap-3 px-4 py-2.5 rounded-xl text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 transition-colors md:mt-auto" title="GitHub">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            <span className="text-sm font-medium hidden md:inline">GitHub</span>
          </a>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-10">
          
          {activeTab === 'sections' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <h2 className="text-2xl font-medium text-zinc-100">Identity & Sections</h2>
              
              <form onSubmit={handleSaveIdentity} className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <h3 className="text-sm font-medium text-zinc-200 border-b border-zinc-800 pb-2">Site Identity</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Full Name</label>
                    <input required type="text" value={identitySettings.name} onChange={e => setIdentitySettings({...identitySettings, name: e.target.value})} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 ${inputFontClass}`} placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 font-vazir">نام کامل</label>
                    <input required type="text" value={identitySettings.name_fa} onChange={e => setIdentitySettings({...identitySettings, name_fa: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 font-vazir text-right" dir="rtl" placeholder="نام شما" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Profession</label>
                    <input required type="text" value={identitySettings.profession} onChange={e => setIdentitySettings({...identitySettings, profession: e.target.value})} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 ${inputFontClass}`} placeholder="Software Engineer" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 font-vazir">حرفه / عنوان</label>
                    <input required type="text" value={identitySettings.profession_fa} onChange={e => setIdentitySettings({...identitySettings, profession_fa: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 font-vazir text-right" dir="rtl" placeholder="حرفه شما" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Profile Image URL</label>
                    <input required type="text" value={identitySettings.image} onChange={e => setIdentitySettings({...identitySettings, image: e.target.value})} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 ${inputFontClass}`} placeholder="https://..." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Language Mode</label>
                    <select value={identitySettings.language_mode} onChange={e => setIdentitySettings({...identitySettings, language_mode: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600">
                      <option value="en">English Only</option>
                      <option value="fa">Persian Only</option>
                      <option value="dual">Dual Language</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Timezone</label>
                    <select value={identitySettings.timezone} onChange={e => setIdentitySettings({...identitySettings, timezone: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600">
                      <option value="UTC">UTC</option>
                      <option value="Asia/Tehran">Asia/Tehran</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                      <option value="Australia/Sydney">Australia/Sydney</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" className="px-5 py-2 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-white text-sm font-medium transition-colors">Save Identity</button>
                  {identityStatus && <span className="text-xs text-zinc-400">{identityStatus}</span>}
                </div>
              </form>

              <form onSubmit={handleAddSection} className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Section Title</label>
                    <input required type="text" value={newSection.title} onChange={e => setNewSection({...newSection, title: e.target.value})} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 ${inputFontClass}`} placeholder="e.g. My Tools" />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 font-vazir">عنوان بخش</label>
                    <input type="text" value={newSection.title_fa} onChange={e => setNewSection({...newSection, title_fa: e.target.value})} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 font-vazir text-right`} dir="rtl" placeholder="عنوان بخش" />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Description</label>
                    <input type="text" value={newSection.description} onChange={e => setNewSection({...newSection, description: e.target.value})} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 ${inputFontClass}`} placeholder="Brief subtitle..." />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 font-vazir">توضیحات</label>
                    <input type="text" value={newSection.description_fa} onChange={e => setNewSection({...newSection, description_fa: e.target.value})} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 font-vazir text-right`} dir="rtl" placeholder="توضیحات" />
                  </div>
                </div>
                <button type="submit" className="px-5 py-2 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-white text-sm font-medium transition-colors h-[38px] flex items-center justify-center gap-2 w-full">
                  <Plus className="w-4 h-4" /> Add Section
                </button>
              </form>

              <div className="space-y-6">
                {sections.map((section: any) => (
                  <div key={section.id} className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 space-y-4">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                      {editingSectionId === section.id ? (
                        <form onSubmit={(e) => handleEditSection(e, section.id)} className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input required type="text" value={editSection.title} onChange={e => setEditSection({...editSection, title: e.target.value})} className={`bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 ${inputFontClass}`} placeholder="Title" />
                          <input type="text" value={editSection.title_fa} onChange={e => setEditSection({...editSection, title_fa: e.target.value})} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 font-vazir text-right" dir="rtl" placeholder="عنوان" />
                          <input type="text" value={editSection.description} onChange={e => setEditSection({...editSection, description: e.target.value})} className={`bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 ${inputFontClass}`} placeholder="Description" />
                          <input type="text" value={editSection.description_fa} onChange={e => setEditSection({...editSection, description_fa: e.target.value})} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 font-vazir text-right" dir="rtl" placeholder="توضیحات" />
                          <div className="flex gap-2">
                            <button type="submit" className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-medium">Save</button>
                            <button type="button" onClick={() => setEditingSectionId(null)} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-medium">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex-1 min-w-0 w-full flex flex-col sm:flex-row border border-zinc-800 rounded-xl bg-zinc-900/40 overflow-hidden">
                          <div className="flex-1 p-3">
                            <h3 className="text-base font-medium text-zinc-100">{section.title}</h3>
                            {section.description && <p className="text-xs text-zinc-500 mt-0.5">{section.description}</p>}
                          </div>
                          {section.title_fa && (
                            <div className="flex-1 p-3 border-t sm:border-t-0 sm:border-l border-zinc-800/50" dir="rtl">
                              <h3 className="text-base font-medium text-zinc-100 font-vazir">{section.title_fa}</h3>
                              {section.description_fa && <p className="text-xs text-zinc-500 mt-0.5 font-vazir">{section.description_fa}</p>}
                            </div>
                          )}
                        </div>
                      )}
                      {editingSectionId !== section.id && (
                        <div className="flex gap-2 p-1 border border-zinc-800 rounded-xl bg-zinc-900/30 self-end lg:self-start shrink-0">
                          <button onClick={() => { setEditingSectionId(section.id); setEditSection({ title: section.title, description: section.description || '', title_fa: section.title_fa || '', description_fa: section.description_fa || '' }); }} className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteSection(section.id)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>

                    <div className="pl-4 border-l-2 border-zinc-800 space-y-3">
                      {section.items.map((item: any) => (
                        <div key={item.id} className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm">
                          {editingItemId === item.id ? (
                            <form onSubmit={(e) => handleEditItem(e, item.id)} className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input required type="text" value={editItem.title} onChange={e => setEditItem({...editItem, title: e.target.value})} className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 ${inputFontClass}`} placeholder="Title" />
                                <input type="text" value={editItem.title_fa} onChange={e => setEditItem({...editItem, title_fa: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-vazir text-right" dir="rtl" placeholder="عنوان" />
                                <input type="text" value={editItem.description} onChange={e => setEditItem({...editItem, description: e.target.value})} className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 ${inputFontClass}`} placeholder="Description" />
                                <input type="text" value={editItem.description_fa} onChange={e => setEditItem({...editItem, description_fa: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-vazir text-right" dir="rtl" placeholder="توضیحات" />
                                <input required type="text" value={editItem.url} onChange={e => setEditItem({...editItem, url: e.target.value})} className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 ${inputFontClass}`} placeholder="URL" />
                                <select value={editItem.type} onChange={e => setEditItem({...editItem, type: e.target.value})} className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 ${inputFontClass}`}>
                                  <option value="link">Link</option>
                                  <option value="download">Download</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button type="submit" className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-medium">Save</button>
                                <button type="button" onClick={() => setEditingItemId(null)} className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-medium">Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="text-zinc-500 shrink-0">{item.type === 'download' ? <Download className="w-4 h-4"/> : <Link className="w-4 h-4"/>}</div>
                                <div className="min-w-0 flex-1 flex flex-col sm:flex-row border border-zinc-800 rounded-lg bg-zinc-900/40 overflow-hidden">
                                  <div className="flex-1 p-2">
                                    <p className="font-medium text-zinc-300 truncate text-sm">{item.title}</p>
                                    {item.description && <p className="text-[11px] text-zinc-600 truncate">{item.description}</p>}
                                    <p className="text-[10px] text-zinc-500 break-all mt-0.5">{item.url}</p>
                                  </div>
                                  {item.title_fa && (
                                    <div className="flex-1 p-2 border-t sm:border-t-0 sm:border-l border-zinc-800/50" dir="rtl">
                                      <p className="font-medium text-zinc-300 truncate text-sm font-vazir">{item.title_fa}</p>
                                      {item.description_fa && <p className="text-[11px] text-zinc-600 truncate font-vazir">{item.description_fa}</p>}
                                      <p className="text-[10px] text-zinc-500 break-all mt-0.5" dir="ltr">{item.url}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 p-1.5 border border-zinc-800 rounded-xl bg-zinc-900/30 self-end md:self-center">
                                <span className="text-xs text-zinc-500 mr-2 hidden sm:inline">Clicks: {item.clicks || 0}</span>
                                <button onClick={() => { setEditingItemId(item.id); setEditItem({ title: item.title, description: item.description || '', title_fa: item.title_fa || '', description_fa: item.description_fa || '', url: item.url, type: item.type }); }} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs">Edit</button>
                                <button onClick={() => handleViewItemClicks(item.id)} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs">Logs</button>
                                <button onClick={() => handleResetItemClicks(item.id)} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs">Reset</button>
                                <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          )}
                          {viewingItemClicksFor === item.id && (
                            <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1 max-h-32 overflow-y-auto text-xs">
                              {itemClicks.length > 0 ? itemClicks.map((click: any) => (
                                <div key={click.id} className="flex justify-between text-zinc-500">
                                  <span className="font-mono">{click.ip}</span>
                                  <span>{formatDate(click.clicked_at)}</span>
                                </div>
                              )) : <p className="text-zinc-600 italic">No clicks yet.</p>}
                            </div>
                          )}
                        </div>
                      ))}

                      <form onSubmit={(e) => handleAddItem(e, section.id)} className="flex flex-col gap-3 mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 border-dashed">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input required type="text" value={newItem.section_id === section.id ? newItem.title : ''} onChange={e => setNewItem({...newItem, section_id: section.id, title: e.target.value})} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 ${inputFontClass}`} placeholder="Title" />
                          <input type="text" value={newItem.section_id === section.id ? newItem.title_fa : ''} onChange={e => setNewItem({...newItem, section_id: section.id, title_fa: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 font-vazir text-right" dir="rtl" placeholder="عنوان" />
                          <input type="text" value={newItem.section_id === section.id ? newItem.description : ''} onChange={e => setNewItem({...newItem, section_id: section.id, description: e.target.value})} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 ${inputFontClass}`} placeholder="Description" />
                          <input type="text" value={newItem.section_id === section.id ? newItem.description_fa : ''} onChange={e => setNewItem({...newItem, section_id: section.id, description_fa: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 font-vazir text-right" dir="rtl" placeholder="توضیحات" />
                          <input required type="text" value={newItem.section_id === section.id ? newItem.url : ''} onChange={e => setNewItem({...newItem, section_id: section.id, url: e.target.value})} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 ${inputFontClass}`} placeholder="URL" />
                          <select value={newItem.section_id === section.id ? newItem.type : 'link'} onChange={e => setNewItem({...newItem, section_id: section.id, type: e.target.value})} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 ${inputFontClass}`}>
                            <option value="link">Link</option>
                            <option value="download">Download</option>
                          </select>
                        </div>
                        <button type="submit" className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors w-full sm:w-auto shrink-0">Add Item</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'files' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <h2 className="text-2xl font-medium text-zinc-100">File Manager</h2>
              
              <form onSubmit={handleFileUpload} className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex-1 w-full">
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-zinc-800 rounded-xl hover:border-zinc-600 hover:bg-zinc-800/50 cursor-pointer transition-all">
                      <Upload className="w-5 h-5 text-zinc-500" />
                      <span className="text-sm font-medium text-zinc-400">{newFile ? newFile.name : 'Choose file to upload'}</span>
                      <input type="file" className="hidden" onChange={e => e.target.files && setNewFile(e.target.files[0])} />
                    </label>
                  </div>
                  <button type="submit" disabled={!newFile || uploadStatus === 'Uploading...'} className="px-6 py-3 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white font-medium transition-colors disabled:opacity-50 w-full sm:w-auto h-full min-h-[48px]">
                    {uploadStatus === 'Uploading...' ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
                {uploadStatus === 'Uploading...' && uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Uploading... {uploadProgress}%</span>
                      <span>{Math.round(uploadEta)}s remaining</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div className="bg-zinc-100 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <button type="button" onClick={() => abortControllerRef.current?.()} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 justify-center w-full mt-2">
                      <XCircle className="w-3 h-3" /> Cancel Upload
                    </button>
                  </div>
                )}
                {uploadStatus && uploadStatus !== 'Uploading...' && <p className="text-sm text-zinc-400">{uploadStatus}</p>}
              </form>

              <div className="space-y-4">
                {adminFiles.map((file: any) => (
                  <div key={file.id} className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0"><Folder className="w-5 h-5" /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200 break-all">{file.original_name}</p>
                          <p className="text-xs text-zinc-500">{formatSize(file.size)} • {formatDate(file.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 p-1.5 border border-zinc-800 rounded-xl bg-zinc-900/30">
                        <button onClick={() => copyToClipboard(`${window.location.origin}/api/download/${encodeURIComponent(file.filename)}`, `direct-${file.id}`)} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors flex items-center gap-2">
                          {copiedId === `direct-${file.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Direct Link
                        </button>
                        <button onClick={() => handleDeleteFile(file.id)} className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <div className="pl-12 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {selectedFileId === file.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input type="text" placeholder={isFa ? 'رمز عبور (اختیاری)' : 'Password (opt)'} value={sharePassword} onChange={e => setSharePassword(e.target.value)} className={`px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 focus:outline-none w-32 ${inputFontClass}`} />
                            <button onClick={() => handleGenerateShareLink(file.id)} className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-medium transition-colors">{isFa ? 'ایجاد' : 'Create'}</button>
                            <button onClick={() => setSelectedFileId(null)} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors">{isFa ? 'لغو' : 'Cancel'}</button>
                          </div>
                        ) : (
                          <button onClick={() => setSelectedFileId(file.id)} className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"><PlusSquare className="w-3.5 h-3.5" /> New Share Link</button>
                        )}
                      </div>

                      {file.shares.map((share: any) => (
                        <div key={share.share_id} className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="font-mono text-zinc-400">{share.share_id}</span>
                              {share.password && <span className="flex items-center gap-1 text-zinc-500" title={`Password: ${share.password}`}><Lock className="w-3 h-3"/> Protected ({share.password})</span>}
                              <span className="text-zinc-500">Clicks: {share.clicks}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 p-1 border border-zinc-800 rounded-xl bg-zinc-900/30 self-start sm:self-auto">
                              <button onClick={() => handleViewClicks(share.share_id)} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">Logs</button>
                              <button onClick={() => handleResetShareClicks(share.share_id)} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">Reset</button>
                              <button onClick={() => copyToClipboard(`${window.location.origin}/share/${share.share_id}`, share.share_id)} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex items-center gap-1">
                                {copiedId === share.share_id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                              </button>
                              <button onClick={() => handleDeleteShare(share.share_id)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          {viewingClicksFor === share.share_id && (
                            <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1 max-h-32 overflow-y-auto">
                              {shareClicks.length > 0 ? shareClicks.map((click: any) => (
                                <div key={click.id} className="flex justify-between text-zinc-500">
                                  <span className="font-mono">{click.ip}</span>
                                  <span>{formatDate(click.clicked_at)}</span>
                                </div>
                              )) : <p className="text-zinc-600 italic">No clicks yet.</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'public_uploads' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-2xl font-medium text-zinc-100">Public Links & Files</h2>
              <p className="text-sm text-zinc-500">Manage files uploaded by users in the public Links section.</p>
              <div className="space-y-4">
                {publicUploads.map((pu: any) => (
                  <div key={pu.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0"><Globe className="w-5 h-5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-200 break-all">{pu.original_name}</p>
                        <p className="text-xs text-zinc-500 break-all">{formatSize(pu.size)} • {formatDate(pu.created_at)} {pu.description ? `• ${pu.description}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-500">Downloads: {pu.clicks || 0}</span>
                      <div className="flex items-center gap-2 p-1.5 border border-zinc-800 rounded-xl bg-zinc-900/30">
                        <button onClick={() => handleViewPublicUploadClicks(pu.id)} className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs">Logs</button>
                        <button onClick={() => handleResetPublicUploadClicks(pu.id)} className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs">Reset</button>
                        <a href={`/api/public-uploads/${pu.id}/download`} className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-colors flex justify-center">
                          <Download className="w-4 h-4" />
                        </a>
                        <button onClick={() => handleDeletePublicUpload(pu.id)} className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex justify-center">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {viewingPublicUploadClicksFor === pu.id && (
                      <div className="mt-2 pt-2 border-t border-zinc-800/50 space-y-1 max-h-32 overflow-y-auto text-xs">
                        {publicUploadClicks.length > 0 ? publicUploadClicks.map((click: any) => (
                          <div key={click.id} className="flex justify-between text-zinc-500">
                            <span className="font-mono">{click.ip}</span>
                            <span>{formatDate(click.clicked_at)}</span>
                          </div>
                        )) : <p className="text-zinc-600 italic">No downloads yet.</p>}
                      </div>
                    )}
                  </div>
                ))}
                {publicUploads.length === 0 && <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">No public uploads yet.</div>}
              </div>
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-2xl font-medium text-zinc-100">Inbox</h2>
              <div className="space-y-4">
                {messages.map((msg: any) => (
                  <div key={msg.id} className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-zinc-200">{msg.name}</h3>
                        {msg.email_or_phone && <p className="text-sm text-zinc-400 mt-0.5">{msg.email_or_phone}</p>}
                        <p className="text-xs text-zinc-500 mt-1">{formatDate(msg.created_at)}</p>
                      </div>
                      <div className="p-1 border border-zinc-800 rounded-xl bg-zinc-900/30">
                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {msg.text && <p className="text-zinc-300 text-sm bg-zinc-950 p-4 rounded-xl mb-3 border border-zinc-800 whitespace-pre-wrap break-words">{msg.text}</p>}
                    {msg.file_id && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Folder className="w-5 h-5 text-zinc-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-200 truncate">{msg.original_name}</p>
                            <p className="text-xs text-zinc-500">{formatSize(msg.size)}</p>
                          </div>
                        </div>
                        <a href={`/api/download/${encodeURIComponent(msg.filename)}`} download className="px-3 py-2 sm:py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto">
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </div>
                    )}
                  </div>
                ))}
                {messages.length === 0 && <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">No messages yet.</div>}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
