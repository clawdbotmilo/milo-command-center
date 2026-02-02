'use client'

/**
 * SimulationControls - Play/pause, speed adjustment, and simulation info
 * 
 * Provides controls for the village simulation including:
 * - Play/Pause toggle
 * - Speed slider (0.25x to 4x)
 * - Time of day display
 * - Tick counter
 */

import { useState, useCallback } from 'react'

// Speed presets
const SPEED_PRESETS = [
  { value: 0.25, label: '0.25×', icon: '🐢' },
  { value: 0.5, label: '0.5×', icon: '🚶' },
  { value: 1, label: '1×', icon: '⏱️' },
  { value: 2, label: '2×', icon: '🏃' },
  { value: 4, label: '4×', icon: '⚡' },
]

// Time of day icons
const TIME_OF_DAY_DISPLAY: Record<string, { icon: string; color: string; label: string }> = {
  dawn: { icon: '🌅', color: 'text-orange-400', label: 'Dawn' },
  morning: { icon: '☀️', color: 'text-yellow-400', label: 'Morning' },
  noon: { icon: '🌞', color: 'text-yellow-300', label: 'Noon' },
  afternoon: { icon: '🌤️', color: 'text-yellow-500', label: 'Afternoon' },
  evening: { icon: '🌆', color: 'text-orange-500', label: 'Evening' },
  dusk: { icon: '🌇', color: 'text-purple-400', label: 'Dusk' },
  night: { icon: '🌙', color: 'text-blue-400', label: 'Night' },
  midnight: { icon: '🌑', color: 'text-slate-400', label: 'Midnight' },
}

interface SimulationControlsProps {
  /** Is the simulation currently running */
  isRunning?: boolean
  /** Current simulation speed multiplier */
  speed?: number
  /** Current tick number */
  tick?: number
  /** Current in-game hour (0-23) */
  timeOfDay?: number
  /** Current day number */
  day?: number
  /** Callback when play/pause is toggled */
  onTogglePlay?: (isRunning: boolean) => void
  /** Callback when speed is changed */
  onSpeedChange?: (speed: number) => void
  /** Callback to reset simulation */
  onReset?: () => void
  /** Callback to step simulation forward by one tick */
  onStep?: () => void
  /** Show expanded controls */
  expanded?: boolean
  /** Disable controls */
  disabled?: boolean
}

export function SimulationControls({
  isRunning = false,
  speed = 1,
  tick = 0,
  timeOfDay = 12,
  day = 1,
  onTogglePlay,
  onSpeedChange,
  onReset,
  onStep,
  expanded = false,
  disabled = false,
}: SimulationControlsProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  // Get time period from hour
  const getTimePeriod = (hour: number): string => {
    if (hour >= 5 && hour < 7) return 'dawn'
    if (hour >= 7 && hour < 11) return 'morning'
    if (hour >= 11 && hour < 13) return 'noon'
    if (hour >= 13 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 19) return 'evening'
    if (hour >= 19 && hour < 21) return 'dusk'
    if (hour >= 21 || hour < 1) return 'night'
    return 'midnight'
  }

  // Format time display
  const formatTime = (hour: number): string => {
    const h = hour % 24
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hour12}:00 ${ampm}`
  }

  const handleTogglePlay = useCallback(() => {
    if (!disabled) {
      onTogglePlay?.(!isRunning)
    }
  }, [disabled, isRunning, onTogglePlay])

  const handleSpeedSelect = useCallback((newSpeed: number) => {
    if (!disabled) {
      onSpeedChange?.(newSpeed)
      setShowSpeedMenu(false)
    }
  }, [disabled, onSpeedChange])

  const timePeriod = getTimePeriod(timeOfDay)
  const timeDisplay = TIME_OF_DAY_DISPLAY[timePeriod] || TIME_OF_DAY_DISPLAY.noon
  const currentSpeedPreset = SPEED_PRESETS.find(p => p.value === speed) || SPEED_PRESETS[2]

  // Compact mode
  if (!expanded) {
    return (
      <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2">
        {/* Play/Pause */}
        <button
          onClick={handleTogglePlay}
          disabled={disabled}
          className={`p-2 rounded-lg transition ${
            disabled
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : isRunning
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
          title={isRunning ? 'Pause' : 'Play'}
        >
          {isRunning ? '⏸️' : '▶️'}
        </button>

        {/* Speed selector */}
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              disabled
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
          >
            {currentSpeedPreset.icon} {currentSpeedPreset.label}
          </button>
          
          {showSpeedMenu && !disabled && (
            <div className="absolute top-full mt-1 left-0 bg-slate-700 rounded-lg shadow-xl border border-slate-600 overflow-hidden z-50">
              {SPEED_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleSpeedSelect(preset.value)}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-600 transition ${
                    preset.value === speed ? 'bg-blue-600 text-white' : 'text-slate-300'
                  }`}
                >
                  {preset.icon} {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-600" />

        {/* Time display */}
        <div className="flex items-center gap-2 text-sm">
          <span className={timeDisplay.color}>{timeDisplay.icon}</span>
          <div className="text-white">{formatTime(timeOfDay)}</div>
          <div className="text-slate-400">Day {day}</div>
        </div>

        {/* Tick counter */}
        <div className="text-xs text-slate-500 ml-2">
          T:{tick}
        </div>
      </div>
    )
  }

  // Expanded mode
  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-700/50 px-4 py-2 border-b border-slate-600">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span>🎮</span>
          Simulation Controls
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Play controls row */}
        <div className="flex items-center gap-2">
          {/* Step back (placeholder) */}
          <button
            disabled={true}
            className="p-2 rounded-lg bg-slate-700 text-slate-500 cursor-not-allowed"
            title="Step back (not available)"
          >
            ⏮️
          </button>

          {/* Play/Pause */}
          <button
            onClick={handleTogglePlay}
            disabled={disabled}
            className={`p-3 rounded-lg transition text-lg ${
              disabled
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : isRunning
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            title={isRunning ? 'Pause simulation' : 'Play simulation'}
          >
            {isRunning ? '⏸️' : '▶️'}
          </button>

          {/* Step forward */}
          <button
            onClick={() => onStep?.()}
            disabled={disabled || isRunning}
            className={`p-2 rounded-lg transition ${
              disabled || isRunning
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
            title="Step forward one tick"
          >
            ⏭️
          </button>

          {/* Reset */}
          <button
            onClick={() => onReset?.()}
            disabled={disabled}
            className={`p-2 rounded-lg transition ${
              disabled
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-red-600/20 hover:bg-red-600/40 text-red-400'
            }`}
            title="Reset simulation"
          >
            🔄
          </button>

          {/* Status indicator */}
          <div className="flex-1 text-right">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                isRunning
                  ? 'bg-green-600/20 text-green-400'
                  : 'bg-yellow-600/20 text-yellow-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
              {isRunning ? 'Running' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Speed slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Speed</span>
            <span className="text-white font-medium">{currentSpeedPreset.icon} {currentSpeedPreset.label}</span>
          </div>
          
          {/* Speed buttons */}
          <div className="flex gap-1">
            {SPEED_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleSpeedSelect(preset.value)}
                disabled={disabled}
                className={`flex-1 py-2 rounded text-xs font-medium transition ${
                  preset.value === speed
                    ? 'bg-blue-600 text-white'
                    : disabled
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom speed slider */}
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange?.(parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Time info */}
        <div className="grid grid-cols-2 gap-3">
          {/* Time of day */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Time of Day</div>
            <div className="flex items-center gap-2">
              <span className={`text-xl ${timeDisplay.color}`}>{timeDisplay.icon}</span>
              <div>
                <div className="text-white font-medium">{formatTime(timeOfDay)}</div>
                <div className={`text-xs ${timeDisplay.color}`}>{timeDisplay.label}</div>
              </div>
            </div>
          </div>

          {/* Day & Tick */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Simulation Progress</div>
            <div className="text-white font-medium">Day {day}</div>
            <div className="text-xs text-slate-400">Tick #{tick.toLocaleString()}</div>
          </div>
        </div>

        {/* Quick info */}
        <div className="text-xs text-slate-500 text-center">
          {isRunning ? (
            <span>Simulation running at {speed}× speed</span>
          ) : (
            <span>Click play or use Step to advance simulation</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default SimulationControls
