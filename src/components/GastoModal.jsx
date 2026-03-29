import { useState } from 'react'

const CATEGORIAS = [
  { value: 'fijo', label: 'Fijo' },
  { value: 'credito', label: 'Crédito' },
  { value: 'ahorro', label: 'Ahorro' },
  { value: 'entretenimiento', label: 'Entretenimiento' },
  { value: 'transporte', label: 'Transporte' },
]

export default function GastoModal({ gasto, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: gasto?.nombre || '',
    monto: gasto?.monto || '',
    dia_pago: gasto?.dia_pago || 1,
    quincena: gasto?.quincena || 1,
    categoria: gasto?.categoria || 'fijo',
    es_mensual: gasto?.es_mensual ?? true,
    notas: gasto?.notas || '',
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

    onSave({
      nombre: form.nombre.trim(),
      monto: parseFloat(form.monto),
      dia_pago: parseInt(form.dia_pago),
      quincena: parseInt(form.quincena),
      categoria: form.categoria,
      es_mensual: form.es_mensual,
      activo: true,
      notas: form.notas.trim() || null,
    })
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
