import './App.css';
import axios from 'axios';
import Results from './Results';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Particles from 'react-tsparticles';
import { loadStarsPreset } from 'tsparticles-preset-stars';

function App() {
  const [isModalMounted, setIsModalMounted] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [koiFile, setKoiFile] = useState(null);
  const [toiFile, setToiFile] = useState(null);
  const [k2File, setK2File] = useState(null);
  const [useDemoKoi, setUseDemoKoi] = useState(false);
  const [useDemoToi, setUseDemoToi] = useState(false);
  const [useDemoK2, setUseDemoK2] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [shakeSubmit, setShakeSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [targetLimits, setTargetLimits] = useState(50);
  const [seed, setSeed] = useState(7);
  const [showResults, setShowResults] = useState(false);
  const hideTimerRef = useRef(null);


  const particlesInit = useCallback(async (engine) => {
    await loadStarsPreset(engine);
  }, []);

  const particlesOptions = useMemo(() => ({
    preset: 'stars',
    background: { color: 'transparent' },
    fullScreen: { enable: true, zIndex: 0 },
    particles: {
      move: {
        speed: 2
      }
    }
  }), []);

  const bgLayerStyle = useMemo(() => {
    const publicUrl = process.env.PUBLIC_URL || '';
    const bgUrl = `${publicUrl}/bg.jpg`;
    return {
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundImage: `url(${bgUrl})`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      zIndex: -1
    };
  }, []);

  const apiUrl = useMemo(() => {
    const base = 'http://ec2-54-151-59-221.us-west-1.compute.amazonaws.com:8000';
    return `${base}/api/upload`;
  }, []);

  // Health check test on component mount
  useEffect(() => {
    const testBackendConnection = async () => {
      const baseUrl = 'http://ec2-54-151-59-221.us-west-1.compute.amazonaws.com:8000';
      const healthUrl = `${baseUrl}/health`;
      
      console.log('🔍 Testing backend connection...');
      console.log('📍 Health check URL:', healthUrl);
      console.log('🌐 API Base URL:', baseUrl);
      
      try {
        const response = await axios.get(healthUrl, { timeout: 5000 });
        console.log('✅ Backend health check SUCCESS:', response.data);
        console.log('📊 Response status:', response.status);
        console.log('📋 Response headers:', response.headers);
      } catch (error) {
        console.error('❌ Backend health check FAILED:');
        console.error('🚨 Error message:', error.message);
        console.error('📊 Error status:', error.response?.status);
        console.error('📋 Error data:', error.response?.data);
        console.error('🔗 Requested URL:', healthUrl);
        console.error('⏱️ Timeout:', error.code === 'ECONNABORTED' ? 'Request timed out' : 'No timeout');
        
        if (error.code === 'ECONNREFUSED') {
          console.error('🔌 Connection refused - Backend server is not running on port 8000');
        } else if (error.code === 'ECONNABORTED') {
          console.error('⏰ Request timeout - Backend is not responding');
        } else if (error.response?.status === 404) {
          console.error('🔍 404 Not Found - Health endpoint not found');
        } else if (error.response?.status >= 500) {
          console.error('💥 Server Error - Backend has internal issues');
        }
      }
    };

    // Run health check after a short delay
    setTimeout(testBackendConnection, 2000);
  }, []);

  // Removed legacy CSV upload handlers

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function openModal() {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsModalMounted(true);
    requestAnimationFrame(() => setIsModalVisible(true));
  }

  /**
   * Closes the modal with fade-out animation
   * Resets form state and clears any pending timers
   */
  function closeModal() {
    setIsModalVisible(false);
    setShowErrors(false);
    setSubmitError('');
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setIsModalMounted(false);
      hideTimerRef.current = null;
    }, 260); // keep in sync with CSS transition durations
  }

  function makeFileChangeHandler(setter) {
    return function onChange(event) {
      const file = event.target.files && event.target.files[0];
      setter(file || null);
      if (file) {
        setShowErrors(false);
      }
    };
  }

  /**
   * Handles the submission of files and demo data to the API
   * Validates input, creates FormData, and manages the polling process
   */
  async function handleSubmitClick() {
    const hasAny = !!(koiFile || toiFile || k2File || useDemoKoi || useDemoToi || useDemoK2);
    if (!hasAny) {
      setShowErrors(true);
      setShakeSubmit(true);
      setTimeout(() => setShakeSubmit(false), 450);
      return;
    }
    setShowErrors(false);
    setSubmitError('');
    setProgress(null); // Reset progress from previous run
    const formData = new FormData();
    if (koiFile) formData.append('koi', koiFile);
    if (toiFile) formData.append('toi', toiFile);
    if (k2File) formData.append('k2', k2File);
    
    // Add demo data flags
    if (useDemoKoi) formData.append('use_demo_koi', 'true');
    if (useDemoToi) formData.append('use_demo_toi', 'true');
    if (useDemoK2) formData.append('use_demo_k2', 'true');
    
    // Add query parameters to URL
    const urlWithParams = `${apiUrl}?limit_targets=${targetLimits}&seed=${seed}`;
    
    setIsSubmitting(true);
    try {
      const res = await axios.post(urlWithParams, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { job_id, status_url, download_url } = res.data;
      
      // Add base URL to relative URLs
      const baseUrl = 'http://ec2-54-151-59-221.us-west-1.compute.amazonaws.com:8000';
      const fullStatusUrl = status_url.startsWith('http') ? status_url : `${baseUrl}${status_url}`;
      const fullDownloadUrl = download_url.startsWith('http') ? download_url : `${baseUrl}${download_url}`;
      
      setJobData({ job_id, status_url: fullStatusUrl, download_url: fullDownloadUrl });
      setIsLoading(true);
    
      let interval = 200;
      let cancelled = false;
    
        async function poll() {
          if (cancelled) return;
            try {
              const { data: s } = await axios.get(fullStatusUrl);
            
            // Update progress if available
            if (s.progress) {
              setProgress(s.progress);
            }
            
          if (s.state === 'done') {
            // Download with custom filename
            try {
              const response = await axios.get(fullDownloadUrl, { responseType: 'blob' });
              const blob = new Blob([response.data]);
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `results.zip`; // Custom filename
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (downloadError) {
              console.error('Download failed:', downloadError);
              // Fallback to direct download
              window.location.href = fullDownloadUrl;
            }
            setIsLoading(false);
            closeModal();
            setShowResults(true); // Show results page
          } else if (s.state === 'error') {
            setSubmitError(s.error || 'Analysis failed');
            setIsLoading(false);
          } else {
            setTimeout(poll, interval);
          }
        } catch (e) {
          setSubmitError('Failed to check job status');
          setIsLoading(false);
        }
      }
    
      poll();
    
      // optional: cancel polling on unmount
      return () => { cancelled = true; };
    } catch (err) {
      let errorMessage = 'Something went wrong while sending files.';
      
      if (err?.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please check your server configuration.';
      } else if (err?.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (err?.response?.status === 0 || err?.code === 'NETWORK_ERROR') {
        errorMessage = 'Cannot connect to server. Please check your connection and server status.';
      } else if (err?.response?.data) {
        // Handle HTML error responses
        if (typeof err.response.data === 'string' && err.response.data.includes('<html>')) {
          errorMessage = 'Server returned an error. Please check your API endpoint.';
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show results page if analysis is complete
  if (showResults) {
    return <Results jobId={jobData?.job_id} />;
  }

  return (
    <div className="App">
      <div aria-hidden style={bgLayerStyle} />
      <Particles id="tsparticles" init={particlesInit} options={particlesOptions} />
      <header className="App-header">
        <img src={(process.env.PUBLIC_URL || '') + '/logo.png'} className="App-logo" alt="logo" />
        <h1 className="app-description" style={{ marginTop: 0, marginBottom:25 }}>ExoCAL</h1>
        <p className="app-description" style={{ marginTop: 0, marginBottom: 30 }}>Exoplanet Candidate Assessment and Labelling</p>
        <button type="button" className="primary-button" onClick={openModal}>Begin Program</button>
      </header>
      {isModalMounted && !isLoading && (
        <div className={`modal-backdrop${isModalVisible ? ' show' : ''}`} role="dialog" aria-modal="true" onClick={closeModal}>
          <div className={`modal-card${isModalVisible ? ' show' : ''}`} onClick={(e) => e.stopPropagation()}>
            <h2>Upload Data Files (.csv)</h2>
            <div className="modal-grid">
              <div className={`file-card${koiFile || useDemoKoi ? ' selected' : ''}${showErrors && !koiFile && !useDemoKoi ? ' error' : ''}`}>
                <input id="koiInput" className="hidden-input" type="file" accept=".csv,text/csv" onChange={makeFileChangeHandler(setKoiFile)} />
                {(koiFile || useDemoKoi) && (
                  <button type="button" className="clear-btn" onClick={() => { setKoiFile(null); setUseDemoKoi(false); }} aria-label="Remove KOI file">×</button>
                )}
                <button className="primary-button file-trigger" onClick={() => document.getElementById('koiInput').click()}>
                  <div>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>KOI</div>
                    <small>Kepler's Object of Interest</small>
                    <div style={{ marginTop: 8, fontSize: 11, opacity: 0.8, fontWeight: 'bold' }}>Upload CSV</div>
                  </div>
                </button>
                <div style={{ 
                  marginTop: 12, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <input
                    type="checkbox"
                    id="demoKoi"
                    checked={useDemoKoi}
                    onChange={(e) => {
                      setUseDemoKoi(e.target.checked);
                      if (e.target.checked) setKoiFile(null);
                    }}
                    style={{ 
                      marginRight: 8,
                      transform: 'scale(1.2)'
                    }}
                  />
                  <label htmlFor="demoKoi" style={{ 
                    fontSize: 12, 
                    color: '#ffffff',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontWeight: '500'
                  }}>Use Demo Data</label>
                </div>
              </div>
              <div className={`file-card${toiFile || useDemoToi ? ' selected' : ''}${showErrors && !toiFile && !useDemoToi ? ' error' : ''}`}>
                <input id="toiInput" className="hidden-input" type="file" accept=".csv,text/csv" onChange={makeFileChangeHandler(setToiFile)} />
                {(toiFile || useDemoToi) && (
                  <button type="button" className="clear-btn" onClick={() => { setToiFile(null); setUseDemoToi(false); }} aria-label="Remove TOI file">×</button>
                )}
                <button className="primary-button file-trigger" onClick={() => document.getElementById('toiInput').click()}>
                  <div>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>TOI</div>
                    <small>TESS Object of Interest</small>
                    <div style={{ marginTop: 8, fontSize: 11, opacity: 0.8, fontWeight: 'bold' }}>Upload CSV</div>
                  </div>
                </button>
                <div style={{ 
                  marginTop: 12, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <input
                    type="checkbox"
                    id="demoToi"
                    checked={useDemoToi}
                    onChange={(e) => {
                      setUseDemoToi(e.target.checked);
                      if (e.target.checked) setToiFile(null);
                    }}
                    style={{ 
                      marginRight: 8,
                      transform: 'scale(1.2)'
                    }}
                  />
                  <label htmlFor="demoToi" style={{ 
                    fontSize: 12, 
                    color: '#ffffff',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontWeight: '500'
                  }}>Use Demo Data</label>
                </div>
              </div>
              <div className={`file-card${k2File || useDemoK2 ? ' selected' : ''}${showErrors && !k2File && !useDemoK2 ? ' error' : ''}`}>
                <input id="k2Input" className="hidden-input" type="file" accept=".csv,text/csv" onChange={makeFileChangeHandler(setK2File)} />
                {(k2File || useDemoK2) && (
                  <button type="button" className="clear-btn" onClick={() => { setK2File(null); setUseDemoK2(false); }} aria-label="Remove K2 file">×</button>
                )}
                <button className="primary-button file-trigger" onClick={() => document.getElementById('k2Input').click()}>
                  <div>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>K2</div>
                    <small>Kepler's <br/> Second Mission <br/> (Reborn Kepler)</small>
                    <div style={{ marginTop: 8, fontSize: 11, opacity: 0.8, fontWeight: 'bold' }}>Upload CSV</div>
                  </div>
                </button>
                <div style={{ 
                  marginTop: 12, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <input
                    type="checkbox"
                    id="demoK2"
                    checked={useDemoK2}
                    onChange={(e) => {
                      setUseDemoK2(e.target.checked);
                      if (e.target.checked) setK2File(null);
                    }}
                    style={{ 
                      marginRight: 8,
                      transform: 'scale(1.2)'
                    }}
                  />
                  <label htmlFor="demoK2" style={{ 
                    fontSize: 12, 
                    color: '#ffffff',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontWeight: '500'
                  }}>Use Demo Data</label>
                </div>
              </div>
            </div>
            
            {/* Configuration Options */}
            <div style={{ marginTop: 20, marginBottom: 16, display: 'flex', gap: 20, justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label htmlFor="targetLimits" style={{ fontSize: 14, marginBottom: 6 }}>Target Limits</label>
                <input
                  id="targetLimits"
                  type="number"
                  min="1"
                  max="1000"
                  value={targetLimits}
                  onChange={(e) => setTargetLimits(parseInt(e.target.value) || 50)}
                  style={{
                    width: 80,
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    textAlign: 'center',
                    fontFamily: 'Orbitron, sans-serif'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label htmlFor="seed" style={{ fontSize: 14, marginBottom: 6 }}>Seed</label>
                <input
                  id="seed"
                  type="number"
                  min="1"
                  max="100"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || 8)}
                  style={{
                    width: 80,
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    textAlign: 'center',
                    fontFamily: 'Orbitron, sans-serif'
                  }}
                />
              </div>
            </div>
            
            {showErrors && (
              <div className="error-text">Please upload at least one CSV file (KOI, TOI, or K2).</div>
            )}
            {submitError && (
              <div className="error-text">{submitError}</div>
            )}
            <div className="modal-actions">
              <button className={`primary-button submit-button${shakeSubmit ? ' shake' : ''}`} disabled={isSubmitting} onClick={handleSubmitClick}>{isSubmitting ? 'Submitting…' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="modal-backdrop show" role="dialog" aria-modal="true">
          <div className="modal-card show">
            <h2>Processing Your Data</h2>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div className="loading-spinner"></div>
              <p style={{ marginTop: 20, fontSize: 16, fontWeight: 'bold', color: '#ffffff' }}>Please wait...</p>
              <p style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>Analyzing exoplanet candidates...</p>
              
              {progress && (
                <div style={{ marginTop: 20, width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>{progress.dataset}</span>
                    <span style={{ fontSize: 14 }}>{progress.percent.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progress.percent}%` }}
                    ></div>
                  </div>
                  <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                    {progress.message}
                  </p>
                  {progress.last_target && (
                    <p style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>
                      Last target: {progress.last_target}
                    </p>
                  )}
                </div>
              )}
              
              {!progress && (
                <p style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>Initializing analysis...</p>
              )}
              
              {jobData && (
                <p style={{ marginTop: 12, fontSize: 12, opacity: 0.6, fontFamily: 'monospace' }}>
                  Job ID: {jobData.job_id}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
