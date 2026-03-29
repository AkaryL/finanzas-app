function formatMoney(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
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

  // Clasificar gastos
  const gastosCredito = gastosActivos.filter(g => g.categoria === 'credito')
  const gastosEntretenimiento = gastosActivos.filter(g => g.categoria === 'entretenimiento')
  const gastosAhorro = gastosActivos.filter(g => g.categoria === 'ahorro')
  const totalCreditos = gastosCredito.reduce((s, g) => s + parseFloat(g.monto), 0)
  const totalEntretenimiento = gastosEntretenimiento.reduce((s, g) => s + parseFloat(g.monto), 0)
  const totalAhorro = gastosAhorro.reduce((s, g) => s + parseFloat(g.monto), 0)
  const pctCreditos = ingresoMensual > 0 ? (totalCreditos / ingresoMensual) * 100 : 0
  const pctEntretenimiento = ingresoMensual > 0 ? (totalEntretenimiento / ingresoMensual) * 100 : 0

  const recomendaciones = []

  // --- ANÁLISIS DE SITUACIÓN GENERAL ---
  if (pctUsado > 95) {
    recomendaciones.push({
      tipo: 'danger',
      icono: '🚨',
      titulo: 'Estás al límite',
      texto: `Tienes comprometido el ${pctUsado.toFixed(1)}% de tu ingreso. Prácticamente no tienes margen de maniobra. Cualquier gasto imprevisto te pone en problemas.`,
    })
  } else if (pctUsado > 80) {
    recomendaciones.push({
      tipo: 'warning',
      icono: '⚠️',
      titulo: 'Margen muy ajustado',
      texto: `Usas el ${pctUsado.toFixed(1)}% de tu ingreso en gastos fijos. Lo ideal es no pasar del 70-80%. Te sobran ${formatMoney(sobrante)} al mes.`,
    })
  } else {
    recomendaciones.push({
      tipo: 'good',
      icono: '✅',
      titulo: 'Buen control de gastos',
      texto: `Usas el ${pctUsado.toFixed(1)}% de tu ingreso. Tienes ${formatMoney(sobrante)} de sobrante mensual, buen margen.`,
    })
  }

  // --- ANÁLISIS POR QUINCENA ---
  if (sobranteQ1 < 0) {
    recomendaciones.push({
      tipo: 'danger',
      icono: '🔴',
      titulo: '1ra quincena en números rojos',
      texto: `Te faltan ${formatMoney(Math.abs(sobranteQ1))} en la 1ra quincena. Tus gastos (${formatMoney(totalQ1)}) superan tu ingreso quincenal (${formatMoney(ingresoQ)}). Necesitas mover algún gasto a la 2da quincena o reducir montos.`,
    })
  } else if (sobranteQ1 < 500) {
    recomendaciones.push({
      tipo: 'warning',
      icono: '⚡',
      titulo: '1ra quincena muy apretada',
      texto: `Solo te quedan ${formatMoney(sobranteQ1)} libres en la 1ra quincena. Considera reubicar algún gasto.`,
    })
  }

  if (sobranteQ2 < 0) {
    recomendaciones.push({
      tipo: 'danger',
      icono: '🔴',
      titulo: '2da quincena en números rojos',
      texto: `Te faltan ${formatMoney(Math.abs(sobranteQ2))} en la 2da quincena. Gastos (${formatMoney(totalQ2)}) vs ingreso (${formatMoney(ingresoQ)}). Necesitas redistribuir gastos.`,
    })
  } else if (sobranteQ2 < 500) {
    recomendaciones.push({
      tipo: 'warning',
      icono: '⚡',
      titulo: '2da quincena muy apretada',
      texto: `Solo te quedan ${formatMoney(sobranteQ2)} libres en la 2da quincena.`,
    })
  }

  // --- CRÉDITOS ---
  if (pctCreditos > 40) {
    recomendaciones.push({
      tipo: 'danger',
      icono: '💳',
      titulo: 'Demasiado en créditos',
      texto: `Pagas ${formatMoney(totalCreditos)} en créditos (${pctCreditos.toFixed(1)}% de tu ingreso). Lo recomendable es máximo 30%. Prioriza pagar el de mayor interés.`,
    })
  } else if (pctCreditos > 25) {
    recomendaciones.push({
      tipo: 'warning',
      icono: '💳',
      titulo: 'Cuidado con los créditos',
      texto: `Destinas ${formatMoney(totalCreditos)} en créditos (${pctCreditos.toFixed(1)}% de tu ingreso). Intenta no superar el 30%.`,
    })
  }

  // --- NU CRÉDITO ESPECÍFICO ---
  const nuCredito = gastosActivos.find(g => g.nombre.toLowerCase().includes('nu'))
  if (nuCredito) {
    const montoNu = parseFloat(nuCredito.monto)
    if (montoNu > ingresoQ * 0.5) {
      recomendaciones.push({
        tipo: 'danger',
        icono: '🏦',
        titulo: `Nu Crédito es un gasto pesado`,
        texto: `El pago de Nu (${formatMoney(montoNu)}) representa más de la mitad de tu quincena. Si puedes, paga más del mínimo para reducir intereses o intenta bajar el saldo utilizado.`,
      })
    }
  }

  // --- ENTRETENIMIENTO ---
  if (pctEntretenimiento > 10) {
    recomendaciones.push({
      tipo: 'warning',
      icono: '🎮',
      titulo: 'Suscripciones',
      texto: `Gastas ${formatMoney(totalEntretenimiento)} en entretenimiento (${pctEntretenimiento.toFixed(1)}%). Revisa si usas todas las suscripciones activas. Cada que puedas, cancela las que no uses.`,
    })
  }

  // --- SALDO ACTUAL Y QUÉ HACER CON ÉL ---
  if (saldoCuenta > 0) {
    // Estrategia con el saldo actual
    const pagosProximos = [...gastosActivos]
      .sort((a, b) => a.dia_pago - b.dia_pago)

    const hoy = new Date().getDate()
    const pagosRestantes = pagosProximos.filter(g => g.dia_pago >= hoy)
    const totalPagosRestantes = pagosRestantes.reduce((s, g) => s + parseFloat(g.monto), 0)

    if (saldoCuenta >= totalPagosRestantes && totalPagosRestantes > 0) {
      recomendaciones.push({
        tipo: 'good',
        icono: '💰',
        titulo: 'Tu saldo cubre los pagos restantes del mes',
        texto: `Tienes ${formatMoney(saldoCuenta)} y te faltan pagar ${formatMoney(totalPagosRestantes)} este mes. Te sobrarían ${formatMoney(saldoCuenta - totalPagosRestantes)} después de tus pagos.`,
      })
    } else if (totalPagosRestantes > 0) {
      recomendaciones.push({
        tipo: 'warning',
        icono: '💰',
        titulo: 'No te alcanza el saldo para cubrir todo',
        texto: `Tienes ${formatMoney(saldoCuenta)} pero te faltan ${formatMoney(totalPagosRestantes)} en pagos restantes este mes. Te faltarían ${formatMoney(totalPagosRestantes - saldoCuenta)}.`,
      })
    }
  }

  // --- FONDO DE EMERGENCIA ---
  const fondoEmergenciaIdeal = ingresoMensual * 3
  if (saldoCuenta < ingresoMensual) {
    recomendaciones.push({
      tipo: 'warning',
      icono: '🛡️',
      titulo: 'Fondo de emergencia bajo',
      texto: `Idealmente deberías tener al menos 3 meses de gastos (${formatMoney(fondoEmergenciaIdeal)}). Tu saldo actual (${formatMoney(saldoCuenta)}) ni siquiera cubre un mes de ingreso.`,
    })
  }

  // --- AHORRO DEL COCHE ---
  if (totalAhorro > 0) {
    recomendaciones.push({
      tipo: 'info',
      icono: '🚗',
      titulo: 'Progreso del ahorro del coche',
      texto: `Llevas ${formatMoney(ahorroCoche)} ahorrados y apartas ${formatMoney(totalAhorro)} al mes. ¡Sigue así! No toques este fondo a menos que sea emergencia.`,
    })
  }

  // --- DISTRIBUCIÓN RECOMENDADA ---
  if (sobrante > 0) {
    recomendaciones.push({
      tipo: 'info',
      icono: '📋',
      titulo: 'Distribución recomendada de tu sobrante',
      texto: `Tu sobrante mensual es ${formatMoney(sobrante)}. Sugerencia: 50% ahorro de emergencia (${formatMoney(sobrante * 0.5)}), 30% gastos personales (${formatMoney(sobrante * 0.3)}), 20% diversión (${formatMoney(sobrante * 0.2)}).`,
    })
  }

  // --- CONSEJO PARA REDUCIR LA NU ---
  if (nuCredito && sobrante > 0) {
    recomendaciones.push({
      tipo: 'good',
      icono: '📉',
      titulo: 'Estrategia para reducir Nu',
      texto: `Si metes tu sobrante (${formatMoney(sobrante)}) a adelantar pagos de Nu cada mes, reduces intereses considerablemente. Pagar más del mínimo siempre es la mejor estrategia en tarjetas de crédito.`,
    })
  }

  // --- EQUILIBRAR QUINCENAS ---
  const diffQ = Math.abs(totalQ1 - totalQ2)
  if (diffQ > ingresoQ * 0.4) {
    const quinMasCara = totalQ1 > totalQ2 ? '1ra' : '2da'
    recomendaciones.push({
      tipo: 'warning',
      icono: '⚖️',
      titulo: 'Quincenas desbalanceadas',
      texto: `La ${quinMasCara} quincena tiene mucho más gasto. Diferencia: ${formatMoney(diffQ)}. Si puedes, redistribuye fechas de pago para equilibrar.`,
    })
  }

  return (
    <>
      <div className="card">
        <div className="card-title" style={{ marginBottom: '8px' }}>
          Recomendaciones Financieras
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '24px' }}>
          Análisis automático basado en tus ingresos, gastos y saldo actual.
          Se actualiza cada vez que modificas tus datos.
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

      {/* Tabla por categoría */}
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
                      <span style={{
                        color: isOver ? 'var(--danger)' : 'var(--accent)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}>
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
