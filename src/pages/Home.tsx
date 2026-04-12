import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Github, Linkedin, Mail, FileText, Send, Upload, ExternalLink, Lock, Download, PlusSquare, X, XCircle } from 'lucide-react';
import { uploadFileWithProgress } from '../utils/upload';

export default function Home() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [sections, setSections] = useState([]);
  const [publicUploads, setPublicUploads] = useState([]);
  const [languageMode, setLanguageMode] = useState('en');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [identity, setIdentity] = useState({ name: 'Your Name', name_fa: 'نام شما', profession: 'Your Profession', profession_fa: 'حرفه شما', image: 'https://picsum.photos/seed/portfolio/200/200' });
  
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadEta, setUploadEta] = useState(0);
  const abortControllerRef = useRef<(() => void) | null>(null);

  const [showPublicUpload, setShowPublicUpload] = useState(false);
  const [publicUploadPass, setPublicUploadPass] = useState('');
  const [publicUploadFile, setPublicUploadFile] = useState<File | null>(null);
  const [publicUploadDesc, setPublicUploadDesc] = useState('');
  const [publicUploadStatus, setPublicUploadStatus] = useState('');
  const [publicUploadProgress, setPublicUploadProgress] = useState(0);
  const [publicUploadEta, setPublicUploadEta] = useState(0);
  const publicAbortControllerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetch('/api/projects').then(res => res.json()).then(setProjects);
    fetch('/api/profiles').then(res => res.json()).then(setProfiles);
    fetch('/api/sections', { cache: 'no-store' }).then(res => res.json()).then(setSections);
    fetch('/api/public-uploads', { cache: 'no-store' }).then(res => res.json()).then(setPublicUploads);
    fetch('/api/settings', { cache: 'no-store' }).then(res => res.json()).then(data => {
      if (data.identity_name) {
        setIdentity(prev => ({ ...prev, name: data.identity_name }));
        document.title = data.identity_name;
      }
      if (data.identity_name_fa) setIdentity(prev => ({ ...prev, name_fa: data.identity_name_fa }));
      if (data.identity_profession) setIdentity(prev => ({ ...prev, profession: data.identity_profession }));
      if (data.identity_profession_fa) setIdentity(prev => ({ ...prev, profession_fa: data.identity_profession_fa }));
      if (data.identity_image) {
        setIdentity(prev => ({ ...prev, image: data.identity_image }));
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
      if (data.language_mode) {
        setLanguageMode(data.language_mode);
        setCurrentLanguage(data.language_mode === 'fa' ? 'fa' : 'en');
      }
    });
  }, []);

  const toggleLanguage = () => {
    setCurrentLanguage(prev => prev === 'en' ? 'fa' : 'en');
  };

  const getTitle = (item: any) => currentLanguage === 'fa' && item.title_fa ? item.title_fa : item.title;
  const getDescription = (item: any) => currentLanguage === 'fa' && item.description_fa ? item.description_fa : item.description;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handlePublicFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setPublicUploadFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (!message && !file)) return;

    if (file && file.size > 1024 * 1024 * 1024) {
      setUploadStatus(currentLanguage === 'fa' ? 'حجم فایل بیش از ۱ گیگابایت است' : 'File size exceeds 1GB limit');
      return;
    }

    if (file && file.size > 500 * 1024 * 1024) {
      if (!password) {
        setUploadStatus(currentLanguage === 'fa' ? 'برای فایل‌های بیش از ۵۰۰ مگابایت رمز عبور لازم است' : 'Password required for files over 500MB');
        return;
      }
      
      setUploadStatus(currentLanguage === 'fa' ? 'در حال تایید رمز عبور...' : 'Verifying password...');
      try {
        const res = await fetch('/api/verify-upload-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        if (!res.ok) {
          setUploadStatus(currentLanguage === 'fa' ? 'رمز عبور برای فایل حجیم نامعتبر است.' : 'Invalid password for large file.');
          return;
        }
      } catch (e) {
        setUploadStatus(currentLanguage === 'fa' ? 'تایید رمز عبور ناموفق بود.' : 'Failed to verify password.');
        return;
      }
    }

    setIsUploading(true);
    setUploadStatus('');
    setUploadProgress(0);
    setUploadEta(0);

    const formData = new FormData();
    formData.append('name', name);
    if (emailOrPhone) formData.append('emailOrPhone', emailOrPhone);
    if (message) formData.append('text', message);
    if (file) formData.append('file', file);
    if (password) formData.append('password', password);

    try {
      const { promise, abort } = uploadFileWithProgress('/api/messages', formData, (progress, eta) => {
        setUploadProgress(progress);
        setUploadEta(eta);
      });
      abortControllerRef.current = abort;
      
      await promise;
      setUploadStatus(currentLanguage === 'fa' ? 'پیام با موفقیت ارسال شد!' : 'Message sent successfully!');
      setMessage(''); setName(''); setEmailOrPhone(''); setFile(null); setPassword('');
    } catch (error: any) {
      if (error.message === 'Upload cancelled') {
        setUploadStatus(currentLanguage === 'fa' ? 'آپلود لغو شد.' : 'Upload cancelled.');
      } else {
        setUploadStatus(error.message || (currentLanguage === 'fa' ? 'خطایی رخ داد.' : 'An error occurred.'));
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handlePublicUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicUploadFile || !publicUploadPass) return;

    if (publicUploadFile.size > 1024 * 1024 * 1024) {
      setPublicUploadStatus(currentLanguage === 'fa' ? 'حجم فایل بیش از ۱ گیگابایت است' : 'File size exceeds 1GB limit');
      return;
    }

    setPublicUploadStatus(currentLanguage === 'fa' ? 'در حال تایید رمز عبور...' : 'Verifying password...');
    try {
      const res = await fetch('/api/verify-upload-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: publicUploadPass })
      });
      if (!res.ok) {
        setPublicUploadStatus(currentLanguage === 'fa' ? 'رمز عبور نامعتبر است.' : 'Invalid password.');
        return;
      }
    } catch (e) {
      setPublicUploadStatus(currentLanguage === 'fa' ? 'تایید رمز عبور ناموفق بود.' : 'Failed to verify password.');
      return;
    }

    setPublicUploadStatus(currentLanguage === 'fa' ? 'در حال آپلود...' : 'Uploading...');
    setPublicUploadProgress(0);
    setPublicUploadEta(0);
    
    const formData = new FormData();
    formData.append('password', publicUploadPass);
    formData.append('file', publicUploadFile);
    if (publicUploadDesc) formData.append('description', publicUploadDesc);

    try {
      const { promise, abort } = uploadFileWithProgress('/api/public-uploads', formData, (progress, eta) => {
        setPublicUploadProgress(progress);
        setPublicUploadEta(eta);
      });
      publicAbortControllerRef.current = abort;
      
      await promise;
      setPublicUploadStatus(currentLanguage === 'fa' ? 'آپلود با موفقیت انجام شد!' : 'Uploaded successfully!');
      setPublicUploadFile(null); setPublicUploadDesc(''); setPublicUploadPass('');
      setTimeout(() => setShowPublicUpload(false), 1500);
      fetch('/api/public-uploads').then(r => r.json()).then(setPublicUploads);
    } catch (error: any) {
      if (error.message === 'Upload cancelled') {
        setPublicUploadStatus(currentLanguage === 'fa' ? 'آپلود لغو شد.' : 'Upload cancelled.');
      } else {
        setPublicUploadStatus(error.message || (currentLanguage === 'fa' ? 'آپلود ناموفق بود.' : 'Upload failed.'));
      }
    } finally {
      publicAbortControllerRef.current = null;
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'github': return <Github className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      case 'mail': return <Mail className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  return (
    <div className={`min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800 relative ${currentLanguage === 'fa' ? 'font-vazir' : 'font-roboto'}`} dir={currentLanguage === 'fa' ? 'rtl' : 'ltr'}>
      <div className={`absolute top-6 flex items-center gap-2 z-50 ${currentLanguage === 'fa' ? 'left-6' : 'right-6'}`}>
        {languageMode === 'dual' && (
          <button 
            onClick={toggleLanguage} 
            className={`px-3 py-1 rounded-full bg-zinc-800/50 text-zinc-400 text-xs font-medium hover:bg-zinc-800 hover:text-zinc-200 transition-colors ${currentLanguage === 'en' ? 'font-vazir' : 'font-roboto'}`}
          >
            {currentLanguage === 'en' ? 'فارسی' : 'English'}
          </button>
        )}
        <button 
          onClick={() => navigate('/admin')}
          className="p-2 text-zinc-600 hover:text-zinc-300 transition-colors"
          title="Admin Panel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="2"/>
          </svg>
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-16">
        
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className={`flex items-start ${currentLanguage === 'fa' ? 'flex-row' : 'flex-row'}`}>
            <img 
              src={identity.image} 
              onError={(e) => e.currentTarget.src = 'https://rezasadid.ir/files/rezasadid.jpg'} 
              alt={identity.name} 
              className="w-20 h-20 rounded-2xl object-cover border border-zinc-800"
            />
          </div>
          <div className={currentLanguage === 'fa' ? 'text-right' : ''}>
            <h1 className="text-4xl font-medium tracking-tight text-zinc-100">{currentLanguage === 'fa' ? identity.name_fa : identity.name}</h1>
            <p className="text-lg text-zinc-400 mt-1">{currentLanguage === 'fa' ? identity.profession_fa : identity.profession}</p>
          </div>
        </motion.section>

        {/* Dynamic Sections */}
        {sections.map((section: any) => (
          <motion.section key={section.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`space-y-4 ${currentLanguage === 'fa' ? 'text-right' : ''}`}>
            <div>
              <h2 className="text-xl font-medium text-zinc-100">{getTitle(section)}</h2>
              {getDescription(section) && <p className="text-sm text-zinc-400 mt-1">{getDescription(section)}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir={currentLanguage === 'fa' ? 'rtl' : 'ltr'}>
              {section.items.map((item: any) => (
                <a 
                  key={item.id} 
                  href={`/api/go/${item.id}`} 
                  download={item.type === 'download'} 
                  target={item.type === 'link' ? '_blank' : undefined} 
                  rel="noreferrer"
                  className={`p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800 transition-colors flex items-center gap-3 ${currentLanguage === 'fa' ? 'flex-row-reverse' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    {item.type === 'download' ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-zinc-200 truncate">{getTitle(item)}</h3>
                    {getDescription(item) && <p className="text-xs text-zinc-500 truncate mt-0.5">{getDescription(item)}</p>}
                  </div>
                </a>
              ))}
            </div>
          </motion.section>
        ))}

        {/* Public Links Section */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`space-y-4 ${currentLanguage === 'fa' ? 'text-right' : ''}`}>
          <div className={`flex items-center gap-3 ${currentLanguage === 'fa' ? 'flex-row' : 'flex-row'}`}>
            <h2 className="text-xl font-medium text-zinc-100">{currentLanguage === 'fa' ? 'لینک‌ها و فایل‌ها' : 'Links & Files'}</h2>
            <button onClick={() => setShowPublicUpload(true)} className="text-zinc-500 hover:text-zinc-300 transition-colors" title="Upload File">
              <PlusSquare className="w-5 h-5" />
            </button>
          </div>
          
          <AnimatePresence>
            {showPublicUpload && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <form onSubmit={handlePublicUploadSubmit} className={`p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 mb-4 relative ${currentLanguage === 'fa' ? 'text-right' : ''}`}>
                  <button type="button" onClick={() => setShowPublicUpload(false)} className={`absolute top-4 text-zinc-500 hover:text-zinc-300 ${currentLanguage === 'fa' ? 'left-4' : 'right-4'}`}><X className="w-4 h-4"/></button>
                  <h3 className="text-sm font-medium text-zinc-200">{currentLanguage === 'fa' ? 'آپلود فایل عمومی' : 'Upload Public File'}</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1.5">{currentLanguage === 'fa' ? 'رمز عبور' : 'Password'}</label>
                      <input type="password" required value={publicUploadPass} onChange={e => setPublicUploadPass(e.target.value)} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 ${currentLanguage === 'fa' ? 'text-right font-vazir' : ''}`} placeholder={currentLanguage === 'fa' ? 'اینجا وارد کنید...' : 'Enter here...'} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1.5">{currentLanguage === 'fa' ? 'فایل (حداکثر ۱ گیگابایت)' : 'File (Max 1GB)'}</label>
                      <input type="file" required onChange={handlePublicFileChange} className={`w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer ${currentLanguage === 'fa' ? 'text-right font-vazir' : ''}`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">{currentLanguage === 'fa' ? 'توضیحات (اختیاری)' : 'Description (Optional)'}</label>
                    <input type="text" value={publicUploadDesc} onChange={e => setPublicUploadDesc(e.target.value)} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 ${currentLanguage === 'fa' ? 'text-right font-vazir' : ''}`} placeholder={currentLanguage === 'fa' ? 'توضیح کوتاه...' : 'Brief description...'} />
                  </div>
                  <div className={`flex flex-col sm:flex-row items-center justify-between pt-2 gap-3 ${currentLanguage === 'fa' ? 'flex-row-reverse' : ''}`}>
                    <button type="submit" disabled={publicUploadStatus === 'Uploading...'} className="px-5 py-2 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-white text-sm font-medium transition-colors w-full sm:w-auto disabled:opacity-50">
                      {publicUploadStatus === 'Uploading...' ? (currentLanguage === 'fa' ? 'در حال آپلود...' : 'Uploading...') : (currentLanguage === 'fa' ? 'آپلود' : 'Upload')}
                    </button>
                    {publicUploadStatus === 'Uploading...' && (
                      <div className="flex-1 w-full sm:ml-4 space-y-1">
                        <div className={`flex justify-between text-xs text-zinc-400 ${currentLanguage === 'fa' ? 'flex-row-reverse' : ''}`}>
                          <span>{publicUploadProgress}%</span>
                          <span>{Math.round(publicUploadEta)}{currentLanguage === 'fa' ? ' ثانیه باقی‌مانده' : 's left'}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5">
                          <div className="bg-zinc-100 h-1.5 rounded-full transition-all duration-300" style={{ width: `${publicUploadProgress}%` }}></div>
                        </div>
                        <button type="button" onClick={() => publicAbortControllerRef.current?.()} className={`text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-1 ${currentLanguage === 'fa' ? 'flex-row-reverse' : ''}`}>
                          <XCircle className="w-3 h-3" /> {currentLanguage === 'fa' ? 'لغو' : 'Cancel'}
                        </button>
                      </div>
                    )}
                    {publicUploadStatus && publicUploadStatus !== 'Uploading...' && <span className="text-xs text-zinc-400 text-center sm:text-left">{publicUploadStatus}</span>}
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {publicUploads.length > 0 ? (
            <div className="space-y-2">
              {publicUploads.map((pu: any) => (
                <div key={pu.id} className={`flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/30 border border-zinc-800/50 text-sm hover:bg-zinc-900/60 transition-colors ${currentLanguage === 'fa' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-3 min-w-0 flex-1 ${currentLanguage === 'fa' ? 'flex-row-reverse' : ''}`}>
                    <span className="font-medium text-zinc-200 truncate max-w-[40%]">{pu.original_name}</span>
                    {pu.description && (
                      <>
                        <span className="text-zinc-700">-</span>
                        <span className="text-zinc-500 truncate">{pu.description}</span>
                      </>
                    )}
                  </div>
                  <a href={`/api/public-uploads/${pu.id}/download`} className={`p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg shrink-0 transition-colors ${currentLanguage === 'fa' ? 'mr-3' : 'ml-3'}`}>
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 italic">{currentLanguage === 'fa' ? 'هیچ فایل عمومی در دسترس نیست.' : 'No public files available.'}</p>
          )}
        </motion.section>

        {/* Contact Section */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`space-y-4 ${currentLanguage === 'fa' ? 'text-right' : ''}`}>
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800">
            <h2 className="text-xl font-medium text-zinc-100 mb-1">{currentLanguage === 'fa' ? 'برای من پیام بفرستید' : 'Send me a message'}</h2>
            <p className="text-sm text-zinc-400 mb-6">{currentLanguage === 'fa' ? 'پروژه‌ای در ذهن دارید یا می‌خواهید فایلی را به اشتراک بگذارید؟ اینجا بفرستید.' : 'Have a project in mind or want to share a file? Drop it here.'}</p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">{currentLanguage === 'fa' ? 'نام شما' : 'Your Name'}</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all ${currentLanguage === 'fa' ? 'text-right font-vazir' : ''}`} placeholder={currentLanguage === 'fa' ? 'نام شما' : 'John Doe'} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">{currentLanguage === 'fa' ? 'ایمیل یا شماره تلفن' : 'Email or Phone'}</label>
                  <input type="text" value={emailOrPhone} onChange={e => setEmailOrPhone(e.target.value)} className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all ${currentLanguage === 'fa' ? 'text-right font-vazir' : ''}`} placeholder={currentLanguage === 'fa' ? 'john@example.com' : 'john@example.com'} />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">{currentLanguage === 'fa' ? 'پیام (اختیاری)' : 'Message (Optional)'}</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all min-h-[100px] resize-y ${currentLanguage === 'fa' ? 'text-right font-vazir' : ''}`} placeholder={currentLanguage === 'fa' ? 'سلام...' : 'Hello...'} />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-500">{currentLanguage === 'fa' ? 'پیوست (حداکثر ۵۰۰ مگابایت، تا ۱ گیگابایت با رمز عبور)' : 'Attachment (Max 500MB, up to 1GB with password)'}</label>
                <div className={`flex items-center gap-3 ${currentLanguage === 'fa' ? 'flex-row' : ''}`}>
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer transition-colors border border-zinc-700">
                    <Upload className="w-4 h-4" />
                    <span className="text-xs font-medium">{currentLanguage === 'fa' ? 'انتخاب فایل' : 'Choose File'}</span>
                    <input type="file" className="hidden" onChange={handleFileChange} />
                  </label>
                  {file && <span className="text-xs text-zinc-400 truncate max-w-[200px]">{file.name}</span>}
                </div>
                
                {file && file.size > 500 * 1024 * 1024 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-1">
                    <label className={`flex items-center gap-2 text-xs font-medium text-zinc-500 mb-1.5 ${currentLanguage === 'fa' ? 'flex-row-reverse' : ''}`}>
                      <Lock className="w-3 h-3" /> {currentLanguage === 'fa' ? 'رمز عبور برای فایل حجیم' : 'Password for large file'}
                    </label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all ${currentLanguage === 'fa' ? 'text-right font-vazir' : ''}`} placeholder={currentLanguage === 'fa' ? 'اینجا وارد کنید...' : 'Enter here...'} />
                  </motion.div>
                )}
              </div>

              <div className={`pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 ${currentLanguage === 'fa' ? 'flex-row-reverse' : ''}`}>
                <button type="submit" disabled={isUploading} className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${currentLanguage === 'fa' ? 'flex-row-reverse' : ''}`}>
                  {isUploading ? (currentLanguage === 'fa' ? 'در حال ارسال...' : 'Sending...') : (currentLanguage === 'fa' ? 'ارسال پیام' : 'Send Message')}
                  <Send className="w-4 h-4" />
                </button>
                {isUploading && (
                  <div className="flex-1 w-full sm:ml-4 space-y-1">
                    <div className={`flex justify-between text-xs text-zinc-400 ${currentLanguage === 'fa' ? 'flex-row-reverse' : ''}`}>
                      <span>{uploadProgress}%</span>
                      <span>{Math.round(uploadEta)}{currentLanguage === 'fa' ? ' ثانیه باقی‌مانده' : 's left'}</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div className="bg-zinc-100 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <button type="button" onClick={() => abortControllerRef.current?.()} className={`text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-1 ${currentLanguage === 'fa' ? 'flex-row-reverse' : ''}`}>
                      <XCircle className="w-3 h-3" /> {currentLanguage === 'fa' ? 'لغو' : 'Cancel'}
                    </button>
                  </div>
                )}
                {uploadStatus && !isUploading && <span className={`text-xs text-center sm:text-left ${uploadStatus.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>{uploadStatus}</span>}
              </div>
            </form>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="pt-8 border-t border-zinc-900 text-center text-zinc-600 text-xs">
          <p>© {new Date().getFullYear()} {currentLanguage === 'fa' ? identity.name_fa : identity.name}. {currentLanguage === 'fa' ? 'تمامی حقوق محفوظ است.' : 'All rights reserved.'}</p>
        </footer>
      </div>
    </div>
  );
}
