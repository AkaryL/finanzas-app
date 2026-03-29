export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { mensaje, contextoFinanciero } = req.body

  if (!mensaje) {
    return res.status(400).json({ error: 'Mensaje requerido' })
  }

  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada' })
  }

  const systemPrompt = `Eres un asesor financiero personal amigable y directo. Hablas en español mexicano.
El usuario tiene la siguiente situación financiera:

${contextoFinanciero}

Reglas:
- Responde de forma concisa y práctica (máximo 3-4 párrafos)
- Da consejos específicos basados en sus números reales
- Si pregunta si puede comprar algo, haz los cálculos con sus datos
- Sé honesto: si no le alcanza, dilo claro pero sin ser duro
- Usa formato simple, sin markdown complejo
- Si te pregunta algo no relacionado a finanzas, redirige amablemente al tema`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: mensaje }],
      }),
    })

    if (!response.ok) {
      const errData = await response.text()
      console.error('Claude API error:', errData)
      return res.status(500).json({ error: 'Error al consultar la IA' })
    }

    const data = await response.json()
    const respuesta = data.content[0].text

    return res.status(200).json({ respuesta })
  } catch (err) {
    console.error('Error:', err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
