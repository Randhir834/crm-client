import React, { useState, useEffect } from 'react';
import './CallNotification.css';

const CallNotification = ({ call, onClose, onDismiss }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Handle both string and Date object formats
      let callDate;
      if (typeof call.scheduledDate === 'string') {
        callDate = new Date(call.scheduledDate);
      } else {
        callDate = new Date(call.scheduledDate);
      }
      
      // Create the full datetime by combining date and time
      const [hours, minutes] = call.scheduledTime.split(':');
      callDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const now = new Date();
      const diff = callDate.getTime() - now.getTime();
      return Math.max(0, Math.floor(diff / 1000)); // Return seconds remaining
    };

    // Update time left every second
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      // Auto-close notification when call time is reached
      if (remaining <= 0) {
        onClose();
      }
    }, 1000);

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [call, onClose]);

  const formatTime = (date, time) => {
    // Handle both string and Date object formats
    let dateObj;
    if (typeof date === 'string') {
      dateObj = new Date(date + 'T' + time);
    } else {
      dateObj = new Date(date);
      const [hours, minutes] = time.split(':');
      dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    return dateObj.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCountdown = (seconds) => {
    if (seconds <= 0) return 'Call starting now!';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="call-notification-overlay">
      <div className="call-notification">
        <div className="call-notification-header">
          <div className="call-notification-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
          </div>
          <button className="call-notification-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="call-notification-content">
          <h3>📞 You have a scheduled call with {call.leadId.name}</h3>
          <div className="countdown-timer">
            <span className="countdown-label">Time until call:</span>
            <span className="countdown-time">{formatCountdown(timeLeft)}</span>
          </div>
          <div className="call-details">
            <div className="call-lead">
              <strong>Lead:</strong> {call.leadId.name}
            </div>
            <div className="call-time">
              <strong>Scheduled Time:</strong> {formatTime(call.scheduledDate, call.scheduledTime)}
            </div>
            <div className="call-duration">
              <strong>Duration:</strong> {call.duration} minutes
            </div>
          </div>
        </div>
        
        <div className="call-notification-actions">
          <button className="btn-secondary" onClick={onDismiss}>
            Dismiss
          </button>
          <button className="btn-primary" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallNotification;