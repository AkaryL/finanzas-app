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

export default function GastosTable({ data, onAdd, onUpdate, onDelete, onToggle }) {
  const { gastos, totalQ1, totalQ2, totalGastos } = data
  const [showModal, setShowModal] = useState(false)
  const [editingGasto, setEditingGasto] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

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

  return (
    <>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map(g => (
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
              ))}
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
