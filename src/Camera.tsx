import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Assuming you are using react-router
import './Camera.css';
import Footer from './Footer.tsx';
import Header from './Header.tsx'

interface DetectedItem {
  snapshot: string;
  category: string;
}

const Camera = () => {
  const [streamUrl, setStreamUrl] = useState('');
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [showOverlay, setShowOverlay] = useState(true);
  const [classificationDetected, setClassificationDetected] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate(); // For navigation

  useEffect(() => {
    const videoFeedUrl = `http://${process.env.REACT_APP_ENDPOINT}:${process.env.REACT_APP_PORT}/api/videoclassifier/video_feed/`;
    setStreamUrl(videoFeedUrl);
  }, []);

  const handleAddItem = async () => {
    try {
      const response = await fetch(`http://${process.env.REACT_APP_ENDPOINT}:${process.env.REACT_APP_PORT}/api/videoclassifier/capture_and_classify_frame/`, {
        method: 'POST',
      });
  
      if (!response.ok) {
        throw new Error('Failed to capture and classify frame');
      }

      const data = await response.json();
      console.log('Backend response:', data); // Log the response to debug

      // Check if any valid classification (bounding box) is detected
      const { classifications } = data;
      if (classifications && (classifications.recyclable > 0 || classifications.ewaste > 0 || classifications.organic > 0)) {
        const snapshotUrl = `http://${process.env.REACT_APP_ENDPOINT}:${process.env.REACT_APP_PORT}${data.processed_file_url}`;

        const newItem: DetectedItem = {
          snapshot: snapshotUrl,
          category: data.detected_categories,  // Use backend-detected categories
        };

        setDetectedItems((prevItems) => [...prevItems, newItem]);
        setClassificationDetected(true);  // Valid classification found
        setErrorMessage(null);  // Clear any previous error messages
      } else {
        // No valid classification found, show error message
        setClassificationDetected(false);
        setErrorMessage('No valid waste classification detected. Please try again.');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      setErrorMessage('Failed to capture and classify frame. Please try again.');
    }
  };

  // Function to open the modal with the clicked image
  const openModal = (imageUrl: string) => {
    setModalImageUrl(imageUrl);
    setIsModalOpen(true);
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setModalImageUrl('');
  };

  const handleDoneAdding = () => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Function to dismiss the overlay
  const handleOverlayDismiss = () => {
    setShowOverlay(false);  // Hide the overlay
  };

  // Check if "Ewaste" or "recyclable" exists in the detected items
  const hasRecyclableOrEwaste = detectedItems.some(item => item.category === 'Ewaste' || item.category === 'Recyclable');
  const hasOrganic = detectedItems.some(item => item.category === 'Organic');

  return (
    <> <Header />
    <div className="camera-page">
      {/* Overlay with instructions */}
      {showOverlay && (
        <div className="overlay">
          <div className="overlay-content">
            <h2 style={{ color: "red" }}>(This feature is temporarily disabled)</h2>
            <h2>Welcome to Live Waste Classification </h2>
            <p>Instructions:</p>
            <ul>
              <li>Click "Add" to classify the waste item.</li>
              <li>View the classified items in the table below.</li>
              <li>You can click on the Snapshot column of the table to expand the image.</li>
            </ul>
            <button className="understand-button" onClick={handleOverlayDismiss}>I Understand</button>
          </div>
        </div>
      )}

      <div className="camera-container">
        <h1 className="camera-title">Live Waste Classification</h1>
        <div className="video-wrapper">
          {streamUrl ? (
            <img src={streamUrl} alt="Live Waste Classification" className="live-stream" />
          ) : (
            <p className="loading-text">Loading live stream...</p>
          )}
        </div>

        {/* Error message if no classification detected */}
        {!classificationDetected && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}

        {/* Add item directly */}
        <div className="add-item-section">
          <button onClick={handleAddItem} className="add-button">Add to Table</button>
        </div>

        {detectedItems.length > 0 && (
          <button onClick={handleDoneAdding} className="done-button">
            Done Adding
          </button>
        )}
      </div>

      <div ref={tableRef} className="table-section">
        {detectedItems.length > 0 && (
          <div className="items-table">
            <h2>Added Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Snapshot</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {detectedItems.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <img 
                        src={item.snapshot} 
                        alt="Snapshot" 
                        className="snapshot-img" 
                        onClick={() => openModal(item.snapshot)}  // Open modal on image click
                        style={{ cursor: 'pointer' }}  // Make it clear the image is clickable
                      />
                    </td>
                    <td>{item.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* If Ewaste or recyclable exists in the table */}
        {hasRecyclableOrEwaste && (
          <div className="info-section">
            <p>Looks like you have Ewaste or recyclable items. You can find nearby recycling centers.</p>
            <button className="navigate-button" onClick={() => navigate('/MapPage')}>Find Recycling Centers</button>
          </div>
        )}

        {/* If organic waste exists in the table */}
        {hasOrganic && (
          <div className="info-section">
            <p>Looks like you have organic waste. Here are some tips for composting.</p>
            <button className="navigate-button" onClick={() => navigate('/CompostingTips')}>Go to Composting Tips</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-button" onClick={closeModal}>&times;</span>
            <img src={modalImageUrl} alt="Full-size snapshot" className="modal-image" />
          </div>
        </div>
      )}
    </div>
    <Footer />
    </>
  );
};

export default Camera;
