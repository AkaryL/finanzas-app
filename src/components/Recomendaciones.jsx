import { useState, useRef, useEffect } from 'react'

function formatMoney(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

function ChatFinanciero({ data }) {
  const {
    config, gastosActivos, totalQ1, totalQ2, totalGastos,
    ingresoMensual, sobrante, sobranteQ1, sobranteQ2,
  } = data

  const saldoCuenta = config ? parseFloat(config.saldo_cuenta) : 0
  const ahorroCoche = config ? parseFloat(config.ahorro_actual_auto) : 0

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asesor financiero con IA. Pregúntame lo que quieras sobre tus finanzas: si puedes comprar algo, cómo administrar tu dinero, estrategias para pagar deudas, etc.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildContexto = () => {
    const gastosDetalle = gastosActivos
      .map(g => `- ${g.nombre}: ${formatMoney(g.monto)} (día ${g.dia_pago}, ${g.quincena === 1 ? '1ra' : '2da'} quincena, categoría: ${g.categoria})`)
      .join('\n')

    return `SITUACIÓN FINANCIERA ACTUAL:
- Ingreso quincenal: ${formatMoney(config?.ingreso_quincenal || 0)}
- Ingreso mensual: ${formatMoney(ingresoMensual)}
- Total gastos mensuales: ${formatMoney(totalGastos)}
- Gastos 1ra quincena: ${formatMoney(totalQ1)} | Sobrante: ${formatMoney(sobranteQ1)}
- Gastos 2da quincena: ${formatMoney(totalQ2)} | Sobrante: ${formatMoney(sobranteQ2)}
- Sobrante mensual: ${formatMoney(sobrante)}
- Saldo actual en cuenta: ${formatMoney(saldoCuenta)}
- Ahorro acumulado para coche: ${formatMoney(ahorroCoche)}

DETALLE DE GASTOS:
${gastosDetalle}`
  }

  const enviarMensaje = async () => {
    const texto = input.trim()
    if (!texto || loading) return

    const nuevosMensajes = [...messages, { role: 'user', content: texto }]
    setMessages(nuevosMensajes)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: texto,
          contextoFinanciero: buildContexto(),
        }),
      })

      if (!res.ok) throw new Error('Error en la respuesta')

      const data = await res.json()
      setMessages([...nuevosMensajes, { role: 'assistant', content: data.respuesta }])
    } catch {
      setMessages([
        ...nuevosMensajes,
        { role: 'assistant', content: 'Hubo un error al conectar con la IA. Intenta de nuevo.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje()
    }
  }

  const preguntasRapidas = [
    '¿Puedo comprar unos tenis de $2,000?',
    '¿Cómo pago más rápido mi tarjeta Nu?',
    '¿Qué gastos puedo recortar?',
    '¿Cómo organizo mejor mis quincenas?',
  ]

  return (
    <div className="card chat-card">
      <div className="card-header">
        <span className="card-title">💬 Chat con tu Asesor Financiero IA</span>
      </div>

      {/* Preguntas rápidas */}
      {messages.length <= 1 && (
        <div className="quick-questions">
          {preguntasRapidas.map((p, i) => (
            <button
              key={i}
              className="quick-question-btn"
              onClick={() => { setInput(p); }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Mensajes */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="chat-avatar">
              {msg.role === 'assistant' ? '🤖' : '👤'}
            </div>
            <div className="chat-bubble">
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="chat-avatar">🤖</div>
            <div className="chat-bubble typing">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <input
          className="form-input chat-input"
          type="text"
          placeholder="Pregúntame sobre tus finanzas..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="btn btn-primary chat-send-btn"
          onClick={enviarMensaje}
          disabled={loading || !input.trim()}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}

export default function Recomendaciones({ data }) {
  const {
    config, gastosActivos, gastosQ1, gastosQ2,
    totalQ1, totalQ2, totalGastos,
    ingresoMensual, sobrante, sobranteQ1, sobranteQ2,
  } = data

  const saldoCuenta = config ? parseFloat(config.saldo_cuenta) : 0
  const ahorroCoche = config ? parseFloat(config.ahorro_actual_auto) : 0
  const ingresoQ = config ? parseFloat(config.ingreso_quincenal) : 0

  const pctUsado = ingresoMensual > 0 ? (totalGastos / ingresoMensual) * 100 : 0

  const gastosCredito = gastosActivos.filter(g => g.categoria === 'credito')
  const gastosEntretenimiento = gastosActivos.filter(g => g.categoria === 'entretenimiento')
  const gastosAhorro = gastosActivos.filter(g => g.categoria === 'ahorro')
  const totalCreditos = gastosCredito.reduce((s, g) => s + parseFloat(g.monto), 0)
  const totalEntretenimiento = gastosEntretenimiento.reduce((s, g) => s + parseFloat(g.monto), 0)
  const totalAhorro = gastosAhorro.reduce((s, g) => s + parseFloat(g.monto), 0)
  const pctCreditos = ingresoMensual > 0 ? (totalCreditos / ingresoMensual) * 100 : 0
  const pctEntretenimiento = ingresoMensual > 0 ? (totalEntretenimiento / ingresoMensual) * 100 : 0

  const recomendaciones = []

  if (pctUsado > 95) {
    recomendaciones.push({ tipo: 'danger', icono: '🚨', titulo: 'Estás al límite', texto: `Tienes comprometido el ${pctUsado.toFixed(1)}% de tu ingreso. Prácticamente no tienes margen de maniobra.` })
  } else if (pctUsado > 80) {
    recomendaciones.push({ tipo: 'warning', icono: '⚠️', titulo: 'Margen muy ajustado', texto: `Usas el ${pctUsado.toFixed(1)}% de tu ingreso en gastos fijos. Te sobran ${formatMoney(sobrante)} al mes.` })
  } else {
    recomendaciones.push({ tipo: 'good', icono: '✅', titulo: 'Buen control de gastos', texto: `Usas el ${pctUsado.toFixed(1)}% de tu ingreso. Tienes ${formatMoney(sobrante)} de sobrante mensual.` })
  }

  if (sobranteQ1 < 0) {
    recomendaciones.push({ tipo: 'danger', icono: '🔴', titulo: '1ra quincena en números rojos', texto: `Te faltan ${formatMoney(Math.abs(sobranteQ1))}. Tus gastos (${formatMoney(totalQ1)}) superan tu ingreso quincenal.` })
  } else if (sobranteQ1 < 500) {
    recomendaciones.push({ tipo: 'warning', icono: '⚡', titulo: '1ra quincena muy apretada', texto: `Solo te quedan ${formatMoney(sobranteQ1)} libres.` })
  }

  if (sobranteQ2 < 0) {
    recomendaciones.push({ tipo: 'danger', icono: '🔴', titulo: '2da quincena en números rojos', texto: `Te faltan ${formatMoney(Math.abs(sobranteQ2))}. Gastos (${formatMoney(totalQ2)}) vs ingreso (${formatMoney(ingresoQ)}).` })
  } else if (sobranteQ2 < 500) {
    recomendaciones.push({ tipo: 'warning', icono: '⚡', titulo: '2da quincena muy apretada', texto: `Solo te quedan ${formatMoney(sobranteQ2)} libres.` })
  }

  if (pctCreditos > 40) {
    recomendaciones.push({ tipo: 'danger', icono: '💳', titulo: 'Demasiado en créditos', texto: `Pagas ${formatMoney(totalCreditos)} en créditos (${pctCreditos.toFixed(1)}% de tu ingreso). Lo recomendable es máximo 30%.` })
  }

  const nuCredito = gastosActivos.find(g => g.nombre.toLowerCase().includes('nu'))
  if (nuCredito && parseFloat(nuCredito.monto) > ingresoQ * 0.5) {
    recomendaciones.push({ tipo: 'danger', icono: '🏦', titulo: 'Nu Crédito es un gasto pesado', texto: `El pago de Nu (${formatMoney(nuCredito.monto)}) es más de la mitad de tu quincena. Intenta pagar más del mínimo.` })
  }

  if (saldoCuenta < ingresoMensual) {
    recomendaciones.push({ tipo: 'warning', icono: '🛡️', titulo: 'Fondo de emergencia bajo', texto: `Idealmente ten al menos 3 meses de gastos. Tu saldo (${formatMoney(saldoCuenta)}) no cubre ni un mes.` })
  }

  if (nuCredito && sobrante > 0) {
    recomendaciones.push({ tipo: 'good', icono: '📉', titulo: 'Estrategia para reducir Nu', texto: `Mete tu sobrante (${formatMoney(sobrante)}) a adelantar pagos de Nu. Pagar más del mínimo reduce intereses.` })
  }

  const diffQ = Math.abs(totalQ1 - totalQ2)
  if (diffQ > ingresoQ * 0.4) {
    const quinMasCara = totalQ1 > totalQ2 ? '1ra' : '2da'
    recomendaciones.push({ tipo: 'warning', icono: '⚖️', titulo: 'Quincenas desbalanceadas', texto: `La ${quinMasCara} quincena tiene mucho más gasto. Diferencia: ${formatMoney(diffQ)}.` })
  }

  return (
    <>
      {/* CHAT CON IA */}
      <ChatFinanciero data={data} />

      {/* Recomendaciones automáticas */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '8px' }}>
          Recomendaciones Automáticas
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '24px' }}>
          Análisis automático basado en tus datos. Se actualiza en tiempo real.
        </p>

        {recomendaciones.map((rec, i) => (
          <div key={i} className={`recommendation ${rec.tipo}`}>
            <span className="recommendation-icon">{rec.icono}</span>
            <div className="recommendation-text">
              <h4>{rec.titulo}</h4>
              <p>{rec.texto}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen numérico */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '16px' }}>Resumen de tu Situación</div>
        <div className="table-responsive">
          <table className="expenses-table">
            <tbody>
              <tr>
                <td style={{ color: 'var(--text-secondary)' }}>Ingreso mensual</td>
                <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatMoney(ingresoMensual)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-secondary)' }}>Total gastos fijos</td>
                <td style={{ fontWeight: 600, color: 'var(--danger-light)' }}>{formatMoney(totalGastos)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-secondary)' }}>Créditos</td>
                <td style={{ fontWeight: 600, color: 'var(--danger-light)' }}>{formatMoney(totalCreditos)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-secondary)' }}>Ahorro mensual</td>
                <td style={{ fontWeight: 600, color: 'var(--warning)' }}>{formatMoney(totalAhorro)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-secondary)' }}>Sobrante real</td>
                <td style={{ fontWeight: 700, color: sobrante >= 0 ? 'var(--accent)' : 'var(--danger)', fontSize: '1.1rem' }}>
                  {formatMoney(sobrante)}
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-secondary)' }}>% ingreso comprometido</td>
                <td style={{ fontWeight: 600, color: pctUsado > 90 ? 'var(--danger)' : pctUsado > 70 ? 'var(--warning)' : 'var(--accent)' }}>
                  {pctUsado.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Distribución por categoría */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '16px' }}>Distribución por Categoría</div>
        <div className="table-responsive">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Monto</th>
                <th>% del Ingreso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cat: 'Créditos', total: totalCreditos, max: 30 },
                { cat: 'Fijos', total: gastosActivos.filter(g => g.categoria === 'fijo').reduce((s, g) => s + parseFloat(g.monto), 0), max: 40 },
                { cat: 'Ahorro', total: totalAhorro, max: 20, inverted: true },
                { cat: 'Entretenimiento', total: totalEntretenimiento, max: 10 },
                { cat: 'Transporte', total: gastosActivos.filter(g => g.categoria === 'transporte').reduce((s, g) => s + parseFloat(g.monto), 0), max: 10 },
              ].map(({ cat, total, max, inverted }) => {
                const pct = ingresoMensual > 0 ? (total / ingresoMensual) * 100 : 0
                const isOver = inverted ? pct < (max * 0.5) : pct > max
                return (
                  <tr key={cat}>
                    <td><strong>{cat}</strong></td>
                    <td className="monto">{formatMoney(total)}</td>
                    <td>{pct.toFixed(1)}%</td>
                    <td>
                      <span style={{ color: isOver ? 'var(--danger)' : 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }}>
                        {isOver ? (inverted ? 'Podría ser más' : 'Excede lo ideal') : 'OK'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
