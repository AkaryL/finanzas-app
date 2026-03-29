import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function formatMoney(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

const TIPOS = [
  { value: 'pago_adelantado', label: 'Pago adelantado', desc: 'Adelantar pago de un crédito/servicio' },
  { value: 'gasto_extra', label: 'Gasto extra', desc: 'Compra o gasto no recurrente' },
  { value: 'ingreso_extra', label: 'Ingreso extra', desc: 'Dinero adicional que recibiste' },
  { value: 'retiro_ahorro', label: 'Retiro de ahorro', desc: 'Sacar dinero del ahorro del coche' },
]

const ORIGENES = [
  { value: 'saldo_cuenta', label: 'Saldo en cuenta' },
  { value: 'ahorro_auto', label: 'Ahorro del coche' },
]

const TIPO_LABELS = {
  pago_adelantado: 'Pago adelantado',
  gasto_extra: 'Gasto extra',
  ingreso_extra: 'Ingreso extra',
  retiro_ahorro: 'Retiro ahorro',
}

const TIPO_CLASSES = {
  pago_adelantado: 'pago-adelantado',
  gasto_extra: 'gasto',
  ingreso_extra: 'ingreso',
  retiro_ahorro: 'gasto',
}

export default function Movimientos({ config, gastosActivos, onConfigUpdate }) {
  const [movimientos, setMovimientos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    tipo: 'pago_adelantado',
    descripcion: '',
    monto: '',
    origen: 'saldo_cuenta',
    destino: '',
  })

  useEffect(() => {
    supabase
      .from('movimientos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setMovimientos(data)
      })
  }, [])

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const registrar = async () => {
    const montoNum = parseFloat(form.monto)
    if (!montoNum || !form.descripcion.trim()) return

    // Guardar movimiento
    const { data: mov, error } = await supabase
      .from('movimientos')
      .insert([{
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
        monto: montoNum,
        origen: form.tipo === 'ingreso_extra' ? null : form.origen,
        destino: form.destino.trim() || null,
      }])
      .select()
      .single()

    if (error) return

    // Actualizar saldo según el tipo
    const saldoActual = parseFloat(config.saldo_cuenta)
    const ahorroActual = parseFloat(config.ahorro_actual_auto)
    let updates = {}

    if (form.tipo === 'ingreso_extra') {
      updates = { saldo_cuenta: saldoActual + montoNum }
    } else if (form.tipo === 'retiro_ahorro') {
      updates = {
        ahorro_actual_auto: ahorroActual - montoNum,
        saldo_cuenta: saldoActual + montoNum,
      }
    } else {
      // pago_adelantado o gasto_extra
      if (form.origen === 'saldo_cuenta') {
        updates = { saldo_cuenta: saldoActual - montoNum }
      } else {
        updates = { ahorro_actual_auto: ahorroActual - montoNum }
      }
    }

    const { error: configError } = await supabase
      .from('configuracion')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', config.id)

    if (!configError) {
      onConfigUpdate(updates)
    }

    setMovimientos(prev => [mov, ...prev])
    setForm({ tipo: 'pago_adelantado', descripcion: '', monto: '', origen: 'saldo_cuenta', destino: '' })
    setShowForm(false)
  }

  const esGasto = form.tipo !== 'ingreso_extra'
  const origenLabel = form.origen === 'saldo_cuenta' ? 'saldo en cuenta' : 'ahorro del coche'
  const montoNum = parseFloat(form.monto) || 0
  const disponible = form.origen === 'saldo_cuenta'
    ? parseFloat(config?.saldo_cuenta || 0)
    : parseFloat(config?.ahorro_actual_auto || 0)

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Movimientos</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Registrar Movimiento'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div className="form-group">
            <label className="form-label">Tipo de movimiento</label>
            <select className="form-select" value={form.tipo} onChange={e => handleChange('tipo', e.target.value)}>
              {TIPOS.map(t => (
                <option key={t.value} value={t.value}>{t.label} - {t.desc}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input
                className="form-input"
                placeholder={form.tipo === 'pago_adelantado' ? 'Ej: Adelanto Nu Crédito' : 'Ej: Comida con amigos'}
                value={form.descripcion}
                onChange={e => handleChange('descripcion', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monto ($)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.monto}
                onChange={e => handleChange('monto', e.target.value)}
              />
            </div>
          </div>

          {esGasto && form.tipo !== 'retiro_ahorro' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tomar dinero de</label>
                <select className="form-select" value={form.origen} onChange={e => handleChange('origen', e.target.value)}>
                  {ORIGENES.map(o => (
                    <option key={o.value} value={o.value}>{o.label} ({formatMoney(
                      o.value === 'saldo_cuenta' ? config?.saldo_cuenta : config?.ahorro_actual_auto
                    )})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Destino / Aplicar a (opcional)</label>
                <input
                  className="form-input"
                  placeholder="Ej: Nu Crédito, BBVA"
                  value={form.destino}
                  onChange={e => handleChange('destino', e.target.value)}
                />
              </div>
            </div>
          )}

          {esGasto && montoNum > 0 && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginTop: '12px',
              fontSize: '0.85rem',
              background: montoNum > disponible ? 'rgba(255,71,87,0.1)' : 'rgba(0,212,170,0.1)',
              color: montoNum > disponible ? 'var(--danger-light)' : 'var(--accent-light)',
            }}>
              {montoNum > disponible
                ? `No te alcanza. Tu ${origenLabel} es ${formatMoney(disponible)}, te faltan ${formatMoney(montoNum - disponible)}.`
                : `Después de este movimiento tu ${origenLabel} quedaría en ${formatMoney(disponible - montoNum)}.`
              }
            </div>
          )}

          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button
              className="btn btn-primary"
              onClick={registrar}
              disabled={!form.descripcion.trim() || !montoNum || (esGasto && montoNum > disponible)}
            >
              Registrar
            </button>
          </div>
        </div>
      )}

      {/* Lista de movimientos */}
      {movimientos.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', textAlign: 'center', padding: '20px' }}>
          Sin movimientos registrados. Aquí aparecerán tus pagos adelantados, gastos extra, etc.
        </p>
      ) : (
        movimientos.map(m => (
          <div key={m.id} className="movimiento-item">
            <div>
              <span className={`movimiento-tipo ${TIPO_CLASSES[m.tipo]}`}>
                {TIPO_LABELS[m.tipo]}
              </span>
              <div style={{ fontWeight: 500, marginTop: '4px' }}>{m.descripcion}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {new Date(m.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {m.origen && ` · De: ${m.origen === 'saldo_cuenta' ? 'Saldo' : 'Ahorro coche'}`}
                {m.destino && ` · Para: ${m.destino}`}
              </div>
            </div>
            <div style={{
              fontWeight: 700,
              fontSize: '1rem',
              color: m.tipo === 'ingreso_extra' ? 'var(--accent)' : 'var(--danger-light)',
            }}>
              {m.tipo === 'ingreso_extra' ? '+' : '-'}{formatMoney(m.monto)}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
