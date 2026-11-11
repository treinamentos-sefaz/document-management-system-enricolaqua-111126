import { useEffect, useState } from 'react';
import { DocumentList } from './components/DocumentList.jsx';
import { AuthForm } from './components/AuthForm.jsx';
import { UploadComponent } from './components/UploadComponent.jsx';
import { listDocuments, uploadDocument } from './services/api.js';
import './App.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [notice, setNotice] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (!session) {
      setDocuments([]);
      setIsLoading(false);
      setLoadError('');
      return undefined;
    }

    const controller = new AbortController();

    async function loadDocuments() {
      setIsLoading(true);
      setLoadError('');

      try {
        const result = await listDocuments({ signal: controller.signal, token: session.token });
        setDocuments(result);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setLoadError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();
    return () => controller.abort();
  }, [refreshVersion, session]);

  async function handleUpload(file) {
    setUploadError('');
    setNotice('');
    setIsUploading(true);

    try {
      const document = await uploadDocument(file, session.token);
      setNotice(`${document.originalName} foi enviado.`);
      setRefreshVersion((version) => version + 1);
      return true;
    } catch (error) {
      setUploadError(error.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  function refreshDocuments() {
    setRefreshVersion((version) => version + 1);
  }

  if (!session) {
    return <AuthForm onAuthenticated={setSession} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DMS</span>
        </a>
        <span className="workspace-label">
          <span className="status-dot" aria-hidden="true" />
          {session.user.username}
        </span>
        <button className="logout-button" type="button" onClick={() => setSession(null)}>
          Sair
        </button>
      </header>

      <div className="content" id="top">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">DOCUMENT MANAGEMENT SYSTEM</p>
          <h1 id="page-title">Seus documentos,<br />em um só lugar.</h1>
          <p className="intro-copy">
            Envie, organize e acesse seus arquivos em uma biblioteca simples e segura.
          </p>
        </section>

        <section className="upload-section" aria-labelledby="upload-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ADICIONAR À BIBLIOTECA</p>
              <h2 id="upload-title">Enviar documento</h2>
            </div>
            <span className="section-index" aria-hidden="true">01</span>
          </div>
          <UploadComponent
            error={uploadError}
            isUploading={isUploading}
            notice={notice}
            onUpload={handleUpload}
          />
        </section>

        <DocumentList
          documents={documents}
          error={loadError}
          isLoading={isLoading}
          onRefresh={refreshDocuments}
          token={session.token}
        />
      </div>

      <footer className="footer">
        <span>Document Management System</span>
        <span>Arquivos armazenados localmente</span>
      </footer>
    </main>
  );
}
