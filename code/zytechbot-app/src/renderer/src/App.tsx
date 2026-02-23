import { useState, useEffect } from 'react'

function App() {
  const [qrCode, setQrCode] = useState<string>('')
  const [status, setStatus] = useState<string>('Iniciando o WhatsApp em segundo plano...')
  const [numbers, setNumbers] = useState<string>('')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    window.electron.ipcRenderer.on('wa-qr', (_, qr: string) => {
      setQrCode(qr)
      setStatus('Aguardando login. Escaneie o QR Code abaixo:')
    })

    window.electron.ipcRenderer.on('wa-ready', () => {
      setQrCode('') 
      setStatus('✅ Conectado! Pronto para enviar mensagens.')
    })

    window.electron.ipcRenderer.on('wa-status', (_, msg: string) => {
      setStatus(msg)
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners('wa-qr')
      window.electron.ipcRenderer.removeAllListeners('wa-ready')
      window.electron.ipcRenderer.removeAllListeners('wa-status')
    }
  }, [])

  const handleSend = () => {
    if (!numbers || !message) {
      alert('Preencha os números e a mensagem!')
      return
    }
    
    window.electron.ipcRenderer.send('start-sending', { 
      numbers: numbers.split('\n').map(n => n.trim()).filter(n => n), 
      message 
    })
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', color: '#eeeeee', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Disparador de Mensagens</h2>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#2b2d31', borderRadius: '8px', minHeight: '80px' }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Status: {status}</p>
        {qrCode && (
          <div style={{ backgroundColor: 'white', padding: '10px', display: 'inline-block', borderRadius: '8px' }}>
            <img src={qrCode} alt="QR Code do WhatsApp" style={{ width: '200px', height: '200px' }} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Números (um por linha, com DDD):</label>
          <textarea
            value={numbers}
            onChange={(e) => setNumbers(e.target.value)}
            rows={4}
            placeholder="Ex: 5511999999999&#10;5511888888888"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', backgroundColor: '#1e1f22', color: '#fff', border: '1px solid #444' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Mensagem:</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Olá! Esta é uma mensagem padrão da equipe..."
            style={{ width: '100%', padding: '10px', borderRadius: '5px', backgroundColor: '#1e1f22', color: '#fff', border: '1px solid #444' }}
          />
        </div>

        <button
          onClick={handleSend}
          style={{ padding: '12px', cursor: 'pointer', backgroundColor: '#23a559', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', fontSize: '16px' }}
        >
          Iniciar Disparos
        </button>
      </div>
    </div>
  )
}

export default App