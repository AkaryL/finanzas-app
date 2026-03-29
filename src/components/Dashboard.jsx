import { useState } from 'react'

function formatMoney(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

export default function Dashboard({ data, onUpdateConfig }) {
  const {
    config, gastosQ1, gastosQ2,
    totalQ1, totalQ2, totalGastos,
    ingresoMensual, sobrante, sobranteQ1, sobranteQ2,
  } = data

  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = (field, currentValue) => {
    setEditingField(field)
    setEditValue(String(currentValue))
  }

  const saveEdit = (field) => {
    onUpdateConfig(field, editValue)
    setEditingField(null)
  }

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') saveEdit(field)
    if (e.key === 'Escape') setEditingField(null)
  }

  const pctUsado = ingresoMensual > 0 ? (totalGastos / ingresoMensual) * 100 : 0
  const progressClass = pctUsado <= 70 ? 'safe' : pctUsado <= 90 ? 'caution' : 'danger'

  const saldoCuenta = config ? parseFloat(config.saldo_cuenta) : 0
  const ahorroCoche = config ? parseFloat(config.ahorro_actual_auto) : 0

  return (
    <>
      {/* Stats principales */}
      <div className="stats-grid">
        <div className="stat-card income">
          <div className="stat-label">Ingreso Mensual</div>
          <div className="stat-value positive">{formatMoney(ingresoMensual)}</div>
          <div className="stat-sub">
            {formatMoney(config?.ingreso_quincenal || 0)} por quincena
          </div>
        </div>

        <div className="stat-card expense">
          <div className="stat-label">Total Gastos</div>
          <div className="stat-value negative">{formatMoney(totalGastos)}</div>
          <div className="stat-sub">{pctUsado.toFixed(1)}% de tu ingreso</div>
        </div>

        <div className="stat-card balance">
          <div className="stat-label">Sobrante Mensual</div>
          <div className={`stat-value ${sobrante >= 0 ? 'positive' : 'negative'}`}>
            {formatMoney(sobrante)}
          </div>
          <div className="stat-sub">Libre para gastar o ahorrar</div>
        </div>

        <div className="stat-card savings">
          <div className="stat-label">Saldo en Cuenta</div>
          <div className="stat-value warning-val">{formatMoney(saldoCuenta)}</div>
          <div className="stat-sub">Ahorro coche: {formatMoney(ahorroCoche)}</div>
        </div>
      </div>

      {/* Barra de progreso general */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Uso de tu ingreso mensual</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {pctUsado.toFixed(1)}% comprometido
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${progressClass}`}
            style={{ width: `${Math.min(pctUsado, 100)}%` }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>$0</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{formatMoney(ingresoMensual)}</span>
        </div>
      </div>

      {/* Desglose por quincena */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '20px' }}>Desglose por Quincena</div>

        <div className="quincena-section">
          <div className="quincena-header">
            <h3><span className="quincena-badge q1">1ra Quincena</span> Gastos del 1 al 15</h3>
            <span className="quincena-total">{formatMoney(totalQ1)}</span>
          </div>
          {gastosQ1.map(g => (
            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 18px', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {g.nombre} <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>- Día {g.dia_pago}</span>
              </span>
              <span style={{ color: 'var(--danger-light)', fontWeight: 600 }}>{formatMoney(g.monto)}</span>
            </div>
          ))}
          <div className="quincena-remaining">
            Restante: <span className={sobranteQ1 >= 0 ? 'positive' : 'negative'}>{formatMoney(sobranteQ1)}</span>
          </div>
        </div>

        <div className="quincena-section">
          <div className="quincena-header">
            <h3><span className="quincena-badge q2">2da Quincena</span> Gastos del 16 al 31</h3>
            <span className="quincena-total">{formatMoney(totalQ2)}</span>
          </div>
          {gastosQ2.map(g => (
            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 18px', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {g.nombre} <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>- Día {g.dia_pago}</span>
              </span>
              <span style={{ color: 'var(--danger-light)', fontWeight: 600 }}>{formatMoney(g.monto)}</span>
            </div>
          ))}
          <div className="quincena-remaining">
            Restante: <span className={sobranteQ2 >= 0 ? 'positive' : 'negative'}>{formatMoney(sobranteQ2)}</span>
          </div>
        </div>
      </div>

      {/* Configuración editable */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '20px' }}>Configuración</div>
        <div className="config-grid">
          {[
            { field: 'ingreso_quincenal', label: 'Ingreso Quincenal', value: config?.ingreso_quincenal },
            { field: 'saldo_cuenta', label: 'Saldo en Cuenta', value: config?.saldo_cuenta },
            { field: 'ahorro_actual_auto', label: 'Ahorro del Coche', value: config?.ahorro_actual_auto },
          ].map(({ field, label, value }) => (
            <div className="config-item" key={field}>
              <label>{label}</label>
              <div className="config-value">
                {editingField === field ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(field)}
                    onKeyDown={e => handleKeyDown(e, field)}
                    autoFocus
                  />
                ) : (
                  <input
                    type="text"
                    value={formatMoney(value || 0)}
                    readOnly
                    onClick={() => startEdit(field, value)}
                    style={{ cursor: 'pointer' }}
                    title="Click para editar"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
