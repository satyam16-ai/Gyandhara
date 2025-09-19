# WebRTC Audio SFU System

A dedicated WebRTC audio streaming system with SFU (Selective Forwarding Unit) architecture for classroom applications.

## Features

- **Single Channel Audio**: Mono audio streaming optimized for voice
- **160kbps Bitrate**: High-quality audio with efficient bandwidth usage
- **SFU Architecture**: Selective forwarding for scalable multi-participant audio
- **Low Latency**: Real-time audio communication for classroom interaction
- **Teacher-Student Roles**: Role-based audio permissions and controls

## Architecture

```
Teacher (Producer) → SFU Server → Students (Consumers)
                        ↓
                   Signaling Server
                   (Socket.IO)
```

## Project Structure

```
webrtc-audio/
├── server/           # SFU server with mediasoup
│   ├── server.js     # Main server file
│   ├── sfu.js        # SFU logic with mediasoup
│   └── signaling.js  # Socket.IO signaling
├── client/           # WebRTC client
│   ├── src/
│   │   ├── audio.js  # Audio controls and WebRTC
│   │   └── ui.js     # User interface
│   └── index.html    # Test page
└── README.md
```

## Setup

### Server
```bash
cd server
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

## Configuration

- **Audio Codec**: Opus (preferred for voice)
- **Bitrate**: 160kbps
- **Channels**: 1 (mono)
- **Sample Rate**: 48kHz (default for WebRTC)
- **Frame Size**: 20ms (default for low latency)

## Integration

This system is designed to be integrated with the existing whiteboard application by:

1. Importing the audio client components
2. Adding audio controls to the classroom UI  
3. Connecting with existing teacher/student role management
4. Synchronizing audio state with whiteboard sessions