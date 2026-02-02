'use client'

/**
 * VillageCanvas - Real-time canvas-based village grid renderer
 * 
 * Features:
 * - Pan and zoom controls
 * - Building rendering with labels
 * - Villager display with status indicators
 * - Real-time position updates
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import type { VillagerState, VillageState } from '@/lib/use-village-events'

// Grid and rendering constants
const GRID_SIZE = 256
const TILE_SIZE = 16 // Base tile size in pixels
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4

// Building type colors
const BUILDING_COLORS: Record<string, string> = {
  TAVERN: '#8B4513',
  CHURCH: '#D4AF37',
  BLACKSMITH: '#4A4A4A',
  BAKERY: '#F5DEB3',
  MARKET: '#8FBC8F',
  LIBRARY: '#4169E1',
  FARM: '#228B22',
  WELL: '#4682B4',
  COTTAGE: '#CD853F',
}

// Tile type colors
const TILE_COLORS: Record<string, string> = {
  grass: '#3a5a40',
  path: '#a68a64',
  water: '#4682B4',
  building: '#8B4513',
  tree: '#2d6a4f',
  field: '#90EE90',
}

// Villager status colors
const STATUS_COLORS: Record<string, string> = {
  idle: '#888888',
  walking: '#4CAF50',
  working: '#FF9800',
  socializing: '#E91E63',
  sleeping: '#673AB7',
  eating: '#795548',
  thinking: '#2196F3',
  default: '#FFFFFF',
}

interface Building {
  id: string
  type: string
  name?: string
  x: number
  y: number
  width: number
  height: number
  entrance?: { x: number; y: number }
}

interface CameraState {
  x: number // Center position in world coords
  y: number
  zoom: number
}

interface VillageCanvasProps {
  state: VillageState | null
  buildings?: Building[]
  width?: number
  height?: number
  onVillagerClick?: (villager: VillagerState) => void
  onBuildingClick?: (building: Building) => void
  onCameraChange?: (camera: CameraState) => void
}

export function VillageCanvas({
  state,
  buildings = [],
  width = 800,
  height = 600,
  onVillagerClick,
  onBuildingClick,
  onCameraChange,
}: VillageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const [camera, setCamera] = useState<CameraState>({ x: 128, y: 128, zoom: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [hoveredVillager, setHoveredVillager] = useState<VillagerState | null>(null)
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null)
  const [selectedVillager, setSelectedVillager] = useState<VillagerState | null>(null)

  // Notify parent of camera changes
  useEffect(() => {
    onCameraChange?.(camera)
  }, [camera, onCameraChange])

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const tilePixels = TILE_SIZE * camera.zoom
    const worldX = camera.x + (screenX - width / 2) / tilePixels
    const worldY = camera.y + (screenY - height / 2) / tilePixels
    return { x: worldX, y: worldY }
  }, [camera, width, height])

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    const tilePixels = TILE_SIZE * camera.zoom
    const screenX = (worldX - camera.x) * tilePixels + width / 2
    const screenY = (worldY - camera.y) * tilePixels + height / 2
    return { x: screenX, y: screenY }
  }, [camera, width, height])

  // Draw minimap - defined first so it can be used by draw
  const drawMinimap = useCallback((
    ctx: CanvasRenderingContext2D,
    visibleStartX: number,
    visibleStartY: number,
    visibleEndX: number,
    visibleEndY: number
  ) => {
    const minimapSize = 100
    const minimapX = width - minimapSize - 10
    const minimapY = 10
    const scale = minimapSize / GRID_SIZE

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize)
    ctx.strokeStyle = '#666666'
    ctx.lineWidth = 1
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize)

    // Draw buildings on minimap
    ctx.fillStyle = '#8B4513'
    for (const building of buildings) {
      ctx.fillRect(
        minimapX + building.x * scale,
        minimapY + building.y * scale,
        Math.max(1, building.width * scale),
        Math.max(1, building.height * scale)
      )
    }

    // Draw villagers on minimap
    if (state?.villagers) {
      ctx.fillStyle = '#FFFFFF'
      for (const villager of state.villagers) {
        ctx.beginPath()
        ctx.arc(
          minimapX + villager.position_x * scale,
          minimapY + villager.position_y * scale,
          2,
          0,
          Math.PI * 2
        )
        ctx.fill()
      }
    }

    // Draw viewport rectangle
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 1
    ctx.strokeRect(
      minimapX + visibleStartX * scale,
      minimapY + visibleStartY * scale,
      (visibleEndX - visibleStartX) * scale,
      (visibleEndY - visibleStartY) * scale
    )
  }, [buildings, state, width])

  // Draw villager tooltip - defined before draw
  const drawVillagerTooltip = useCallback((ctx: CanvasRenderingContext2D, villager: VillagerState) => {
    const screenPos = worldToScreen(villager.position_x, villager.position_y)
    const tooltipX = screenPos.x + 20
    const tooltipY = screenPos.y - 20
    const padding = 8
    const lineHeight = 16

    const lines = [
      `${villager.name} (${villager.role})`,
      `Status: ${villager.status}`,
      `Position: (${villager.position_x}, ${villager.position_y})`,
      `Money: ${villager.money} coins`,
    ]

    ctx.font = '12px sans-serif'
    const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width))
    const tooltipWidth = maxWidth + padding * 2
    const tooltipHeight = lines.length * lineHeight + padding * 2

    // Adjust position to stay on screen
    const adjustedX = Math.min(tooltipX, width - tooltipWidth - 10)
    const adjustedY = Math.max(tooltipY, tooltipHeight + 10)

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.fillRect(adjustedX, adjustedY - tooltipHeight, tooltipWidth, tooltipHeight)
    ctx.strokeStyle = '#666666'
    ctx.lineWidth = 1
    ctx.strokeRect(adjustedX, adjustedY - tooltipHeight, tooltipWidth, tooltipHeight)

    // Text
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'left'
    lines.forEach((line, i) => {
      ctx.fillText(line, adjustedX + padding, adjustedY - tooltipHeight + padding + (i + 1) * lineHeight - 4)
    })
  }, [worldToScreen, width])

  // Draw HUD - defined before draw
  const drawHUD = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(10, height - 40, 200, 30)
    
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(
      `Zoom: ${(camera.zoom * 100).toFixed(0)}% | Pos: (${camera.x.toFixed(0)}, ${camera.y.toFixed(0)})`,
      20,
      height - 20
    )

    // Villager count
    if (state?.villagers) {
      ctx.fillText(
        `Villagers: ${state.villagers.length}`,
        20,
        height - 8
      )
    }
  }, [camera, height, state])

  // Draw the grid and all entities - main draw function
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const tilePixels = TILE_SIZE * camera.zoom

    // Clear canvas
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    // Calculate visible tile range
    const topLeft = screenToWorld(0, 0)
    const bottomRight = screenToWorld(width, height)
    const startX = Math.max(0, Math.floor(topLeft.x) - 1)
    const startY = Math.max(0, Math.floor(topLeft.y) - 1)
    const endX = Math.min(GRID_SIZE, Math.ceil(bottomRight.x) + 1)
    const endY = Math.min(GRID_SIZE, Math.ceil(bottomRight.y) + 1)

    // Draw grass tiles (base layer)
    ctx.fillStyle = TILE_COLORS.grass
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const screenPos = worldToScreen(x, y)
        ctx.fillRect(screenPos.x, screenPos.y, tilePixels + 1, tilePixels + 1)
      }
    }

    // Draw grid lines (only at higher zoom levels)
    if (camera.zoom >= 0.75) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 0.5
      for (let y = startY; y <= endY; y++) {
        const screenStart = worldToScreen(startX, y)
        const screenEnd = worldToScreen(endX, y)
        ctx.beginPath()
        ctx.moveTo(screenStart.x, screenStart.y)
        ctx.lineTo(screenEnd.x, screenStart.y)
        ctx.stroke()
      }
      for (let x = startX; x <= endX; x++) {
        const screenStart = worldToScreen(x, startY)
        const screenEnd = worldToScreen(x, endY)
        ctx.beginPath()
        ctx.moveTo(screenStart.x, screenStart.y)
        ctx.lineTo(screenStart.x, screenEnd.y)
        ctx.stroke()
      }
    }

    // Draw buildings
    for (const building of buildings) {
      const screenPos = worldToScreen(building.x, building.y)
      const buildingWidth = building.width * tilePixels
      const buildingHeight = building.height * tilePixels

      // Building fill
      ctx.fillStyle = BUILDING_COLORS[building.type] || '#8B4513'
      ctx.fillRect(screenPos.x, screenPos.y, buildingWidth, buildingHeight)

      // Building border
      ctx.strokeStyle = hoveredBuilding?.id === building.id ? '#FFD700' : '#000000'
      ctx.lineWidth = hoveredBuilding?.id === building.id ? 3 : 1
      ctx.strokeRect(screenPos.x, screenPos.y, buildingWidth, buildingHeight)

      // Building label (only at higher zoom)
      if (camera.zoom >= 0.5 && building.name) {
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `${Math.max(10, 12 * camera.zoom)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(
          building.name,
          screenPos.x + buildingWidth / 2,
          screenPos.y + buildingHeight + 14 * camera.zoom
        )
      }

      // Building entrance marker
      if (building.entrance && camera.zoom >= 0.75) {
        const entranceScreen = worldToScreen(building.entrance.x, building.entrance.y)
        ctx.fillStyle = '#FFD700'
        ctx.beginPath()
        ctx.arc(entranceScreen.x, entranceScreen.y, 4 * camera.zoom, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw villagers
    if (state?.villagers) {
      for (const villager of state.villagers) {
        const screenPos = worldToScreen(villager.position_x, villager.position_y)
        const radius = 6 * camera.zoom
        const isHovered = hoveredVillager?.id === villager.id
        const isSelected = selectedVillager?.id === villager.id

        // Status indicator ring
        const statusColor = STATUS_COLORS[villager.status] || STATUS_COLORS.default
        ctx.beginPath()
        ctx.arc(screenPos.x, screenPos.y, radius + 3 * camera.zoom, 0, Math.PI * 2)
        ctx.fillStyle = statusColor
        ctx.fill()

        // Villager body
        ctx.beginPath()
        ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? '#FFD700' : isHovered ? '#FFFFFF' : '#E0E0E0'
        ctx.fill()
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1
        ctx.stroke()

        // Selection/hover indicator
        if (isSelected || isHovered) {
          ctx.beginPath()
          ctx.arc(screenPos.x, screenPos.y, radius + 6 * camera.zoom, 0, Math.PI * 2)
          ctx.strokeStyle = isSelected ? '#FFD700' : '#FFFFFF'
          ctx.lineWidth = 2
          ctx.setLineDash([4, 4])
          ctx.stroke()
          ctx.setLineDash([])
        }

        // Villager name (at higher zoom or when hovered/selected)
        if ((camera.zoom >= 1 || isHovered || isSelected)) {
          ctx.fillStyle = '#FFFFFF'
          ctx.font = `bold ${Math.max(10, 11 * camera.zoom)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(villager.name, screenPos.x, screenPos.y - radius - 6 * camera.zoom)
          
          // Role beneath name
          if (camera.zoom >= 1.5 || isHovered || isSelected) {
            ctx.font = `${Math.max(8, 9 * camera.zoom)}px sans-serif`
            ctx.fillStyle = '#AAAAAA'
            ctx.fillText(villager.role, screenPos.x, screenPos.y - radius - 18 * camera.zoom)
          }
        }
      }
    }

    // Draw minimap in corner
    drawMinimap(ctx, startX, startY, endX, endY)

    // Draw tooltip for hovered villager
    if (hoveredVillager && !isDragging) {
      drawVillagerTooltip(ctx, hoveredVillager)
    }

    // Draw HUD info
    drawHUD(ctx)
  }, [camera, width, height, buildings, state, hoveredVillager, hoveredBuilding, selectedVillager, isDragging, screenToWorld, worldToScreen, drawMinimap, drawVillagerTooltip, drawHUD])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      draw(ctx)
      animationRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [draw])

  // Handle mouse move for panning and hover
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    if (isDragging) {
      const dx = (mouseX - lastMousePos.x) / (TILE_SIZE * camera.zoom)
      const dy = (mouseY - lastMousePos.y) / (TILE_SIZE * camera.zoom)
      setCamera(prev => ({
        ...prev,
        x: Math.max(0, Math.min(GRID_SIZE, prev.x - dx)),
        y: Math.max(0, Math.min(GRID_SIZE, prev.y - dy)),
      }))
      setLastMousePos({ x: mouseX, y: mouseY })
    } else {
      // Check for villager hover
      const worldPos = screenToWorld(mouseX, mouseY)
      let foundVillager: VillagerState | null = null
      let foundBuilding: Building | null = null

      if (state?.villagers) {
        for (const villager of state.villagers) {
          const dist = Math.hypot(villager.position_x - worldPos.x, villager.position_y - worldPos.y)
          if (dist < 1) {
            foundVillager = villager
            break
          }
        }
      }

      if (!foundVillager) {
        for (const building of buildings) {
          if (
            worldPos.x >= building.x &&
            worldPos.x < building.x + building.width &&
            worldPos.y >= building.y &&
            worldPos.y < building.y + building.height
          ) {
            foundBuilding = building
            break
          }
        }
      }

      setHoveredVillager(foundVillager)
      setHoveredBuilding(foundBuilding)
    }
  }, [isDragging, lastMousePos, camera.zoom, screenToWorld, state, buildings])

  // Handle mouse down for pan start
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      setIsDragging(true)
      setLastMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }, [])

  // Handle mouse up for pan end and click
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) {
      // This was a click, not a drag
      if (hoveredVillager) {
        setSelectedVillager(prev => prev?.id === hoveredVillager.id ? null : hoveredVillager)
        onVillagerClick?.(hoveredVillager)
      } else if (hoveredBuilding) {
        onBuildingClick?.(hoveredBuilding)
      } else {
        setSelectedVillager(null)
      }
    }
    setIsDragging(false)
  }, [isDragging, hoveredVillager, hoveredBuilding, onVillagerClick, onBuildingClick])

  // Handle wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * zoomFactor)),
    }))
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const moveAmount = 5 / camera.zoom
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          setCamera(prev => ({ ...prev, y: Math.max(0, prev.y - moveAmount) }))
          break
        case 'ArrowDown':
        case 's':
          setCamera(prev => ({ ...prev, y: Math.min(GRID_SIZE, prev.y + moveAmount) }))
          break
        case 'ArrowLeft':
        case 'a':
          setCamera(prev => ({ ...prev, x: Math.max(0, prev.x - moveAmount) }))
          break
        case 'ArrowRight':
        case 'd':
          setCamera(prev => ({ ...prev, x: Math.min(GRID_SIZE, prev.x + moveAmount) }))
          break
        case '+':
        case '=':
          setCamera(prev => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom * 1.2) }))
          break
        case '-':
          setCamera(prev => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom / 1.2) }))
          break
        case 'Home':
          setCamera({ x: 128, y: 128, zoom: 1 })
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [camera.zoom])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg cursor-grab active:cursor-grabbing"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false)
        setHoveredVillager(null)
        setHoveredBuilding(null)
      }}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
    />
  )
}

export default VillageCanvas
