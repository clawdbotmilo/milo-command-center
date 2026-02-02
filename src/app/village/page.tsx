import { VillageViewer } from '@/components/village/VillageViewer'

export const metadata = {
  title: 'Village | Milo Command Center',
  description: 'Real-time village simulation visualization',
}

export default function VillagePage() {
  return (
    <main className="min-h-screen bg-slate-950 py-6 px-4">
      <div className="max-w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            🏘️ Village Simulation
          </h1>
          <p className="text-slate-400">
            Real-time visualization of the village with live villager tracking, building display, and event monitoring.
          </p>
        </div>
        
        <VillageViewer />
      </div>
    </main>
  )
}
