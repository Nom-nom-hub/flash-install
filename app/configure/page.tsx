"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

// The URL of this page should be added as Configuration URL in your integration settings on Vercel
export default function Page() {
  const searchParams = useSearchParams();
  const configurationId = searchParams.get("configurationId");
  const teamId = searchParams.get("teamId");
  
  const [config, setConfig] = useState({
    enableCache: true,
    cacheCompression: true,
    concurrency: 4,
    fallbackToNpm: true
  });
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setConfig({
      ...config,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig({
      ...config,
      [name]: parseInt(value, 10)
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    
    // In a real implementation, this would save the configuration to Vercel
    // For now, we'll just simulate a successful save
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      
      // If we have a configurationId, we would update the configuration
      if (configurationId) {
        console.log(`Updating configuration ${configurationId} for team ${teamId}`);
        console.log('New configuration:', config);
      }
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="space-y-4 text-center mb-8">
        <h1 className="text-2xl font-bold text-yellow-400">Flash Install Configuration</h1>
        <p className="text-gray-300">
          Configure Flash Install for your Vercel projects
        </p>
        {configurationId && (
          <p className="text-sm text-gray-400">
            Configuration ID: <code className="bg-gray-800 px-2 py-1 rounded">{configurationId}</code>
          </p>
        )}
      </div>
      
      <div className="bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-800">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="enableCache"
                  checked={config.enableCache}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-gray-700 text-yellow-400 focus:ring-yellow-400"
                />
                <span className="text-white font-medium">Enable Caching</span>
              </label>
              <p className="mt-1 text-sm text-gray-400 ml-8">
                Enable Flash Install's deterministic caching for faster builds
              </p>
            </div>
            
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="cacheCompression"
                  checked={config.cacheCompression}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-gray-700 text-yellow-400 focus:ring-yellow-400"
                />
                <span className="text-white font-medium">Enable Cache Compression</span>
              </label>
              <p className="mt-1 text-sm text-gray-400 ml-8">
                Compress cached packages to reduce storage space
              </p>
            </div>
            
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="fallbackToNpm"
                  checked={config.fallbackToNpm}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-gray-700 text-yellow-400 focus:ring-yellow-400"
                />
                <span className="text-white font-medium">Fallback to npm</span>
              </label>
              <p className="mt-1 text-sm text-gray-400 ml-8">
                Automatically fall back to npm if Flash Install encounters an error
              </p>
            </div>
            
            <div>
              <label className="flex items-center space-x-3">
                <span className="text-white font-medium">Concurrency:</span>
                <input
                  type="number"
                  name="concurrency"
                  value={config.concurrency}
                  onChange={handleNumberChange}
                  min="1"
                  max="16"
                  className="w-16 rounded-md border-gray-700 bg-gray-800 text-white focus:border-yellow-400 focus:ring-yellow-400"
                />
              </label>
              <p className="mt-1 text-sm text-gray-400 ml-8">
                Number of concurrent package installations (1-16)
              </p>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 ${
              loading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-yellow-400 hover:bg-yellow-500 text-black"
            }`}
          >
            {loading ? "Saving..." : "Save Configuration"}
          </button>
          
          {saved && (
            <div className="mt-4 p-3 bg-blue-900 text-blue-100 rounded-md text-center">
              Configuration saved successfully!
            </div>
          )}
        </form>
      </div>
      
      <div className="mt-8 text-center">
        <a
          href="https://github.com/flash-install-cli/flash-install"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-400 hover:text-yellow-300"
        >
          Learn more about Flash Install
        </a>
      </div>
    </div>
  );
}
