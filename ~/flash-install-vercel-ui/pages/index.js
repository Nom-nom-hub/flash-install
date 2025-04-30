import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Flash Install for Vercel</title>
        <meta name="description" content="Accelerate your Vercel builds with Flash Install" />
        <link rel="icon" href="/logo.png" />
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
