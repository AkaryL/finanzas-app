import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Dashboard from './components/Dashboard'
import GastosTable from './components/GastosTable'
import Simulador from './components/Simulador'
import Recomendaciones from './components/Recomendaciones'
import './App.css'

const TABS = [
  { id: 'dashboard', label: 'Resumen', icon: '📊' },
  { id: 'gastos', label: 'Gastos', icon: '💳' },
  { id: 'simulador', label: 'Simulador', icon: '🔍' },
  { id: 'recomendaciones', label: 'Consejos', icon: '💡' },
]

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [config, setConfig] = useState(null)
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [configRes, gastosRes] = await Promise.all([
        supabase.from('configuracion').select('*').limit(1).single(),
        supabase.from('gastos').select('*').order('quincena', { ascending: true }).order('dia_pago', { ascending: true }),
      ])

      if (configRes.error) throw configRes.error
      if (gastosRes.error) throw gastosRes.error

      setConfig(configRes.data)
      setGastos(gastosRes.data)
    } catch (err) {
      console.error('Error fetching data:', err)
      showToast('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateConfig = async (field, value) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return

    const { error } = await supabase
      .from('configuracion')
      .update({ [field]: numValue, updated_at: new Date().toISOString() })
      .eq('id', config.id)

    if (error) {
      showToast('Error al actualizar', 'error')
      return
    }

    setConfig(prev => ({ ...prev, [field]: numValue }))
    showToast('Configuración actualizada')
  }

  const addGasto = async (gasto) => {
    const { data, error } = await supabase
      .from('gastos')
      .insert([gasto])
      .select()
      .single()

    if (error) {
      showToast('Error al agregar gasto', 'error')
      return
    }

    setGastos(prev => [...prev, data].sort((a, b) => a.quincena - b.quincena || a.dia_pago - b.dia_pago))
    showToast('Gasto agregado')
  }

  const updateGasto = async (id, updates) => {
    const { error } = await supabase
      .from('gastos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      showToast('Error al actualizar gasto', 'error')
      return
    }

    setGastos(prev =>
      prev.map(g => g.id === id ? { ...g, ...updates } : g)
        .sort((a, b) => a.quincena - b.quincena || a.dia_pago - b.dia_pago)
    )
    showToast('Gasto actualizado')
  }

  const deleteGasto = async (id) => {
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id)

    if (error) {
      showToast('Error al eliminar', 'error')
      return
    }

    setGastos(prev => prev.filter(g => g.id !== id))
    showToast('Gasto eliminado')
  }

  const toggleGasto = async (id, activo) => {
    await updateGasto(id, { activo: !activo })
  }

  // Computed values
  const gastosActivos = gastos.filter(g => g.activo)
  const gastosQ1 = gastosActivos.filter(g => g.quincena === 1)
  const gastosQ2 = gastosActivos.filter(g => g.quincena === 2)
  const totalQ1 = gastosQ1.reduce((sum, g) => sum + parseFloat(g.monto), 0)
  const totalQ2 = gastosQ2.reduce((sum, g) => sum + parseFloat(g.monto), 0)
  const totalGastos = totalQ1 + totalQ2
  const ingresoMensual = config ? parseFloat(config.ingreso_quincenal) * 2 : 0
  const sobrante = ingresoMensual - totalGastos
  const sobranteQ1 = (config ? parseFloat(config.ingreso_quincenal) : 0) - totalQ1
  const sobranteQ2 = (config ? parseFloat(config.ingreso_quincenal) : 0) - totalQ2

  const financeData = {
    config,
    gastos,
    gastosActivos,
    gastosQ1,
    gastosQ2,
    totalQ1,
    totalQ2,
    totalGastos,
    ingresoMensual,
    sobrante,
    sobranteQ1,
    sobranteQ2,
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>Cargando tus finanzas...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>Mi Control Financiero</h1>
        <p>Administra tus ingresos, gastos y planifica tus compras</p>
      </div>

      <nav className="nav-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'dashboard' && (
        <Dashboard
          data={financeData}
          onUpdateConfig={updateConfig}
        />
      )}

      {activeTab === 'gastos' && (
        <GastosTable
          data={financeData}
          onAdd={addGasto}
          onUpdate={updateGasto}
          onDelete={deleteGasto}
          onToggle={toggleGasto}
        />
      )}

      {activeTab === 'simulador' && (
        <Simulador data={financeData} />
      )}

      {activeTab === 'recomendaciones' && (
        <Recomendaciones data={financeData} />
      )}

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
