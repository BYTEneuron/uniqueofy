import { useState, useEffect } from 'react';
import axios from '../api/axios';
import './ModelInfo.css';

const ModelInfo = () => {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/model/current');
        setModelInfo(response.data.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch model information');
        console.error('Error fetching model info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModelInfo();
  }, []);

  if (loading) {
    return (
      <div className="model-info-container">
        <div className="loading">Loading model information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="model-info-container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="model-info-container">
      <div className="model-info-card">
        <h1>Current AI Model Information</h1>

        <div className="info-section">
          <h2>Active Model</h2>
          <div className="info-row">
            <span className="label">Model Name:</span>
            <span className="value">{modelInfo?.name}</span>
          </div>
          <div className="info-row">
            <span className="label">Model ID:</span>
            <span className="value code">{modelInfo?.modelId}</span>
          </div>
          <div className="info-row">
            <span className="label">Provider:</span>
            <span className="value">{modelInfo?.provider}</span>
          </div>
          <div className="info-row">
            <span className="label">Knowledge Cutoff:</span>
            <span className="value">{modelInfo?.knowledgeCutoff}</span>
          </div>
        </div>

        <div className="info-section latest">
          <h2>Latest Available Model</h2>
          <div className="info-row">
            <span className="label">Model Name:</span>
            <span className="value">{modelInfo?.latestModel}</span>
          </div>
          <div className="info-row">
            <span className="label">Model ID:</span>
            <span className="value code">{modelInfo?.latestModelId}</span>
          </div>
        </div>

        <div className="info-section metadata">
          <div className="info-row">
            <span className="label">Last Updated:</span>
            <span className="value">{new Date(modelInfo?.timestamp).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelInfo;
