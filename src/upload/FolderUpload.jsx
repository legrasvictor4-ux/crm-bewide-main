// FolderUpload.jsx - Composant pour l'upload de dossiers clients
import React, { useState, useRef } from 'react';

const FolderUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadStatus !== 'uploading') {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (uploadStatus === 'uploading') return;
    
    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = async (files) => {
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadResult(null);
    
    const formData = new FormData();
    
    // Ajouter chaque fichier au FormData
    Array.from(files).forEach((file, index) => {
      formData.append(`files`, file, file.webkitRelativePath || file.name);
    });
    
    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          setUploadResult(result);
          setUploadStatus('success');
          
          // Réinitialiser après 5 secondes
          setTimeout(() => {
            setUploadStatus('idle');
            setUploadProgress(0);
          }, 5000);
        } else {
          throw new Error('Échec du téléchargement');
        }
      };
      
      xhr.onerror = () => {
        setUploadStatus('error');
        setUploadResult({ error: 'Une erreur est survenue lors du téléchargement' });
      };
      
      xhr.open('POST', '/api/upload/folder', true);
      xhr.send(formData);
      
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      setUploadStatus('error');
      setUploadResult({ error: error.message });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="folder-upload-container">
      <h3>Importer un dossier client</h3>
      
      <div 
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploadStatus}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileInput}
          webkitdirectory="true"
          directory="true"
          multiple
        />
        
        {uploadStatus === 'uploading' ? (
          <div className="upload-progress">
            <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
            <div className="progress-text">
              Téléchargement en cours... {uploadProgress}%
            </div>
          </div>
        ) : uploadStatus === 'success' ? (
          <div className="upload-success">
            <div className="success-icon">✓</div>
            <div className="success-message">
              <h4>Import réussi !</h4>
              {uploadResult && (
                <div className="upload-stats">
                  <p>{uploadResult.processed} clients importés avec succès</p>
                  {uploadResult.errors > 0 && (
                    <p className="warning">{uploadResult.errors} erreurs lors de l'import</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="upload-error">
            <div className="error-icon">✕</div>
            <div className="error-message">
              <h4>Erreur lors de l'import</h4>
              <p>{uploadResult?.error || 'Une erreur inconnue est survenue'}</p>
              <button 
                className="retry-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadStatus('idle');
                }}
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">📁</div>
            <p>Glissez-déposez votre dossier ici ou cliquez pour sélectionner</p>
            <p className="hint">Tous les fichiers du dossier seront importés</p>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .folder-upload-container {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        h3 {
          margin-bottom: 15px;
          color: #333;
        }
        
        .drop-zone {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background-color: #f9f9f9;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .drop-zone.dragging {
          border-color: #4CAF50;
          background-color: #f0f8f0;
        }
        
        .upload-prompt, .upload-success, .upload-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .upload-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        
        .success-icon, .error-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        
        .success-icon {
          color: #4CAF50;
        }
        
        .error-icon {
          color: #f44336;
        }
        
        .hint {
          color: #666;
          font-size: 0.9em;
          margin-top: 5px;
        }
        
        .upload-progress {
          width: 100%;
          max-width: 400px;
        }
        
        .progress-bar {
          height: 20px;
          background-color: #4CAF50;
          border-radius: 10px;
          margin-bottom: 10px;
          transition: width 0.3s ease;
        }
        
        .progress-text {
          font-size: 0.9em;
          color: #555;
        }
        
        .upload-stats {
          margin-top: 10px;
          font-size: 0.9em;
        }
        
        .warning {
          color: #f39c12;
          font-weight: 500;
        }
        
        .retry-button {
          margin-top: 15px;
          padding: 8px 20px;
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }
        
        .retry-button:hover {
          background-color: #d32f2f;
        }
      `}</style>
    </div>
  );
};

export default FolderUpload;
