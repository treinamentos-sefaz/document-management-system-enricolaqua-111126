import { useRef, useState } from 'react';

export function UploadComponent({ error, isUploading, notice, onUpload }) {
  const formRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationMessage('');

    if (!selectedFile) {
      setValidationMessage('Escolha um arquivo para enviar.');
      return;
    }

    const uploaded = await onUpload(selectedFile);

    if (uploaded) {
      setSelectedFile(null);
      formRef.current?.reset();
    }
  }

  function handleFileChange(event) {
    setValidationMessage('');
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  return (
    <form ref={formRef} className="upload-form" onSubmit={handleSubmit}>
      <label className={`file-picker${selectedFile ? ' has-file' : ''}`} htmlFor="document-file">
        <span className="file-picker-icon" aria-hidden="true">+</span>
        <span className="file-picker-copy">
          <strong>{selectedFile ? selectedFile.name : 'Escolha um arquivo'}</strong>
          <span>{selectedFile ? 'Pronto para enviar' : 'Qualquer formato · até 10 MB'}</span>
        </span>
        <span className="file-picker-action">Procurar</span>
        <input
          id="document-file"
          name="file"
          type="file"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>

      <div className="upload-actions">
        <p className="upload-hint">O arquivo ficará disponível na sua biblioteca.</p>
        <button className="primary-button" type="submit" disabled={isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
          <span aria-hidden="true">↗</span>
        </button>
      </div>

      {validationMessage && <p className="feedback error" role="alert">{validationMessage}</p>}
      {error && <p className="feedback error" role="alert">{error}</p>}
      {notice && <p className="feedback success" role="status">{notice}</p>}
    </form>
  );
}