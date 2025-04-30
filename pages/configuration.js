import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

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
  const [saved, setSaved] = useState(false);

  // Log the query parameters for debugging
  useEffect(() => {
    if (configurationId) {
      console.log(`Configuration ID: ${configurationId}`);
    }
    if (teamId) {
      console.log(`Team ID: ${teamId}`);
    }
  }, [configurationId, teamId]);

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
    <div style={{
      minHeight: '100vh',
      padding: '0 0.5rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000',
      color: '#fff'
    }}>
      <Head>
        <title>Configure Flash Install</title>
        <meta name="description" content="Configure Flash Install for Vercel" />
        <link rel="icon" href="/logo.png" />
      </Head>

      <main style={{
        padding: '5rem 0',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '800px',
        width: '100%'
      }}>
        <h1 style={{
          margin: '0 0 2rem 0',
          lineHeight: 1.15,
          fontSize: '2.5rem',
          textAlign: 'center'
        }}>Configure Flash Install</h1>

        <div style={{
          margin: '1rem 0',
          padding: '2rem',
          width: '100%',
          backgroundColor: '#111',
          borderRadius: '10px',
          border: '1px solid #333'
        }}>
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '1.25rem', fontWeight: 500, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="enableCache"
                  checked={config.enableCache}
                  onChange={handleChange}
                  style={{ marginRight: '0.75rem', width: '20px', height: '20px' }}
                />
                Enable Caching
              </label>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#888' }}>
                Enable Flash Install's deterministic caching
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '1.25rem', fontWeight: 500, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="cacheCompression"
                  checked={config.cacheCompression}
                  onChange={handleChange}
                  style={{ marginRight: '0.75rem', width: '20px', height: '20px' }}
                />
                Enable Cache Compression
              </label>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#888' }}>
                Compress cached packages to reduce storage space
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '1.25rem', fontWeight: 500, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="fallbackToNpm"
                  checked={config.fallbackToNpm}
                  onChange={handleChange}
                  style={{ marginRight: '0.75rem', width: '20px', height: '20px' }}
                />
                Fallback to npm
              </label>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#888' }}>
                Automatically fall back to npm if Flash Install encounters an error
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '1.25rem', fontWeight: 500 }}>
                Concurrency:
                <input
                  type="number"
                  name="concurrency"
                  value={config.concurrency}
                  onChange={handleNumberChange}
                  min="1"
                  max="16"
                  style={{
                    marginLeft: '1rem',
                    padding: '0.5rem',
                    width: '60px',
                    fontSize: '1rem',
                    borderRadius: '5px',
                    border: '1px solid #333',
                    backgroundColor: '#222',
                    color: '#fff'
                  }}
                />
              </label>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#888' }}>
                Number of concurrent package installations (1-16)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#ffcc00',
                color: '#000',
                border: 'none',
                padding: '0.75rem 1.5rem',
                fontSize: '1.25rem',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                transition: 'background-color 0.15s ease',
                marginTop: '1rem',
                width: '100%',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>

            {saved && (
              <div style={{
                backgroundColor: '#0070f3',
                color: 'white',
                padding: '1rem',
                borderRadius: '5px',
                marginTop: '1rem',
                textAlign: 'center'
              }}>
                Configuration saved successfully!
              </div>
            )}
          </form>
        </div>
      </main>

      <footer style={{
        width: '100%',
        height: '100px',
        borderTop: '1px solid #333',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#888'
      }}>
        <a
          href="https://github.com/flash-install-cli/flash-install"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#888', textDecoration: 'none' }}
        >
          Powered by Flash Install
        </a>
      </footer>
    </div>
  );
}
