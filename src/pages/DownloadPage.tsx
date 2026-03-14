import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Download, AlertCircle } from 'lucide-react';

export default function DownloadPage() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setError('');

    try {
      // We do a HEAD request first to check if the password is correct
      // without downloading the whole file into memory
      const checkRes = await fetch(`/api/share/${shareId}?password=${encodeURIComponent(password)}`, {
        method: 'HEAD'
      });

      if (checkRes.ok) {
        // If ok, trigger the actual download via browser
        window.location.href = `/api/share/${shareId}?password=${encodeURIComponent(password)}`;
      } else {
        if (checkRes.status === 401) {
          setError('Incorrect password');
        } else if (checkRes.status === 404) {
          setError('File not found or link expired');
        } else if (checkRes.status === 429) {
          setError('Too many attempts. Please try again later.');
        } else {
          setError('An error occurred');
        }
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-6 h-6 text-zinc-400" />
          </div>
          <h1 className="text-2xl font-medium text-zinc-100">Protected File</h1>
          <p className="text-zinc-400 text-sm">This file requires a password to download.</p>
        </div>

        <form onSubmit={handleDownload} className="space-y-4 pt-4">
          <div>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-center text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all" 
              placeholder="Enter password..." 
              autoFocus 
            />
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm justify-center bg-red-400/10 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isChecking || !password} 
            className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isChecking ? 'Verifying...' : <><Download className="w-4 h-4" /> Download File</>}
          </button>
        </form>
      </div>
    </div>
  );
}
