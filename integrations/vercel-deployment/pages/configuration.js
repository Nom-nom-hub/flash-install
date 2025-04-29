import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Configuration.module.css';

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
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Configure Flash Install</h1>
        
        <div className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="enableCache"
                  checked={config.enableCache}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                Enable Caching
              </label>
              <p className={styles.helpText}>Enable flash-install's deterministic caching for faster builds</p>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="cacheCompression"
                  checked={config.cacheCompression}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                Enable Cache Compression
              </label>
              <p className={styles.helpText}>Compress cached packages to reduce storage space</p>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="fallbackToNpm"
                  checked={config.fallbackToNpm}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                Fallback to npm
              </label>
              <p className={styles.helpText}>Automatically fall back to npm if flash-install encounters an error</p>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>
                Concurrency:
                <input
                  type="number"
                  name="concurrency"
                  value={config.concurrency}
                  onChange={handleNumberChange}
                  min="1"
                  max="16"
                  className={styles.numberInput}
                />
              </label>
              <p className={styles.helpText}>Number of concurrent package installations (1-16)</p>
            </div>
            
            <button type="submit" className={styles.button} disabled={loading}>
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
