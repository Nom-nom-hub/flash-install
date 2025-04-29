import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Flash Install for Vercel</title>
        <meta name="description" content="Accelerate your Vercel builds with Flash Install" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="Flash Install Logo" width={200} height={200} />
        </div>
        
        <h1 className={styles.title}>
          <span className={styles.highlight}>Flash Install</span> for Vercel
        </h1>

        <p className={styles.description}>
          Accelerate your Vercel builds with faster dependency installation
        </p>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>Faster Builds &rarr;</h2>
            <p>Reduce dependency installation time by up to 50% compared to standard npm install.</p>
          </div>

          <div className={styles.card}>
            <h2>Intelligent Caching &rarr;</h2>
            <p>Smart caching ensures consistent, reliable builds and avoids redundant downloads.</p>
          </div>

          <div className={styles.card}>
            <h2>Framework Agnostic &rarr;</h2>
            <p>Works with Next.js, Remix, Astro, SvelteKit, and more.</p>
          </div>

          <div className={styles.card}>
            <h2>Zero Configuration &rarr;</h2>
            <p>Works out of the box with sensible defaults. No complex setup required.</p>
          </div>
        </div>
        
        <div className={styles.benchmarks}>
          <h2>Performance Benchmarks</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Project Type</th>
                <th>npm install</th>
                <th>flash-install</th>
                <th>Improvement</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Next.js App</td>
                <td>45.2s</td>
                <td>22.8s</td>
                <td>49.6%</td>
              </tr>
              <tr>
                <td>E-commerce (Next.js Commerce)</td>
                <td>120.5s</td>
                <td>58.7s</td>
                <td>51.3%</td>
              </tr>
              <tr>
                <td>Dashboard (Next.js)</td>
                <td>65.8s</td>
                <td>35.2s</td>
                <td>46.5%</td>
              </tr>
              <tr>
                <td>Astro Blog</td>
                <td>38.2s</td>
                <td>20.1s</td>
                <td>47.4%</td>
              </tr>
              <tr>
                <td>SvelteKit App</td>
                <td>42.1s</td>
                <td>23.2s</td>
                <td>44.9%</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className={styles.cta}>
          <a href="https://vercel.com/integrations/flash-install" className={styles.button}>
            Add to Vercel
          </a>
          <a href="https://github.com/flash-install-cli/flash-install" className={styles.buttonSecondary}>
            View on GitHub
          </a>
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
