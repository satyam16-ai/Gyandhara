# GYANDHARA - Low-Bandwidth Educational Platform

🌍 **Empowering Rural Education Through AI-Powered Technology**

GYANDHARA is a revolutionary low-bandwidth educational platform designed specifically for rural students and areas with limited internet connectivity. Using advanced whiteboard technology, real-time collaboration, and AI-powered features, GYANDHARA delivers quality education with minimal data usage.

## 🔑 Key Features

### 📊 Ultra-Low Bandwidth Usage
- **Optimized for 2G/3G networks** - Works seamlessly even with poor connectivity  
- **Smart compression** - Intelligent data reduction algorithms
- **Adaptive quality** - Automatically adjusts based on network conditions
- **Minimal data consumption** - Up to 90% less data usage than traditional platforms

### 🎨 Interactive Whiteboard
- **Real-time collaborative drawing** - Synchronized across all devices
- **Multiple drawing tools** - Pen, highlighter, eraser, shapes, and images
- **Paper-like experience** - Notebook, graph, and legal pad styles
- **Multi-slide support** - Organized lesson structure

### 💬 AI-Powered Communication
- **Intelligent chat system** - Real-time messaging with smart features
- **AI Doubt Solver** - Instant assistance in multiple languages
- **Hand raising system** - Interactive classroom management
- **Voice communication** - Crystal clear audio optimized for low bandwidth

### 🤖 Advanced AI Features
- **Multi-language support** - Hindi, English, and 10+ Indian languages  
- **Smart content generation** - AI-powered educational assistance
- **Auto-translation** - Real-time language conversion
- **Intelligent doubt solving** - Context-aware help system
- **Learning Analytics**: Track student progress

### 💾 Offline-First Design
- Classes stored locally for offline viewing
- Content shareable via USB/SD cards
- Automatic sync when internet returns
- Local server deployment option

## 🚀 Technology Stack

### Frontend
- **React/Next.js** - Modern web framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Responsive design
- **Socket.io Client** - Real-time communication
- **Canvas API** - Interactive drawing

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Socket.io** - WebSocket implementation
- **SQLite** - Lightweight database
- **Opus Audio Codec** - Audio compression

### AI/ML Components
- **Web Speech API** - Speech-to-text
- **Audio Processing** - Real-time noise reduction
- **Stroke Optimization** - Path simplification
- **Translation Services** - Multi-language support

## 📱 Bandwidth Modes

### Ultra Low (2G Compatible)
- Audio-only mode
- Text captions
- < 10 KB/minute data usage
- Works on connections as slow as 50 kbps

### Low Bandwidth
- Basic drawing functionality
- Compressed audio (32kbps)
- Simplified stroke rendering
- < 50 KB/minute data usage

### Normal Mode
- Full feature set
- High-quality audio (64kbps)
- Rich interactive elements
- < 200 KB/minute data usage

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with audio support
- Internet connection for initial setup

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd voiceboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development servers**
   ```bash
   # Start frontend (port 3000)
   npm run dev
   
   # Start backend server (port 3001) - in another terminal
   npm run server
   
   # Or start both together
   npm run dev:full
   ```

4. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Production Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🎯 Usage Guide

### For Teachers
1. **Start a Class**
   - Select "Teacher" on the landing page
   - Click "Start Class" 
   - Share the session ID with students

2. **Teaching Tools**
   - Use the whiteboard to draw and explain concepts
   - Enable voice recording for audio instruction
   - Monitor connected students in real-time
   - Adjust bandwidth settings as needed

3. **Student Interaction**
   - See raised hands from students
   - Respond to chat questions
   - Monitor individual student connection quality

### For Students
1. **Join a Class**
   - Select "Student" on the landing page
   - Enter the session ID provided by teacher
   - Choose appropriate bandwidth mode

2. **Learning Features**
   - View synchronized whiteboard content
   - Listen to teacher's audio instruction
   - Use chat for questions and discussions
   - Raise hand for teacher attention

3. **AI Enhancements**
   - Enable live captions for better understanding
   - Use auto-translation for local language support
   - Access auto-generated notes after class

## 📊 Impact & Benefits

### For Rural Education
- **Accessibility**: Works with basic Android phones and 2G networks
- **Affordability**: Minimal data costs compared to video solutions
- **Offline Support**: Continue learning without internet
- **Local Language Support**: AI translation breaks language barriers

### For Educational Institutions
- **Scalability**: One teacher can reach hundreds of students
- **Cost-Effective**: Minimal server requirements
- **Easy Deployment**: Can run on local Raspberry Pi servers
- **Analytics**: Track student engagement and progress

### Environmental Impact
- **Reduced Bandwidth**: Lower energy consumption
- **Longer Device Life**: Works on older, low-power devices
- **Sustainable**: Offline-first approach reduces dependency

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=./voiceboard.db

# AI Services (Optional)
OPENAI_API_KEY=your_openai_key
GOOGLE_TRANSLATE_API_KEY=your_google_translate_key

# Audio Settings
DEFAULT_AUDIO_BITRATE=32000
MAX_AUDIO_CHUNK_SIZE=2048
```

### Bandwidth Settings

Customize bandwidth modes in `src/lib/bandwidth.ts`:

```typescript
export const BANDWIDTH_CONFIGS = {
  'ultra-low': {
    audioBitrate: 16000,
    maxStrokesPerSecond: 5,
    compressionLevel: 0.9
  },
  // ... other modes
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Reporting Issues
- Use GitHub Issues for bug reports
- Include browser/device information
- Provide reproduction steps
- Add network condition details

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Rural Students**: The inspiration behind this project
- **Open Source Community**: For the amazing tools and libraries
- **Educators**: For feedback and real-world testing
- **AI/ML Research**: For making smart compression possible

## 📞 Support & Contact

- **Documentation**: [Wiki](https://github.com/yourorg/voiceboard/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourorg/voiceboard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourorg/voiceboard/discussions)
- **Email**: support@voiceboard.edu

---

**VoiceBoard** - Empowering rural education through intelligent technology 🌟

*Built with ❤️ for students who deserve quality education regardless of their location or internet connectivity.*
