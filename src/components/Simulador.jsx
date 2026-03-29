import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function formatMoney(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

export default function Simulador({ data }) {
  const { config, sobrante, sobranteQ1, sobranteQ2, totalGastos, ingresoMensual } = data

  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [quincena, setQuincena] = useState('1')
  const [usarSaldo, setUsarSaldo] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [historial, setHistorial] = useState([])

  useEffect(() => {
    supabase
      .from('simulaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data: sims }) => {
        if (sims) setHistorial(sims)
      })
  }, [])

  const simular = async () => {
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) return

    const saldoCuenta = config ? parseFloat(config.saldo_cuenta) : 0
    const sobranteQuincena = quincena === '1' ? sobranteQ1 : sobranteQ2
    const dineroDisponible = usarSaldo
      ? sobranteQuincena + saldoCuenta
      : sobranteQuincena

    const restante = dineroDisponible - montoNum
    const esViable = restante >= 0
    const pctImpacto = ingresoMensual > 0 ? (montoNum / ingresoMensual) * 100 : 0

    // Determinar nivel de recomendación
    let nivel = 'viable'
    let mensaje = ''

    if (!esViable) {
      nivel = 'no-viable'
      mensaje = `No te alcanza. Te faltan ${formatMoney(Math.abs(restante))} para cubrir este gasto.`
    } else if (restante < 500) {
      nivel = 'warning-result'
      mensaje = `Puedes hacerlo, pero te quedarías con solo ${formatMoney(restante)}. Muy justo.`
    } else {
      mensaje = `Sí puedes. Te quedarían ${formatMoney(restante)} disponibles.`
    }

    // Sugerencias extra
    const sugerencias = []

    if (!esViable && saldoCuenta >= montoNum && !usarSaldo) {
      sugerencias.push(`Podrías cubrirlo con tu saldo en cuenta (${formatMoney(saldoCuenta)}), pero eso reduce tu colchón.`)
    }

    if (!esViable) {
      const mesesParaAhorrar = Math.ceil(montoNum / Math.max(sobrante, 1))
      if (sobrante > 0) {
        sugerencias.push(`Si ahorras tu sobrante mensual, lo juntarías en ~${mesesParaAhorrar} mes(es).`)
      }
    }

    if (esViable && pctImpacto > 20) {
      sugerencias.push(`Este gasto representa el ${pctImpacto.toFixed(1)}% de tu ingreso mensual. Es un gasto considerable.`)
    }

    if (esViable && montoNum > sobrante && usarSaldo) {
      sugerencias.push('Necesitas usar parte de tu saldo actual, no solo el sobrante quincenal.')
    }

    const res = {
      esViable,
      nivel,
      mensaje,
      restante,
      sugerencias,
      pctImpacto,
      dineroDisponible,
    }

    setResultado(res)

    // Guardar en historial
    const { data: saved } = await supabase
      .from('simulaciones')
      .insert([{
        descripcion: descripcion || 'Sin descripción',
        monto: montoNum,
        es_viable: esViable,
        dinero_restante: restante,
        notas: mensaje,
      }])
      .select()
      .single()

    if (saved) {
      setHistorial(prev => [saved, ...prev].slice(0, 10))
    }
  }

  const limpiar = () => {
    setDescripcion('')
    setMonto('')
    setResultado(null)
  }

  return (
    <>
      <div className="card">
        <div className="card-title" style={{ marginBottom: '20px' }}>
          Simulador de Compra
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '24px' }}>
          Ingresa lo que quieres comprar y te digo si puedes darte ese gasto o no.
        </p>

        <div className="simulator-input-area">
          <div className="form-group full-width">
            <label className="form-label">Descripción</label>
            <input
              className="form-input"
              type="text"
              placeholder="Ej: Audífonos, Tenis, Salida con amigos..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Monto ($)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={monto}
              onChange={e => setMonto(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Quincena donde se pagaría</label>
            <select
              className="form-select"
              value={quincena}
              onChange={e => setQuincena(e.target.value)}
            >
              <option value="1">1ra Quincena (sobrante: {formatMoney(sobranteQ1)})</option>
              <option value="2">2da Quincena (sobrante: {formatMoney(sobranteQ2)})</option>
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={usarSaldo}
                onChange={e => setUsarSaldo(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
              />
              Incluir saldo en cuenta ({formatMoney(config?.saldo_cuenta || 0)})
            </label>
          </div>

          <div className="full-width" style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={simular}>
              Simular Compra
            </button>
            {resultado && (
              <button className="btn btn-secondary" onClick={limpiar}>
                Limpiar
              </button>
            )}
          </div>
        </div>

        {resultado && (
          <div className={`simulator-result ${resultado.nivel}`}>
            <h3>
              {resultado.esViable ? (resultado.nivel === 'warning-result' ? '⚠️ Con cuidado' : '✅ Sí puedes') : '❌ No te alcanza'}
            </h3>
            <p><strong>{resultado.mensaje}</strong></p>
            <p className="detail">
              Dinero disponible: {formatMoney(resultado.dineroDisponible)} |
              Impacto: {resultado.pctImpacto.toFixed(1)}% de tu ingreso mensual
            </p>
            {resultado.sugerencias.length > 0 && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '8px' }}>Sugerencias:</p>
                {resultado.sugerencias.map((s, i) => (
                  <p key={i} className="detail" style={{ marginBottom: '4px' }}>• {s}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Referencia rápida */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '16px' }}>Tu dinero disponible</div>
        <div className="config-grid">
          <div className="config-item">
            <label>Sobrante 1ra Quincena</label>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: sobranteQ1 >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
              {formatMoney(sobranteQ1)}
            </div>
          </div>
          <div className="config-item">
            <label>Sobrante 2da Quincena</label>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: sobranteQ2 >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
              {formatMoney(sobranteQ2)}
            </div>
          </div>
          <div className="config-item">
            <label>Sobrante Mensual Total</label>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: sobrante >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
              {formatMoney(sobrante)}
            </div>
          </div>
        </div>
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: '16px' }}>Historial de Simulaciones</div>
          {historial.map(h => (
            <div key={h.id} className="historial-item">
              <div>
                <div style={{ fontWeight: 500 }}>{h.descripcion}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  {new Date(h.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatMoney(h.monto)}</div>
                <div className={h.es_viable ? 'historial-viable' : 'historial-no-viable'}>
                  {h.es_viable ? 'Viable' : 'No viable'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
