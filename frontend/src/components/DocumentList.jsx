import { DownloadButton } from './DownloadButton.jsx';

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function getFileExtension(fileName) {
  const extension = fileName.split('.').pop();
  return extension && extension !== fileName ? extension.slice(0, 5).toUpperCase() : 'FILE';
}

export function DocumentList({ documents, error, isLoading, onRefresh, token }) {
  return (
    <section className="documents-section" aria-labelledby="documents-title">
      <div className="section-heading documents-heading">
        <div>
          <p className="eyebrow">SUA BIBLIOTECA</p>
          <h2 id="documents-title">Documentos</h2>
        </div>
        <div className="documents-tools">
          <span className="document-count" aria-live="polite">
            {documents.length} {documents.length === 1 ? 'arquivo' : 'arquivos'}
          </span>
          <button
            className="refresh-button"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Atualizar documentos"
            title="Atualizar documentos"
          >
            <span aria-hidden="true">↻</span>
          </button>
        </div>
      </div>

      {error && documents.length === 0 ? (
        <div className="list-state state-error" role="alert">
          <p>{error}</p>
          <button className="text-button" type="button" onClick={onRefresh}>Tentar novamente</button>
        </div>
      ) : isLoading && documents.length === 0 ? (
        <div className="list-state" role="status">Carregando documentos...</div>
      ) : documents.length === 0 ? (
        <div className="list-state empty-state">
          <span className="empty-mark" aria-hidden="true">—</span>
          <strong>Nenhum documento ainda</strong>
          <span>Os arquivos enviados aparecerão aqui.</span>
        </div>
      ) : (
        <>
          {error && <p className="feedback error list-feedback" role="alert">{error}</p>}
          {isLoading && <p className="list-refreshing" role="status">Atualizando documentos...</p>}
          <ul className="document-list">
            {documents.map((item) => (
              <li className="document-row" key={item.id}>
                <span className="file-type" aria-hidden="true">{getFileExtension(item.originalName)}</span>
                <div className="document-details">
                  <strong className="document-name" title={item.originalName}>{item.originalName}</strong>
                  <span>{formatFileSize(item.size)} <span className="metadata-separator">·</span> {formatDate(item.uploadedAt)}</span>
                </div>
                <DownloadButton documentId={item.id} fileName={item.originalName} token={token} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}