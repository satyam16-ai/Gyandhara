'use client'

import { useEffect, useState } from 'react'
import { BandwidthSettings } from '@/types'

interface BandwidthMonitorProps {
  settings: BandwidthSettings
}

const BandwidthMonitor: React.FC<BandwidthMonitorProps> = ({ settings }) => {
  const [connectionSpeed, setConnectionSpeed] = useState<number>(0)
  const [latency, setLatency] = useState<number>(0)
  const [dataUsage, setDataUsage] = useState<number>(0)

  useEffect(() => {
    // Simulate bandwidth monitoring
    const interval = setInterval(() => {
      // In real implementation, measure actual network performance
      setConnectionSpeed(Math.random() * 1000 + 100) // 100-1100 kbps
      setLatency(Math.random() * 300 + 50) // 50-350ms
      setDataUsage(prev => prev + Math.random() * 10 + 5) // Increment data usage
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const getConnectionQuality = () => {
    if (connectionSpeed > 500) return { label: 'Excellent', color: 'green' }
    if (connectionSpeed > 200) return { label: 'Good', color: 'blue' }
    if (connectionSpeed > 100) return { label: 'Fair', color: 'yellow' }
    return { label: 'Poor', color: 'red' }
  }

  const formatDataUsage = (bytes: number) => {
    if (bytes < 1024) return `${bytes.toFixed(1)} KB`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} GB`
  }

  const getEstimatedSavings = () => {
    const videoEquivalent = dataUsage * 25 // Assume video uses 25x more data
    return formatDataUsage(videoEquivalent - dataUsage)
  }

  const quality = getConnectionQuality()

  return (
    <div className="flex items-center space-x-3">
      {/* Connection Indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full bg-${quality.color}-500`} />
        <div className="text-sm">
          <div className="font-medium text-gray-800">{quality.label}</div>
          <div className="text-xs text-gray-500">
            {connectionSpeed.toFixed(0)} kbps
          </div>
        </div>
      </div>

      {/* Bandwidth Mode */}
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        settings.mode === 'ultra-low' ? 'bg-orange-100 text-orange-800' :
        settings.mode === 'low' ? 'bg-yellow-100 text-yellow-800' :
        'bg-green-100 text-green-800'
      }`}>
        {settings.mode.replace('-', ' ').toUpperCase()}
      </div>

      {/* Data Usage Popup */}
      <div className="relative group">
        <button className="text-gray-500 hover:text-gray-700">
          📊
        </button>
        
        <div className="absolute right-0 top-8 w-64 bg-white border rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <h4 className="font-semibold mb-3">Network Stats</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Speed:</span>
              <span className="font-medium">{connectionSpeed.toFixed(0)} kbps</span>
            </div>
            
            <div className="flex justify-between">
              <span>Latency:</span>
              <span className="font-medium">{latency.toFixed(0)}ms</span>
            </div>
            
            <div className="flex justify-between">
              <span>Data Used:</span>
              <span className="font-medium">{formatDataUsage(dataUsage)}</span>
            </div>
            
            <div className="flex justify-between text-green-600">
              <span>Saved vs Video:</span>
              <span className="font-medium">{getEstimatedSavings()}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t">
            <div className="text-xs text-gray-500">
              Mode: {settings.mode}<br/>
              Auto-compress: {settings.autoCompress ? 'On' : 'Off'}<br/>
              Stroke simplification: {settings.strokeSimplification ? 'On' : 'Off'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BandwidthMonitor
