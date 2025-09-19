import React, { useState, useEffect, useRef, useCallback } from 'react';
import AudioManager from './AudioManager';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Radio,
  RadioIcon,
  Waves,
  AlertCircle,
  Settings
} from 'lucide-react';

const AudioControl = ({ 
  role = 'student', 
  roomId, 
  onStateChange,
  serverUrl = process.env.NEXT_PUBLIC_WEBRTC_SERVER_URL || 'http://localhost:3001',
  className = ''
}) => {
  const [audioState, setAudioState] = useState({
    isConnected: false,
    isProducing: false,
    isMuted: false,
    isRemoteMuted: false,
    audioLevel: 0,
    remoteAudioLevel: 0,
    state: 'disconnected'
  });
  
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const audioManager = useRef(null);
  const animationRef = useRef(null);

  // Initialize audio manager with better error handling
  useEffect(() => {
    try {
      audioManager.current = new AudioManager({
        serverUrl,
        onStateChange: (state) => {
          console.log('AudioControl: State changed:', state);
          setAudioState(prev => ({ ...prev, ...state }));
          onStateChange?.(state);
        },
        onError: (error) => {
          console.error('[AudioControl] Error:', error);
          setError(error);
          setIsConnecting(false);
        },
        onLog: (message) => {
          console.log('[AudioControl] Log:', message);
          setLogs(prev => [...prev.slice(-9), { 
            message, 
            timestamp: new Date().toLocaleTimeString() 
          }]);
        }
      });
    } catch (err) {
      console.error('Failed to initialize AudioManager:', err);
      setError('Failed to initialize audio system');
    }

    return () => {
      if (audioManager.current) {
        try {
          audioManager.current.destroy();
        } catch (err) {
          console.error('Error destroying AudioManager:', err);
        }
      }
    };
  }, [serverUrl]); // Removed onStateChange to prevent recreation

  // Auto-connect when room ID is provided (with longer debounce and better error handling)
  useEffect(() => {
    console.log('AudioControl useEffect triggered:', { 
      roomId, 
      hasAudioManager: !!audioManager.current, 
      isConnected: audioState.isConnected, 
      isConnecting,
      serverUrl 
    });
    
    if (roomId && roomId !== 'undefined' && roomId.trim() && audioManager.current && !audioState.isConnected && !isConnecting) {
      const timeoutId = setTimeout(() => {
        console.log('Auto-connecting to audio room:', roomId, 'as', role);
        handleConnect();
      }, 3000); // Increased debounce to give server more time to fully start
      
      return () => clearTimeout(timeoutId);
    } else if (!roomId || roomId === 'undefined' || !roomId.trim()) {
      console.warn('AudioControl: Invalid room ID provided:', roomId);
    } else if (!audioManager.current) {
      console.warn('AudioControl: AudioManager not initialized yet');
    } else if (audioState.isConnected) {
      console.log('AudioControl: Already connected, skipping auto-connect');
    } else if (isConnecting) {
      console.log('AudioControl: Connection already in progress');
    }
  }, [roomId, audioState.isConnected, isConnecting, role, serverUrl]);

  const handleConnect = useCallback(async () => {
    if (!audioManager.current || !roomId || isConnecting) return;
    
    // Validate room ID
    if (!roomId || roomId === 'undefined' || !roomId.trim()) {
      setError('Invalid room ID. Cannot connect to audio server.');
      console.error('AudioControl: Attempted to connect with invalid room ID:', roomId);
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log('Attempting to connect to audio room:', roomId, 'as', role, 'to server:', serverUrl);
      
      // Test server connectivity first
      try {
        const response = await fetch(`${serverUrl}/health`);
        if (!response.ok) {
          throw new Error(`Server health check failed: ${response.status}`);
        }
        console.log('Server health check passed');
      } catch (healthErr) {
        console.error('Server health check failed:', healthErr);
        setError('Audio server is not responding. Please check if the server is running on port 3001.');
        return;
      }
      
      const success = await audioManager.current.connect(roomId, role);
      if (!success) {
        setError('Failed to connect to audio server. The server may be overloaded or the room may be full.');
      } else {
        console.log('Successfully connected to audio server');
      }
    } catch (err) {
      console.error('Connection error:', err);
      if (err.message.includes('websocket error') || err.message.includes('Connection timeout')) {
        setError('WebSocket connection failed. Please check your network connection and try again.');
      } else {
        setError(`Connection failed: ${err.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [roomId, role, isConnecting, serverUrl]);

  const handleDisconnect = useCallback(async () => {
    if (!audioManager.current) return;
    
    try {
      await audioManager.current.disconnect();
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(`Disconnect failed: ${err.message}`);
    }
  }, []);

  const handleStartAudio = useCallback(async () => {
    if (!audioManager.current) return;
    
    setError(null);
    
    try {
      console.log('Checking microphone permissions...');
      
      // Check permissions first with improved logic
      const permission = await audioManager.current.checkMicrophonePermissions();
      console.log('Permission check result:', permission);
      
      // Only block if we're absolutely certain access is denied
      if (permission.state === 'denied' && permission.method === 'getUserMedia-test') {
        setError('Microphone access denied. Please click the microphone icon in your browser\'s address bar and allow access, then try again.');
        return;
      } else if (permission.state === 'no-device') {
        setError('No microphone found. Please connect a microphone and try again.');
        return;
      } else if (permission.state === 'granted') {
        console.log('Microphone permissions confirmed granted via', permission.method);
      } else {
        // For unknown states or other issues, we'll try to start anyway
        console.log('Permission state uncertain, attempting to start audio anyway:', permission);
      }
      
      // Log detailed connection status
      const connectionStatus = audioManager.current.getConnectionStatus();
      console.log('Connection status before starting audio:', connectionStatus);
      
      console.log('Starting audio...');
      const success = await audioManager.current.startAudio();
      if (!success) {
        const statusAfter = audioManager.current.getConnectionStatus();
        console.log('Connection status after failed start:', statusAfter);
        setError('Failed to start audio. Check console for details, or try refreshing the page.');
      } else {
        console.log('Audio started successfully!');
      }
    } catch (err) {
      console.error('Start audio error:', err);
      
      // Provide more specific error messages based on the error
      if (err.message.includes('NotAllowedError') || err.message.includes('allow microphone access')) {
        setError('Microphone access denied. Please click the microphone icon in your browser\'s address bar and allow access, then refresh the page.');
      } else if (err.message.includes('NotFoundError')) {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (err.message.includes('NotReadableError')) {
        setError('Microphone is already in use by another application. Please close other apps using the microphone and try again.');
      } else {
        setError(`Failed to start audio: ${err.message}`);
      }
    }
  }, []);

  const handleStopAudio = useCallback(async () => {
    if (!audioManager.current) return;
    
    try {
      await audioManager.current.stopAudio();
    } catch (err) {
      console.error('Stop audio error:', err);
      setError(`Failed to stop audio: ${err.message}`);
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!audioManager.current) return;
    
    try {
      audioManager.current.toggleMute();
    } catch (err) {
      console.error('Toggle mute error:', err);
      setError(`Failed to toggle mute: ${err.message}`);
    }
  }, []);

  const handleToggleRemoteMute = useCallback(() => {
    if (!audioManager.current) return;
    
    try {
      audioManager.current.toggleRemoteMute();
    } catch (err) {
      console.error('Toggle remote mute error:', err);
      setError(`Failed to toggle remote mute: ${err.message}`);
    }
  }, []);

  // Audio level animation
  useEffect(() => {
    if (audioState.audioLevel > 0 || audioState.remoteAudioLevel > 0) {
      const animate = () => {
        if (audioState.audioLevel > 0 || audioState.remoteAudioLevel > 0) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioState.audioLevel, audioState.remoteAudioLevel]);

  const getStatusColor = () => {
    switch (audioState.state) {
      case 'producing': return 'text-green-500';
      case 'receiving': return 'text-blue-500';
      case 'connected': return 'text-yellow-500';
      case 'connecting': return 'text-orange-500';
      case 'disconnected': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    
    switch (audioState.state) {
      case 'producing': return role === 'teacher' ? 'Teaching' : 'Speaking';
      case 'receiving': return 'Listening';
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  const renderTeacherControls = () => (
    <div className="flex items-center space-x-2">
      {!audioState.isProducing ? (
        <button
          onClick={handleStartAudio}
          disabled={!audioState.isConnected || isConnecting}
          className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          title="Start microphone"
        >
          <Mic size={20} />
          <span>Start Mic</span>
        </button>
      ) : (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleMute}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              audioState.isMuted 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
            title={audioState.isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {audioState.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            <span>{audioState.isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          
          <button
            onClick={handleStopAudio}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            title="Stop microphone"
          >
            <MicOff size={20} />
            <span>Stop</span>
          </button>
        </div>
      )}
      
      {/* Audio level indicator */}
      {audioState.isProducing && (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-8 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="bg-green-500 transition-all duration-75"
              style={{ 
                height: `${Math.min(audioState.audioLevel, 100)}%`,
                width: '100%',
                marginTop: `${100 - Math.min(audioState.audioLevel, 100)}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderStudentControls = () => (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2">
        <Radio 
          size={20} 
          className={audioState.state === 'receiving' ? 'text-blue-500' : 'text-gray-400'} 
        />
        <span className="text-sm">
          {audioState.state === 'receiving' ? 'Receiving Audio' : 'Waiting for Teacher'}
        </span>
      </div>
      
      {audioState.state === 'receiving' && (
        <>
          <button
            onClick={handleToggleRemoteMute}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
              audioState.isRemoteMuted 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            title={audioState.isRemoteMuted ? 'Unmute teacher' : 'Mute teacher'}
          >
            {audioState.isRemoteMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          
          {/* Remote audio level indicator */}
          <div className="flex items-center space-x-1">
            <div className="w-2 h-6 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 transition-all duration-75"
                style={{ 
                  height: `${Math.min(audioState.remoteAudioLevel, 100)}%`,
                  width: '100%',
                  marginTop: `${100 - Math.min(audioState.remoteAudioLevel, 100)}%`
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className={`audio-control bg-white border rounded-lg shadow-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Waves size={20} className="text-blue-500" />
          <h3 className="font-semibold text-lg">Audio</h3>
          <span className={`text-sm ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          
          {audioState.isConnected && (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Connection Status */}
      {!audioState.isConnected && roomId && !isConnecting && (
        <div className="mb-4">
          <button
            onClick={handleConnect}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Connect to Room Audio
          </button>
        </div>
      )}

      {isConnecting && (
        <div className="mb-4 text-center">
          <div className="text-blue-500">Connecting to audio server...</div>
        </div>
      )}

      {/* Role-specific Controls */}
      {audioState.isConnected && (
        <div className="mb-4">
          {role === 'teacher' ? renderTeacherControls() : renderStudentControls()}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-2">Settings</h4>
          <div className="space-y-2 text-sm">
            <div>Room ID: <code className="bg-gray-100 px-2 py-1 rounded">{roomId || 'Not set'}</code></div>
            <div>Role: <span className="capitalize">{role}</span></div>
            <div>Server: <code className="bg-gray-100 px-2 py-1 rounded">{serverUrl}</code></div>
            <div>State: <span className={getStatusColor()}>{audioState.state}</span></div>
          </div>
          
          {/* Recent Logs */}
          {logs.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium mb-2">Recent Activity</h5>
              <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                {logs.slice(-5).map((log, index) => (
                  <div key={index} className="flex space-x-2">
                    <span className="text-gray-500">{log.timestamp}</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioControl;