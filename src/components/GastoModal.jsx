import { useState } from 'react'

const CATEGORIAS = [
  { value: 'fijo', label: 'Fijo' },
  { value: 'credito', label: 'Crédito' },
  { value: 'ahorro', label: 'Ahorro' },
  { value: 'entretenimiento', label: 'Entretenimiento' },
  { value: 'transporte', label: 'Transporte' },
]

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function GastoModal({ gasto, onSave, onClose }) {
  const now = new Date()
  const [form, setForm] = useState({
    nombre: gasto?.nombre || '',
    monto: gasto?.monto || '',
    dia_pago: gasto?.dia_pago || 1,
    quincena: gasto?.quincena || 1,
    categoria: gasto?.categoria || 'fijo',
    es_mensual: gasto?.es_mensual ?? true,
    notas: gasto?.notas || '',
    mes_pago: gasto?.mes_pago || null,
    anio_pago: gasto?.anio_pago || null,
    es_puntual: !!(gasto?.mes_pago),
  })

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))

    // Auto-assign quincena based on day
    if (field === 'dia_pago') {
      const day = parseInt(value)
      if (!isNaN(day)) {
        setForm(prev => ({ ...prev, dia_pago: day, quincena: day <= 15 ? 1 : 2 }))
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.monto) return

    const data = {
      nombre: form.nombre.trim(),
      monto: parseFloat(form.monto),
      dia_pago: parseInt(form.dia_pago),
      quincena: parseInt(form.quincena),
      categoria: form.categoria,
      es_mensual: form.es_mensual,
      activo: true,
      notas: form.notas.trim() || null,
      mes_pago: (form.categoria === 'credito' && form.es_puntual) ? parseInt(form.mes_pago) : null,
      anio_pago: (form.categoria === 'credito' && form.es_puntual) ? parseInt(form.anio_pago) : null,
    }

    onSave(data)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{gasto ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre del gasto</label>
            <input
              className="form-input"
              type="text"
              placeholder="Ej: Netflix, Gym, etc."
              value={form.nombre}
              onChange={e => handleChange('nombre', e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Monto ($)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.monto}
                onChange={e => handleChange('monto', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Día de pago (1-31)</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max="31"
                value={form.dia_pago}
                onChange={e => handleChange('dia_pago', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quincena</label>
              <select
                className="form-select"
                value={form.quincena}
                onChange={e => handleChange('quincena', e.target.value)}
              >
                <option value={1}>1ra Quincena (1-15)</option>
                <option value={2}>2da Quincena (16-31)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={form.categoria}
                onChange={e => handleChange('categoria', e.target.value)}
              >
                {CATEGORIAS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.categoria === 'credito' && (
            <div style={{ background: 'rgba(255,71,87,0.06)', borderRadius: '10px', padding: '16px', marginBottom: '4px' }}>
              <div className="form-group" style={{ marginBottom: form.es_puntual ? '12px' : 0 }}>
                <label className="form-label">Tipo de crédito</label>
                <select
                  className="form-select"
                  value={form.es_puntual ? 'puntual' : 'recurrente'}
                  onChange={e => {
                    const puntual = e.target.value === 'puntual'
                    setForm(prev => ({
                      ...prev,
                      es_puntual: puntual,
                      mes_pago: puntual ? (prev.mes_pago || now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2) : null,
                      anio_pago: puntual ? (prev.anio_pago || (now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear())) : null,
                    }))
                  }}
                >
                  <option value="recurrente">Recurrente (se paga cada mes)</option>
                  <option value="puntual">Puntual (solo se paga un mes específico)</option>
                </select>
              </div>
              {form.es_puntual && (
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Mes límite de pago</label>
                    <select
                      className="form-select"
                      value={form.mes_pago || ''}
                      onChange={e => handleChange('mes_pago', parseInt(e.target.value))}
                    >
                      {MESES.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Año</label>
                    <select
                      className="form-select"
                      value={form.anio_pago || now.getFullYear()}
                      onChange={e => handleChange('anio_pago', parseInt(e.target.value))}
                    >
                      <option value={now.getFullYear()}>{now.getFullYear()}</option>
                      <option value={now.getFullYear() + 1}>{now.getFullYear() + 1}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notas (opcional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="Detalles adicionales..."
              value={form.notas}
              onChange={e => handleChange('notas', e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {gasto ? 'Guardar Cambios' : 'Agregar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
