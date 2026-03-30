import { useState } from 'react'
import GastoModal from './GastoModal'

function formatMoney(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

const CATEGORIAS = {
  fijo: 'Fijo',
  credito: 'Crédito',
  ahorro: 'Ahorro',
  entretenimiento: 'Entretenimiento',
  transporte: 'Transporte',
}

const CUENTAS_PAGO = [
  { value: 'saldo_cuenta', label: 'Saldo en cuenta' },
  { value: 'ahorro_auto', label: 'Ahorro del coche' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'otra', label: 'Otra cuenta' },
]

const CUENTA_LABELS = {
  saldo_cuenta: 'Saldo en cuenta',
  ahorro_auto: 'Ahorro coche',
  efectivo: 'Efectivo',
  otra: 'Otra cuenta',
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function GastosTable({ data, pagosDeudas, onAdd, onUpdate, onDelete, onToggle, onRegistrarPago, onQuitarPago }) {
  const { gastos, totalQ1, totalQ2, totalGastos } = data
  const [showModal, setShowModal] = useState(false)
  const [editingGasto, setEditingGasto] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [pagoModal, setPagoModal] = useState(null) // gasto que se va a marcar como pagado
  const [cuentaPago, setCuentaPago] = useState('saldo_cuenta')
  const [notasPago, setNotasPago] = useState('')

  const now = new Date()
  const mesActual = now.getMonth() + 1
  const anioActual = now.getFullYear()
  const [mesVista, setMesVista] = useState(mesActual)
  const [anioVista, setAnioVista] = useState(anioActual)
  const mesLabel = MESES[mesVista - 1] + ' ' + anioVista

  const mesSiguiente = mesActual === 12 ? 1 : mesActual + 1
  const anioSiguiente = mesActual === 12 ? anioActual + 1 : anioActual

  // Helpers para pagos
  const getPagoDeuda = (gastoId) => {
    return pagosDeudas.find(p => p.gasto_id === gastoId && p.mes === mesVista && p.anio === anioVista)
  }

  // Filtrar créditos: si tiene mes_pago/anio_pago, solo mostrar en ese mes. Si no, es recurrente.
  const creditosActivos = gastos.filter(g => {
    if (g.categoria !== 'credito' || !g.activo) return false
    if (g.mes_pago && g.anio_pago) {
      return g.mes_pago === mesVista && g.anio_pago === anioVista
    }
    return true // recurrente, mostrar siempre
  })
  const creditosPagados = creditosActivos.filter(g => getPagoDeuda(g.id))
  const creditosPendientes = creditosActivos.filter(g => !getPagoDeuda(g.id))

  const openAdd = () => {
    setEditingGasto(null)
    setShowModal(true)
  }

  const openEdit = (gasto) => {
    setEditingGasto(gasto)
    setShowModal(true)
  }

  const handleSave = (gastoData) => {
    if (editingGasto) {
      onUpdate(editingGasto.id, gastoData)
    } else {
      onAdd(gastoData)
    }
    setShowModal(false)
  }

  const handleDelete = (id) => {
    onDelete(id)
    setConfirmDelete(null)
  }

  const openPagoModal = (gasto) => {
    setPagoModal(gasto)
    setCuentaPago('saldo_cuenta')
    setNotasPago('')
  }

  const handleRegistrarPago = () => {
    if (!pagoModal) return
    onRegistrarPago(pagoModal.id, cuentaPago, notasPago, mesVista, anioVista)
    setPagoModal(null)
  }

  return (
    <>
      {/* Resumen de pagos del mes para créditos */}
      {creditosActivos.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="card-title">Pagos de Deudas - {mesLabel}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="btn btn-sm"
                  style={{
                    padding: '2px 10px',
                    fontSize: '0.72rem',
                    background: mesVista === mesActual ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: mesVista === mesActual ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                  }}
                  onClick={() => { setMesVista(mesActual); setAnioVista(anioActual) }}
                >
                  {MESES[mesActual - 1]}
                </button>
                <button
                  className="btn btn-sm"
                  style={{
                    padding: '2px 10px',
                    fontSize: '0.72rem',
                    background: mesVista === mesSiguiente ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: mesVista === mesSiguiente ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                  }}
                  onClick={() => { setMesVista(mesSiguiente); setAnioVista(anioSiguiente) }}
                >
                  {MESES[mesSiguiente - 1]}
                </button>
              </div>
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {creditosPagados.length}/{creditosActivos.length} pagados
            </span>
          </div>

          <div className="progress-bar" style={{ marginBottom: '20px' }}>
            <div
              className={`progress-fill ${creditosPagados.length === creditosActivos.length ? 'safe' : creditosPagados.length > 0 ? 'caution' : 'danger'}`}
              style={{ width: `${(creditosPagados.length / creditosActivos.length) * 100}%` }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {creditosActivos.map(g => {
              const pago = getPagoDeuda(g.id)
              return (
                <div key={g.id} className="movimiento-item" style={{ borderRadius: '10px', background: pago ? 'rgba(0,212,170,0.06)' : 'rgba(255,71,87,0.06)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <strong>{g.nombre}</strong>
                      <span className="categoria-badge credito" style={{ fontSize: '0.7rem' }}>
                        Día {g.dia_pago}
                      </span>
                      {pago && (
                        <span style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-dim)',
                        }}>
                          Pagado de: {CUENTA_LABELS[pago.cuenta_origen] || pago.cuenta_origen}
                          {pago.notas && ` · ${pago.notas}`}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--danger-light)', fontWeight: 600, marginTop: '4px' }}>
                      {formatMoney(g.monto)}
                    </div>
                  </div>
                  <div>
                    {pago ? (
                      <button
                        className="btn btn-sm"
                        style={{
                          background: 'rgba(0,212,170,0.15)',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent-dim)',
                        }}
                        onClick={() => onQuitarPago(g.id, mesVista, anioVista)}
                        title="Desmarcar pago"
                      >
                        Pagado
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm"
                        style={{
                          background: 'rgba(255,71,87,0.15)',
                          color: 'var(--danger-light)',
                          border: '1px solid var(--danger)',
                        }}
                        onClick={() => openPagoModal(g)}
                      >
                        Pendiente
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {creditosPagados.length === creditosActivos.length && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(0,212,170,0.1)',
              color: 'var(--accent-light)',
              fontSize: '0.88rem',
              textAlign: 'center',
              fontWeight: 500,
            }}>
              Todas las deudas de {mesLabel} están pagadas
            </div>
          )}
        </div>
      )}

      {/* Tabla de gastos */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Mis Gastos ({gastos.length})</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Q1: <strong style={{ color: 'var(--danger-light)' }}>{formatMoney(totalQ1)}</strong>
              {' | '}
              Q2: <strong style={{ color: 'var(--danger-light)' }}>{formatMoney(totalQ2)}</strong>
              {' | '}
              Total: <strong style={{ color: 'var(--danger)' }}>{formatMoney(totalGastos)}</strong>
            </span>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              + Agregar Gasto
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Monto</th>
                <th>Día Pago</th>
                <th>Quincena</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map(g => {
                const pago = g.categoria === 'credito' ? getPagoDeuda(g.id) : null
                const esCredito = g.categoria === 'credito'
                return (
                  <tr key={g.id} className={g.activo ? '' : 'inactive-row'}>
                    <td>
                      <div>
                        <strong>{g.nombre}</strong>
                        {g.notas && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {g.notas}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="monto">{formatMoney(g.monto)}</td>
                    <td>{g.dia_pago}</td>
                    <td>
                      <span className={`quincena-badge ${g.quincena === 1 ? 'q1' : 'q2'}`}>
                        {g.quincena === 1 ? '1ra' : '2da'}
                      </span>
                    </td>
                    <td>
                      <span className={`categoria-badge ${g.categoria}`}>
                        {CATEGORIAS[g.categoria] || g.categoria}
                      </span>
                    </td>
                    <td>
                      {esCredito && g.activo ? (
                        pago ? (
                          <span
                            className="pago-badge pagado"
                            onClick={() => onQuitarPago(g.id, mesVista, anioVista)}
                            title={`Pagado de ${CUENTA_LABELS[pago.cuenta_origen] || pago.cuenta_origen}. Click para desmarcar.`}
                            style={{ cursor: 'pointer' }}
                          >
                            Pagado
                          </span>
                        ) : (
                          <span
                            className="pago-badge pendiente"
                            onClick={() => openPagoModal(g)}
                            title="Marcar como pagado"
                            style={{ cursor: 'pointer' }}
                          >
                            Pendiente
                          </span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className={`btn-icon ${g.activo ? 'toggle-active' : 'toggle-inactive'}`}
                          onClick={() => onToggle(g.id, g.activo)}
                          title={g.activo ? 'Desactivar' : 'Activar'}
                        >
                          {g.activo ? '✓' : '○'}
                        </button>
                        <button
                          className="btn-icon edit"
                          onClick={() => openEdit(g)}
                          title="Editar"
                        >
                          ✎
                        </button>
                        <button
                          className="btn-icon delete"
                          onClick={() => setConfirmDelete(g.id)}
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <GastoModal
          gasto={editingGasto}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Modal para registrar pago de deuda */}
      {pagoModal && (
        <div className="modal-overlay" onClick={() => setPagoModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h2>Registrar Pago</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
              Marcar <strong style={{ color: 'var(--text-primary)' }}>{pagoModal.nombre}</strong> como pagado en {mesLabel}
            </p>
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(255,71,87,0.08)',
              marginBottom: '20px',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--danger-light)',
              textAlign: 'center',
            }}>
              {formatMoney(pagoModal.monto)}
            </div>

            <div className="form-group">
              <label className="form-label">De qué cuenta pagaste</label>
              <select
                className="form-select"
                value={cuentaPago}
                onChange={e => setCuentaPago(e.target.value)}
              >
                {CUENTAS_PAGO.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notas (opcional)</label>
              <input
                className="form-input"
                placeholder="Ej: Pagué con transferencia, número de referencia..."
                value={notasPago}
                onChange={e => setNotasPago(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setPagoModal(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleRegistrarPago}>
                Marcar como Pagado
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
            <h2>Eliminar gasto</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
