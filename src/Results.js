import './App.css';
import { useCallback, useMemo, useEffect, useState } from 'react';
import Particles from 'react-tsparticles';
import { loadStarsPreset } from 'tsparticles-preset-stars';
import axios from 'axios';

function Results({ jobId }) {
  const [figures, setFigures] = useState(null);
  const [artifacts, setArtifacts] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiBaseUrl = 'https://server.exocal.earth';

  /**
   * Parses CSV text data into an array of objects
   * Handles numeric field conversion and error cases
   * @param {string} csvText - Raw CSV text from API
   * @returns {Array} Array of parsed row objects
   */
  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      
      headers.forEach((header, index) => {
        let value = values[index] || '';
        
        // Convert numeric fields
        if (['prob', 'label', 'P_days', 'Dur_hr', 'Rp_Re', 'Teff_K', 'Depth_ppm', 'Rstar_Rsun'].includes(header)) {
          const numValue = parseFloat(value);
          row[header] = isNaN(numValue) ? 0 : numValue;
        } else {
          row[header] = value;
        }
      });
      
      rows.push(row);
    }
    
    return rows;
  };

  // Fetch figures and artifacts when component mounts
  useEffect(() => {
    if (!jobId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [figsResponse, artifactsResponse, candidatesResponse] = await Promise.all([
          axios.get(`${apiBaseUrl}/api/jobs/${jobId}/figs`),
          axios.get(`${apiBaseUrl}/api/jobs/${jobId}/artifacts`),
          axios.get(`${apiBaseUrl}/api/jobs/${jobId}/top-candidates.csv`)
        ]);
        
        setFigures(figsResponse.data);
        setArtifacts(artifactsResponse.data);
        
        // Parse CSV data
        const csvData = candidatesResponse.data;
        const parsedCandidates = parseCSV(csvData);
        setCandidates(parsedCandidates);
      } catch (err) {
        setError('Failed to load results data');
        console.error('Error fetching results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId, apiBaseUrl]);

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

  // Download ZIP function
  const handleDownloadZip = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/api/jobs/${jobId}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exocal_results_${jobId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download results');
    }
  };

  // Helper function to get all image URLs from figures data
  const getAllImageUrls = () => {
    if (!figures?.datasets) return [];
    
    const urls = [];
    Object.entries(figures.datasets).forEach(([dataset, data]) => {
      if (data.summary) {
        urls.push(...data.summary.map(url => ({ url, dataset, type: 'summary' })));
      }
      // Exclude target images - only show summary images
    });
    return urls;
  };

  return (
    <div className="App">
      <div aria-hidden style={bgLayerStyle} />
      <Particles id="tsparticles" init={particlesInit} options={particlesOptions} />
      <header className="App-header">
        <h1 className="app-description" style={{ marginTop: 0, marginBottom: 25 }}>ExoCAL</h1>
        {/* <h2 style={{ marginTop: 0, marginBottom: 20 }}>Analysis Complete!</h2> */}
        {/* <p style={{ marginTop: 0, marginBottom: 30, textAlign: 'center', maxWidth: 600 }}>
          Your exoplanet candidate analysis has been completed and downloaded successfully. 
          The results contain the processed data from your uploaded CSV files.
        </p>
         */}
         <button className="primary-button" onClick={handleDownloadZip}>
          Download Results
         </button>
        {/* Display images from API response */}
        {jobId && (
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>Analysis Results</h3>
            <p style={{ marginBottom: 20, fontSize: 14, opacity: 0.8 }}>
              Job ID: {jobId}
            </p>
            
            {loading && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                <p style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>Loading analysis results...</p>
                <p style={{ marginTop: 5, fontSize: 12, opacity: 0.6 }}>This may take a few moments</p>
              </div>
            )}
            
            {error && (
              <div style={{ textAlign: 'center', marginBottom: 20, color: '#ffb3b3' }}>
                {error}
              </div>
            )}
            
            {candidates && !loading && (
              <div style={{ marginBottom: 30 }}>
                <h4 style={{ marginBottom: 15, fontSize: 16 }}>Top Candidates Results</h4>
                {candidates.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#ffffff', 
                    opacity: 0.7,
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    No candidate data found for this analysis.
                  </div>
                ) : (
                <div style={{ 
                  maxWidth: '100%',
                  maxHeight: '500px',
                  margin: '0 auto',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  overflow: 'auto',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}>
                  <table style={{ 
                    width: '100%',
                    borderCollapse: 'collapse',
                    color: '#ffffff',
                    fontSize: '12px',
                    minWidth: '800px'
                  }}>
                    <thead>
                      <tr style={{ 
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.3)'
                      }}>
                        <th style={{ 
                          padding: '8px 12px', 
                          textAlign: 'left',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'sticky',
                          top: 0,
                          background: 'rgba(40, 40, 40, 0.75)',
                          color: '#ffffff'
                        }}>
                          Dataset
                        </th>
                        <th style={{ 
                          padding: '8px 12px', 
                          textAlign: 'left',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'sticky',
                          top: 0,
                          background: 'rgba(40, 40, 40, 0.75)',
                          color: '#ffffff'
                        }}>
                          Designation
                        </th>
                        <th style={{ 
                          padding: '8px 12px', 
                          textAlign: 'center',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'sticky',
                          top: 0,
                          background: 'rgba(40, 40, 40, 0.75)',
                          color: '#ffffff'
                        }}>
                          Prob
                        </th>
                        <th style={{ 
                          padding: '8px 12px', 
                          textAlign: 'center',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'sticky',
                          top: 0,
                          background: 'rgba(40, 40, 40, 0.75)',
                          color: '#ffffff'
                        }}>
                          Label
                        </th>
                        <th style={{ 
                          padding: '8px 12px', 
                          textAlign: 'right',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'sticky',
                          top: 0,
                          background: 'rgba(40, 40, 40, 0.75)',
                          color: '#ffffff'
                        }}>
                          P (days)
                        </th>
                        <th style={{ 
                          padding: '8px 12px', 
                          textAlign: 'right',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'sticky',
                          top: 0,
                          background: 'rgba(40, 40, 40, 0.75)',
                          color: '#ffffff'
                        }}>
                          Dur (hr)
                        </th>
                        <th style={{ 
                          padding: '8px 12px', 
                          textAlign: 'right',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'sticky',
                          top: 0,
                          background: 'rgba(40, 40, 40, 0.75)',
                          color: '#ffffff'
                        }}>
                          Rp/Re
                        </th>
                        <th style={{ 
                          padding: '8px 12px', 
                          textAlign: 'right',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'sticky',
                          top: 0,
                          background: 'rgba(40, 40, 40, 0.75)',
                          color: '#ffffff'
                        }}>
                          Teff (K)
                        </th>
                        <th style={{ 
                          padding: '8px 12px', 
                          textAlign: 'right',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'sticky',
                          top: 0,
                          background: 'rgba(40, 40, 40, 0.75)',
                          color: '#ffffff'
                        }}>
                          Depth (ppm)
                        </th>
                        <th style={{ 
                          padding: '8px 12px', 
                          textAlign: 'right',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'sticky',
                          top: 0,
                          background: 'rgba(40, 40, 40, 0.75)',
                          color: '#ffffff'
                        }}>
                          Rstar/Rsun
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((row, index) => {
                        const isConfirmed = row.prob === 1;
                        return (
                        <tr key={index} style={{ 
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          background: isConfirmed 
                            ? 'rgba(43, 220, 118, 0.2)' 
                            : index % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                          borderLeft: isConfirmed ? '4px solid #2bdc76' : 'none'
                        }}>
                          <td style={{ 
                            padding: '8px 12px',
                            color: '#61dafb',
                            fontWeight: 'bold'
                          }}>
                            {row.dataset || 'Unknown'}
                          </td>
                          <td style={{ 
                            padding: '8px 12px',
                            fontFamily: 'monospace',
                            fontSize: '11px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{row.designation || row.target || 'N/A'}</span>
                              {isConfirmed && (
                                <span style={{
                                  background: '#2bdc76',
                                  color: '#000000',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '9px',
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  Confirmed
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ 
                            padding: '8px 12px',
                            textAlign: 'center',
                            color: '#2bdc76'
                          }}>
                            {row.prob || 0}
                          </td>
                          <td style={{ 
                            padding: '8px 12px',
                            textAlign: 'center',
                            color: '#2bdc76'
                          }}>
                            {row.label || 0}
                          </td>
                          <td style={{ 
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontFamily: 'monospace'
                          }}>
                            {row.P_days ? row.P_days.toFixed(2) : 'N/A'}
                          </td>
                          <td style={{ 
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontFamily: 'monospace'
                          }}>
                            {row.Dur_hr ? row.Dur_hr.toFixed(2) : 'N/A'}
                          </td>
                          <td style={{ 
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontFamily: 'monospace'
                          }}>
                            {row.Rp_Re ? row.Rp_Re.toFixed(2) : 'N/A'}
                          </td>
                          <td style={{ 
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontFamily: 'monospace'
                          }}>
                            {row.Teff_K ? row.Teff_K.toLocaleString() : 'N/A'}
                          </td>
                          <td style={{ 
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontFamily: 'monospace'
                          }}>
                            {row.Depth_ppm ? row.Depth_ppm.toFixed(1) : 'N/A'}
                          </td>
                          <td style={{ 
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontFamily: 'monospace'
                          }}>
                            {row.Rstar_Rsun ? row.Rstar_Rsun.toFixed(3) : 'N/A'}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            )}
            
            {figures && !loading && (
              <div style={{ marginBottom: 30 }}>
                <h4 style={{ marginBottom: 15, fontSize: 16 }}>Generated Figures</h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 20, 
                  maxWidth: 1000, 
                  margin: '0 auto' 
                }}>
                  {getAllImageUrls().map((imageData, index) => (
                    <div key={index} style={{ 
                      background: 'rgba(255, 255, 255, 0.1)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px'
                    }}>
                        <img 
                          src={`${apiBaseUrl}${imageData.url}`}
                          alt={`${imageData.dataset} ${imageData.type}`}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '100%', 
                          objectFit: 'contain' 
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                        loading="lazy"
                      />
                      <div style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'none',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '12px',
                        textAlign: 'center',
                        padding: '8px'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          {imageData.dataset}
                        </div>
                        <div style={{ fontSize: '10px', opacity: 0.8 }}>
                          {imageData.type}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            </div>
        )}
        
        <div style={{ display: 'flex', gap: 20, marginTop: 20, marginBottom: 50 }}>
          <button 
            className="primary-button" 
            onClick={() => window.location.reload()}
          >
            Run New Analysis
          </button>
          <button 
            className="primary-button" 
            onClick={() => window.open('https://github.com/upmanyu9101/ExoCAL', '_blank')}
          >
            GitHub Repository &gt;
          </button>
        </div>
      </header>
    </div>
  );
}

export default Results;
