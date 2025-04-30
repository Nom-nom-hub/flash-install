import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

export default function Configuration() {
  const router = useRouter();
  const { teamId, configurationId } = router.query;
  
  const [config, setConfig] = useState({
    enableCache: true,
    cacheCompression: true,
    concurrency: 4,
    fallbackToNpm: true
  });
  
  const [loading, setLoading] = useState(false);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig({
      ...config,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setConfig({
      ...config,
      [name]: parseInt(value, 10)
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // In a real implementation, this would save the configuration to Vercel
    // For now, we'll just simulate a successful save
    setTimeout(() => {
      setLoading(false);
      alert('Configuration saved successfully!');
    }, 1000);
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Configure Flash Install</title>
        <meta name="description" content="Configure Flash Install for Vercel" />
        <link rel="icon" href="/logo.png" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Configure Flash Install</h1>
        
        <div className={styles.card} style={{ width: '100%', maxWidth: '500px' }}>
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  name="enableCache"
                  checked={config.enableCache}
                  onChange={handleChange}
                  style={{ marginRight: '10px' }}
                />
                Enable Caching
              </label>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                Enable flash-install's deterministic caching for faster builds
              </p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  name="cacheCompression"
                  checked={config.cacheCompression}
                  onChange={handleChange}
                  style={{ marginRight: '10px' }}
                />
                Enable Cache Compression
              </label>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                Compress cached packages to reduce storage space
              </p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  name="fallbackToNpm"
                  checked={config.fallbackToNpm}
                  onChange={handleChange}
                  style={{ marginRight: '10px' }}
                />
                Fallback to npm
              </label>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                Automatically fall back to npm if flash-install encounters an error
              </p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center' }}>
                Concurrency:
                <input
                  type="number"
                  name="concurrency"
                  value={config.concurrency}
                  onChange={handleNumberChange}
                  min="1"
                  max="16"
                  style={{ marginLeft: '10px', width: '60px' }}
                />
              </label>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                Number of concurrent package installations (1-16)
              </p>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              style={{
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '100%'
              }}
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </form>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://github.com/flash-install-cli/flash-install"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by Flash Install
        </a>
      </footer>
    </div>
  );
}
