import React from 'react';

export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      backgroundColor: '#121212',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '3rem', 
        marginBottom: '1rem',
        color: '#FFD700' // Yellow
      }}>
        ⚡ flash-install
      </h1>
      <h2 style={{ 
        fontSize: '1.5rem', 
        marginBottom: '2rem',
        color: '#E0E0E0' // Light gray
      }}>
        Vercel Integration Demo
      </h2>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '600px'
      }}>
        <h3 style={{ color: '#4CAF50' }}>Performance Improvements</h3>
        <ul style={{ lineHeight: 1.6 }}>
          <li>Up to <strong>50% faster</strong> dependency installation</li>
          <li>Intelligent caching between builds</li>
          <li>Team-wide dependency cache sharing</li>
          <li>Automatic fallback to npm if any issues occur</li>
        </ul>
        
        <h3 style={{ color: '#4CAF50', marginTop: '1.5rem' }}>Integration Features</h3>
        <ul style={{ lineHeight: 1.6 }}>
          <li>Seamless integration with Vercel's build system</li>
          <li>Detailed metrics on dependency installation</li>
          <li>Compatible with all major package managers</li>
          <li>Optimized for Next.js projects</li>
        </ul>
      </div>
      
      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#999' }}>
        <p>This demo showcases the flash-install Vercel integration.</p>
        <p>
          <a href="https://github.com/Nom-nom-hub/flash-install" 
             style={{ color: '#FFD700', textDecoration: 'none' }}>
            View on GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
