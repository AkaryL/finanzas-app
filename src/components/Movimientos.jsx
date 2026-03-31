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

export default function Movimientos({ config, gastosActivos, pagosDeudas = [], onConfigUpdate, onRegistrarPago, onRevertirPago }) {
  const [movimientos, setMovimientos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const now = new Date()
  const mesActual = now.getMonth() + 1
  const anioActual = now.getFullYear()
  const mesSiguiente = mesActual === 12 ? 1 : mesActual + 1
  const anioSiguiente = mesActual === 12 ? anioActual + 1 : anioActual
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  const emptyForm = {
    tipo: 'pago_adelantado',
    descripcion: '',
    monto: '',
    origen: 'saldo_cuenta',
    destino: '',
    gastoId: '',
    mesPago: `${mesSiguiente}-${anioSiguiente}`,
  }

  const [form, setForm] = useState(emptyForm)

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

    // Preparar datos del movimiento
    const movData = {
      tipo: form.tipo,
      descripcion: form.descripcion.trim(),
      monto: montoNum,
      origen: form.tipo === 'ingreso_extra' ? null : form.origen,
      destino: form.destino.trim() || null,
    }

    // Si es pago adelantado, guardar referencia al gasto para poder revertir
    if (form.tipo === 'pago_adelantado' && form.gastoId && form.mesPago) {
      const [mesStr, anioStr] = form.mesPago.split('-')
      movData.gasto_id = form.gastoId
      movData.mes_pago = parseInt(mesStr)
      movData.anio_pago = parseInt(anioStr)
    }

    // Guardar movimiento
    const { data: mov, error } = await supabase
      .from('movimientos')
      .insert([movData])
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

    // Si es pago adelantado y se seleccionó un crédito, registrar el pago de deuda
    if (form.tipo === 'pago_adelantado' && form.gastoId && onRegistrarPago) {
      const [mesStr, anioStr] = form.mesPago.split('-')
      await onRegistrarPago(form.gastoId, form.origen, `Pago adelantado: ${form.descripcion}`, parseInt(mesStr), parseInt(anioStr), montoNum)
    }

    setMovimientos(prev => [mov, ...prev])
    setForm(emptyForm)
    setShowForm(false)
    setEditingId(null)
  }

  // Calcular el impacto en saldo de un movimiento (para revertirlo)
  const calcImpacto = (mov) => {
    const monto = parseFloat(mov.monto)
    if (mov.tipo === 'ingreso_extra') {
      return { saldo_cuenta: -monto } // revertir: quitar lo que se sumó
    } else if (mov.tipo === 'retiro_ahorro') {
      return { ahorro_actual_auto: monto, saldo_cuenta: -monto }
    } else {
      // pago_adelantado o gasto_extra
      if (mov.origen === 'saldo_cuenta') {
        return { saldo_cuenta: monto } // revertir: devolver lo que se restó
      } else {
        return { ahorro_actual_auto: monto }
      }
    }
  }

  const startEdit = (mov) => {
    setForm({
      tipo: mov.tipo,
      descripcion: mov.descripcion,
      monto: String(mov.monto),
      origen: mov.origen || 'saldo_cuenta',
      destino: mov.destino || '',
      gastoId: '',
      mesPago: `${mesSiguiente}-${anioSiguiente}`,
    })
    setEditingId(mov.id)
    setShowForm(true)
  }

  const guardarEdicion = async () => {
    const montoNum = parseFloat(form.monto)
    if (!montoNum || !form.descripcion.trim()) return

    const movOriginal = movimientos.find(m => m.id === editingId)
    if (!movOriginal) return

    // 1. Revertir el impacto del movimiento original
    const reversion = calcImpacto(movOriginal)

    // 2. Calcular el nuevo impacto
    let nuevoImpacto = {}
    if (form.tipo === 'ingreso_extra') {
      nuevoImpacto = { saldo_cuenta: montoNum }
    } else if (form.tipo === 'retiro_ahorro') {
      nuevoImpacto = { ahorro_actual_auto: -montoNum, saldo_cuenta: montoNum }
    } else {
      if (form.origen === 'saldo_cuenta') {
        nuevoImpacto = { saldo_cuenta: -montoNum }
      } else {
        nuevoImpacto = { ahorro_actual_auto: -montoNum }
      }
    }

    // 3. Combinar reversion + nuevo impacto
    const saldoActual = parseFloat(config.saldo_cuenta)
    const ahorroActual = parseFloat(config.ahorro_actual_auto)
    const deltaSaldo = (reversion.saldo_cuenta || 0) + (nuevoImpacto.saldo_cuenta || 0)
    const deltaAhorro = (reversion.ahorro_actual_auto || 0) + (nuevoImpacto.ahorro_actual_auto || 0)

    const configUpdates = {}
    if (deltaSaldo !== 0) configUpdates.saldo_cuenta = saldoActual + deltaSaldo
    if (deltaAhorro !== 0) configUpdates.ahorro_actual_auto = ahorroActual + deltaAhorro

    // 4. Si el movimiento original era pago_adelantado con gasto_id, revertir ese abono
    if (movOriginal.tipo === 'pago_adelantado' && movOriginal.gasto_id && onRevertirPago) {
      await onRevertirPago(movOriginal.gasto_id, parseFloat(movOriginal.monto), movOriginal.mes_pago, movOriginal.anio_pago)
    }

    // 5. Preparar datos de actualización
    const updateData = {
      tipo: form.tipo,
      descripcion: form.descripcion.trim(),
      monto: montoNum,
      origen: form.tipo === 'ingreso_extra' ? null : form.origen,
      destino: form.destino.trim() || null,
      gasto_id: null,
      mes_pago: null,
      anio_pago: null,
    }

    if (form.tipo === 'pago_adelantado' && form.gastoId && form.mesPago) {
      const [mesStr, anioStr] = form.mesPago.split('-')
      updateData.gasto_id = form.gastoId
      updateData.mes_pago = parseInt(mesStr)
      updateData.anio_pago = parseInt(anioStr)
    }

    // 6. Actualizar movimiento en DB
    const { error } = await supabase
      .from('movimientos')
      .update(updateData)
      .eq('id', editingId)

    if (error) return

    // 7. Actualizar configuración si hay cambios
    if (Object.keys(configUpdates).length > 0) {
      const { error: configError } = await supabase
        .from('configuracion')
        .update({ ...configUpdates, updated_at: new Date().toISOString() })
        .eq('id', config.id)

      if (!configError) {
        onConfigUpdate(configUpdates)
      }
    }

    // 8. Si es pago adelantado y se seleccionó un crédito, registrar el nuevo pago de deuda
    if (form.tipo === 'pago_adelantado' && form.gastoId && onRegistrarPago) {
      const [mesStr, anioStr] = form.mesPago.split('-')
      await onRegistrarPago(form.gastoId, form.origen, `Pago adelantado: ${form.descripcion}`, parseInt(mesStr), parseInt(anioStr), montoNum)
    }

    // 9. Actualizar lista local
    setMovimientos(prev => prev.map(m => m.id === editingId ? {
      ...m,
      ...updateData,
    } : m))

    setForm(emptyForm)
    setShowForm(false)
    setEditingId(null)
  }

  const eliminarMovimiento = async (mov) => {
    // 1. Revertir el impacto en saldo
    const reversion = calcImpacto(mov)
    const saldoActual = parseFloat(config.saldo_cuenta)
    const ahorroActual = parseFloat(config.ahorro_actual_auto)

    const configUpdates = {}
    if (reversion.saldo_cuenta) configUpdates.saldo_cuenta = saldoActual + reversion.saldo_cuenta
    if (reversion.ahorro_actual_auto) configUpdates.ahorro_actual_auto = ahorroActual + reversion.ahorro_actual_auto

    // 2. Eliminar de DB
    const { error } = await supabase
      .from('movimientos')
      .delete()
      .eq('id', mov.id)

    if (error) return

    // 3. Revertir saldo
    if (Object.keys(configUpdates).length > 0) {
      const { error: configError } = await supabase
        .from('configuracion')
        .update({ ...configUpdates, updated_at: new Date().toISOString() })
        .eq('id', config.id)

      if (!configError) {
        onConfigUpdate(configUpdates)
      }
    }

    // 4. Si era pago adelantado, revertir el abono en pagos_deudas
    if (mov.tipo === 'pago_adelantado' && mov.gasto_id && onRevertirPago) {
      await onRevertirPago(mov.gasto_id, parseFloat(mov.monto), mov.mes_pago, mov.anio_pago)
    }

    setMovimientos(prev => prev.filter(m => m.id !== mov.id))
    setConfirmDelete(null)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const esGasto = form.tipo !== 'ingreso_extra'
  const origenLabel = form.origen === 'saldo_cuenta' ? 'saldo en cuenta' : 'ahorro del coche'
  const montoNum = parseFloat(form.monto) || 0

  // Al editar, el saldo disponible incluye el monto original (porque se revierte)
  const movOriginalEdit = editingId ? movimientos.find(m => m.id === editingId) : null
  const bonusEdicion = (() => {
    if (!movOriginalEdit) return 0
    const orig = movOriginalEdit
    // Cuánto se "devuelve" al saldo del origen seleccionado al revertir el movimiento original
    if (orig.tipo === 'ingreso_extra') return 0 // no resta de ningún origen
    if (orig.tipo === 'retiro_ahorro') {
      return form.origen === 'saldo_cuenta' ? -parseFloat(orig.monto) : parseFloat(orig.monto)
    }
    // pago_adelantado o gasto_extra: el monto original se devuelve al origen original
    if (orig.origen === form.origen) return parseFloat(orig.monto)
    return 0
  })()

  const disponibleBase = form.origen === 'saldo_cuenta'
    ? parseFloat(config?.saldo_cuenta || 0)
    : parseFloat(config?.ahorro_actual_auto || 0)
  const disponible = disponibleBase + bonusEdicion

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Movimientos</span>
        <button className="btn btn-primary btn-sm" onClick={() => {
          if (showForm) { cancelForm() } else { setShowForm(true) }
        }}>
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

          {form.tipo === 'pago_adelantado' && (() => {
            const [mesSelStr, anioSelStr] = form.mesPago.split('-')
            const mesSel = parseInt(mesSelStr)
            const anioSel = parseInt(anioSelStr)
            const creditos = gastosActivos.filter(g => {
              if (g.categoria !== 'credito') return false
              // Si tiene mes/año puntual, solo mostrar si coincide con el mes seleccionado
              if (g.mes_pago && g.anio_pago) {
                return g.mes_pago === mesSel && g.anio_pago === anioSel
              }
              return true // recurrente
            })
            const creditosSinPagar = creditos.filter(g => {
              const pago = pagosDeudas.find(p => p.gasto_id === g.id && p.mes === mesSel && p.anio === anioSel)
              if (!pago) return true // sin ningún pago
              return parseFloat(pago.monto_pagado || 0) < parseFloat(g.monto) // abono parcial
            })
            return (
              <>
              <div className="form-group">
                <label className="form-label">Mes al que aplica el pago</label>
                <select className="form-select" value={form.mesPago} onChange={e => setForm(prev => ({ ...prev, mesPago: e.target.value, gastoId: '' }))}>
                  <option value={`${mesActual}-${anioActual}`}>{MESES[mesActual - 1]} {anioActual} (mes actual)</option>
                  <option value={`${mesSiguiente}-${anioSiguiente}`}>{MESES[mesSiguiente - 1]} {anioSiguiente} (mes siguiente)</option>
                </select>
              </div>
              {creditosSinPagar.length > 0 ? (
              <div className="form-group">
                <label className="form-label">Aplicar a crédito (marca como pagado en Gastos)</label>
                <select className="form-select" value={form.gastoId} onChange={e => {
                  const gastoId = e.target.value
                  if (gastoId) {
                    const gasto = creditos.find(g => g.id === gastoId)
                    if (gasto) {
                      // Calcular lo que falta por pagar
                      const pagoExistente = pagosDeudas.find(p => p.gasto_id === gastoId && p.mes === mesSel && p.anio === anioSel)
                      const abonado = parseFloat(pagoExistente?.monto_pagado || 0)
                      const restante = parseFloat(gasto.monto) - abonado
                      setForm(prev => ({
                        ...prev,
                        gastoId,
                        descripcion: prev.descripcion || `Adelanto ${gasto.nombre}`,
                        monto: prev.monto || String(restante > 0 ? restante : gasto.monto),
                      }))
                    } else {
                      handleChange('gastoId', gastoId)
                    }
                  } else {
                    handleChange('gastoId', '')
                  }
                }}>
                  <option value="">No aplicar a ningún crédito</option>
                  {creditosSinPagar.map(g => {
                    const pagoExistente = pagosDeudas.find(p => p.gasto_id === g.id && p.mes === mesSel && p.anio === anioSel)
                    const abonado = parseFloat(pagoExistente?.monto_pagado || 0)
                    const restante = parseFloat(g.monto) - abonado
                    return (
                      <option key={g.id} value={g.id}>
                        {g.nombre} - {abonado > 0 ? `Faltan ${formatMoney(restante)} de ${formatMoney(g.monto)}` : formatMoney(g.monto)}
                      </option>
                    )
                  })}
                </select>
              </div>
            ) : null}
            </>)
          })()}

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
                  {ORIGENES.map(o => {
                    const base = o.value === 'saldo_cuenta' ? parseFloat(config?.saldo_cuenta || 0) : parseFloat(config?.ahorro_actual_auto || 0)
                    // Al editar, sumar de vuelta lo que el movimiento original restó de esta cuenta
                    let bonus = 0
                    if (movOriginalEdit && movOriginalEdit.tipo !== 'ingreso_extra') {
                      if (movOriginalEdit.tipo === 'retiro_ahorro') {
                        bonus = o.value === 'ahorro_auto' ? parseFloat(movOriginalEdit.monto) : -parseFloat(movOriginalEdit.monto)
                      } else if (movOriginalEdit.origen === o.value) {
                        bonus = parseFloat(movOriginalEdit.monto)
                      }
                    }
                    return (
                      <option key={o.value} value={o.value}>{o.label} ({formatMoney(base + bonus)})</option>
                    )
                  })}
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
            <button className="btn btn-secondary" onClick={cancelForm}>Cancelar</button>
            <button
              className="btn btn-primary"
              onClick={editingId ? guardarEdicion : registrar}
              disabled={!form.descripcion.trim() || !montoNum || (esGasto && !editingId && montoNum > disponible)}
            >
              {editingId ? 'Guardar Cambios' : 'Registrar'}
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
            <div style={{ flex: 1 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: m.tipo === 'ingreso_extra' ? 'var(--accent)' : 'var(--danger-light)',
              }}>
                {m.tipo === 'ingreso_extra' ? '+' : '-'}{formatMoney(m.monto)}
              </div>
              <div className="actions-cell" style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="btn-icon edit"
                  onClick={() => startEdit(m)}
                  title="Editar"
                  style={{ fontSize: '0.8rem', padding: '4px 6px' }}
                >
                  ✎
                </button>
                <button
                  className="btn-icon delete"
                  onClick={() => setConfirmDelete(m)}
                  title="Eliminar"
                  style={{ fontSize: '0.8rem', padding: '4px 6px' }}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))
      )}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h2>Eliminar movimiento</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>
              Se eliminará <strong style={{ color: 'var(--text-primary)' }}>{confirmDelete.descripcion}</strong> y se revertirá el saldo ({confirmDelete.tipo === 'ingreso_extra' ? '-' : '+'}{formatMoney(confirmDelete.monto)}).
            </p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '16px' }}>
              Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={() => eliminarMovimiento(confirmDelete)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
